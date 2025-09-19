<?php
namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
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
        $permissions = Permission::get()->groupBy('module');

        // Construct the base query
        $rolesQuery = Role::with('permissions')->orderBy('id', 'desc');

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $rolesQuery->where(function ($query) use ($search) {
                $query->where('label', 'like', "%{$search}%");
            });
        }

        // Count total and filtered permissions
        $totalCount    = $rolesQuery->count();
        $filteredCount = $rolesQuery->count();

        // Pagination
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allRoles = $rolesQuery->get()->map(function ($role) {
                return [
                    'id'          => $role->id,
                    'name'        => $role->name,
                    'label'       => $role->label,
                    'description' => $role->description,
                    'permissions' => $role->permissions->map(function ($permission) {
                        return [
                            'id'     => $permission->id,
                            'name'   => $permission->name,
                            'label'  => $permission->label,
                            'module' => $permission->module,
                        ];
                    })->toArray(),
                ];
            });

            $roles = [
                'data'     => $allRoles,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
                'links'    => [],
            ];
        } else {
            $roles = $rolesQuery->paginate($perPage)->withQueryString();
            $roles->getCollection()->transform(function ($role) {
                return [
                    'id'          => $role->id,
                    'name'        => $role->name,
                    'label'       => $role->label,
                    'description' => $role->description,
                    'permissions' => $role->permissions->map(function ($permission) {
                        return [
                            'id'     => $permission->id,
                            'name'   => $permission->name,
                            'label'  => $permission->label,
                            'module' => $permission->module,
                        ];
                    })->toArray(),
                ];
            });
        }

        return Inertia::render('roles/index', [
            'roles'         => $roles,
            'permissions'   => $permissions,
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
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(RoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'name'        => $request->name,
            'label'       => $request->label,
            'description' => $request->description,
            'is_active'   => true,  // Siempre activo
            'guard_name'  => 'web', // Siempre web
        ]);

        if ($role && $request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }

        return redirect()->route('roles.index')->with('success', 'Rol creado correctamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Role $role)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Role $role)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(RoleRequest $request, $id): RedirectResponse
    {
        $role = Role::findOrFail($id);
        $role->update([
            'name'        => $request->name,
            'label'       => $request->label,
            'description' => $request->description,
            'is_active'   => true,  // Siempre activo
            'guard_name'  => 'web', // Siempre web
        ]);

        if ($request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }

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
