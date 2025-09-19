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
                return [
                    'id'                => $product->id,
                    'code'              => $product->code,
                    'name'              => $product->name,
                    'category'          => $product->category->name,
                    'category_id'       => $product->category_id,
                    'stock'             => $product->stock,
                    'price_without_tax' => $product->price_without_tax,
                    'price_with_tax'    => $product->price_with_tax,
                    'iva_value'         => $product->iva_value,
                    'sale_price'        => $product->sale_price,
                    'supplier'          => $product->supplier,
                    'description'       => Str::limit($product->description ?? '', 50),
                    // Para la tabla: URL completa para mostrar imágenes
                    'image_path'        => $product->image_path ? Storage::url($product->image_path) : null,
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
                return [
                    'id'                => $product->id,
                    'code'              => $product->code,
                    'name'              => $product->name,
                    'category'          => $product->category->name,
                    'category_id'       => $product->category_id,
                    'stock'             => $product->stock,
                    'price_without_tax' => $product->price_without_tax,
                    'price_with_tax'    => $product->price_with_tax,
                    'iva_value'         => $product->iva_value,
                    'sale_price'        => $product->sale_price,
                    'supplier'          => $product->supplier,
                    'description'       => Str::limit($product->description ?? '', 50),
                    // Para la tabla: URL completa para mostrar imágenes
                    'image_path'        => $product->image_path ? Storage::url($product->image_path) : null,
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
            'supplier'          => 'nullable|string|max:255',
            'stock'             => 'nullable|integer|min:0',
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
            // Si viene image_path pero no hay nueva imagen, usar la existente (ruta relativa)
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

        $product = Product::create([
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
            'stock'             => $validated['stock'] ?? 0,
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Producto creado correctamente.');
    }

    public function edit(Product $product)
    {
        $product->load('category');
        $categories = Category::select('id', 'name')->orderBy('name')->get()->toArray();

        return Inertia::render('products/edit', [
            'product'    => [
                'id'                => $product->id,
                'code'              => $product->code,
                'category_id'       => $product->category_id,
                'name'              => $product->name,
                'description'       => $product->description,
                // Para el formulario: solo la ruta relativa para guardar correctamente
                'image_path'        => $product->image_path,
                'price_without_tax' => $product->price_without_tax,
                'price_with_tax'    => $product->price_with_tax,
                'iva_value'         => $product->iva_value,
                'sale_price'        => $product->sale_price,
                'supplier'          => $product->supplier,
                'stock'             => $product->stock,
            ],
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        // Validación manual para FormData con ID del producto para unique
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
            'supplier'          => 'nullable|string|max:255',
            'stock'             => 'nullable|integer|min:0',
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
            'stock'             => $validated['stock'] ?? $product->stock,
        ]);

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

        InventoryMovement::create([
            'product_id' => $product->id,
            'type'       => $validated['type'],
            'quantity'   => $validated['quantity'],
            'date'       => $validated['date'],
            'notes'      => $validated['notes'],
        ]);

        return redirect()->route('products.show', $product)
            ->with('success', 'Movimiento de inventario registrado correctamente.');
    }
}
