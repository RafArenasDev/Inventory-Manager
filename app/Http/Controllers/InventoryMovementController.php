<?php
namespace App\Http\Controllers;

use App\Http\Requests\InventoryMovementRequest;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class InventoryMovementController extends Controller
{
    public function index(Request $request)
    {
        $movementsQuery = InventoryMovement::with(['product.category', 'supplier'])
            ->latest('date')
            ->orderBy('created_at', 'desc');

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $movementsQuery->where(function ($query) use ($search) {
                $query->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        // Product filter
        if ($request->filled('product_id')) {
            $movementsQuery->where('product_id', $request->product_id);
        }

        // Type filter
        if ($request->filled('type')) {
            $movementsQuery->where('type', $request->type);
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $movementsQuery->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $movementsQuery->whereDate('date', '<=', $request->date_to);
        }

        // Count total and filtered movements
        $totalCount    = InventoryMovement::count();
        $filteredCount = $movementsQuery->count();

        // Pagination (topada a 100 para evitar cargas desmedidas)
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $movementsQuery = $movementsQuery->paginate($perPage)->withQueryString();
        $movementsQuery->getCollection()->transform(function ($movement) {
            return [
                'id'         => $movement->id,
                'type'       => $movement->type,
                'quantity'   => $movement->quantity,
                'date'       => $movement->date->format('Y-m-d'),
                'notes'      => $movement->notes,
                'created_at' => $movement->created_at->format('Y-m-d H:i:s'),
                'product'    => [
                    'id'    => $movement->product->id,
                    'code'  => $movement->product->code,
                    'name'  => $movement->product->name,
                    'stock' => $movement->product->stock,
                ],
                'supplier'   => $movement->supplier ? [
                    'id'   => $movement->supplier->id,
                    'name' => $movement->supplier->name,
                ] : null,
                'category'   => $movement->product->category->name,
            ];
        });

        return Inertia::render('inventoryMovements/index', [
            'movements'     => $movementsQuery,
            'products'      => Product::with(['category', 'supplier'])
                ->select('id', 'code', 'name', 'supplier_id')
                ->orderBy('name')
                ->get(),
            'suppliers'     => Supplier::select('id', 'name')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
            'filters'       => $request->only([
                'search', 'per_page', 'product_id', 'type', 'date_from', 'date_to',
            ]),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function store(InventoryMovementRequest $request)
    {
        $validated = $request->validated();

        $product = Product::findOrFail($validated['product_id']);

        // Validar stock para movimientos de salida
        if (in_array($validated['type'], ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida']) && $product->stock < $validated['quantity']) {
            return back()->with('error',
                'No hay suficiente stock. Stock actual: ' . $product->stock
            )->withInput();
        }

        // Update stock based on movement type
        if (in_array($validated['type'], ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            $product->increment('stock', $validated['quantity']);
        } elseif (in_array($validated['type'], ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            $product->decrement('stock', $validated['quantity']);
        } elseif ($validated['type'] === 'Ajuste Inventario') {
            if ($validated['quantity'] >= 0) {
                $product->increment('stock', $validated['quantity']);
            } else {
                $product->decrement('stock', abs($validated['quantity']));
            }
        }

        $movement = InventoryMovement::create($validated);

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario registrado correctamente.');
    }

    public function update(InventoryMovementRequest $request, InventoryMovement $inventoryMovement)
    {
        $validated = $request->validated();

        $product = $inventoryMovement->product;

        // Revertir el efecto del movimiento anterior en el stock
        if (in_array($inventoryMovement->type, ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            $product->decrement('stock', $inventoryMovement->quantity);
        } elseif (in_array($inventoryMovement->type, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            $product->increment('stock', $inventoryMovement->quantity);
        } elseif ($inventoryMovement->type === 'Ajuste Inventario') {
            if ($inventoryMovement->quantity >= 0) {
                $product->decrement('stock', $inventoryMovement->quantity);
            } else {
                $product->increment('stock', abs($inventoryMovement->quantity));
            }
        }

        // Validar stock para el nuevo movimiento si es de salida
        if (in_array($validated['type'], ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida']) && $product->stock < $validated['quantity']) {
            return back()->with('error',
                'No hay suficiente stock después de revertir el movimiento anterior. Stock actual: ' . $product->stock
            )->withInput();
        }

        // Aplicar el nuevo efecto en el stock
        if (in_array($validated['type'], ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            $product->increment('stock', $validated['quantity']);
        } elseif (in_array($validated['type'], ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            $product->decrement('stock', $validated['quantity']);
        } elseif ($validated['type'] === 'Ajuste Inventario') {
            if ($validated['quantity'] >= 0) {
                $product->increment('stock', $validated['quantity']);
            } else {
                $product->decrement('stock', abs($validated['quantity']));
            }
        }

        $inventoryMovement->update($validated);

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario actualizado correctamente.');
    }

    public function destroy(InventoryMovement $inventoryMovement)
    {
        $product = $inventoryMovement->product;

        // Revertir el efecto en el stock
        if (in_array($inventoryMovement->type, ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            $product->decrement('stock', $inventoryMovement->quantity);
        } elseif (in_array($inventoryMovement->type, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            $product->increment('stock', $inventoryMovement->quantity);
        } elseif ($inventoryMovement->type === 'Ajuste Inventario') {
            if ($inventoryMovement->quantity >= 0) {
                $product->decrement('stock', $inventoryMovement->quantity);
            } else {
                $product->increment('stock', abs($inventoryMovement->quantity));
            }
        }

        $inventoryMovement->delete();

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario eliminado correctamente.');
    }

    public function export(Request $request)
    {
        // Aplicar los mismos filtros que en index()
        $movementsQuery = InventoryMovement::with(['product.category', 'supplier'])
            ->orderBy('id', 'asc');

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $movementsQuery->where(function ($query) use ($search) {
                $query->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('supplier', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('product_id')) {
            $movementsQuery->where('product_id', $request->product_id);
        }

        if ($request->filled('type')) {
            $movementsQuery->where('type', $request->type);
        }

        if ($request->filled('date_from')) {
            $movementsQuery->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $movementsQuery->whereDate('date', '<=', $request->date_to);
        }

        $movements = $movementsQuery->get();

        // Crear spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Movimientos de Inventario');

        // Encabezados
        $headers = [
            'A1' => 'ID',
            'B1' => 'Tipo',
            'C1' => 'Producto',
            'D1' => 'Código Producto',
            'E1' => 'Categoría',
            'F1' => 'Proveedor',
            'G1' => 'Cantidad',
            'H1' => 'Stock Actual',
            'I1' => 'Fecha Movimiento',
            'J1' => 'Notas',
            'K1' => 'Fecha Registro',
        ];

        // Escribir encabezados
        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Estilo para encabezados
        $headerStyle = [
            'font'      => [
                'bold'  => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill'      => [
                'fillType'   => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'], // Azul
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER,
            ],
            'borders'   => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color'       => ['rgb' => '000000'],
                ],
            ],
        ];

        // Aplicar estilo a encabezados
        $sheet->getStyle('A1:K1')->applyFromArray($headerStyle);

        // Escribir datos
        $row = 2;
        foreach ($movements as $movement) {
            $sheet->setCellValue('A' . $row, $movement->id);
            $sheet->setCellValue('B' . $row, $movement->type);
            $sheet->setCellValue('C' . $row, $movement->product->name);
            $sheet->setCellValue('D' . $row, $movement->product->code);
            $sheet->setCellValue('E' . $row, $movement->product->category->name);
            $sheet->setCellValue('F' . $row, $movement->supplier->name ?? '');
            $sheet->setCellValue('G' . $row, $movement->quantity);
            $sheet->setCellValue('H' . $row, $movement->product->stock);
            $sheet->setCellValue('I' . $row, $movement->date->format('d/m/Y'));
            $sheet->setCellValue('J' . $row, $movement->notes ?? '');
            $sheet->setCellValue('K' . $row, $movement->created_at->format('d/m/Y H:i:s'));
            $row++;
        }

        // Estilo para datos
        $dataStyle = [
            'borders'   => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color'       => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];

        // Aplicar bordes a todos los datos
        if ($row > 2) {
            $sheet->getStyle('A1:K' . ($row - 1))->applyFromArray($dataStyle);
        }

        // Centrar columnas numéricas
        $sheet->getStyle('A2:A' . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('G2:H' . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('I2:I' . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Autoajustar columnas
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Establecer altura de fila para encabezados
        $sheet->getRowDimension(1)->setRowHeight(25);

        // Crear writer y descargar
        $filename = 'movimientos_inventario_' . now()->format('Y-m-d_H-i-s') . '.xlsx';

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
