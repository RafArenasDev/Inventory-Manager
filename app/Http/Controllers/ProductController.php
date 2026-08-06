<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductController extends Controller
{
    private $movementTypeMap = [
        'Entry'               => 'Entrada',
        'Exit'                => 'Salida',
        'CustomerReturn'      => 'Devolucion Cliente',
        'SupplierReturn'      => 'Devolucion Proveedor',
        'ConsignmentEntry'    => 'Consignacion Entrada',
        'ConsignmentExit'     => 'Consignacion Salida',
        'ExchangeEntry'       => 'Cambio Entrada',
        'ExchangeExit'        => 'Cambio Salida',
        'InventoryAdjustment' => 'Ajuste Inventario',
    ];

    public function index(Request $request)
    {
        $productsQuery = Product::with(['category', 'supplier'])->latest()->orderBy('id', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $productsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhereHas('supplier', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%");
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

        $totalCount    = $productsQuery->count();
        $filteredCount = $productsQuery->count();
        $perPage       = max(1, min((int) ($request->per_page ?? 10), 100));

        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();
        $suppliers  = Supplier::select('id', 'name')->orderBy('name')->get()->toArray();

        $productsQuery = $productsQuery->paginate($perPage)->withQueryString();
        $productsQuery->getCollection()->transform(function ($product) {
            $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)
                ->where('product_id', $product->id)
                ->first();

            return [
                'id'                  => $product->id,
                'code'                => $product->code,
                'name'                => $product->name,
                'category'            => $product->category?->name,
                'category_id'         => $product->category_id,
                'stock'               => $product->stock,
                'price_without_tax'   => $product->price_without_tax,
                'price_with_tax'      => $product->price_with_tax,
                'iva_value'           => $product->iva_value,
                'sale_price'          => $product->sale_price,
                'supplier'            => $product->supplier?->name,
                'supplier_id'         => $product->supplier_id,
                'description'         => Str::limit($product->description ?? '', 50),
                'image_path'          => $product->image_path ? Storage::url($product->image_path) : null,
                'movement_date'       => $initialMovement?->date,
                'movement_notes'      => $initialMovement?->notes,
                'initial_movement_id' => $initialMovement?->id,
            ];
        });

        return Inertia::render('products/index', [
            'products'      => $productsQuery,
            'categories'    => $categories,
            'suppliers'     => $suppliers,
            'filters'       => $request->only(['search', 'per_page', 'category_id', 'stock_filter']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function create()
    {
        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();
        $suppliers  = Supplier::select('id', 'name')->orderBy('name')->get()->toArray();

        return Inertia::render('products/index', [
            'categories'    => $categories,
            'suppliers'     => $suppliers,
            'filters'       => [],
            'totalCount'    => 0,
            'filteredCount' => 0,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code'              => 'required|string|max:50|unique:products,code',
            'category_id'       => 'required|integer|exists:categories,id',
            'name'              => 'required|string|max:255',
            'description'       => 'nullable|string',
            'image'             => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'image_path'        => 'nullable|string|max:255',
            'price_without_tax' => 'required|integer|min:0',
            'price_with_tax'    => 'required|integer|min:0',
            'iva_value'         => 'nullable|integer|min:0',
            'sale_price'        => 'required|integer|min:0',
            'supplier_id'       => 'nullable|integer|exists:suppliers,id',
            'stock'             => 'required|integer|min:0',
            'movement_notes'    => 'nullable|string|max:500',
            'movement_type'     => 'required|in:Entry,Exit,CustomerReturn,SupplierReturn,ConsignmentEntry,ConsignmentExit,ExchangeEntry,ExchangeExit,InventoryAdjustment',
        ], [
            'code.required'              => 'El código del producto es obligatorio.',
            'code.unique'                => 'Ya existe un producto con este código.',
            'category_id.required'       => 'Debe seleccionar una categoría.',
            'category_id.exists'         => 'La categoría seleccionada no es válida.',
            'name.required'              => 'El nombre del producto es obligatorio.',
            'image.image'                => 'El archivo debe ser una imagen.',
            'image.mimes'                => 'La imagen debe ser un archivo JPEG, PNG, JPG o GIF.',
            'image.max'                  => 'La imagen no puede ser mayor a 2MB.',
            'price_without_tax.required' => 'El precio sin IVA es obligatorio.',
            'price_without_tax.integer'  => 'El precio sin IVA debe ser un número entero.',
            'price_with_tax.required'    => 'El precio con IVA es obligatorio.',
            'price_with_tax.integer'     => 'El precio con IVA debe ser un número entero.',
            'sale_price.required'        => 'El precio de venta es obligatorio.',
            'sale_price.integer'         => 'El precio de venta debe ser un número entero.',
            'stock.required'             => 'El stock es obligatorio.',
            'stock.min'                  => 'El stock no puede ser negativo.',
            'supplier_id.exists'         => 'El proveedor seleccionado no es válido.',
            'movement_type.required'     => 'El tipo de movimiento es obligatorio.',
            'movement_type.in'           => 'El tipo de movimiento no es válido.',
        ]);

        $imagePath = null;

        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        } elseif ($validated['image_path']) {
            $imagePath = $validated['image_path'];
            if (str_starts_with($imagePath, '/storage/')) {
                $imagePath = str_replace('/storage/', '', $imagePath);
            } elseif (str_starts_with($imagePath, 'http')) {
                $imagePath = parse_url($imagePath, PHP_URL_PATH);
                $imagePath = str_replace('/storage/', '', $imagePath);
            }
        }

        $product = Product::create([
            'code'                => $validated['code'],
            'category_id'         => $validated['category_id'],
            'name'                => $validated['name'],
            'description'         => $validated['description'],
            'image_path'          => $imagePath,
            'price_without_tax'   => $validated['price_without_tax'],
            'price_with_tax'      => $validated['price_with_tax'],
            'iva_value'           => $validated['iva_value'],
            'sale_price'          => $validated['sale_price'],
            'supplier_id'         => $validated['supplier_id'] ?: null,
            'stock'               => $validated['stock'],
            'initial_movement_id' => null,
        ]);

        if ($validated['stock'] > 0) {
            // Obtener el nombre del proveedor
            $supplier     = Supplier::find($validated['supplier_id']);
            $supplierName = $supplier->name;

            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'type'       => $this->movementTypeMap[$validated['movement_type']] ?? $validated['movement_type'],
                'quantity'   => $validated['stock'],
                'date'       => now()->format('Y-m-d'),
                'notes'      => $validated['movement_notes'] ?: "Primer pedido del proveedor {$supplierName}",
                'supplier_id' => $validated['supplier_id'],
            ]);

            $product->update(['initial_movement_id' => $movement->id]);
        }

        return redirect()->route('products.index')
            ->with('success', 'Producto creado correctamente.');

    }

    public function edit(Product $product)
    {
        $product->load(['category', 'supplier']);
        $categories      = Category::select('id', 'name')->orderBy('name')->get()->toArray();
        $suppliers       = Supplier::select('id', 'name')->orderBy('name')->get()->toArray();
        $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)
            ->where('product_id', $product->id)
            ->first();

        $movementType = $initialMovement ? array_search($initialMovement->type, $this->movementTypeMap) ?: '': '';

        return Inertia::render('products/index', [
            'product'       => [
                'id'                  => $product->id,
                'code'                => $product->code,
                'category_id'         => $product->category_id,
                'name'                => $product->name,
                'description'         => $product->description,
                'image_path'          => $product->image_path ? Storage::url($product->image_path) : null,
                'price_without_tax'   => $product->price_without_tax,
                'price_with_tax'      => $product->price_with_tax,
                'iva_value'           => $product->iva_value,
                'sale_price'          => $product->sale_price,
                'supplier_id'         => $product->supplier_id,
                'stock'               => $product->stock,
                'movement_notes'      => $initialMovement?->notes,
                'movement_type'       => $movementType,
                'initial_movement_id' => $initialMovement?->id,
            ],
            'categories'    => $categories,
            'suppliers'     => $suppliers,
            'filters'       => [],
            'totalCount'    => 0,
            'filteredCount' => 0,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $productId = $product->id;
        $validated = $request->validate([
            'code' => "required|string|max:50|unique:products,code,{$productId}",
            'category_id'       => 'required|integer|exists:categories,id',
            'name'              => 'required|string|max:255',
            'description'       => 'nullable|string',
            'image'             => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'image_path'        => 'nullable|string|max:255',
            'price_without_tax' => 'required|integer|min:0',
            'price_with_tax'    => 'required|integer|min:0',
            'iva_value'         => 'nullable|integer|min:0',
            'sale_price'        => 'required|integer|min:0',
            'supplier_id'       => 'nullable|integer|exists:suppliers,id',
            'stock'             => 'nullable|integer|min:0',
            'movement_notes'    => 'nullable|string|max:500',
        ], [
            'code.required'              => 'El código del producto es obligatorio.',
            'code.unique'                => 'Ya existe un producto con este código.',
            'category_id.required'       => 'Debe seleccionar una categoría.',
            'category_id.exists'         => 'La categoría seleccionada no es válida.',
            'name.required'              => 'El nombre del producto es obligatorio.',
            'image.image'                => 'El archivo debe ser una imagen.',
            'image.mimes'                => 'La imagen debe ser un archivo JPEG, PNG, JPG o GIF.',
            'image.max'                  => 'La imagen no puede ser mayor a 2MB.',
            'price_without_tax.required' => 'El precio sin IVA es obligatorio.',
            'price_without_tax.numeric'  => 'El precio sin IVA debe ser un número.',
            'price_with_tax.required'    => 'El precio con IVA es obligatorio.',
            'price_with_tax.numeric'     => 'El precio con IVA debe ser un número.',
            'sale_price.required'        => 'El precio de venta es obligatorio.',
            'sale_price.numeric'         => 'El precio de venta debe ser un número.',
            'supplier_id.exists'         => 'El proveedor seleccionado no es válido.',
        ]);

        // Manejar imagen
        $imagePath = $product->image_path;

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $imagePath = $request->file('image')->store('products', 'public');
        } elseif ($validated['image_path']) {
            $imagePath = $validated['image_path'];
            if (str_starts_with($imagePath, '/storage/')) {
                $imagePath = str_replace('/storage/', '', $imagePath);
            } elseif (str_starts_with($imagePath, 'http')) {
                $imagePath = parse_url($imagePath, PHP_URL_PATH);
                $imagePath = str_replace('/storage/', '', $imagePath);
            }
        }

        // Convertir strings a integers
        $priceWithoutTax = (int) $validated['price_without_tax'];
        $priceWithTax    = (int) $validated['price_with_tax'];
        $ivaValue        = $validated['iva_value'] ? (int) $validated['iva_value'] : 0;
        $salePrice       = (int) $validated['sale_price'];
        $stock           = $validated['stock'] !== null ? (int) $validated['stock'] : $product->stock;

        $product->update([
            'code'              => $validated['code'],
            'category_id'       => $validated['category_id'],
            'name'              => $validated['name'],
            'description'       => $validated['description'],
            'image_path'        => $imagePath,
            'price_without_tax' => $priceWithoutTax,
            'price_with_tax'    => $priceWithTax,
            'iva_value'         => $ivaValue,
            'sale_price'        => $salePrice,
            'supplier_id'       => $validated['supplier_id'] ?: null,
            'stock'             => $stock,
        ]);

        // Obtener el nombre del proveedor
        $supplier     = Supplier::find($validated['supplier_id']);
        $supplierName = $supplier->name;

        // Manejar movimiento de inventario
        $initialMovementId = $product->initial_movement_id;
        if ($initialMovementId) {
            $movement = InventoryMovement::where('id', $initialMovementId)
                ->where('product_id', $product->id)
                ->first();
            if ($movement) {
                $movement->update([
                    'quantity'    => $stock,
                    'notes'       => $validated['movement_notes'] ?? $movement->notes,
                    'supplier_id' => $validated['supplier_id'],
                ]);
            }
        } elseif ($stock > 0 || ! empty($validated['movement_notes'])) {
            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'type'       => 'Entrada',
                'quantity'   => $stock,
                'date'       => now()->format('Y-m-d'),
                'notes'      => $validated['movement_notes'] ?: "Primer pedido del proveedor {$supplierName}",
                'supplier_id' => $validated['supplier_id'],
            ]);
            $product->update(['initial_movement_id' => $movement->id]);
        }

        return redirect()->route('products.index')
            ->with('success', 'Producto actualizado correctamente.');

    }

    public function destroy(Product $product)
    {
        if ($product->movements()->count() > 0) {
            return redirect()->back()
                ->with('error', 'No se puede eliminar el producto "' . $product->name . '" porque tiene movimientos de inventario asociados.');
        }

        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Producto eliminado correctamente.');
    }

    public function movementsCreate(Product $product)
    {
        return Inertia::render('products/movements-create', [
            'product' => [
                'id'    => $product->id,
                'code'  => $product->code,
                'name'  => $product->name,
                'stock' => $product->stock,
            ],
        ]);
    }

    public function movementsStore(Request $request, Product $product)
    {
        $validated = $request->validate([
            'type'     => 'required|in:Entry,Exit,CustomerReturn,SupplierReturn,ConsignmentEntry,ConsignmentExit,ExchangeEntry,ExchangeExit,InventoryAdjustment',
            'quantity' => 'required|integer|min:1',
            'date'     => 'required|date',
            'notes'    => 'nullable|string|max:500',
        ]);

        $movementType = $this->movementTypeMap[$validated['type']] ?? $validated['type'];

        if (in_array($movementType, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida']) && $product->stock < $validated['quantity']) {
            return redirect()->back()
                ->with('error', 'No hay suficiente stock. Stock actual: ' . $product->stock);
        }

        if (in_array($movementType, ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            $product->increment('stock', $validated['quantity']);
        } elseif (in_array($movementType, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            $product->decrement('stock', $validated['quantity']);
        }

        InventoryMovement::create([
            'product_id' => $product->id,
            'type'       => $movementType,
            'quantity'   => $validated['quantity'],
            'date'       => $validated['date'],
            'notes'      => $validated['notes'],
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Movimiento de inventario registrado correctamente.');
    }
}
