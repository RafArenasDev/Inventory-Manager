<?php

namespace Tests\Feature\Security;

use App\Models\City;
use App\Models\Department;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresión: el validador `email` de Laravel usa RFCValidation por sí
 * solo, que es permisiva a propósito y deja pasar "correo@correo" sin TLD
 * — real en producción, reportado por el dueño del negocio: se podían
 * crear clientes/usuarios/proveedores con un correo que nunca recibiría
 * nada. Ver App\Support\ValidationRules::email().
 */
class EmailFormatValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PermissionSeeder::class);
    }

    private function actingUserWithPermission(string $permission): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permission);
        $this->actingAs($user);

        return $user;
    }

    public function test_client_creation_rejects_an_email_without_a_tld()
    {
        $this->actingUserWithPermission('Crear Clientes');
        $department = Department::create(['name' => 'Risaralda']);
        $city = City::create(['name' => 'Dosquebradas', 'department_id' => $department->id]);

        $this->post(route('clients.store'), [
            'document_type' => 'CC',
            'document_number' => 123456789,
            'name' => 'Cliente de Prueba',
            'department_id' => $department->id,
            'city_id' => $city->id,
            'cellphone' => '3001234567',
            'address' => 'Calle falsa 123',
            'email' => 'correo@correo',
        ])->assertSessionHasErrors('email');
    }

    public function test_client_creation_accepts_a_well_formed_email()
    {
        $this->actingUserWithPermission('Crear Clientes');
        $department = Department::create(['name' => 'Risaralda']);
        $city = City::create(['name' => 'Dosquebradas', 'department_id' => $department->id]);

        $this->post(route('clients.store'), [
            'document_type' => 'CC',
            'document_number' => 123456789,
            'name' => 'Cliente de Prueba',
            'department_id' => $department->id,
            'city_id' => $city->id,
            'cellphone' => '3001234567',
            'address' => 'Calle falsa 123',
            'email' => 'correo@correo.com',
        ])->assertSessionHasNoErrors();
    }

    public function test_supplier_creation_rejects_an_email_without_a_tld()
    {
        $this->actingUserWithPermission('Crear Proveedores');

        $this->post(route('suppliers.store'), [
            'name' => 'Proveedor de Prueba',
            'representative' => 'Juan Pérez',
            'nit_number' => '900123456',
            'phone' => '3001234567',
            'address' => 'Calle falsa 123',
            'email' => 'contacto@proveedor',
        ])->assertSessionHasErrors('email');
    }

    public function test_user_creation_rejects_an_email_without_a_tld()
    {
        $admin = $this->actingUserWithPermission('Crear Usuarios');

        $this->post(route('users.store'), [
            'name' => 'Usuario de Prueba',
            'email' => 'nuevo@usuario',
            'password' => 'Str0ng!Passw0rd#26',
            'confirm_password' => 'Str0ng!Passw0rd#26',
            'roles' => [],
        ])->assertSessionHasErrors('email');

        $this->assertSame(1, User::count(), 'No debió crearse ningún usuario nuevo: solo existe el admin de prueba.');
        $this->assertSame($admin->id, User::first()->id);
    }

    public function test_password_reset_link_request_rejects_an_email_without_a_tld()
    {
        $this->post(route('password.email'), [
            'email' => 'usuario@dominio',
        ])->assertSessionHasErrors('email');
    }
}
