<?php

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Construcción de la consulta con conteo de productos
        $categoriesQuery = Category::withCount('products')
            ->orderBy('id', 'desc');

        // Filtro de búsqueda
        if ($request->filled('search')) {
            $search = $request->search;
            $categoriesQuery->where(function ($query) use ($search) {
                $query->whereLikeUnaccent('name', "%{$search}%");
            });
        }

        // Conteo total y filtrado
        $totalCount = Category::count();         // total sin filtros
        $filteredCount = $categoriesQuery->count(); // total después de filtros

        // Paginación
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allCategories = $categoriesQuery->get()->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'description' => $category->description,
                    'products_count' => $category->products_count,
                    'is_active' => $category->is_active,
                ];
            });

            $categoriesQuery = [
                'data' => $allCategories,
                'total' => $filteredCount,
                'per_page' => $perPage,
                'from' => 1,
                'to' => $filteredCount,
            ];
        } else {
            $categoriesQuery = $categoriesQuery->paginate($perPage)->withQueryString();
            $categoriesQuery->getCollection()->transform(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'description' => $category->description,
                    'products_count' => $category->products_count,
                    'is_active' => $category->is_active,
                ];
            });
        }

        return Inertia::render('categories/index', [
            'categories' => $categoriesQuery,
            'filters' => $request->only(['search', 'per_page']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CategoryRequest $request)
    {
        // La unicidad del nombre ya la valida CategoryRequest (Rule::unique) —
        // un chequeo manual acá solo duplicaba la regla con un mensaje genérico
        // en vez del error asociado al campo.
        Category::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->route('categories.index')->with('success', 'Categoría creada correctamente.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(CategoryRequest $request, Category $category)
    {
        $category->name = $request->name;
        $category->description = $request->description;

        $category->save();

        return redirect()->route('categories.index')->with('success', 'Categoría actualizada correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Category $category)
    {
        $productsCount = $category->products()->count();
        if ($productsCount > 0) {
            $isPlural = $productsCount > 1;
            $noun = $isPlural ? 'productos asociados' : 'producto asociado';

            // La primera línea es el título del Swal (soporta HTML) y el
            // resto el cuerpo — ver FlashErrorWatcher.
            return redirect()->back()->with(
                'error',
                "No se puede eliminar la categoría <b>{$category->name}</b>\n".
                "Tiene {$productsCount} {$noun}."
            );
        }

        $category->delete();

        return redirect()->route('categories.index')->with('success', 'Categoría eliminada correctamente.');
    }

    /**
     * Alternar el estado activo/inactivo de la categoría.
     */
    public function toggleActive(Category $category)
    {
        $category->update(['is_active' => ! $category->is_active]);

        return redirect()->back()->with(
            'success',
            $category->is_active ? 'Categoría activada correctamente.' : 'Categoría desactivada correctamente.'
        );
    }
}
