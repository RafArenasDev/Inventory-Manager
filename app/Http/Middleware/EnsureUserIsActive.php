<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Un usuario puede quedar desactivado mientras ya tiene una sesión abierta
 * (otro admin lo desactiva desde otro dispositivo). El login ya bloquea
 * cuentas inactivas, pero eso no afecta sesiones ya iniciadas — esta
 * verificación corre en cada request autenticado y cierra la sesión al
 * primer contacto, sin revelar el motivo (despido, error, etc.).
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && ! $user->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with(
                'status',
                'Tu sesión fue cerrada. Por favor comunícate con el administrador del sistema.'
            );
        }

        return $next($request);
    }
}
