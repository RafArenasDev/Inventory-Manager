<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Cada módulo solo recibe los permisos que realmente verifica algún
     * middleware de ruta o gating de UI (ver routes/web.php y los
     * userPermissions.includes(...) del frontend) — no todos los módulos
     * necesitan el CRUD completo (ej. Ventas no se edita, Caja no se elimina).
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissionsByModule = [
            'Dashboard' => [
                'Exportar Dashboard' => 'Permite exportar los datos del dashboard a Excel o PDF',
            ],
            'Roles y Permisos' => [
                'Ver Roles y Permisos' => 'Permite ver el módulo de Roles y Permisos',
                'Crear Roles y Permisos' => 'Permite crear roles y sus permisos',
                'Editar Roles y Permisos' => 'Permite abrir la edición de un rol',
                'Actualizar Roles y Permisos' => 'Permite guardar cambios en un rol y sus permisos',
                'Eliminar Roles y Permisos' => 'Permite eliminar roles',
            ],
            'Usuarios' => [
                'Ver Usuarios' => 'Permite ver el módulo de Usuarios',
                'Crear Usuarios' => 'Permite crear usuarios',
                'Editar Usuarios' => 'Permite abrir la edición de un usuario',
                'Actualizar Usuarios' => 'Permite guardar cambios en un usuario',
                'Eliminar Usuarios' => 'Permite eliminar usuarios',
            ],
            'Proveedores' => [
                'Ver Proveedores' => 'Permite ver el módulo de Proveedores',
                'Crear Proveedores' => 'Permite crear proveedores',
                'Editar Proveedores' => 'Permite abrir la edición de un proveedor',
                'Actualizar Proveedores' => 'Permite guardar cambios en un proveedor',
                'Eliminar Proveedores' => 'Permite eliminar proveedores',
                'Exportar Proveedores' => 'Permite exportar los proveedores a Excel',
            ],
            'Categorías' => [
                'Ver Categorías' => 'Permite ver el módulo de Categorías',
                'Crear Categorías' => 'Permite crear categorías',
                'Actualizar Categorías' => 'Permite editar categorías',
                'Eliminar Categorías' => 'Permite eliminar categorías',
            ],
            'Productos' => [
                'Ver Productos' => 'Permite ver el módulo de Productos',
                'Crear Productos' => 'Permite crear productos',
                'Editar Productos' => 'Permite abrir la edición de un producto',
                'Actualizar Productos' => 'Permite guardar cambios en un producto',
                'Eliminar Productos' => 'Permite eliminar productos',
                'Exportar Productos' => 'Permite exportar los productos a Excel',
            ],
            'Movimientos Inventario' => [
                'Ver Movimientos Inventario' => 'Permite ver el módulo de Movimientos de Inventario',
                'Crear Movimientos Inventario' => 'Permite registrar movimientos de inventario',
                'Editar Movimientos Inventario' => 'Permite abrir la edición de un movimiento',
                'Actualizar Movimientos Inventario' => 'Permite guardar cambios en un movimiento',
                'Exportar Movimientos Inventario' => 'Permite exportar los movimientos de inventario a Excel',
            ],
            'Clientes' => [
                'Ver Clientes' => 'Permite ver el módulo de Clientes',
                'Crear Clientes' => 'Permite crear clientes',
                'Editar Clientes' => 'Permite editar clientes',
                'Eliminar Clientes' => 'Permite eliminar clientes',
            ],
            'Ventas' => [
                'Ver Ventas' => 'Permite ver el módulo de Ventas',
                'Crear Ventas' => 'Permite registrar ventas',
                'Eliminar Ventas' => 'Permite anular ventas',
                'Exportar Ventas' => 'Permite exportar las ventas a Excel',
            ],
            'Finanzas' => [
                'Ver Finanzas' => 'Permite ver el módulo de Finanzas',
                'Crear Finanzas' => 'Permite registrar transacciones',
                'Editar Finanzas' => 'Permite editar transacciones',
                'Cancelar Finanzas' => 'Permite cancelar transacciones',
                'Exportar Transacciones' => 'Permite exportar las transacciones a Excel',
                'Gestionar Categorías Transacciones' => 'Permite crear, editar y eliminar categorías de transacciones',
            ],
            'Pedidos' => [
                'Ver Pedidos' => 'Permite ver el módulo de Pedidos a proveedores',
                'Crear Pedidos' => 'Permite solicitar un pedido a un proveedor',
                'Actualizar Pedidos' => 'Permite cancelar un pedido o editar sus notas',
                'Eliminar Pedidos' => 'Permite eliminar pedidos',
                'Exportar Pedidos' => 'Permite exportar los pedidos a Excel',
            ],
            'Caja' => [
                'Ver Caja' => 'Permite ver el módulo de Caja',
                'Crear Caja' => 'Permite abrir la caja diaria',
                'Actualizar Caja' => 'Permite cerrar la caja diaria',
                'Exportar Caja' => 'Permite exportar los registros de caja a Excel',
            ],
            'Auditoría' => [
                'Ver Auditoría' => 'Permite ver el historial de auditoría de acciones críticas',
                'Exportar Auditoría' => 'Permite exportar el historial de auditoría a Excel',
            ],
        ];

        // El `name` es el identificador técnico que valida el middleware de
        // rutas y no puede cambiar; el `label` es el texto que ve el usuario.
        // Aquí se ajustan los labels que no calzan con el nombre técnico
        // genérico (ej. "Crear/Actualizar Caja" son en realidad Abrir/Cerrar).
        $customLabels = [
            'Crear Caja' => 'Abrir Caja',
            'Actualizar Caja' => 'Cerrar Caja',
        ];

        foreach ($permissionsByModule as $module => $perms) {
            foreach ($perms as $name => $description) {
                Permission::updateOrCreate(
                    ['name' => $name, 'guard_name' => 'web'],
                    [
                        'module' => $module,
                        'label' => $customLabels[$name] ?? $name,
                        'description' => $description,
                    ]
                );
            }
        }
    }
}
