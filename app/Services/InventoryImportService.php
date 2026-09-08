<?php

namespace App\Services;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Carga masiva de productos/movimientos vía Excel/CSV (REFACTOR-PLAN.md
 * punto 12.4). Una sola pieza reutilizada desde Productos, Movimientos de
 * Inventario, y la recepción de un Pedido — solo cambia qué botón la abre.
 *
 * Flujo en dos pasos para poder mostrar una vista previa antes de tocar la
 * BD: preview() guarda el archivo aparte y devuelve un diagnóstico fila por
 * fila sin persistir nada; commit() vuelve a leer ESE MISMO archivo (no los
 * datos ya parseados, para no confiar en un JSON grande yendo y viniendo al
 * navegador) y aplica todo en una sola transacción.
 */
class InventoryImportService
{
    private const REQUIRED_HEADERS = ['codigo', 'cantidad'];

    /**
     * Tope de filas por archivo — cada fila válida abre su propia
     * transacción de escritura (producto + movimiento + posible ajuste de
     * Pedido); un archivo de miles de filas puede agotar el tiempo de
     * ejecución o la memoria. 50 cubre sobradamente una carga manual real;
     * catálogos más grandes deben partirse en varios archivos.
     */
    public const MAX_ROWS = 50;

    private const MOVEMENT_TYPES = [
        'Entrada', 'Salida', 'Devolucion Cliente', 'Devolucion Proveedor',
        'Consignacion Entrada', 'Consignacion Salida', 'Cambio Entrada',
        'Cambio Salida', 'Ajuste Inventario',
    ];

    /**
     * Normaliza para comparar nombres de categoría/proveedor tal como los
     * escribe quien arma el Excel — minúsculas y sin tildes, igual que la
     * búsqueda insensible a tildes del resto de la app (whereLikeUnaccent).
     */
    private function normalizeForMatch(string $value): string
    {
        $value = mb_strtolower(trim($value));

        return strtr($value, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n']);
    }

    public function storeUpload(UploadedFile $file): string
    {
        $token = (string) str()->uuid();
        $file->storeAs('imports', "{$token}.{$file->getClientOriginalExtension()}", 'local');

        return $token;
    }

    public function preview(string $filePath, string $mode = 'movements'): array
    {
        $rows = $this->parseRows($filePath);

        $categoriesByName = Category::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [$this->normalizeForMatch($name) => $id]);
        $suppliersByName = Supplier::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [$this->normalizeForMatch($name) => $id]);
        $productsByCode = Product::pluck('id', 'code')->mapWithKeys(fn ($id, $code) => [mb_strtolower($code) => $id]);

        $results = [];
        foreach ($rows as $index => $row) {
            $results[] = $this->validateRow($row, $index + 2, $categoriesByName, $suppliersByName, $productsByCode, $mode);
        }

