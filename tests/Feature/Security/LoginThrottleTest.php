<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Fase 1 de QA, categoría "Autenticación y fuerza bruta" — confirma con
 * intentos reales el bloqueo progresivo de LoginRequest::registerFailedAttempt()
 * (cooldown creciente 1min/5min/15min) y el bloqueo duro a los 10 intentos.
 */
class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    private function attemptWrongPassword(string $email): TestResponse
    {
        return $this->post('/login', [
            'email' => $email,
            'password' => 'contraseña-incorrecta',
        ]);
    }

    public function test_first_two_failed_attempts_have_no_cooldown()
    {
        $user = User::factory()->create();

        $this->attemptWrongPassword($user->email);
        $this->attemptWrongPassword($user->email);

        // Un tercer intento (todavía con contraseña mala) debe llegar a
        // validar credenciales de nuevo, no quedar cortado por el
        // RateLimiter — si hubiera cooldown ya en el 2do intento, este
        // devolvería el mensaje de "espera N segundos" en vez del de
        // contraseña incorrecta.
        $response = $this->attemptWrongPassword($user->email);

        $response->assertSessionHasErrors(['password']);
        $response->assertSessionDoesntHaveErrors(['email']);
    }

    public function test_third_failed_attempt_locks_out_for_a_cooldown_window()
    {
        $user = User::factory()->create();

        $this->attemptWrongPassword($user->email);
        $this->attemptWrongPassword($user->email);
        $this->attemptWrongPassword($user->email); // dispara el cooldown de 60s

        $response = $this->attemptWrongPassword($user->email);

        $response->assertSessionHasErrors(['email']);
        $user->refresh();
        $this->assertNull($user->security_locked_at, 'Todavía no debería ser bloqueo duro, solo cooldown temporal.');
    }

    public function test_ten_failed_attempts_hard_locks_the_account_even_with_the_correct_password()
    {
        $user = User::factory()->create();

        // Cada intento cae en un cooldown distinto — se limpia el limiter a
        // mano entre uno y otro para simular que se esperó el tiempo real,
        // igual que haría un atacante paciente (que es exactamente el caso
        // que el bloqueo duro por contador persistente en BD sí frena).
        for ($i = 0; $i < 10; $i++) {
            $this->attemptWrongPassword($user->email);
            RateLimiter::clear(
                Str::transliterate(Str::lower($user->email)).'|127.0.0.1'
            );
        }

        $user->refresh();
        $this->assertNotNull($user->security_locked_at);
        $this->assertSame(10, $user->failed_login_attempts);

        // Ni con la contraseña correcta se puede entrar mientras el
        // bloqueo duro esté activo.
        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertGuest();
    }

    public function test_a_successful_login_resets_the_failed_attempts_counter()
    {
        $user = User::factory()->create();

        $this->attemptWrongPassword($user->email);
        $this->attemptWrongPassword($user->email);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $user->refresh();
        $this->assertSame(0, $user->failed_login_attempts);
        $this->assertNull($user->security_locked_at);
    }
}
