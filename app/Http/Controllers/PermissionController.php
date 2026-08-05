<?php
namespace App\Http\Controllers;

use App\Http\Requests\PermissionRequest;
use App\Models\Permission;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $permissionsQuery = Permission::latest()->orderBy('id', 'asc');

        // Search filter
        if (request()->filled('search')) {
            $search = request()->search;
            $permissionsQuery->where(function ($query) use ($search) {
                $query->where('label', 'like', "%{$search}%");
            });
        }

        // Count total and filtered permissions
        $totalCount    = $permissionsQuery->count();
        $filteredCount = $permissionsQuery->count();

        // Pagination
        $perPage = (int) (request()->per_page ?? 10);

        if ($perPage === -1) {
            $allPermissions = $permissionsQuery->get()->map(function ($permission) {
                return [
                    'id'          => $permission->id,
                    'name'        => $permission->name,
                    'label'       => $permission->label,
                    'module'      => $permission->module,
                    'description' => $permission->description,
                ];
            });

            $permissionsQuery = [
                'data'     => $allPermissions,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
            ];
        } else {
            $permissionsQuery = $permissionsQuery->paginate($perPage)->withQueryString();
            $permissionsQuery->getCollection()->transform(function ($permission) {
                return [
                    'id'          => $permission->id,
                    'name'        => $permission->name,
                    'label'       => $permission->label,
                    'module'      => $permission->module,
                    'description' => $permission->description,
                ];
            });
        }

        return Inertia::render('permissions/index', [
            'permissions'   => $permissionsQuery,
            'filters'       => $request->only(['search', 'per_page']),
            'totalCount'    => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(PermissionRequest $request)
    {
        // Verificar si ya existe un permiso con el mismo name
        $existingPermission = Permission::where('name', $request->label)->first();
        if ($existingPermission) {
            return redirect()->back()->with('error', 'Ya existe un permiso con el nombre ' . $request->label);
        }

        $permission = Permission::create([
            'module'      => $request->module,
            'label'       => $request->label,
            'name'        => $request->label,
            'description' => $request->description,
            'guard_name'  => 'web',
        ]);

        if ($permission) {
            return redirect()->route('permissions.index')->with('success', 'Permiso creado correctamente.');
        }
        return redirect()->back()->with('error', 'Error al crear el permiso.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(PermissionRequest $request, Permission $permission)
    {
        // Verificar si otro permiso ya tiene el mismo name (excepto el permiso actual)
        $existingPermission = Permission::where('name', $request->label)
            ->where('id', '!=', $permission->id)
            ->first();
        if ($existingPermission) {
            return redirect()->back()->with('error', 'Ya existe otro permiso con el nombre ' . $request->label);
        }

        if ($permission) {
            $permission->module      = $request->module;
            $permission->label       = $request->label;
            $permission->name        = $request->label;
            $permission->description = $request->description;

            $permission->save();

            return redirect()->route('permissions.index')->with('success', 'Permiso actualizado correctamente.');
        }
        return redirect()->back()->with('error', 'Error al actualizar el permiso.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Permission $permission)
    {
        if ($permission) {
            $permission->delete();
            return redirect()->route('permissions.index')->with('success', 'Permiso eliminado correctamente.');
        }
        return redirect()->back()->with('error', 'Error al eliminar el permiso.');
    }
}
