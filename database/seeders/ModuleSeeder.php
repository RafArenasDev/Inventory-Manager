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
        // El orden de este arreglo es el orden real en la sidebar (dentro de
        // cada grupo, y de los grupos entre sí). `group` null = sin grupo,
        // se muestra suelto arriba de todo (solo Dashboard).
        $modules = [
            ['key' => 'dashboard', 'label' => 'Dashboard', 'icon' => 'LayoutGrid', 'route' => '/dashboard', 'group' => null],

            ['key' => 'users', 'label' => 'Usuarios', 'icon' => 'Users', 'route' => '/users', 'group' => 'Administración'],
            ['key' => 'roles', 'label' => 'Roles y Permisos', 'icon' => 'Shield', 'route' => '/roles', 'group' => 'Administración'],

            ['key' => 'categories', 'label' => 'Categorías', 'icon' => 'Tags', 'route' => '/categories', 'group' => 'Inventario'],
            ['key' => 'products', 'label' => 'Productos', 'icon' => 'Package', 'route' => '/products', 'group' => 'Inventario'],
            ['key' => 'suppliers', 'label' => 'Proveedores', 'icon' => 'Truck', 'route' => '/suppliers', 'group' => 'Inventario'],
            ['key' => 'inventory-movements', 'label' => 'Movimientos Inventario', 'icon' => 'ClipboardList', 'route' => '/inventory-movements', 'group' => 'Inventario'],
            ['key' => 'purchase-orders', 'label' => 'Pedidos', 'icon' => 'PackageSearch', 'route' => '/purchase-orders', 'group' => 'Inventario'],

            ['key' => 'sales', 'label' => 'Ventas', 'icon' => 'ShoppingCart', 'route' => '/sales', 'group' => 'Ventas'],
            ['key' => 'clients', 'label' => 'Clientes', 'icon' => 'Users', 'route' => '/clients', 'group' => 'Ventas'],
            ['key' => 'cash-register', 'label' => 'Caja', 'icon' => 'Wallet', 'route' => '/cash-register', 'group' => 'Ventas'],
            ['key' => 'transactions', 'label' => 'Finanzas', 'icon' => 'DollarSign', 'route' => '/transactions', 'group' => 'Ventas'],
        ];

        foreach ($modules as $index => $module) {
            Module::updateOrCreate(
                ['key' => $module['key']],
                [
                    'label' => $module['label'],
                    'icon' => $module['icon'],
                    'route' => $module['route'],
                    'group' => $module['group'],
                    'order' => $index,
                    'is_active' => $module['is_active'] ?? true,
                ]
            );
        }
    }
}
