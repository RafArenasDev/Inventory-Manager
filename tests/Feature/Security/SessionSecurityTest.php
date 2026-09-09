<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase 1 de QA, categoría "Suplantación de sesión" — confirma que el ID de
 * sesión cambia en login y logout (fijación de sesión: si el ID no cambiara,
 * un atacante que le hace llegar a la víctima un session id conocido de
 * antemano podría heredar su sesión ya autenticada).
 */
class SessionSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_id_regenerates_on_login()
    {
        $user = User::factory()->create();

        // Sesión "pre-login" con un id ya fijado, como la tendría un
        // visitante anónimo que abrió la página de login.
        $this->get('/login');
        $idBeforeLogin = session()->getId();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $this->assertNotSame($idBeforeLogin, session()->getId());
    }

    public function test_session_id_regenerates_on_logout()
    {
        $user = User::factory()->create();
        $this->actingAs($user)->get('/dashboard');
        $idWhileLoggedIn = session()->getId();

        $this->post('/logout');

        $this->assertGuest();
        $this->assertNotSame($idWhileLoggedIn, session()->getId());
    }

    public function test_password_change_also_invalidates_the_session()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->put('/settings/password', [
            'current_password' => 'password',
            'password' => 'New!Str0ngPassw0rd',
            'password_confirmation' => 'New!Str0ngPassw0rd',
        ]);

        $this->assertGuest();
    }
}
