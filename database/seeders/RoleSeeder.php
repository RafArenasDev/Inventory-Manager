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
        // Crear roles con firstOrCreate para evitar duplicados
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin', 'guard_name' => 'web'],
            [
                'label'       => 'Administrador',
                'description' => 'Rol de administrador con acceso completo a todas las funcionalidades del sistema.',
                'is_active'   => true,
            ]
        );

        $sellerRole = Role::firstOrCreate(
            ['name' => 'seller', 'guard_name' => 'web'],
            [
                'label'       => 'Vendedor',
                'description' => 'Rol de vendedor con acceso a funcionalidades de ventas y gestión de clientes.',
                'is_active'   => true,
            ]
        );

        // Asignar TODOS los permisos al rol admin
        $adminRole->syncPermissions(Permission::all());

        // Asignar permisos específicos al rol seller
        $sellerPermissions = Permission::whereIn('name', [
            'Ver Categorías',
            'Ver Productos',
            'Ver Movimientos Inventario',
        ])->get();

        $sellerRole->syncPermissions($sellerPermissions);

        // // Create 50 roles with random names (commented out)
        // $faker = \Faker\Factory::create();
        //
        // for ($i = 0; $i < 50; $i++) {
        //     $roleName = $faker->unique()->word;
        //
        //     Role::create([
        //         'name'        => $roleName,
        //         'label'       => ucfirst($roleName),
        //         'description' => $faker->sentence,
        //         'is_active'   => $faker->boolean(90), // 90% probability of being active
        //         'guard_name'  => 'web',
        //     ]);
        // }
    }
}