        return [
            'rows' => $results,
            'summary' => [
                'total' => count($results),
                'create_product' => count(array_filter($results, fn ($r) => $r['action'] === 'create_product' && empty($r['errors']))),
                'update_stock' => count(array_filter($results, fn ($r) => $r['action'] === 'update_stock' && empty($r['errors']))),
                'errors' => count(array_filter($results, fn ($r) => ! empty($r['errors']))),
            ],
        ];
    }

    public function commit(string $filePath, ?int $purchaseOrderId = null, string $mode = 'movements'): array
    {
        $rows = $this->parseRows($filePath);

        $categoriesByName = Category::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [$this->normalizeForMatch($name) => $id]);
        $suppliersByName = Supplier::pluck('id', 'name')->mapWithKeys(fn ($id, $name) => [$this->normalizeForMatch($name) => $id]);
        $productsByCode = Product::pluck('id', 'code')->mapWithKeys(fn ($id, $code) => [mb_strtolower($code) => $id]);

        $created = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($rows, $categoriesByName, $suppliersByName, $productsByCode, $purchaseOrderId, $mode, &$created, &$updated, &$skipped) {
            foreach ($rows as $index => $row) {
                $validated = $this->validateRow($row, $index + 2, $categoriesByName, $suppliersByName, $productsByCode, $mode);
                if (! empty($validated['errors'])) {
                    $skipped++;

                    continue;
                }

                if ($validated['action'] === 'create_product') {
                    $product = Product::create([
                        'code' => $row['codigo'],
                        'category_id' => $categoriesByName[$this->normalizeForMatch($row['categoria'])],
                        'name' => $row['nombre'],
                        'description' => null,
                        'price_without_tax' => (int) $row['precio_sin_iva'],
                        'price_with_tax' => (int) ($row['precio_con_iva'] ?? $row['precio_sin_iva']),
                        'iva_value' => (int) ($row['iva_valor'] ?? 0),
                        'sale_price' => (int) ($row['precio_venta'] ?? $row['precio_sin_iva']),
                        'supplier_id' => $row['proveedor'] ? ($suppliersByName[$this->normalizeForMatch($row['proveedor'])] ?? null) : null,
                        'stock' => (int) $row['cantidad'],
                        'low_stock_threshold' => is_numeric($row['umbral_alerta'] ?? null) ? (int) $row['umbral_alerta'] : null,
                    ]);
                    $productsByCode[mb_strtolower($product->code)] = $product->id;
                    $created++;
                } else {
                    $product = Product::find($productsByCode[mb_strtolower($row['codigo'])]);
                    $updated++;
                }

                // Un producto recién creado solo puede "nacer" con una
                // Entrada — no tiene sentido (ni stock previo que restar)
                // introducirlo vía un movimiento de salida.
                $type = $validated['action'] === 'create_product' ? 'Entrada' : ($row['tipo_movimiento'] ?: 'Entrada');
                $quantity = (int) $row['cantidad'];

                if (in_array($type, ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
                    $product->increment('stock', $validated['action'] === 'create_product' ? 0 : $quantity);
                    Category::where('id', $product->category_id)->where('is_active', false)->update(['is_active' => true]);
                } elseif (in_array($type, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
                    $product->decrement('stock', $quantity);
                }

                $movement = InventoryMovement::create([
                    'product_id' => $product->id,
                    'supplier_id' => $row['proveedor'] ? ($suppliersByName[$this->normalizeForMatch($row['proveedor'])] ?? null) : $product->supplier_id,
                    'purchase_order_id' => $purchaseOrderId,
                    'type' => $type,
                    'quantity' => $quantity,
                    'date' => $row['fecha'] ?: today()->toDateString(),
                    'notes' => $row['notas'] ?: 'Carga masiva',
                ]);

                if ($validated['action'] === 'create_product') {
                    $product->update(['initial_movement_id' => $movement->id]);
                }

                if ($purchaseOrderId) {
                    $item = PurchaseOrderItem::where('purchase_order_id', $purchaseOrderId)
                        ->where('product_id', $product->id)
                        ->first();
                    if ($item) {
                        $item->increment('quantity_received', min($quantity, $item->quantity_requested - $item->quantity_received));
                    }
                }
            }

            if ($purchaseOrderId) {
                $order = PurchaseOrder::with('items')->find($purchaseOrderId);
                if ($order && $order->isFullyReceived() && $order->status !== 'Recibido') {
                    $order->update(['status' => 'Recibido', 'received_at' => now(), 'received_by' => auth()->id()]);
                }
            }
        });

        Storage::disk('local')->delete($filePath);

        return ['created' => $created, 'updated' => $updated, 'skipped' => $skipped];
    }

    private function parseRows(string $filePath): array
    {
        $fullPath = Storage::disk('local')->path($filePath);
        $spreadsheet = IOFactory::load($fullPath);
        $sheet = $spreadsheet->getActiveSheet();
        $data = $sheet->toArray(null, true, true, false);

        if (empty($data)) {
            return [];
        }

        $headers = array_map(fn ($h) => mb_strtolower(trim((string) $h)), array_shift($data));
        $rows = [];

        foreach ($data as $line) {
            if (implode('', array_map('strval', $line)) === '') {
                continue; // fila vacía al final del archivo
            }

            $row = array_combine($headers, array_pad($line, count($headers), null));
            $rows[] = [
                'codigo' => trim((string) ($row['codigo'] ?? '')),
                'nombre' => trim((string) ($row['nombre'] ?? '')),
                'categoria' => trim((string) ($row['categoria'] ?? '')),
                'proveedor' => trim((string) ($row['proveedor'] ?? '')),
                'precio_sin_iva' => $row['precio_sin_iva'] ?? null,
                'precio_con_iva' => $row['precio_con_iva'] ?? null,
                'iva_porcentaje' => $row['iva_porcentaje'] ?? null,
                'iva_valor' => is_numeric($row['precio_sin_iva'] ?? null) && is_numeric($row['iva_porcentaje'] ?? null)
                    ? round(((float) $row['precio_sin_iva']) * ((float) $row['iva_porcentaje']) / 100)
                    : null,
                'precio_venta' => $row['precio_venta'] ?? null,
                'umbral_alerta' => $row['umbral_alerta'] ?? null,
                'cantidad' => $row['cantidad'] ?? null,
                'tipo_movimiento' => trim((string) ($row['tipo_movimiento'] ?? '')) ?: 'Entrada',
                'fecha' => trim((string) ($row['fecha'] ?? '')),
                'notas' => trim((string) ($row['notas'] ?? '')),
            ];
        }

        if (count($rows) > self::MAX_ROWS) {
            throw new \RuntimeException(
                'El archivo tiene '.count($rows).' filas — el máximo por carga es '.self::MAX_ROWS.
                '. Divídelo en archivos más pequeños.'
            );
        }

        return $rows;
    }

    private function validateRow(array $row, int $lineNumber, $categoriesByName, $suppliersByName, $productsByCode, string $mode = 'movements'): array
    {
        $errors = [];
        $code = mb_strtolower($row['codigo']);
        $productExists = $code !== '' && $productsByCode->has($code);
        $isProductsMode = $mode === 'products';

        if ($row['codigo'] === '') {
            $errors[] = 'Falta el código del producto.';
        }

        if (! is_numeric($row['cantidad']) || (int) $row['cantidad'] <= 0) {
            $errors[] = 'La cantidad debe ser un número mayor a 0.';
        }

        // La carga masiva de Productos solo crea productos nuevos — no
        // admite "tipo_movimiento" (siempre es Entrada) ni reutilizar un
        // código existente, eso es tarea de Movimientos de Inventario.
        if (! $isProductsMode && $row['tipo_movimiento'] && ! in_array($row['tipo_movimiento'], self::MOVEMENT_TYPES)) {
            $errors[] = "Tipo de movimiento \"{$row['tipo_movimiento']}\" no reconocido.";
        }

        if ($isProductsMode && $productExists) {
            $errors[] = 'Este código ya existe — la carga masiva de Productos solo crea productos nuevos. '.
                'Para registrar una entrada sobre un producto existente, usa Movimientos de Inventario.';
        }

        $action = $productExists ? 'update_stock' : 'create_product';

        if (! $productExists) {
            if ($row['nombre'] === '') {
                $errors[] = 'Producto nuevo: falta el nombre.';
            }
            if ($row['categoria'] === '') {
                $errors[] = 'Producto nuevo: falta la categoría.';
            } elseif (! $categoriesByName->has($this->normalizeForMatch($row['categoria']))) {
                $errors[] = "La categoría \"{$row['categoria']}\" no existe — créala primero.";
            }
            if (! is_numeric($row['precio_sin_iva'])) {
                $errors[] = 'Producto nuevo: falta el precio sin IVA.';
            }
        }

        if ($isProductsMode && $row['proveedor'] === '') {
            $errors[] = 'Falta el proveedor — todo producto necesita uno.';
        } elseif ($row['proveedor'] !== '' && ! $suppliersByName->has($this->normalizeForMatch($row['proveedor']))) {
            $errors[] = "El proveedor \"{$row['proveedor']}\" no existe.";
        }

        return [
            'line' => $lineNumber,
            'codigo' => $row['codigo'],
            'nombre' => $productExists ? null : $row['nombre'],
            'cantidad' => $row['cantidad'],
            'tipo_movimiento' => $row['tipo_movimiento'],
            'action' => $action,
            'errors' => $errors,
            'detail' => $this->buildDetail($row, $action),
        ];
    }

    /**
     * Resumen legible de qué va a pasar con la fila — sin esto, "Detalle"
     * quedaba vacío salvo que hubiera un error, y no se entendía para qué
     * servía la columna.
     */
    private function buildDetail(array $row, string $action): string
    {
        if ($action === 'create_product') {
            $parts = ["Crea \"{$row['nombre']}\" en \"{$row['categoria']}\""];
            if ($row['proveedor'] !== '') {
                $parts[] = "proveedor \"{$row['proveedor']}\"";
            }

            return implode(', ', $parts).'.';
        }

        $type = $row['tipo_movimiento'] ?: 'Entrada';
        $detail = "Registra un movimiento \"{$type}\" de {$row['cantidad']} unidades sobre el producto existente.";
        if ($row['notas'] !== '') {
            $detail .= " Notas: {$row['notas']}";
        }

        return $detail;
    }

    public function requiredHeaders(): array
    {
        return self::REQUIRED_HEADERS;
    }
}
