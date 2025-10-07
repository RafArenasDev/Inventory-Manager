<?php
namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define modules
        $modules = [
            'usuarios'               => 'Usuarios',
            'roles'                  => 'Roles',
            'permisos'               => 'Permisos',
            'proveedores'            => 'Proveedores',
            'clientes'               => 'Clientes',
            'categorias'             => 'Categorías',
            'productos'              => 'Productos',
            'ventas'                 => 'Ventas',
            'movimientos-inventario' => 'Movimientos Inventario',
            'finanzas'               => 'Finanzas',
            'caja'                   => 'Caja',
        ];

        // Define CRUD actions
        $crudActions = [
            'ver'        => 'Ver',
            'crear'      => 'Crear',
            'editar'     => 'Editar',
            'actualizar' => 'Actualizar',
            'eliminar'   => 'Eliminar',
        ];

        foreach ($modules as $module => $moduleName) {
            foreach ($crudActions as $action => $actionLabel) {
                $label = ($action === 'ver') ?
                "Ver {$moduleName}" :
                "{$actionLabel} {$moduleName}";

                $descriptionText = ($action === 'ver') ?
                "Permite ver el módulo de {$moduleName}" :
                "Permite " . strtolower($actionLabel) . " " . $moduleName;

                Permission::firstOrCreate(
                    ['name' => $label, 'guard_name' => 'web'],
                    [
                        'module'      => $moduleName,
                        'name'        => $label,
                        'label'       => $label,
                        'description' => $descriptionText,
                        'guard_name'  => 'web',
                    ]
                );
            }
        }

        // ==================== PERMISOS DE EXPORTACIÓN ====================

        // Permiso específico para exportar movimientos inventario
        Permission::firstOrCreate(
            ['name' => 'Exportar Movimientos Inventario', 'guard_name' => 'web'],
            [
                'module'      => 'Movimientos Inventario',
                'name'        => 'Exportar Movimientos Inventario',
                'label'       => 'Exportar Movimientos Inventario',
                'description' => 'Permite exportar los movimientos de inventario a Excel',
                'guard_name'  => 'web',
            ]
        );

        // Permiso específico para exportar proveedores
        Permission::firstOrCreate(
            ['name' => 'Exportar Proveedores', 'guard_name' => 'web'],
            [
                'module'      => 'Proveedores',
                'name'        => 'Exportar Proveedores',
                'label'       => 'Exportar Proveedores',
                'description' => 'Permite exportar los proveedores a Excel',
                'guard_name'  => 'web',
            ]
        );

        // Permiso específico para exportar ventas
        Permission::firstOrCreate(
            ['name' => 'Exportar Ventas', 'guard_name' => 'web'],
            [
                'module'      => 'Ventas',
                'name'        => 'Exportar Ventas',
                'label'       => 'Exportar Ventas',
                'description' => 'Permite exportar las ventas a Excel',
                'guard_name'  => 'web',
            ]
        );

        // Permiso específico para exportar caja
        Permission::firstOrCreate(
            ['name' => 'Exportar Caja', 'guard_name' => 'web'],
            [
                'module'      => 'Caja',
                'name'        => 'Exportar Caja',
                'label'       => 'Exportar Caja',
                'description' => 'Permite exportar los registros de caja a Excel',
                'guard_name'  => 'web',
            ]
        );

        // ==================== PERMISOS ESPECÍFICOS DE FINANZAS Y CAJA ====================

        // Permiso para abrir caja
        Permission::firstOrCreate(
            ['name' => 'Abrir Caja', 'guard_name' => 'web'],
            [
                'module'      => 'Caja',
                'name'        => 'Abrir Caja',
                'label'       => 'Abrir Caja',
                'description' => 'Permite abrir la caja diaria',
                'guard_name'  => 'web',
            ]
        );

        // Permiso para cerrar caja
        Permission::firstOrCreate(
            ['name' => 'Cerrar Caja', 'guard_name' => 'web'],
            [
                'module'      => 'Caja',
                'name'        => 'Cerrar Caja',
                'label'       => 'Cerrar Caja',
                'description' => 'Permite cerrar la caja diaria',
                'guard_name'  => 'web',
            ]
        );

        // Permiso para cancelar transacciones
        Permission::firstOrCreate(
            ['name' => 'Cancelar Transacciones', 'guard_name' => 'web'],
            [
                'module'      => 'Finanzas',
                'name'        => 'Cancelar Transacciones',
                'label'       => 'Cancelar Transacciones',
                'description' => 'Permite cancelar transacciones',
                'guard_name'  => 'web',
            ]
        );

        // Permiso para exportar transacciones
        Permission::firstOrCreate(
            ['name' => 'Exportar Transacciones', 'guard_name' => 'web'],
            [
                'module'      => 'Finanzas',
                'name'        => 'Exportar Transacciones',
                'label'       => 'Exportar Transacciones',
                'description' => 'Permite exportar transacciones a Excel',
                'guard_name'  => 'web',
            ]
        );

        // Permiso para gestionar categorías de transacciones
        Permission::firstOrCreate(
            ['name' => 'Gestionar Categorías Transacciones', 'guard_name' => 'web'],
            [
                'module'      => 'Finanzas',
                'name'        => 'Gestionar Categorías Transacciones',
                'label'       => 'Gestionar Categorías Transacciones',
                'description' => 'Permite gestionar categorías de transacciones',
                'guard_name'  => 'web',
            ]
        );

        // ==================== PERMISOS DE EXPORTACIÓN DASHBOARD ====================

        // Permiso específico para exportar dashboard
        Permission::firstOrCreate(
            ['name' => 'Exportar Dashboard', 'guard_name' => 'web'],
            [
                'module'      => 'Dashboard',
                'name'        => 'Exportar Dashboard',
                'label'       => 'Exportar Dashboard',
                'description' => 'Permite exportar los datos del dashboard a Excel o PDF',
                'guard_name'  => 'web',
            ]
        );

        // Permiso específico para exportar ventas
        Permission::firstOrCreate(
            ['name' => 'Exportar Ventas', 'guard_name' => 'web'],
            [
                'module'      => 'Ventas',
                'name'        => 'Exportar Ventas',
                'label'       => 'Exportar Ventas',
                'description' => 'Permite exportar las ventas a Excel',
                'guard_name'  => 'web',
            ]
        );

    }
}
