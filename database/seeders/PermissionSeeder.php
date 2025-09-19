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
            'categorias'             => 'Categorías',
            'productos'              => 'Productos',
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
                // Define permission label and name (same value)
                $label = ($action === 'ver') ?
                "Ver {$moduleName}" :
                "{$actionLabel} {$moduleName}";
                $name = $label;

                // Define cleaner description
                $descriptionText = ($action === 'ver') ?
                "Permite ver el módulo de {$moduleName}" :
                "Permite " . strtolower($actionLabel) . " " . $moduleName;

                // Create permission if it doesn't exist
                Permission::firstOrCreate(
                    ['name' => $name, 'guard_name' => 'web'],
                    [
                        'module'      => $moduleName,
                        'name'        => $name,
                        'label'       => $label,
                        'description' => $descriptionText,
                        'guard_name'  => 'web',
                    ]
                );
            }
        }
    }
}
