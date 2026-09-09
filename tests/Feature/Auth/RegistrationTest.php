<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register()
    {
        // La app exige contraseñas fuertes (min 12, mayúscula+minúscula,
        // número y símbolo — ver AppServiceProvider::boot()); 'password'
        // (el default del scaffold de Breeze) ya no pasa esa validación.
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Str0ng!Passw0rd#26',
            'password_confirmation' => 'Str0ng!Passw0rd#26',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }
}
