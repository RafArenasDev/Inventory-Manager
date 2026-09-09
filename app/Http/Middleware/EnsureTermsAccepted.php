<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloquea el acceso al resto de la app hasta que el usuario acepte los
 * Términos y Condiciones vigentes — corre en cada request autenticado
 * (excepto las rutas de terms.* mismas, que quedarían en loop infinito). No
 * solo protege el redirect de después del login: también bloquea navegar
 * directo a otra URL saltándose ese paso.
 */
class EnsureTermsAccepted
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && ($user->terms_accepted_at === null || $user->terms_version !== config('legal.terms_version'))) {
            return redirect()->route('terms.show');
        }

        return $next($request);
    }
}
