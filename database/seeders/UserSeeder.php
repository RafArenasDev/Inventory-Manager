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
        // Verificar que hay roles disponibles
        if (Role::count() === 0) {
            throw new \Exception('No hay roles disponibles en la base de datos. Por favor, ejecuta primero el RoleSeeder.');
        }

        $users = [
            ['email' => 'admin@admin.com', 'name' => 'Administrador', 'password' => 'Admin-12345*', 'role' => 'admin'],
            ['email' => 'rafarenas.dev@gmail.com', 'name' => 'Rafael Arenas', 'password' => 'RafaAdmin-2026*', 'role' => 'admin'],
            ['email' => 'seller@seller.com', 'name' => 'Camila Torres', 'password' => 'Seller-1234*', 'role' => 'seller'],
            ['email' => 'vendedor2@demo.com', 'name' => 'Andrés Felipe Ríos', 'password' => 'Vendedor-123*', 'role' => 'seller'],
            ['email' => 'cajero@demo.com', 'name' => 'Valentina Suárez', 'password' => 'Cajero-1234*', 'role' => 'cashier'],
            ['email' => 'bodega@demo.com', 'name' => 'Julián Castaño', 'password' => 'Bodega-1234*', 'role' => 'warehouse'],
            ['email' => 'auditor@demo.com', 'name' => 'Marcela Duque', 'password' => 'Auditor-123*', 'role' => 'auditor'],
        ];

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => bcrypt($userData['password']),
                    'email_verified_at' => now(),
                ]
            );
            $user->syncRoles([$userData['role']]);
        }
    }
}
