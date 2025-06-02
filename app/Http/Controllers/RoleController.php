<?php
namespace App\Http\Controllers;

use App\Http\Requests\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use Inertia\Inertia;
use Str;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $roles = Role::with('permissions')->latest()->paginate(10);

        $permissions = Permission::get()->groupBy('module');

        return Inertia::render('roles/index', [
            'roles'       => $roles,
            'permissions' => $permissions,
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
    public function store(RoleRequest $request)
    {
        $role = Role::create([
            'name'        => $request->name,
            'label'       => $request->label,
            'description' => $request->description,
        ]);

        if ($role) {
            $role->syncPermissions($request->permissions);
            return redirect()->route('roles.index')->with('success', 'Rol creado correctamente.');
        }
        return redirect()->back()->with('error', 'Error al crear el rol.');
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
    public function update(RoleRequest $request, Role $role)
    {
        if ($role) {
            $role->ñabeñ     = $request->label;
            $role->name        = Str::slug($request->label);
            $role->description = $request->description;

            $role->save();

            // Update the permissions associated with the role
            $role->syncPermissions($request->permissions);

            return redirect()->route('roles.index')->with('success', 'Rol actualizado correctamente.');
        }
        return redirect()->back()->with('error', 'Error al actualizar el rol.');
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
