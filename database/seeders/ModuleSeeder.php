<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modules = [
            ['key' => 'dashboard', 'label' => 'Dashboard', 'icon' => 'LayoutGrid', 'route' => '/dashboard'],
            ['key' => 'roles', 'label' => 'Roles y Permisos', 'icon' => 'Shield', 'route' => '/roles'],
            ['key' => 'users', 'label' => 'Usuarios', 'icon' => 'Users', 'route' => '/users'],
            ['key' => 'suppliers', 'label' => 'Proveedores', 'icon' => 'Truck', 'route' => '/suppliers'],
            ['key' => 'categories', 'label' => 'Categorías', 'icon' => 'Tags', 'route' => '/categories'],
            ['key' => 'products', 'label' => 'Productos', 'icon' => 'Package', 'route' => '/products'],
            ['key' => 'inventory-movements', 'label' => 'Movimientos Inventario', 'icon' => 'ClipboardList', 'route' => '/inventory-movements'],
            ['key' => 'clients', 'label' => 'Clientes', 'icon' => 'Users', 'route' => '/clients'],
            ['key' => 'sales', 'label' => 'Ventas', 'icon' => 'ShoppingCart', 'route' => '/sales'],
            ['key' => 'cash-register', 'label' => 'Caja', 'icon' => 'Wallet', 'route' => '/cash-register'],
            ['key' => 'transactions', 'label' => 'Finanzas', 'icon' => 'DollarSign', 'route' => '/transactions'],
        ];

        foreach ($modules as $index => $module) {
            Module::updateOrCreate(
                ['key' => $module['key']],
                [
                    'label'     => $module['label'],
                    'icon'      => $module['icon'],
                    'route'     => $module['route'],
                    'order'     => $index,
                    'is_active' => $module['is_active'] ?? true,
                ]
            );
        }
    }
}
