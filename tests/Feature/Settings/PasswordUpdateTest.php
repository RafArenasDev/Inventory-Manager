<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated()
    {
        $user = User::factory()->create();

        // La app exige contraseñas fuertes (min 12, mayúscula+minúscula,
        // número y símbolo — ver AppServiceProvider::boot()).
        $response = $this
            ->actingAs($user)
            ->from('/settings/password')
            ->put('/settings/password', [
                'current_password' => 'password',
                'password' => 'New!Str0ngPassw0rd',
                'password_confirmation' => 'New!Str0ngPassw0rd',
            ]);

        // PasswordController::update() cierra la sesión a propósito tras un
        // cambio de contraseña exitoso (evita dejar sesiones viejas con la
        // clave anterior aún "confiadas") y manda a /login, no de vuelta a
        // /settings/password.
        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/login');

        $this->assertGuest();
        $this->assertTrue(Hash::check('New!Str0ngPassw0rd', $user->refresh()->password));
    }

    public function test_correct_password_must_be_provided_to_update_password()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/settings/password')
            ->put('/settings/password', [
                'current_password' => 'wrong-password',
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect('/settings/password');
    }
}
