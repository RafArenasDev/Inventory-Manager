<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(): Response
    {
        return Inertia::render('settings/password');
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user = $request->user();

        // Se suprime el log genérico del trait Auditable (que vería el save
        // de más abajo y solo mostraría "must_change_password" cambiado, un
        // detalle interno sin sentido para quien lea la auditoría) a favor
        // de esta entrada explícita y legible.
        AuditLogger::suppress($user);

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        AuditLogger::log('user.password_self_changed', $user);

        // Cambiar la propia contraseña invalida la sesión actual a propósito
        // — es la práctica correcta (no dejar sesiones viejas con la clave
        // anterior aún "confiadas") y evita el bug de terminar en una vista
        // vieja: ahora siempre aterriza en login con un aviso claro.
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login')->with(
            'status',
            'Tu contraseña fue actualizada. Por favor inicia sesión de nuevo.'
        );
    }
}
