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
                $query->where('name', 'like', "%{$search}%");
            });
        }

                                                    // Conteo total y filtrado
        $totalCount    = Category::count();         // total sin filtros
        $filteredCount = $categoriesQuery->count(); // total después de filtros

        // Paginación
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allCategories = $categoriesQuery->get()->map(function ($category) {
                return [
                    'id'             => $category->id,
                    'name'           => $category->name,
                    'description'    => $category->description,
                    'products_count' => $category->products_count,
                ];
            });

            $categoriesQuery = [
                'data'     => $allCategories,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
            ];
        } else {
            $categoriesQuery = $categoriesQuery->paginate($perPage)->withQueryString();
            $categoriesQuery->getCollection()->transform(function ($category) {
                return [
                    'id'             => $category->id,
                    'name'           => $category->name,
                    'description'    => $category->description,
                    'products_count' => $category->products_count,
                ];
            });
        }

        return Inertia::render('categories/index', [
            'categories'    => $categoriesQuery,
            'filters'       => $request->only(['search', 'per_page']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('categories/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CategoryRequest $request)
    {
        // Verificar si ya existe una categoría con el mismo name
        $existingCategory = Category::where('name', $request->name)->first();

        if ($existingCategory) {
            return redirect()->back()->with('error',
                'Ya existe una categoría con el nombre "' . $request->name . '"'
            );
        }

        $category = Category::create([
            'name'        => $request->name,
            'description' => $request->description,
        ]);

        if ($category) {
            return redirect()->route('categories.index')->with('success', 'Categoría creada correctamente.');
        }

        return redirect()->back()->with('error', 'Error al crear la categoría.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Category $category)
    {
        return Inertia::render('categories/show', [
            'category' => [
                'id'          => $category->id,
                'name'        => $category->name,
                'description' => $category->description,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Category $category)
    {
        return Inertia::render('categories/edit', [
            'category' => [
                'id'          => $category->id,
                'name'        => $category->name,
                'description' => $category->description,
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(CategoryRequest $request, Category $category)
    {
        // Verificar si otra categoría ya tiene el mismo name (excepto la categoría actual)
        $existingCategory = Category::where('name', $request->name)
            ->where('id', '!=', $category->id)
            ->first();

        if ($existingCategory) {
            return redirect()->back()->with('error',
                'Ya existe otra categoría con el nombre "' . $request->name . '"'
            );
        }

        $category->name        = $request->name;
        $category->description = $request->description;

        $category->save();

        return redirect()->route('categories.index')->with('success', 'Categoría actualizada correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Category $category)
    {
        // Verificar si la categoría tiene productos asociados
        if ($category->products()->count() > 0) {
            return redirect()->back()->with('error',
                'No se puede eliminar la categoría "' . $category->name .
                '" porque tiene productos asociados.'
            );
        }

        $category->delete();

        return redirect()->route('categories.index')->with('success', 'Categoría eliminada correctamente.');
    }
}
