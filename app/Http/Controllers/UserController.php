<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use App\Notifications\WelcomeUserNotification;
use Illuminate\Http\Request;
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
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
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
        $user->delete();

        return redirect()->route('users.index')->with('success', 'Usuario eliminado correctamente.');
    }
}
