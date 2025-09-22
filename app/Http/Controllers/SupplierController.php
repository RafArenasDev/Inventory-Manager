<?php
namespace App\Http\Controllers;

use App\Http\Requests\SupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliersQuery = Supplier::orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $suppliersQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('representative', 'like', "%{$search}%")
                    ->orWhereRaw("CONCAT(nit_number, '-', nit_digit) LIKE ?", ["%{$search}%"]);
            });
        }

        $totalCount    = $suppliersQuery->count();
        $filteredCount = $suppliersQuery->count();

        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allSuppliers = $suppliersQuery->get()->map(function ($supplier) {
                return [
                    'id'             => $supplier->id,
                    'name'           => $supplier->name,
                    'representative' => $supplier->representative,
                    'nit'            => $supplier->nit,
                    'nit_number'     => $supplier->nit_number,
                    'nit_digit'      => $supplier->nit_digit,
                    'phone'          => $supplier->phone,
                    'cellphone'      => $supplier->cellphone,
                    'address'        => $supplier->address,
                    'email'          => $supplier->email,
                    'description'    => $supplier->description,
                    'products_count' => $supplier->products()->count(),
                    'main_contact'   => $supplier->main_contact,
                    'main_phone'     => $supplier->main_phone,
                ];
            });

            $suppliers = [
                'data'     => $allSuppliers,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
                'links'    => [],
            ];
        } else {
            $suppliers = $suppliersQuery->paginate($perPage)->withQueryString();
            $suppliers->getCollection()->transform(function ($supplier) {
                return [
                    'id'             => $supplier->id,
                    'name'           => $supplier->name,
                    'representative' => $supplier->representative,
                    'nit'            => $supplier->nit,
                    'nit_number'     => $supplier->nit_number,
                    'nit_digit'      => $supplier->nit_digit,
                    'phone'          => $supplier->phone,
                    'cellphone'      => $supplier->cellphone,
                    'address'        => $supplier->address,
                    'email'          => $supplier->email,
                    'description'    => $supplier->description,
                    'products_count' => $supplier->products()->count(),
                    'main_contact'   => $supplier->main_contact,
                    'main_phone'     => $supplier->main_phone,
                ];
            });
        }

        return Inertia::render('suppliers/index', [
            'suppliers'     => $suppliers,
            'filters'       => $request->only(['search', 'per_page']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    public function create()
    {
        //
    }

    public function store(SupplierRequest $request): RedirectResponse
    {
        $supplier = Supplier::create([
            'name'           => $request->name,
            'representative' => $request->representative,
            'nit_number'     => $request->nit_number,
            'nit_digit'      => $request->nit_digit,
            'phone'          => $request->phone,
            'cellphone'      => $request->cellphone,
            'address'        => $request->address,
            'email'          => $request->email,
            'description'    => $request->description,
            'is_active'      => true,
        ]);

        return redirect()->route('suppliers.index')->with('success', 'Proveedor creado correctamente.');
    }

    public function show(Supplier $supplier)
    {
        //
    }

    public function edit(Supplier $supplier)
    {
        //
    }

    public function update(SupplierRequest $request, $id): RedirectResponse
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->update([
            'name'           => $request->name,
            'representative' => $request->representative,
            'nit_number'     => $request->nit_number,
            'nit_digit'      => $request->nit_digit,
            'phone'          => $request->phone,
            'cellphone'      => $request->cellphone,
            'address'        => $request->address,
            'email'          => $request->email,
            'description'    => $request->description,
            'is_active'      => true,
        ]);

        return redirect()->route('suppliers.index')->with('success', 'Proveedor actualizado correctamente.');
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->products()->count() > 0) {
            return redirect()->back()->with('error', 'No se puede eliminar el proveedor porque tiene productos asociados.');
        }

        if ($supplier) {
            $supplier->delete();
            return redirect()->route('suppliers.index')->with('success', 'Proveedor eliminado correctamente.');
        }
        return redirect()->back()->with('error', 'Error al eliminar el proveedor.');
    }
}
