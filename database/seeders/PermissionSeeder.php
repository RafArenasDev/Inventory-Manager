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
            'users'       => 'Usuarios',
            'roles'       => 'Roles',
            'permissions' => 'Permisos',
            'categories'  => 'Categorías',
            'products'    => 'Productos',
        ];

        // Define CRUD actions
        $crudActions = [
            'view'   => 'Ver',
            'create' => 'Crear',
            'update' => 'Editar',
            'delete' => 'Eliminar',
        ];

        foreach ($modules as $module => $moduleName) {
            foreach ($crudActions as $action => $actionLabel) {
                // Define permission name
                $name = ($action === 'view') ?
                "view-{$module}-module" :
                "{$action}-{$module}";

                // Define permission label
                $label = ($action === 'view') ?
                "Ver {$moduleName}" :
                "{$actionLabel} {$moduleName}";

                // Define cleaner description
                $descriptionText = ($action === 'view') ?
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
