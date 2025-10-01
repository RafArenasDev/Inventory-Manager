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

    }
}
