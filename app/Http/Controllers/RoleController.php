<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Module;
use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                $query->whereLikeUnaccent('label', "%{$search}%");
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
        // RoleRequest ya valida el nombre único, pero deja la misma ventana
        // de carrera que Usuarios/Clientes/Productos/Proveedores: dos altas
        // casi simultáneas con el mismo nombre pueden pasar la validación
        // antes de que cualquiera exista todavía.
        try {
            $role = Role::create([
                'name' => $request->name,
                'label' => $request->label,
                'description' => $request->description,
                'is_active' => true,  // Siempre activo
                'guard_name' => 'web', // Siempre web
            ]);
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return redirect()->back()->with('error', 'Ya existe un rol con ese nombre.')->withInput();
            }
            throw $e;
        }

        $role->syncPermissions($request->input('permissions', []));

        // syncPermissions() escribe en la tabla pivote role_has_permissions,
        // no en la fila de Role — el trait Auditable no ve ningún cambio de
        // atributo ahí, así que sin esto la asignación de permisos de un rol
        // nuevo quedaría sin rastro.
        $this->logPermissionDiff($role, []);

        return redirect()->route('roles.index')->with('success', 'Rol creado correctamente.');
    }

    /**
     * syncPermissions() es un cambio de pivote, no de atributos de Role, así
     * que el trait Auditable genérico no lo detecta — se deja constancia a
     * mano solo cuando la lista realmente cambió.
     */
    private function logPermissionDiff(Role $role, array $beforePermissionIds): void
    {
        $before = Permission::whereIn('id', $beforePermissionIds)->pluck('name')->sort()->values()->all();
        $after = $role->fresh()->permissions->pluck('name')->sort()->values()->all();

        if ($before === $after) {
            return;
        }

        AuditLogger::log('role.permissions_synced', $role, null, ['permisos' => [$before, $after]]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(RoleRequest $request, $id): RedirectResponse
    {
        $role = Role::findOrFail($id);
        $isAdminRole = $role->name === 'admin';

        // El rol Administrador siempre conserva todos los permisos y su
        // nombre interno: de lo contrario se podría editar y dejar el
        // sistema sin ningún usuario con acceso completo.
        $permissionIds = $isAdminRole
            ? Permission::pluck('id')->all()
            : $request->input('permissions', []);

        $user = $request->user();
        $isOnlyRoleOfCurrentUser = $user->roles->count() === 1 && $user->roles->contains('id', $role->id);

        if ($isOnlyRoleOfCurrentUser) {
            $viewRolesPermissionId = Permission::where('name', 'Ver Roles y Permisos')->value('id');

            if (! in_array($viewRolesPermissionId, $permissionIds)) {
                return redirect()->back()->withErrors([
                    'permissions' => 'No puedes quitar el permiso "Ver Roles y Permisos" de tu único rol: perderías el acceso a este módulo.',
                ]);
            }
        }

        $beforePermissionIds = $role->permissions->pluck('id')->all();

        try {
            DB::transaction(function () use ($role, $request, $isAdminRole, $permissionIds) {
                $role->update([
                    'name' => $isAdminRole ? 'admin' : $request->name,
                    'label' => $request->label,
                    'description' => $request->description,
                    'is_active' => true,  // Siempre activo
                    'guard_name' => 'web', // Siempre web
                ]);

                $role->syncPermissions($permissionIds);
            });
        } catch (QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return redirect()->back()->with('error', 'Ya existe otro rol con ese nombre.')->withInput();
            }
            throw $e;
        }

        $this->logPermissionDiff($role, $beforePermissionIds);

        return redirect()->route('roles.index')->with('success', 'Rol actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Role $role)
    {
        if ($role->name === 'admin') {
            return redirect()->back()->with('error', 'No puedes eliminar el rol Administrador.');
        }

        // model_has_roles borra en cascada al eliminar un rol (no hay FK
        // restrict), así que sin este chequeo los usuarios asignados
        // quedarían sin rol de forma silenciosa. Se bloquea explícitamente
        // en vez de confiar en la integridad referencial.
        $usersCount = $role->users()->count();
        if ($usersCount > 0) {
            $isPlural = $usersCount > 1;
            $noun = $isPlural ? 'usuarios asignados' : 'usuario asignado';
            $verb = $isPlural ? 'Reasígnalos' : 'Reasígnalo';

            // La primera línea es el título del Swal (soporta HTML) y el
            // resto el cuerpo — ver FlashErrorWatcher.
            return redirect()->back()->with(
                'error',
                'No se puede eliminar el rol <b>'.e($role->label)."</b>\n".
                "Tiene {$usersCount} {$noun}. {$verb} a otro rol primero."
            );
        }

        $role->delete();

        return redirect()->route('roles.index')->with('success', 'Rol eliminado correctamente.');
    }
}
