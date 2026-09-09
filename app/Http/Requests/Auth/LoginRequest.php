<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * A partir de cuántos intentos fallidos consecutivos (contador
     * persistente en BD, no el de caché del RateLimiter) la cuenta se
     * bloquea del todo hasta que el usuario restablezca su contraseña.
     */
    private const HARD_LOCK_THRESHOLD = 10;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        // Se busca el usuario aparte (en vez de solo Auth::attempt) para
        // poder devolver un mensaje específico por campo — email no
        // registrado, cuenta inactiva o contraseña incorrecta — en vez del
        // mensaje ambiguo por defecto de Laravel. Es una decisión consciente
        // para esta app interna de pocos usuarios conocidos, no una app
        // pública donde conviene ocultar si un correo existe.
        $user = User::where('email', $this->string('email'))->first();

        if (! $user) {
            AuditLogger::log(
                'auth.login_failed',
                null,
                null,
                null,
                'Correo no registrado: '.$this->string('email'),
            );

            throw ValidationException::withMessages([
                'email' => 'No encontramos una cuenta con este correo electrónico.',
            ]);
        }

        if (! $user->is_active) {
            AuditLogger::log('auth.login_blocked_inactive', $user, null, null, null, $user->id, $user->name);

            throw ValidationException::withMessages([
                'email' => 'Tu cuenta está inactiva. Comunícate con el administrador del sistema.',
            ]);
        }

        // Bloqueo duro: sobrevive a la ventana del RateLimiter (que expira
        // sola) porque vive en la BD. Ni con la contraseña correcta se puede
        // entrar mientras esté activo — es la única forma de frenar un
        // ataque sostenido que simplemente espera a que pase cada cooldown.
        if ($user->security_locked_at !== null) {
            AuditLogger::log('auth.login_blocked_locked', $user, null, null, null, $user->id, $user->name);

            throw ValidationException::withMessages([
                'email' => 'Tu cuenta fue bloqueada por seguridad tras demasiados intentos fallidos. Restablece tu contraseña con "¿Olvidaste tu contraseña?" para volver a ingresar.',
            ]);
        }

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            $this->registerFailedAttempt($user);

            if ($user->security_locked_at !== null) {
                AuditLogger::log('auth.login_blocked_locked', $user, null, null, null, $user->id, $user->name);

                throw ValidationException::withMessages([
                    'email' => 'Por seguridad, bloqueamos tu cuenta tras demasiados intentos fallidos. Restablece tu contraseña con "¿Olvidaste tu contraseña?" para volver a ingresar.',
                ]);
            }

            AuditLogger::log('auth.login_failed', $user, null, null, null, $user->id, $user->name);

            throw ValidationException::withMessages([
                'password' => 'La contraseña ingresada es incorrecta.',
            ]);
        }

        $user->forceFill([
            'failed_login_attempts' => 0,
            'security_locked_at' => null,
        ])->save();

        RateLimiter::clear($this->throttleKey());

        AuditLogger::log('auth.login_success', $user);
    }

    /**
     * Suma el intento fallido al contador persistente del usuario y aplica
     * el cooldown que corresponda — creciente mientras más intentos lleve
     * acumulados — o el bloqueo duro si llegó al tope.
     */
    private function registerFailedAttempt(User $user): void
    {
        $attempts = $user->failed_login_attempts + 1;

        if ($attempts >= self::HARD_LOCK_THRESHOLD) {
            $user->forceFill([
                'failed_login_attempts' => $attempts,
                'security_locked_at' => now(),
            ])->save();

            RateLimiter::clear($this->throttleKey());

            return;
        }

        $user->forceFill(['failed_login_attempts' => $attempts])->save();

        $decaySeconds = match (true) {
            $attempts >= 8 => 900,  // 15 minutos
            $attempts >= 5 => 300,  // 5 minutos
            $attempts >= 3 => 60,   // 1 minuto
            default => 0,           // 1er y 2do intento: sin espera
        };

        if ($decaySeconds > 0) {
            RateLimiter::hit($this->throttleKey(), $decaySeconds);
        }
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * El RateLimiter acá solo controla el cooldown temporal (el "espera N
     * segundos") — es una compuerta binaria (1 intento ya registrado dentro
     * de la ventana = bloqueado), la duración real de esa ventana la decide
     * registerFailedAttempt() según el contador persistente del usuario.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 1)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => __('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
