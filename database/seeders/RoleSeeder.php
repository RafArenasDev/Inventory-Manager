<?php
namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles
        $adminRole = Role::create([
            'name'        => 'admin',
            'label'       => 'Administrador',
            'description' => 'Rol de administrador con acceso completo a todas las funcionalidades del sistema.',
            'is_active'   => true,
            'guard_name'  => 'web',
        ]);

        $sellerRole = Role::create([
            'name'        => 'seller',
            'label'       => 'Vendedor',
            'description' => 'Rol de vendedor con acceso a funcionalidades de ventas y gestión de clientes.',
            'is_active'   => true,
            'guard_name'  => 'web',
        ]);

        // Assign all permissions to the admin role
        $adminRole->syncPermissions(Permission::all());

        // Assign specific permissions to the seller role
        $sellerPermissions = Permission::whereIn('name', [
            'view-categories-module',
            'view-products-module',
        ])->get();

        $sellerRole->syncPermissions($sellerPermissions);
    }
}
