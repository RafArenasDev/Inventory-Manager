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
                'label' => 'Administrador',
                'description' => 'Rol de administrador con acceso completo a todas las funcionalidades del sistema.',
                'is_active' => true,
            ]
        );

        $sellerRole = Role::firstOrCreate(
            ['name' => 'seller', 'guard_name' => 'web'],
            [
                'label' => 'Vendedor',
                'description' => 'Rol de vendedor: registra ventas y gestiona clientes.',
                'is_active' => true,
            ]
        );

        $cashierRole = Role::firstOrCreate(
            ['name' => 'cashier', 'guard_name' => 'web'],
            [
                'label' => 'Cajero',
                'description' => 'Rol de cajero: registra ventas y consulta caja; abrir/cerrar caja es solo del administrador.',
                'is_active' => true,
            ]
        );

        $warehouseRole = Role::firstOrCreate(
            ['name' => 'warehouse', 'guard_name' => 'web'],
            [
                'label' => 'Bodega',
                'description' => 'Rol de bodega: gestiona productos, stock y movimientos de inventario.',
                'is_active' => true,
            ]
        );

        $auditorRole = Role::firstOrCreate(
            ['name' => 'auditor', 'guard_name' => 'web'],
            [
                'label' => 'Auditor',
                'description' => 'Rol de auditor: acceso de solo lectura y exportación a todos los módulos.',
                'is_active' => true,
            ]
        );

        // Admin: todos los permisos
        $adminRole->syncPermissions(Permission::all());

        // Vendedor: catálogo + clientes + ventas
        $sellerRole->syncPermissions(Permission::whereIn('name', [
            'Ver Categorías',
            'Ver Productos',
            'Ver Movimientos Inventario',
            'Ver Clientes',
            'Crear Clientes',
            'Editar Clientes',
            'Ver Ventas',
            'Crear Ventas',
            'Exportar Ventas',
        ])->get());

        // Cajero: solo registra — abrir/cerrar caja queda reservado al admin.
        $cashierRole->syncPermissions(Permission::whereIn('name', [
            'Ver Caja',
            'Exportar Caja',
            'Ver Ventas',
            'Crear Ventas',
            'Exportar Ventas',
            'Ver Clientes',
            'Crear Clientes',
            'Ver Productos',
        ])->get());

        // Bodega: productos, categorías, proveedores y movimientos de inventario
        $warehouseRole->syncPermissions(Permission::whereIn('name', [
            'Ver Productos',
            'Crear Productos',
            'Editar Productos',
            'Actualizar Productos',
            'Exportar Productos',
            'Ver Categorías',
            'Crear Categorías',
            'Actualizar Categorías',
            'Ver Proveedores',
            'Crear Proveedores',
            'Editar Proveedores',
            'Actualizar Proveedores',
            'Ver Movimientos Inventario',
            'Crear Movimientos Inventario',
            'Editar Movimientos Inventario',
            'Actualizar Movimientos Inventario',
            'Exportar Movimientos Inventario',
            'Ver Pedidos',
            'Crear Pedidos',
            'Actualizar Pedidos',
            'Exportar Pedidos',
        ])->get());

        // Auditor: solo lectura y exportación en todos los módulos
        $auditorRole->syncPermissions(Permission::where(function ($query) {
            $query->where('name', 'like', 'Ver %')
                ->orWhere('name', 'like', 'Exportar %');
        })->get());
    }
}
