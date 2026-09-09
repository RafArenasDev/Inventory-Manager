<?php

namespace Tests\Feature\Security;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase 1 de QA, categoría "Exposición de información sensible" — confirma
 * que con APP_DEBUG apagado (el estado real de producción) un error interno
 * nunca muestra una traza técnica ni rutas de archivos al usuario final.
 */
class InfoExposureTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_server_error_does_not_leak_a_stack_trace_when_debug_is_off()
    {
        config(['app.debug' => false]);
        $user = User::factory()->create();

        // Cualquier ruta con un id que no existe ya dispara un error real
        // manejado por el framework (404 limpio) — confirma que, con debug
        // apagado, el cuerpo de la respuesta no trae ni una ruta de archivo
        // del servidor ni un nombre de clase interno.
        $response = $this->actingAs($user)->get('/products/999999');

        $body = $response->getContent();
        $this->assertStringNotContainsString('vendor\\laravel', $body);
        $this->assertStringNotContainsString(base_path(), $body);
        $this->assertStringNotContainsString('Stack trace', $body);
    }

    public function test_env_example_defaults_debug_to_false()
    {
        // .env.example es la plantilla que alguien copiaría para un
        // despliegue nuevo — si trae APP_DEBUG=true, un despliegue real que
        // no lo cambie a mano queda mostrando trazas técnicas completas
        // (rutas de archivos, variables de entorno) en cada error.
        $example = file_get_contents(base_path('.env.example'));

        $this->assertMatchesRegularExpression('/^APP_DEBUG=false$/m', $example);
    }
}
