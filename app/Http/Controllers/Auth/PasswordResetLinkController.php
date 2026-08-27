<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            // REDIRIGIR AL LOGIN con mensaje de éxito
            return redirect()->route('login')->with('status', 'Revisa tu bandeja de entrada o carpeta de spam.');
        }

        // RESET_THROTTLED: Laravel bloquea pedir un enlace nuevo dentro de
        // los 60 segundos del anterior (evita spam de correos) — es un caso
        // distinto a "el correo no existe" y merece su propio mensaje, para
        // no sonar a que algo falló cuando en realidad solo hay que esperar.
        if ($status === Password::RESET_THROTTLED) {
            return back()->withErrors([
                'email' => 'Ya enviamos un enlace hace muy poco. Espera un minuto e intenta de nuevo.',
            ]);
        }

        return back()->withErrors(['email' => 'No se pudo enviar el enlace de recuperación. Verifica que el correo sea correcto.']);
    }
}
