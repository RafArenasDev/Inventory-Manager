<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Support\ValidationRules;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Mostrar la página de restablecimiento de contraseña.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Manejar una solicitud de nueva contraseña entrante.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => ['required', ...ValidationRules::email()],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Intentar restablecer la contraseña del usuario. Si es exitoso
        // actualizaremos la contraseña en el modelo de usuario real y la persistiremos
        // en la base de datos. De lo contrario, analizaremos el error y devolveremos la respuesta.
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                    // Restablecer la contraseña es la única salida del
                    // bloqueo duro por seguridad — limpiar también el
                    // contador para que no vuelva a bloquearse de inmediato.
                    'failed_login_attempts' => 0,
                    'security_locked_at' => null,
                ])->save();

                event(new PasswordReset($user));

                // Nadie está autenticado durante este flujo (llega por el
                // enlace del correo), así que el guard `auth()->check()` del
                // trait Auditable no capturaría este save — se deja constancia
                // a mano, con el propio usuario restablecido como actor.
                AuditLogger::log('user.password_reset_via_email', $user, null, null, null, $user->id, $user->name);
            }
        );

        // Si la contraseña se restableció exitosamente, redirigiremos al usuario de vuelta a
        // la vista de login con mensaje de CONTRASEÑA RESTABLECIDA
        if ($status == Password::PASSWORD_RESET) {
            return to_route('login')->with('status', 'Contraseña restablecida. Ya puedes iniciar sesión con tu nueva contraseña.');
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}
