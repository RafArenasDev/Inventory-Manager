<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Module;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Construct the base query
        $rolesQuery = Role::with('permissions')->orderBy('id', 'desc');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $rolesQuery->where(function ($query) use ($search) {
                $query->whereLike('label', "%{$search}%");
            });
        }

        // Count total and filtered permissions
        $totalCount = $rolesQuery->count();
        $filteredCount = $rolesQuery->count();

        // Pagination (topada a 200 para evitar cargas desmedidas)
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $roles = $rolesQuery->paginate($perPage)->withQueryString();
        $roles->getCollection()->transform(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'label' => $role->label,
                'description' => $role->description,
                'permissions' => $role->permissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'label' => $permission->label,
                        'module' => $permission->module,
                    ];
                })->toArray(),
            ];
        });

        return Inertia::render('roles/index', [
            'roles' => $roles,
            'permissions' => Permission::get(['id', 'name', 'label', 'module']),
            'catalogModules' => Module::where('is_active', true)->orderBy('order')->get(['id', 'key', 'label']),
            'filters' => $request->only(['search', 'per_page']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(RoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'name' => $request->name,
            'label' => $request->label,
            'description' => $request->description,
            'is_active' => true,  // Siempre activo
            'guard_name' => 'web', // Siempre web
        ]);

        $role->syncPermissions($request->input('permissions', []));

        return redirect()->route('roles.index')->with('success', 'Rol creado correctamente.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(RoleRequest $request, $id): RedirectResponse
    {
        $role = Role::findOrFail($id);
        $role->update([
            'name' => $request->name,
            'label' => $request->label,
            'description' => $request->description,
            'is_active' => true,  // Siempre activo
            'guard_name' => 'web', // Siempre web
        ]);

        $role->syncPermissions($request->input('permissions', []));

        return redirect()->route('roles.index')->with('success', 'Rol actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Role $role)
    {
        if ($role) {
            $role->delete();

            return redirect()->route('roles.index')->with('success', 'Rol eliminado correctamente.');
        }

        return redirect()->back()->with('error', 'Error al eliminar el rol.');
    }
}
