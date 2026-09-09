<?php

namespace Tests\Feature\Business;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Hallazgo real de caja negra (2026-09-09): probando el formulario de Roles
 * y Permisos en el navegador de verdad, crear un rol con label "Bodega"
 * (ya existente) se aceptó sin aviso — quedaron dos roles indistinguibles
 * en la tabla. La causa: `roleForm.tsx` genera `name` (el campo que sí
 * validaba único) a partir de `label` en minúsculas, pero el usuario nunca
 * ve ni edita `name` — ve y escribe `label`, que no tenía regla de
 * unicidad. Caja blanca no lo había atrapado porque el test anterior de
 * "rol duplicado" (Ronda 3) probaba con el mismo `name` técnico, no con el
 * mismo `label` visible — exactamente el escenario que un humano
 * reproduce sin pensarlo.
 */
class RoleLabelUniquenessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    public function test_cannot_create_a_role_with_a_label_that_already_exists()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('Crear Roles y Permisos');
        $permissionId = Permission::first()->id;

        Role::create(['name' => 'warehouse', 'label' => 'Bodega', 'guard_name' => 'web', 'is_active' => true]);

        // Mismo label, name técnico distinto (así lo genera el formulario
        // real: minúsculas, espacios a guiones) — antes del fix esto pasaba.
        $response = $this->actingAs($user)->post(route('roles.store'), [
            'name' => 'bodega',
            'label' => 'Bodega',
            'permissions' => [$permissionId],
        ]);

        $response->assertSessionHasErrors(['label']);
        $this->assertSame(1, Role::where('label', 'Bodega')->count());
    }
}
