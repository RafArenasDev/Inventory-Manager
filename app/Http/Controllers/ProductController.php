<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ProductController extends Controller
{
    private $movementTypeMap = [
        'Entry' => 'Entrada',
        'Exit' => 'Salida',
        'CustomerReturn' => 'Devolucion Cliente',
        'SupplierReturn' => 'Devolucion Proveedor',
        'ConsignmentEntry' => 'Consignacion Entrada',
        'ConsignmentExit' => 'Consignacion Salida',
        'ExchangeEntry' => 'Cambio Entrada',
        'ExchangeExit' => 'Cambio Salida',
        'InventoryAdjustment' => 'Ajuste Inventario',
    ];

    public function index(Request $request)
    {
        $productsQuery = Product::with(['category', 'supplier'])->latest()->orderBy('id', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $productsQuery->where(function ($query) use ($search) {
                $query->whereLikeUnaccent('name', "%{$search}%")
                    ->orWhereLike('code', "%{$search}%")
                    ->orWhereHas('supplier', function ($query) use ($search) {
                        $query->whereLikeUnaccent('name', "%{$search}%");
                    });
            });
        }

        if ($request->filled('category_id')) {
            $productsQuery->where('category_id', $request->category_id);
        }

        if ($request->filled('stock_filter')) {
            $stockFilter = $request->stock_filter;
            if ($stockFilter === 'low_stock') {
                $productsQuery->where('stock', '<=', 5);
            } elseif ($stockFilter === 'out_of_stock') {
                $productsQuery->where('stock', 0);
            } elseif ($stockFilter === 'in_stock') {
                $productsQuery->where('stock', '>', 0);
            }
        }

        $totalCount = $productsQuery->count();
        $filteredCount = $productsQuery->count();
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();
        $suppliers = Supplier::select('id', 'name')->orderBy('name')->get()->toArray();

        $productsQuery = $productsQuery->paginate($perPage)->withQueryString();
        $productsQuery->getCollection()->transform(function ($product) {
            $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)
                ->where('product_id', $product->id)
                ->first();

            return [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'category' => $product->category?->name,
                'category_id' => $product->category_id,
                'stock' => $product->stock,
                'low_stock_threshold' => $product->low_stock_threshold,
                'price_without_tax' => $product->price_without_tax,
                'price_with_tax' => $product->price_with_tax,
                'iva_value' => $product->iva_value,
                'sale_price' => $product->sale_price,
                'supplier' => $product->supplier?->name,
                'supplier_id' => $product->supplier_id,
                'description' => Str::limit($product->description ?? '', 50),
                'image_path' => $product->image_path ? Storage::url($product->image_path) : null,
                'movement_date' => $initialMovement?->date,
                'movement_notes' => $initialMovement?->notes,
                'initial_movement_id' => $initialMovement?->id,
            ];
        });

        return Inertia::render('products/index', [
            'products' => $productsQuery,
            'categories' => $categories,
            'suppliers' => $suppliers,
            'filters' => $request->only(['search', 'per_page', 'category_id', 'stock_filter']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function export(Request $request)
    {
        $productsQuery = Product::with(['category', 'supplier'])->orderBy('id', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $productsQuery->where(function ($query) use ($search) {
                $query->whereLikeUnaccent('name', "%{$search}%")
                    ->orWhereLike('code', "%{$search}%")
                    ->orWhereHas('supplier', function ($query) use ($search) {
                        $query->whereLikeUnaccent('name', "%{$search}%");
                    });
            });
        }

        if ($request->filled('category_id')) {
            $productsQuery->where('category_id', $request->category_id);
        }

        if ($request->filled('stock_filter')) {
            $stockFilter = $request->stock_filter;
            if ($stockFilter === 'low_stock') {
                $productsQuery->where('stock', '<=', 5);
            } elseif ($stockFilter === 'out_of_stock') {
                $productsQuery->where('stock', 0);
            } elseif ($stockFilter === 'in_stock') {
                $productsQuery->where('stock', '>', 0);
            }
        }

        $products = $productsQuery->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Productos');

        $headers = [
            'A1' => 'ID',
            'B1' => 'Código',
            'C1' => 'Nombre',
            'D1' => 'Categoría',
            'E1' => 'Proveedor',
            'F1' => 'Descripción',
            'G1' => 'Precio sin IVA',
            'H1' => 'IVA',
            'I1' => 'Precio con IVA',
            'J1' => 'Precio de Venta',
            'K1' => 'Stock',
            'L1' => 'Fecha Registro',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];

        $sheet->getStyle('A1:L1')->applyFromArray($headerStyle);

        $row = 2;
        foreach ($products as $product) {
            $sheet->setCellValue('A'.$row, $product->id);
            $sheet->setCellValue('B'.$row, $product->code);
            $sheet->setCellValue('C'.$row, $product->name);
            $sheet->setCellValue('D'.$row, $product->category?->name ?? '');
            $sheet->setCellValue('E'.$row, $product->supplier?->name ?? '');
            $sheet->setCellValue('F'.$row, $product->description ?? '');
            $sheet->setCellValue('G'.$row, $product->price_without_tax / 100);
            $sheet->setCellValue('H'.$row, $product->iva_value / 100);
            $sheet->setCellValue('I'.$row, $product->price_with_tax / 100);
            $sheet->setCellValue('J'.$row, $product->sale_price / 100);
            $sheet->setCellValue('K'.$row, $product->stock);
            $sheet->setCellValue('L'.$row, $product->created_at->format('d/m/Y'));
            $row++;
        }

        $dataStyle = [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        if ($row > 2) {
            $sheet->getStyle('A1:L'.($row - 1))->applyFromArray($dataStyle);
            $sheet->getStyle('G2:J'.($row - 1))->getNumberFormat()->setFormatCode('_-"$"* #,##0_-;-"$"* #,##0_-;_-"$"* "-"_-;_-@_-');
        }

        $sheet->getStyle('A2:A'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('K2:K'.($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        foreach (range('A', 'L') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(25);

        $filename = 'Productos_'.now()->format('Y-m-d').'.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function create()
    {
        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();
        $suppliers = Supplier::select('id', 'name')->orderBy('name')->get()->toArray();

        return Inertia::render('products/index', [
            'categories' => $categories,
            'suppliers' => $suppliers,
            'filters' => [],
            'totalCount' => 0,
            'filteredCount' => 0,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:products,code',
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'price_without_tax' => 'required|integer|min:1',
            'price_with_tax' => 'required|integer|min:1',
            'iva_value' => 'nullable|integer|min:0',
            'sale_price' => 'required|integer|min:1',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'stock' => 'required|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:1',
            'movement_notes' => 'nullable|string|max:500',
        ], [
            'code.required' => 'El código del producto es obligatorio.',
            'code.unique' => 'Ya existe un producto con este código.',
            'category_id.required' => 'Debe seleccionar una categoría.',
            'category_id.exists' => 'La categoría seleccionada no es válida.',
            'name.required' => 'El nombre del producto es obligatorio.',
            'image.image' => 'El archivo debe ser una imagen.',
            'image.mimes' => 'La imagen debe ser un archivo JPEG, PNG, JPG o GIF.',
            'image.max' => 'La imagen no puede ser mayor a 2MB.',
            'price_without_tax.required' => 'El precio sin IVA es obligatorio.',
            'price_without_tax.integer' => 'El precio sin IVA debe ser un número entero.',
            'price_with_tax.required' => 'El precio con IVA es obligatorio.',
            'price_with_tax.integer' => 'El precio con IVA debe ser un número entero.',
            'sale_price.required' => 'El precio de venta es obligatorio.',
            'sale_price.integer' => 'El precio de venta debe ser un número entero.',
            'stock.required' => 'El stock es obligatorio.',
            'stock.min' => 'El stock no puede ser negativo.',
            'supplier_id.required' => 'Debe seleccionar un proveedor.',
            'supplier_id.exists' => 'El proveedor seleccionado no es válido.',
        ]);

        // La imagen SOLO puede venir de un archivo subido — nunca de un path
        // de string enviado por el cliente (evita que alguien manipule el
        // request para apuntar `image_path` a un archivo arbitrario del disco
        // público, o a una URL externa que nunca se validó como imagen real).
        $imagePath = $request->hasFile('image')
            ? $request->file('image')->store('products', 'public')
            : null;

        try {
            $product = Product::create([
                'code' => $validated['code'],
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'image_path' => $imagePath,
                'price_without_tax' => $validated['price_without_tax'],
                'price_with_tax' => $validated['price_with_tax'],
                'iva_value' => $validated['iva_value'] ?? 0,
                'sale_price' => $validated['sale_price'],
                'supplier_id' => $validated['supplier_id'] ?: null,
                'stock' => $validated['stock'],
                'low_stock_threshold' => $validated['low_stock_threshold'] ?? null,
                'initial_movement_id' => null,
            ]);
        } catch (QueryException $e) {
            // La regla `unique:products,code` ya valida esto, pero deja una
            // ventana real: dos usuarios pueden pasar la validación casi al
            // mismo tiempo y el segundo INSERT choca contra el `unique` de
            // la base de datos — sin este catch, eso se veía como un error
            // 500 crudo en vez de un aviso claro.
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            if ($this->isUniqueViolation($e)) {
                return back()->with('error', 'Ya existe un producto registrado con ese código.')->withInput();
            }
            throw $e;
        }

        $this->reactivateCategoryIfNeeded($validated['category_id']);

        $supplier = Supplier::find($validated['supplier_id']);
        $supplierName = $supplier?->name ?? 'proveedor no especificado';

        // Todo producto nace con una Entrada — incluso con stock inicial 0 —
        // para que Productos y Movimientos siempre estén en sincronía (un
        // producto sin ningún movimiento era un hueco en el historial). El
        // tipo nunca lo decide el cliente (evita que un POST manipulado a
        // mano registre el movimiento inicial como "Salida" o cualquier otro
        // tipo).
        $movement = InventoryMovement::create([
            'product_id' => $product->id,
            'type' => 'Entrada',
            'quantity' => $validated['stock'],
            'date' => now()->format('Y-m-d'),
            'notes' => $validated['movement_notes'] ?: "Primer pedido del proveedor {$supplierName}",
            'supplier_id' => $validated['supplier_id'],
        ]);

        $product->update(['initial_movement_id' => $movement->id]);

        return redirect()->route('products.index')
            ->with('success', 'Producto creado correctamente.');

    }

    public function edit(Product $product)
    {
        $product->load(['category', 'supplier']);
        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();
        $suppliers = Supplier::select('id', 'name')->orderBy('name')->get()->toArray();
        $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)
            ->where('product_id', $product->id)
            ->first();

        $movementType = $initialMovement ? array_search($initialMovement->type, $this->movementTypeMap) ?: '' : '';

        return Inertia::render('products/index', [
            'product' => [
                'id' => $product->id,
                'code' => $product->code,
                'category_id' => $product->category_id,
                'name' => $product->name,
                'description' => $product->description,
                'image_path' => $product->image_path ? Storage::url($product->image_path) : null,
                'price_without_tax' => $product->price_without_tax,
                'price_with_tax' => $product->price_with_tax,
                'iva_value' => $product->iva_value,
                'sale_price' => $product->sale_price,
                'supplier_id' => $product->supplier_id,
                'stock' => $product->stock,
                'low_stock_threshold' => $product->low_stock_threshold,
                'movement_notes' => $initialMovement?->notes,
                'movement_type' => $movementType,
                'initial_movement_id' => $initialMovement?->id,
            ],
            'categories' => $categories,
            'suppliers' => $suppliers,
            'filters' => [],
            'totalCount' => 0,
            'filteredCount' => 0,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $productId = $product->id;
        $validated = $request->validate([
            'code' => "required|string|max:50|unique:products,code,{$productId}",
            'category_id' => 'required|integer|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'remove_image' => 'nullable|boolean',
            'price_without_tax' => 'required|integer|min:1',
            'price_with_tax' => 'required|integer|min:1',
            'iva_value' => 'nullable|integer|min:0',
            'sale_price' => 'required|integer|min:1',
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'stock' => 'nullable|integer|min:0',
            'low_stock_threshold' => 'nullable|integer|min:1',
            'movement_notes' => 'nullable|string|max:500',
        ], [
            'code.required' => 'El código del producto es obligatorio.',
            'code.unique' => 'Ya existe un producto con este código.',
            'category_id.required' => 'Debe seleccionar una categoría.',
            'category_id.exists' => 'La categoría seleccionada no es válida.',
            'name.required' => 'El nombre del producto es obligatorio.',
            'image.image' => 'El archivo debe ser una imagen.',
            'image.mimes' => 'La imagen debe ser un archivo JPEG, PNG, JPG o GIF.',
            'image.max' => 'La imagen no puede ser mayor a 2MB.',
            'price_without_tax.required' => 'El precio sin IVA es obligatorio.',
            'price_without_tax.numeric' => 'El precio sin IVA debe ser un número.',
            'price_with_tax.required' => 'El precio con IVA es obligatorio.',
            'price_with_tax.numeric' => 'El precio con IVA debe ser un número.',
            'sale_price.required' => 'El precio de venta es obligatorio.',
            'sale_price.numeric' => 'El precio de venta debe ser un número.',
            'supplier_id.required' => 'Debe seleccionar un proveedor.',
            'supplier_id.exists' => 'El proveedor seleccionado no es válido.',
        ]);

        // Manejar imagen — igual que en store(), nunca se acepta un path de
        // string enviado por el cliente: o sube un archivo nuevo, o pide
        // borrarla, o se deja tal cual está.
        $imagePath = $product->image_path;

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $imagePath = $request->file('image')->store('products', 'public');
        } elseif ($request->boolean('remove_image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $imagePath = null;
        }

        // Convertir strings a integers
        $priceWithoutTax = (int) $validated['price_without_tax'];
        $priceWithTax = (int) $validated['price_with_tax'];
        $ivaValue = (int) ($validated['iva_value'] ?? 0);
        $salePrice = (int) $validated['sale_price'];
        $stock = isset($validated['stock']) ? (int) $validated['stock'] : $product->stock;
        $originalStock = $product->stock;
        $stockChanged = $stock !== $originalStock;

        try {
            $product->update([
                'code' => $validated['code'],
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'image_path' => $imagePath,
                'price_without_tax' => $priceWithoutTax,
                'price_with_tax' => $priceWithTax,
                'iva_value' => $ivaValue,
                'sale_price' => $salePrice,
                'supplier_id' => $validated['supplier_id'] ?: null,
                'stock' => $stock,
                'low_stock_threshold' => $validated['low_stock_threshold'] ?? null,
            ]);
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return back()->with('error', 'Ya existe otro producto registrado con ese código.')->withInput();
            }
            throw $e;
        }

        $this->reactivateCategoryIfNeeded($validated['category_id']);

        // Obtener el nombre del proveedor
        $supplier = Supplier::find($validated['supplier_id']);
        $supplierName = $supplier?->name ?? 'proveedor no especificado';

        // El historial de movimientos del producto solo se toca si el stock
        // realmente cambió — editar otros campos (precio, nombre, etc.) no
        // genera ni modifica movimientos. El tipo nunca lo elige el usuario:
        // aquí siempre es "Ajuste Inventario" (el frontend ya lo decide así).
        $initialMovementId = $product->initial_movement_id;
        if ($initialMovementId) {
            if ($stockChanged) {
                $movement = InventoryMovement::where('id', $initialMovementId)
                    ->where('product_id', $product->id)
                    ->first();
                if ($movement) {
                    $movement->update([
                        'type' => 'Ajuste Inventario',
                        'quantity' => $stock,
                        'notes' => $validated['movement_notes'] ?? $movement->notes,
                        'supplier_id' => $validated['supplier_id'],
                    ]);
                }
            }
        } elseif ($stockChanged && ($stock > 0 || ! empty($validated['movement_notes']))) {
            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'type' => 'Entrada',
                'quantity' => $stock,
                'date' => now()->format('Y-m-d'),
                'notes' => $validated['movement_notes'] ?: "Primer pedido del proveedor {$supplierName}",
                'supplier_id' => $validated['supplier_id'],
            ]);
            $product->update(['initial_movement_id' => $movement->id]);
        }

        return redirect()->route('products.index')
            ->with('success', 'Producto actualizado correctamente.');

    }

    public function destroy(Product $product)
    {
        // Ventas y pedidos de compra sí bloquean el borrado (integridad real
        // del historial fiscal/de compras — `restrict` a nivel de BD). Los
        // movimientos de inventario NO bloquean: son solo el historial de
        // entradas/salidas del propio producto, y todo producto tiene al
        // menos uno (el de creación), así que exigir "sin movimientos" para
        // borrar hacía imposible eliminar cualquier producto ya creado.
        if ($product->saleItems()->exists()) {
            return redirect()->back()
                ->with('error', 'No se puede eliminar "'.e($product->name).'": tiene ventas registradas. Puedes marcarlo como agotado en su lugar.');
        }

        if ($product->purchaseOrderItems()->exists()) {
            return redirect()->back()
                ->with('error', 'No se puede eliminar "'.e($product->name).'": está incluido en uno o más pedidos de compra.');
        }

        DB::transaction(function () use ($product) {
            // El historial de movimientos NO se borra — queda como rastro de
            // auditoría (con snapshot de código/nombre, ver InventoryMovement)
            // de que el producto existió y qué pasó con su stock, aunque el
            // producto en sí se elimine por completo a continuación.
            InventoryMovement::create([
                'product_id' => $product->id,
                'product_code' => $product->code,
                'product_name' => $product->name,
                'supplier_id' => $product->supplier_id,
                'type' => 'Baja por Eliminacion',
                'quantity' => $product->stock,
                'date' => now()->format('Y-m-d'),
                'notes' => 'Producto eliminado del catálogo — stock dado de baja.',
            ]);

            $product->movements()->update(['product_deleted_at' => now()]);

            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }

            $product->delete();
        });

        return redirect()->route('products.index')
            ->with('success', 'Producto eliminado correctamente.');
    }

    public function movementsCreate(Product $product)
    {
        return Inertia::render('products/movements-create', [
            'product' => [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'stock' => $product->stock,
            ],
        ]);
    }

    public function movementsStore(Request $request, Product $product)
    {
        $validated = $request->validate([
            'type' => 'required|in:Entry,Exit,CustomerReturn,SupplierReturn,ConsignmentEntry,ConsignmentExit,ExchangeEntry,ExchangeExit,InventoryAdjustment',
            'quantity' => 'required|integer|min:1',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:500',
        ]);

        $movementType = $this->movementTypeMap[$validated['type']] ?? $validated['type'];

        if (in_array($movementType, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida']) && $product->stock < $validated['quantity']) {
            return redirect()->back()
                ->with('error', 'No hay suficiente stock. Stock actual: '.$product->stock);
        }

        if (in_array($movementType, ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            $product->increment('stock', $validated['quantity']);
            $this->reactivateCategoryIfNeeded($product->category_id);
        } elseif (in_array($movementType, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            $product->decrement('stock', $validated['quantity']);
        }

        InventoryMovement::create([
            'product_id' => $product->id,
            'type' => $movementType,
            'quantity' => $validated['quantity'],
            'date' => $validated['date'],
            'notes' => $validated['notes'],
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Movimiento de inventario registrado correctamente.');
    }

    /**
     * Si la categoría del producto está inactiva, se reactiva sola: tener
     * productos/entradas de inventario es evidencia de que la categoría
     * sigue en uso. Sin confirmación, es solo un ajuste de estado.
     */
    private function reactivateCategoryIfNeeded(?int $categoryId): void
    {
        if (! $categoryId) {
            return;
        }

        Category::where('id', $categoryId)->where('is_active', false)->update(['is_active' => true]);
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        // 23505 = Postgres, 1062 = MySQL/MariaDB — cubre ambos motores que
        // usa este proyecto entre local y producción.
        return $e->getCode() === '23505' || (int) $e->getCode() === 1062;
    }
}
