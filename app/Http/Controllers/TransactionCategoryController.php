<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransactionCategoryRequest;
use App\Models\TransactionCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TransactionCategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Construct the base query
        $categoriesQuery = TransactionCategory::query()->orderBy('type')->orderBy('name');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $categoriesQuery->where(function ($query) use ($search) {
                $query->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Apply type filter
        if ($request->filled('type')) {
            $categoriesQuery->where('type', $request->type);
        }

        // Count total and filtered
        $totalCount = TransactionCategory::count();
        $filteredCount = $categoriesQuery->count();

        // Pagination
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allCategories = $categoriesQuery->get();

            $categories = [
                'data' => $allCategories,
                'total' => $filteredCount,
                'per_page' => $perPage,
                'from' => 1,
                'to' => $filteredCount,
                'links' => [],
            ];
        } else {
            $categories = $categoriesQuery->paginate($perPage)->withQueryString();
        }

        return Inertia::render('TransactionCategories/Index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'per_page', 'type']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('TransactionCategories/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(TransactionCategoryRequest $request): RedirectResponse
    {
        TransactionCategory::create([
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'is_active' => true,
            'is_system' => false,
        ]);

        return redirect()->route('transaction-categories.index')
            ->with('success', 'Categoría creada correctamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(TransactionCategory $transactionCategory)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TransactionCategory $transactionCategory)
    {
        // No permitir editar categorías del sistema
        if ($transactionCategory->is_system) {
            return redirect()->route('transaction-categories.index')
                ->with('error', 'No se pueden editar categorías del sistema.');
        }

        return Inertia::render('TransactionCategories/Edit', [
            'category' => $transactionCategory,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(TransactionCategoryRequest $request, TransactionCategory $transactionCategory): RedirectResponse
    {
        // No permitir editar categorías del sistema
        if ($transactionCategory->is_system) {
            return redirect()->route('transaction-categories.index')
                ->with('error', 'No se pueden editar categorías del sistema.');
        }

        $transactionCategory->update([
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'is_active' => $request->is_active ?? true,
        ]);

        return redirect()->route('transaction-categories.index')
            ->with('success', 'Categoría actualizada correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TransactionCategory $transactionCategory): RedirectResponse
    {
        // No permitir eliminar categorías del sistema
        if ($transactionCategory->is_system) {
            return redirect()->route('transaction-categories.index')
                ->with('error', 'No se pueden eliminar categorías del sistema.');
        }

        // Verificar si tiene transacciones asociadas
        if ($transactionCategory->transactions()->exists()) {
            return redirect()->route('transaction-categories.index')
                ->with('error', 'No se puede eliminar la categoría porque tiene transacciones asociadas.');
        }

        $transactionCategory->delete();

        return redirect()->route('transaction-categories.index')
            ->with('success', 'Categoría eliminada correctamente.');
    }
}
