<?php
namespace App\Http\Controllers;

use App\Http\Requests\InventoryMovementRequest;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
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
        $movementsQuery = InventoryMovement::with(['product.category'])
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

        // Pagination
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allMovements = $movementsQuery->get()->map(function ($movement) {
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
                    'category'   => $movement->product->category->name,
                ];
            });

            $movementsQuery = [
                'data'     => $allMovements,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
            ];
        } else {
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
                    'category'   => $movement->product->category->name,
                ];
            });
        }

        return Inertia::render('inventoryMovements/index', [
            'movements'     => $movementsQuery,
            'products'      => Product::with('category')
                ->select('id', 'code', 'name')
                ->orderBy('name')
                ->get(),
            'filters'       => $request->only([
                'search', 'per_page', 'product_id', 'type', 'date_from', 'date_to',
            ]),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function create()
    {
        return Inertia::render('inventoryMovements/index', [
            'products' => Product::with('category')
                ->select('id', 'code', 'name', 'stock')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(InventoryMovementRequest $request)
    {
        $validated = $request->validated();

        // Convertir string a enum value
        $validated['type'] = $validated['type'] === 'Entrada' ? 'Entrada' : 'Salida';

        $product = Product::findOrFail($validated['product_id']);

        if ($validated['type'] === 'Salida' && $product->stock < $validated['quantity']) {
            return back()->with('error',
                'No hay suficiente stock. Stock actual: ' . $product->stock
            )->withInput();
        }

        // Update stock
        if ($validated['type'] === 'Entrada') {
            $product->increment('stock', $validated['quantity']);
        } else {
            $product->decrement('stock', $validated['quantity']);
        }

        $movement = InventoryMovement::create($validated);

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario registrado correctamente.');
    }

    public function show(InventoryMovement $inventoryMovement)
    {
        $inventoryMovement->load(['product.category']);

        return Inertia::render('inventoryMovements/show', [
            'movement' => [
                'id'         => $inventoryMovement->id,
                'type'       => $inventoryMovement->type,
                'quantity'   => $inventoryMovement->quantity,
                'date'       => $inventoryMovement->date->format('Y-m-d'),
                'notes'      => $inventoryMovement->notes,
                'created_at' => $inventoryMovement->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $inventoryMovement->updated_at->format('Y-m-d H:i:s'),
                'product'    => [
                    'id'         => $inventoryMovement->product->id,
                    'code'       => $inventoryMovement->product->code,
                    'name'       => $inventoryMovement->product->name,
                    'stock'      => $inventoryMovement->product->stock,
                    'unit_price' => $inventoryMovement->product->unit_price,
                    'category'   => $inventoryMovement->product->category->name,
                ],
            ],
        ]);
    }

    public function edit(InventoryMovement $inventoryMovement)
    {
        $inventoryMovement->load(['product.category']);

        return Inertia::render('inventoryMovements/index', [
            'movement' => [
                'id'         => $inventoryMovement->id,
                'product_id' => $inventoryMovement->product_id,
                'type'       => $inventoryMovement->type,
                'quantity'   => $inventoryMovement->quantity,
                'date'       => $inventoryMovement->date->format('Y-m-d'),
                'notes'      => $inventoryMovement->notes,
            ],
            'products' => Product::with('category')
                ->select('id', 'code', 'name', 'stock')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function update(InventoryMovementRequest $request, InventoryMovement $inventoryMovement)
    {
        $validated         = $request->validated();
        $validated['type'] = $validated['type'] === 'Entrada' ? 'Entrada' : 'Salida';

        $newProduct = Product::findOrFail($validated['product_id']);

        // Validar stock para salidas
        if ($validated['type'] === 'Salida' && $newProduct->stock < $validated['quantity']) {
            return back()->with('error',
                'No hay suficiente stock en el producto seleccionado. Stock actual: ' . $newProduct->stock
            )->withInput();
        }

        // Revertir el efecto del movimiento original
        $oldProduct = $inventoryMovement->product;
        if ($inventoryMovement->type === 'Entrada') {
            $oldProduct->decrement('stock', $inventoryMovement->quantity);
        } else {
            $oldProduct->increment('stock', $inventoryMovement->quantity);
        }

        // Aplicar el nuevo efecto
        if ($validated['type'] === 'Entrada') {
            $newProduct->increment('stock', $validated['quantity']);
        } else {
            $newProduct->decrement('stock', $validated['quantity']);
        }

        $inventoryMovement->update($validated);

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario actualizado correctamente.');
    }

    // public function destroy(InventoryMovement $inventoryMovement)
    // {
    //     if ($inventoryMovement->date->isPast()) {
    //         return response()->json([
    //             'errors' => [
    //                 'delete' => ['No se pueden eliminar movimientos de fechas anteriores.'],
    //             ],
    //         ], 422);
    //     }

    //     // Revert stock change
    //     if ($inventoryMovement->type === 'Entrada') {
    //         $inventoryMovement->product->decrement('stock', $inventoryMovement->quantity);
    //     } else {
    //         $inventoryMovement->product->increment('stock', $inventoryMovement->quantity);
    //     }

    //     $inventoryMovement->delete();

    //     return response()->noContent();
    // }
    public function cancel(nventoryMovement $inventoryMovement)
    {
        if ($inventoryMovement->date->isFuture()) {
            return back()->withErrors([
                'cancel' => ['No se pueden anular movimientos de fechas futuras.'],
            ])->onlyInput();
        }

        if ($inventoryMovement->cancelled_at) {
            return back()->withErrors([
                'cancel' => ['El movimiento ya está anulado.'],
            ])->onlyInput();
        }

        // Revertir el efecto del movimiento
        if ($inventoryMovement->type === 'Entrada') {
            $inventoryMovement->product->decrement('stock', $inventoryMovement->quantity);
        } else {
            $inventoryMovement->product->increment('stock', $inventoryMovement->quantity);
        }

        $inventoryMovement->update(['cancelled_at' => now()]);

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento anulado correctamente.');
    }

    public function stockReport(Request $request)
    {
        $query = Product::with('category')
            ->select('products.*', 'categories.name as category_name')
            ->join('categories', 'products.category_id', '=', 'categories.id');

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('low_stock_only')) {
            $query->where('stock', '<=', 5);
        }

        if ($request->filled('out_of_stock_only')) {
            $query->where('stock', 0);
        }

        $products = $query->orderBy('stock', 'asc')->get();

        $totalProducts = $products->count();
        $totalStock    = $products->sum('stock');
        $totalValue    = $products->sum(function ($product) {
            return $product->stock * ($product->unit_price ?? 0);
        });

        $lowStockProducts   = $products->where('stock', '<=', 5)->count();
        $outOfStockProducts = $products->where('stock', 0)->count();

        return Inertia::render('inventoryMovements/stock-report', [
            'products'   => $products->map(function ($product) {
                return [
                    'id'            => $product->id,
                    'code'          => $product->code,
                    'name'          => $product->name,
                    'category_name' => $product->category_name,
                    'stock'         => $product->stock,
                    'unit_price'    => $product->unit_price,
                    'total_value'   => $product->stock * ($product->unit_price ?? 0),
                    'stock_status'  => $product->stock <= 5 ? 'low' : ($product->stock == 0 ? 'out' : 'ok'),
                ];
            }),
            'summary'    => [
                'total_products'        => $totalProducts,
                'total_stock'           => $totalStock,
                'total_value'           => number_format($totalValue, 2),
                'low_stock_products'    => $lowStockProducts,
                'out_of_stock_products' => $outOfStockProducts,
            ],
            'filters'    => $request->only(['category_id', 'low_stock_only', 'out_of_stock_only']),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function movementsReport(Request $request)
    {
        $query = InventoryMovement::with(['product.category'])
            ->selectRaw('
                inventory_movements.*,
                categories.name as category_name,
                products.name as product_name,
                products.code as product_code
            ')
            ->join('products', 'inventory_movements.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id');

        if ($request->filled('date_from')) {
            $query->whereDate('inventory_movements.date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('inventory_movements.date', '<=', $request->date_to);
        }

        if ($request->filled('type')) {
            $query->where('inventory_movements.type', $request->type);
        }

        if ($request->filled('category_id')) {
            $query->where('categories.id', $request->category_id);
        }

        $movements = $query->orderBy('inventory_movements.date', 'desc')->get();

        $totalEntries   = $movements->where('type', 'Entrada')->sum('quantity');
        $totalExits     = $movements->where('type', 'Salida')->sum('quantity');
        $netMovement    = $totalEntries - $totalExits;
        $totalMovements = $movements->count();

        return Inertia::render('inventoryMovements/movements-report', [
            'movements'  => $movements->map(function ($movement) {
                return [
                    'id'            => $movement->id,
                    'type'          => $movement->type,
                    'quantity'      => $movement->quantity,
                    'date'          => $movement->date->format('Y-m-d'),
                    'notes'         => $movement->notes,
                    'product'       => [
                        'id'   => $movement->product_id,
                        'code' => $movement->product_code,
                        'name' => $movement->product_name,
                    ],
                    'category_name' => $movement->category_name,
                ];
            }),
            'summary'    => [
                'total_movements' => $totalMovements,
                'total_entries'   => $totalEntries,
                'total_exits'     => $totalExits,
                'net_movement'    => $netMovement,
                'period'          => [
                    'from' => $request->date_from ?? 'Inicio',
                    'to'   => $request->date_to ?? 'Actual',
                ],
            ],
            'filters'    => $request->only(['date_from', 'date_to', 'type', 'category_id']),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function export(Request $request)
    {
        // Aplicar los mismos filtros que en index()
        $movementsQuery = InventoryMovement::with(['product.category'])
            ->orderBy('id', 'asc'); // CAMBIO: Ordenar por ID ascendente

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $movementsQuery->where(function ($query) use ($search) {
                $query->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
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
            'F1' => 'Cantidad',
            'G1' => 'Stock Actual',
            'H1' => 'Fecha Movimiento',
            'I1' => 'Notas',
            'J1' => 'Fecha Registro',
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
        $sheet->getStyle('A1:J1')->applyFromArray($headerStyle);

        // Escribir datos
        $row = 2;
        foreach ($movements as $movement) {
            $sheet->setCellValue('A' . $row, $movement->id);
            $sheet->setCellValue('B' . $row, $movement->type);
            $sheet->setCellValue('C' . $row, $movement->product->name);
            $sheet->setCellValue('D' . $row, $movement->product->code);
            $sheet->setCellValue('E' . $row, $movement->product->category->name);
            $sheet->setCellValue('F' . $row, $movement->quantity);
            $sheet->setCellValue('G' . $row, $movement->product->stock);
            $sheet->setCellValue('H' . $row, $movement->date->format('d/m/Y'));
            $sheet->setCellValue('I' . $row, $movement->notes ?? '');
            $sheet->setCellValue('J' . $row, $movement->created_at->format('d/m/Y H:i:s'));
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
            $sheet->getStyle('A1:J' . ($row - 1))->applyFromArray($dataStyle);
        }

        // Centrar columnas numéricas
        $sheet->getStyle('A2:A' . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('F2:G' . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('H2:H' . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        // Autoajustar columnas
        foreach (range('A', 'J') as $col) {
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
