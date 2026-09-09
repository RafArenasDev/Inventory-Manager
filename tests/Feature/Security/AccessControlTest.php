<?php

namespace Tests\Feature\Security;

use App\Models\Client;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fase 1 de QA (roadmap "Pruebas, manuales y lo que falta antes del
 * contrato"), categoría "Control de acceso entre roles" — confirma con
 * peticiones HTTP reales que cada ruta protegida exige su permiso, en vez
 * de asumirlo por cómo se ve la UI.
 */
class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    private function activeUser(): User
    {
        return User::factory()->create([
            'is_active' => true,
            'terms_accepted_at' => now(),
            'terms_version' => config('legal.terms_version'),
        ]);
    }

    public function test_guest_is_redirected_to_login_for_a_protected_route()
    {
        $this->get('/clients')->assertRedirect('/login');
    }

    public function test_user_without_permission_cannot_delete_a_client()
    {
        $user = $this->activeUser();
        $client = Client::factory()->create();

        $this->actingAs($user)
            ->delete(route('clients.destroy', $client->id))
            ->assertForbidden();

        $this->assertDatabaseHas('clients', ['id' => $client->id]);
    }

    public function test_user_without_permission_cannot_delete_a_product()
    {
        $user = $this->activeUser();
        $product = Product::factory()->create();

        $this->actingAs($user)
            ->delete(route('products.destroy', $product->id))
            ->assertForbidden();

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_user_without_permission_cannot_delete_another_user()
    {
        $actor = $this->activeUser();
        $target = $this->activeUser();

        $this->actingAs($actor)
            ->delete(route('users.destroy', $target->id))
            ->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_user_with_the_right_permission_can_delete_a_client()
    {
        $user = $this->activeUser();
        $user->givePermissionTo('Eliminar Clientes');
        $client = Client::factory()->create();

        $this->actingAs($user)
            ->delete(route('clients.destroy', $client->id), ['reason' => 'Registro de prueba, duplicado.'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    /**
     * Hallazgo corregido en esta ronda (routes/web.php): estos dos
     * endpoints no tenían NINGÚN middleware de permiso — cualquier usuario
     * autenticado, sin importar su rol, podía leer los datos completos
     * (email, teléfono, dirección) de cualquier cliente por su número de
     * documento, o el precio/stock de cualquier producto por su código.
     */
    public function test_client_lookup_by_document_requires_crear_ventas_permission()
    {
        $user = $this->activeUser();
        $client = Client::factory()->create(['document_number' => '123456789']);

        $this->actingAs($user)
            ->get('/sales/client-by-document?document_number=123456789')
            ->assertForbidden();

        $user->givePermissionTo('Crear Ventas');

        $this->actingAs($user)
            ->get('/sales/client-by-document?document_number=123456789')
            ->assertOk()
            ->assertJsonFragment(['id' => $client->id]);
    }

    public function test_product_lookup_by_code_requires_crear_ventas_permission()
    {
        $user = $this->activeUser();
        $product = Product::factory()->create(['code' => 'SKU-TEST-1']);

        $this->actingAs($user)
            ->get('/sales/product-by-code?code=SKU-TEST-1')
            ->assertForbidden();

        $user->givePermissionTo('Crear Ventas');

        $this->actingAs($user)
            ->get('/sales/product-by-code?code=SKU-TEST-1')
            ->assertOk()
            ->assertJsonFragment(['id' => $product->id]);
    }

    public function test_dashboard_is_visible_to_any_authenticated_user_by_design()
    {
        // A diferencia de los demás módulos, el Dashboard NO tiene un
        // permiso "Ver Dashboard" (ver PermissionSeeder) — solo
        // "Exportar Dashboard" está gateado.
        $user = $this->activeUser();

        $this->actingAs($user)->get('/dashboard')->assertOk();
    }

    public function test_user_without_export_permission_cannot_export_dashboard()
    {
        $user = $this->activeUser();

        $this->actingAs($user)
            ->get('/dashboard/export/diario/excel')
            ->assertForbidden();
    }
}
