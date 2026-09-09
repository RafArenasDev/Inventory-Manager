<?php

namespace Tests\Feature\Security;

use App\Models\Client;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase 1 de QA, categoría "CSRF".
 *
 * No se puede probar acá "una petición sin token se rechaza con 419": el
 * propio `Illuminate\Foundation\Http\Middleware\VerifyCsrfToken` se
 * auto-desactiva bajo PHPUnit (`runningUnitTests()`), a propósito, para no
 * obligar a cada test del framework a mandar un token — se comprobó al
 * intentarlo: con un token inválido, la petición igual pasó la verificación
 * de CSRF y solo falló después, en el middleware de permisos. Esto es
 * comportamiento del framework, no de esta app.
 *
 * Lo que sí se puede confirmar con código real:
 * - `bootstrap/app.php` nunca llama a `validateCsrfTokens(except: [...])`
 *   — cero rutas exentas, a diferencia de un middleware custom que sí
 *   podría tener excepciones silenciosas.
 * - Con el token real de la sesión, la petición funciona normal (abajo).
 */
class CsrfProtectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_bootstrap_never_exempts_any_route_from_csrf_verification()
    {
        $bootstrap = file_get_contents(base_path('bootstrap/app.php'));

        $this->assertStringNotContainsString('validateCsrfTokens', $bootstrap);
    }

    public function test_a_request_with_the_correct_csrf_token_succeeds()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('Eliminar Clientes');
        $client = Client::factory()->create();

        $this->actingAs($user);
        $token = csrf_token();

        $this->call('DELETE', route('clients.destroy', $client->id), [
            'reason' => 'Prueba de CSRF',
            '_token' => $token,
        ]);

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }
}
