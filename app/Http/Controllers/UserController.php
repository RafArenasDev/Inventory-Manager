<?php
namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser     = Auth::user();
        $authUserRole = $authUser->roles->first()?->name;

        // Verificación de permisos
        if (! in_array($authUserRole, ['admin', 'seller'])) {
            abort(403, 'Usuario no autorizado.');
        }

        // Consulta base con orden descendente
        $userQuery = User::with('roles')->orderBy('id', 'desc');

        // Filtro de búsqueda
        if ($request->filled('search')) {
            $search = $request->search;
            $userQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Conteos
        $totalCount    = $userQuery->count();
        $filteredCount = $userQuery->count();

        // Paginación
        $perPage = (int) ($request->per_page ?? 10);

        if ($perPage === -1) {
            $allUsers = $userQuery->get()->map(function ($user) {
                return [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('label')->join(', '),
                ];
            });

            $users = [
                'data'     => $allUsers,
                'total'    => $filteredCount,
                'per_page' => $perPage,
                'from'     => 1,
                'to'       => $filteredCount,
                'links'    => [],
            ];
        } else {
            $users = $userQuery->paginate($perPage)->withQueryString();
            $users->getCollection()->transform(function ($user) {
                return [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('label')->join(', '),
                ];
            });
        }

        // Roles disponibles según permisos
        $rolesQuery = Role::query();
        if ($authUserRole === 'admin') {
            $rolesQuery->whereIn('name', ['admin', 'seller']);
        } elseif ($authUserRole === 'seller') {
            $rolesQuery->where('name', 'seller');
        }
        $roles = $rolesQuery->get();

        return Inertia::render('users/index', [
            'users'         => $users,
            'roles'         => $roles,
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
    public function store(UserRequest $request)
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password)]);

        if ($user) {
            $user->syncRoles($request->roles);

            return redirect()->route('users.index')->with('success', 'Usuario creado correctamente.');
        }

        return redirect()->back()->with('error', 'Error al crear el usuario.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user)
    {
        if ($user) {
            $user->name  = $request->name;
            $user->email = $request->email;

            $user->save();

            $user->syncRoles($request->roles);
            return redirect()->route('users.index')->with('success', 'Usuario actualizado correctamente.');
        }

        return redirect()->back()->with('error', 'Error al actualizar el usuario.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        if ($user) {
            $user->delete();
            return redirect()->route('users.index')->with('success', 'Usuario eliminado correctamente.');
        }

        return redirect()->back()->with('error', 'Error al eliminar el usuario.');
    }
}
