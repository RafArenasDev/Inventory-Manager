<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use App\Notifications\WelcomeUserNotification;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Consultar usuarios con sus roles
        $userQuery = User::with('roles')->orderBy('id', 'desc');

        // Aplicar filtro de búsqueda
        if ($request->filled('search')) {
            $search = $request->search;
            $userQuery->where(function ($query) use ($search) {
                $query->whereLikeUnaccent('name', "%{$search}%")
                    ->orWhereLike('email', "%{$search}%");
            });
        }

        // Contar total y filtrados
        $totalCount = $userQuery->count();
        $filteredCount = $userQuery->count();

        // Paginación (topada a 200 para evitar cargas desmedidas)
        $perPage = max(1, min((int) ($request->per_page ?? 10), 100));

        $users = $userQuery->paginate($perPage)->withQueryString();
        $users->getCollection()->transform(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name')->toArray(), // Devolver roles como array de nombres
                'is_active' => $user->is_active,
            ];
        });

        // Obtener todos los roles disponibles
        $roles = Role::get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'label' => $role->label,
            ];
        });

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'filters' => $request->only(['search', 'per_page']),
            'totalCount' => $totalCount,
            'filteredCount' => $filteredCount,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'must_change_password' => true,
        ]);

        if ($user && $request->has('roles')) {
            $user->syncRoles($request->roles);
        }

        $user->notify(new WelcomeUserNotification($request->password));

        return redirect()->route('users.index')->with('success', 'Usuario creado correctamente.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        $user->name = $request->name;
        $user->email = $request->email;

        // Solo actualizar contraseña si se proporciona
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        if ($request->has('roles')) {
            $user->syncRoles($request->roles);
        }

        return redirect()->route('users.index')->with('success', 'Usuario actualizado correctamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'No puedes eliminar tu propia cuenta.');
        }

        // Un usuario queda referenciado en tablas de historial que todavía
        // no tengan FK en null (cualquier tabla nueva que referencie users
        // con "restrict" rompería el borrado sin aviso) — se deja que la
        // restricción real de la BD lo bloquee y se traduce ese error a un
        // mensaje claro. SQLSTATE 23000/23001 = violación de integridad
        // referencial en MySQL y Postgres respectivamente.
        //
        // DB::transaction() es necesario acá: el trait HasRoles de Spatie
        // borra los roles del usuario en un evento `deleting` ANTES de que
        // Eloquent intente el DELETE real. Sin transacción, si el DELETE
        // fallaba por una FK restrict, ese borrado de roles ya había hecho
        // commit por su cuenta y el usuario quedaba sin rol aunque la fila
        // siguiera existiendo (bug real, encontrado probando este flujo).
        try {
            DB::transaction(function () use ($user) {
                $user->delete();
            });
        } catch (QueryException $e) {
            if (in_array($e->getCode(), ['23000', '23001'], true)) {
                return redirect()->back()->with(
                    'error',
                    'No se puede eliminar a "'.$user->name.'": tiene historial asociado (cajas, ventas, movimientos, etc.). '.
                    'Puedes desactivarlo en su lugar.'
                );
            }

            throw $e;
        }

        return redirect()->route('users.index')->with('success', 'Usuario eliminado correctamente.');
    }

    /**
     * Alternar el estado activo/inactivo del usuario. Un usuario inactivo no
     * puede volver a loguearse (ver LoginRequest::authenticate).
     */
    public function toggleActive(User $user)
    {
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'No puedes desactivar tu propia cuenta.');
        }

        $user->update(['is_active' => ! $user->is_active]);

        return redirect()->back()->with(
            'success',
            $user->is_active ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.'
        );
    }
}
