<?php
namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener todos los roles disponibles
        $roles = Role::all();

        // Verificar que hay roles disponibles
        if ($roles->isEmpty()) {
            throw new \Exception('No hay roles disponibles en la base de datos. Por favor, ejecuta primero el RoleSeeder.');
        }

        // Create user Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name'              => 'Administrador',
                'password'          => bcrypt('Admin-123*'),
                'email_verified_at' => now(),
            ]
        );
        $admin->assignRole('admin');

        // Create user Seller
        $seller = User::firstOrCreate(
            ['email' => 'seller@seller.com'],
            [
                'name'              => 'Vendedor',
                'password'          => bcrypt('seller-123*'),
                'email_verified_at' => now(),
            ]
        );
        $seller->assignRole('seller');

        // // Create 30 additional users with factory and assign random roles
        // User::factory(100)->create()->each(function ($user) use ($roles) {
        //     // Asignar un rol aleatorio
        //     $randomRole = $roles->random();
        //     $user->assignRole($randomRole->name);
        // });
    }
}
