<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $productsQuery = Product::with('category')->latest()->orderBy('id', 'asc');

        if ($request->filled('search')) {
            $search = $request->search;
            $productsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('supplier', 'like', "%{$search}%");
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
        $perPage       = (int) ($request->per_page ?? 10);

        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();

        if ($perPage === -1) {
            $allProducts = $productsQuery->get()->map(function ($product) {
                $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)
                    ->where('product_id', $product->id)
                    ->first();

                return [
                    'id'                  => $product->id,
                    'code'                => $product->code,
                    'name'                => $product->name,
                    'category'            => $product->category->name,
                    'category_id'         => $product->category_id,
                    'stock'               => $product->stock,
                    'price_without_tax'   => $product->price_without_tax,
                    'price_with_tax'      => $product->price_with_tax,
                    'iva_value'           => $product->iva_value,
                    'sale_price'          => $product->sale_price,
                    'supplier'            => $product->supplier,
                    'description'         => Str::limit($product->description ?? '', 50),
                    // Para la tabla: URL completa para mostrar imágenes
                    'image_path'          => $product->image_path ? Storage::url($product->image_path) : null,
                    'movement_date'       => $initialMovement ? $initialMovement->date : null,
                    'movement_notes'      => $initialMovement ? $initialMovement->notes : null,
                    'initial_movement_id' => $initialMovement ? $initialMovement->id : null,
                ];
            });

            $productsQuery = [
                'data'     => $allProducts,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
            ];
        } else {
            $productsQuery = $productsQuery->paginate($perPage)->withQueryString();
            $productsQuery->getCollection()->transform(function ($product) {
                $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)
                    ->where('product_id', $product->id)
                    ->first();

                return [
                    'id'                  => $product->id,
                    'code'                => $product->code,
                    'name'                => $product->name,
                    'category'            => $product->category->name,
                    'category_id'         => $product->category_id,
                    'stock'               => $product->stock,
                    'price_without_tax'   => $product->price_without_tax,
                    'price_with_tax'      => $product->price_with_tax,
                    'iva_value'           => $product->iva_value,
                    'sale_price'          => $product->sale_price,
                    'supplier'            => $product->supplier,
                    'description'         => Str::limit($product->description ?? '', 50),
                    // Para la tabla: URL completa para mostrar imágenes
                    'image_path'          => $product->image_path ? Storage::url($product->image_path) : null,
                    'movement_date'       => $initialMovement ? $initialMovement->date : null,
                    'movement_notes'      => $initialMovement ? $initialMovement->notes : null,
                    'initial_movement_id' => $initialMovement ? $initialMovement->id : null,
                ];
            });
        }

        return Inertia::render('products/index', [
            'products'      => $productsQuery,
            'categories'    => $categories,
            'filters'       => $request->only(['search', 'per_page', 'category_id', 'stock_filter']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function create()
    {
        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();

        return Inertia::render('products/create', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        // Validación manual para FormData
        $validated = $request->validate([
            'code'                => 'required|string|max:50|unique:products,code',
            'category_id'         => 'required|integer|exists:categories,id',
            'name'                => 'required|string|max:255',
            'description'         => 'nullable|string',
            'image'               => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'image_path'          => 'nullable|string|max:255',
            'price_without_tax'   => 'required|integer|min:0',
            'price_with_tax'      => 'required|integer|min:0',
            'iva_value'           => 'nullable|integer|min:0',
            'sale_price'          => 'required|integer|min:0',
            'supplier'            => 'nullable|string|max:255',
            'stock'               => 'nullable|integer|min:0',
            'movement_date'       => 'nullable|date',
            'movement_notes'      => 'nullable|string|max:500',
            'initial_movement_id' => 'nullable|integer',
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
            'stock.min'                  => 'El stock no puede ser negativo.',
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

        $ivaValue     = $validated['iva_value'] ?? ($validated['price_with_tax'] - $validated['price_without_tax']);
        $initialStock = $validated['stock'] ?? 0;
        $initialDate  = $validated['movement_date'] ?? now()->format('Y-m-d');
        $initialNotes = $validated['movement_notes'] ?: ($validated['supplier'] ? "Primer pedido {$validated['supplier']}" : 'Primer pedido');

        // Crear el producto
        $product = Product::create([
            'code'                => $validated['code'],
            'category_id'         => $validated['category_id'],
            'name'                => $validated['name'],
            'description'         => $validated['description'],
            'image_path'          => $imagePath,
            'price_without_tax'   => $validated['price_without_tax'],
            'price_with_tax'      => $validated['price_with_tax'],
            'iva_value'           => $ivaValue,
            'sale_price'          => $validated['sale_price'],
            'supplier'            => $validated['supplier'],
            'stock'               => $initialStock,
            'initial_movement_id' => null, // Se asignará después si hay movimiento
        ]);

        // Crear movimiento inicial si hay stock > 0
        if ($initialStock > 0) {
            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'type'       => 'Entrada',
                'quantity'   => $initialStock,
                'date'       => $initialDate,
                'notes'      => $initialNotes,
            ]);

            // Asignar el movimiento inicial al producto
            $product->update(['initial_movement_id' => $movement->id]);
        }

        return redirect()->route('products.index')
            ->with('success', 'Producto creado correctamente.');
    }

    public function edit(Product $product)
    {
        $product->load('category');
        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();

        $initialMovement = InventoryMovement::where('id', $product->initial_movement_id)->where('product_id', $product->id)->first();

        return Inertia::render('products/edit', [
            'product'    => [
                'id'                  => $product->id,
                'code'                => $product->code,
                'category_id'         => $product->category_id,
                'name'                => $product->name,
                'description'         => $product->description,
                'image_path'          => $product->image_path,
                'price_without_tax'   => $product->price_without_tax,
                'price_with_tax'      => $product->price_with_tax,
                'iva_value'           => $product->iva_value,
                'sale_price'          => $product->sale_price,
                'supplier'            => $product->supplier,
                'stock'               => $product->stock,
                'movement_date'       => $initialMovement ? $initialMovement->date->format('Y-m-d') : null,
                'movement_notes'      => $initialMovement ? $initialMovement->notes : null,
                'initial_movement_id' => $initialMovement ? $initialMovement->id : null,
            ],
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $productId = $product->id;
        $validated = $request->validate([
            'code' => "required|string|max:50|unique:products,code,{$productId}",
            'category_id'         => 'required|integer|exists:categories,id',
            'name'                => 'required|string|max:255',
            'description'         => 'nullable|string',
            'image'               => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'image_path'          => 'nullable|string|max:255',
            'price_without_tax'   => 'required|integer|min:0',
            'price_with_tax'      => 'required|integer|min:0',
            'iva_value'           => 'nullable|integer|min:0',
            'sale_price'          => 'required|integer|min:0',
            'supplier'            => 'nullable|string|max:255',
            'stock'               => 'nullable|integer|min:0',
            'movement_date'       => 'nullable|date',
            'movement_notes'      => 'nullable|string|max:500',
            'initial_movement_id' => 'nullable|integer',
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
            'stock.min'                  => 'El stock no puede ser negativo.',
        ]);

        $imagePath = $product->image_path; // Mantener la imagen existente por defecto

        if ($request->hasFile('image')) {
            // Si hay nueva imagen, eliminar la anterior
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $imagePath = $request->file('image')->store('products', 'public');
        } elseif ($validated['image_path']) {
            // Si viene image_path pero no hay nueva imagen, usar la proporcionada (ruta relativa)
            $imagePath = $validated['image_path'];

            // Limpiar si viene con URL completa
            if (str_starts_with($imagePath, '/storage/')) {
                $imagePath = str_replace('/storage/', '', $imagePath);
            } elseif (str_starts_with($imagePath, 'http')) {
                // Si es URL completa, extraer solo la ruta
                $imagePath = parse_url($imagePath, PHP_URL_PATH);
                $imagePath = str_replace('/storage/', '', $imagePath);
            }
        }

        // Calcular IVA si no viene en el request
        $ivaValue = $validated['iva_value'] ?? ($validated['price_with_tax'] - $validated['price_without_tax']);
        $newStock = $validated['stock'] ?? $product->stock;
        $newDate  = $validated['movement_date'] ?? null;
        $newNotes = $validated['movement_notes'] ?? '';

        $product->update([
            'code'              => $validated['code'],
            'category_id'       => $validated['category_id'],
            'name'              => $validated['name'],
            'description'       => $validated['description'],
            'image_path'        => $imagePath,
            'price_without_tax' => $validated['price_without_tax'],
            'price_with_tax'    => $validated['price_with_tax'],
            'iva_value'         => $ivaValue,
            'sale_price'        => $validated['sale_price'],
            'supplier'          => $validated['supplier'],
            'stock'             => $newStock,
        ]);

        // Manejar movimiento inicial
        $initialMovementId = $validated['initial_movement_id'] ?? $product->initial_movement_id;
        if ($initialMovementId) {
            $movement = InventoryMovement::where('id', $initialMovementId)->where('product_id', $product->id)->first();
            if ($movement && $movement->type === 'Entrada') {
                $movement->update([
                    'quantity' => $newStock,
                    'date'     => $newDate ?? $movement->date,
                    'notes'    => $newNotes,
                ]);
            }
        } else if ($newStock >= 0 || ! empty($newNotes)) {
            $movement = InventoryMovement::create([
                'product_id' => $product->id,
                'type'       => 'Entrada',
                'quantity'   => $newStock,
                'date'       => $newDate ?? now()->format('Y-m-d'),
                'notes'      => $newNotes,
            ]);
            $product->initial_movement_id = $movement->id;
            $product->save();
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
            'type'     => 'required|in:entry,exit',
            'quantity' => 'required|integer|min:1',
            'date'     => 'required|date',
            'notes'    => 'nullable|string|max:500',
        ]);

        if ($validated['type'] === 'exit' && $product->stock < $validated['quantity']) {
            return redirect()->back()
                ->with('error', 'No hay suficiente stock. Stock actual: ' . $product->stock);
        }

        // Actualizar stock
        if ($validated['type'] === 'entry') {
            $product->increment('stock', $validated['quantity']);
        } else { // 'exit'
            $product->decrement('stock', $validated['quantity']);
        }

        // Convertir a los valores que usa tu enum
        $movementType = $validated['type'] === 'entry' ? 'Entrada' : 'Salida';

        InventoryMovement::create([
            'product_id' => $product->id,
            'type'       => $movementType, // Usar el valor correcto del enum
            'quantity'   => $validated['quantity'],
            'date'       => $validated['date'],
            'notes'      => $validated['notes'],
        ]);

        return redirect()->route('products.show', $product)
            ->with('success', 'Movimiento de inventario registrado correctamente.');
    }
}
