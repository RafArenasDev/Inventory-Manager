<?php
namespace App\Http\Controllers;

use App\Http\Requests\InventoryMovementRequest;
use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryMovementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $movementsQuery = InventoryMovement::with(['product.category'])
            ->latest('date')
            ->orderBy('created_at', 'desc');

        // Search filter
        if (request()->filled('search')) {
            $search = request()->search;
            $movementsQuery->where(function ($query) use ($search) {
                $query->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        // Product filter
        if (request()->filled('product_id')) {
            $movementsQuery->where('product_id', request()->product_id);
        }

        // Type filter
        if (request()->filled('type')) {
            $movementsQuery->where('type', request()->type);
        }

        // Date range filter
        if (request()->filled('date_from')) {
            $movementsQuery->whereDate('date', '>=', request()->date_from);
        }

        if (request()->filled('date_to')) {
            $movementsQuery->whereDate('date', '<=', request()->date_to);
        }

        // Count total and filtered movements
        $totalCount    = $movementsQuery->count();
        $filteredCount = $movementsQuery->count();

        // Pagination
        $perPage = (int) (request()->per_page ?? 10);

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

        return Inertia::render('inventory-movements/index', [
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

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('inventory-movements/create', [
            'products' => Product::with('category')
                ->select('id', 'code', 'name', 'stock')
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(InventoryMovementRequest $request)
    {
        $validated = $request->validated();

        $product = Product::findOrFail($validated['product_id']);

        // Validar que no se salga stock negativo
        if ($validated['type'] === 'exit' && $product->stock < $validated['quantity']) {
            return redirect()->back()->with('error',
                'No hay suficiente stock. Stock actual: ' . $product->stock
            );
        }

        $movement = InventoryMovement::create($validated);

        if ($movement) {
            return redirect()->route('inventory-movements.index')
                ->with('success', 'Movimiento de inventario registrado correctamente.');
        }

        return redirect()->back()->with('error', 'Error al registrar el movimiento.');
    }

    /**
     * Display the specified resource.
     */
    public function show(InventoryMovement $inventoryMovement)
    {
        $inventoryMovement->load(['product.category']);

        return Inertia::render('inventory-movements/show', [
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

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(InventoryMovement $inventoryMovement)
    {
        $inventoryMovement->load(['product.category']);

        return Inertia::render('inventory-movements/edit', [
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

    /**
     * Update the specified resource in storage.
     */
    public function update(InventoryMovementRequest $request, InventoryMovement $inventoryMovement)
    {
        $validated = $request->validated();
        $product   = Product::findOrFail($validated['product_id']);

        // Si cambió el producto, validar stock del nuevo producto
        if ($validated['product_id'] !== $inventoryMovement->product_id) {
            if ($validated['type'] === 'exit' && $product->stock < $validated['quantity']) {
                return redirect()->back()->with('error',
                    'No hay suficiente stock en el producto seleccionado. Stock actual: ' . $product->stock
                );
            }
        }

        // Si cambió la cantidad o el tipo, validar stock del producto actual
        if ($validated['quantity'] !== $inventoryMovement->quantity ||
            $validated['type'] !== $inventoryMovement->type) {

            $currentProduct = Product::find($inventoryMovement->product_id);
            if ($validated['type'] === 'exit' && $currentProduct->stock < $validated['quantity']) {
                return redirect()->back()->with('error',
                    'No hay suficiente stock en el producto actual. Stock actual: ' . $currentProduct->stock
                );
            }
        }

        $inventoryMovement->update($validated);

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(InventoryMovement $inventoryMovement)
    {
        // Solo se pueden eliminar movimientos del día actual o del usuario actual
        if ($inventoryMovement->date->isPast()) {
            return redirect()->back()->with('error',
                'No se pueden eliminar movimientos de fechas anteriores.'
            );
        }

        // Revertir el stock antes de eliminar
        $delta = $inventoryMovement->type === 'entry' ? -$inventoryMovement->quantity : $inventoryMovement->quantity;
        $inventoryMovement->product->increment('stock', $delta);

        $inventoryMovement->delete();

        return redirect()->route('inventory-movements.index')
            ->with('success', 'Movimiento de inventario eliminado correctamente.');
    }

    /**
     * Get stock report
     */
    public function stockReport(Request $request)
    {
        $query = Product::with('category')
            ->select('products.*', 'categories.name as category_name')
            ->join('categories', 'products.category_id', '=', 'categories.id');

        // Filters
        if (request()->filled('category_id')) {
            $query->where('category_id', request()->category_id);
        }

        if (request()->filled('low_stock_only')) {
            $query->where('stock', '<=', 5);
        }

        if (request()->filled('out_of_stock_only')) {
            $query->where('stock', 0);
        }

        $products = $query->orderBy('stock', 'asc')->get();

        // Calculate totals
        $totalProducts = $products->count();
        $totalStock    = $products->sum('stock');
        $totalValue    = $products->sum(function ($product) {
            return $product->stock * ($product->unit_price ?? 0);
        });

        $lowStockProducts   = $products->where('stock', '<=', 5)->count();
        $outOfStockProducts = $products->where('stock', 0)->count();

        return Inertia::render('inventory-movements/stock-report', [
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

    /**
     * Get movements report
     */
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

        // Date range filter
        if (request()->filled('date_from')) {
            $query->whereDate('inventory_movements.date', '>=', request()->date_from);
        }

        if (request()->filled('date_to')) {
            $query->whereDate('inventory_movements.date', '<=', request()->date_to);
        }

        // Type filter
        if (request()->filled('type')) {
            $query->where('inventory_movements.type', request()->type);
        }

        // Category filter
        if (request()->filled('category_id')) {
            $query->where('categories.id', request()->category_id);
        }

        $movements = $query->orderBy('inventory_movements.date', 'desc')->get();

        // Calculate totals
        $totalEntries   = $movements->where('type', 'entry')->sum('quantity');
        $totalExits     = $movements->where('type', 'exit')->sum('quantity');
        $netMovement    = $totalEntries - $totalExits;
        $totalMovements = $movements->count();

        return Inertia::render('inventory-movements/movements-report', [
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
                    'from' => request()->date_from ?? 'Inicio',
                    'to'   => request()->date_to ?? 'Actual',
                ],
            ],
            'filters'    => $request->only(['date_from', 'date_to', 'type', 'category_id']),
            'categories' => Category::select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    /**
     * Export movements to CSV
     */
    public function export(Request $request)
    {
        $query = InventoryMovement::with(['product.category'])
            ->latest('date');

        // Apply same filters as index
        if (request()->filled('search')) {
            $search = request()->search;
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                    ->orWhereHas('product', function ($subQ) use ($search) {
                        $subQ->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        if (request()->filled('product_id')) {
            $query->where('product_id', request()->product_id);
        }

        if (request()->filled('type')) {
            $query->where('type', request()->type);
        }

        if (request()->filled('date_from')) {
            $query->whereDate('date', '>=', request()->date_from);
        }

        if (request()->filled('date_to')) {
            $query->whereDate('date', '<=', request()->date_to);
        }

        $movements = $query->get();

        $filename = 'movimientos-inventario-' . now()->format('Y-m-d') . '.csv';
        $headers  = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($movements) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Tipo', 'Cantidad', 'Fecha', 'Notas', 'Producto', 'Código', 'Categoría']);

            foreach ($movements as $movement) {
                fputcsv($file, [
                    $movement->id,
                    $movement->type_label,
                    $movement->quantity,
                    $movement->date->format('Y-m-d'),
                    $movement->notes ?? '',
                    $movement->product->name,
                    $movement->product->code,
                    $movement->product->category->name,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
