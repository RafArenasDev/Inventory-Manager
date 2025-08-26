import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';

interface Permission {
    id?: number;
    name: string;
    label: string;
    module: string;
    description?: string;
    guard_name?: string;
}

interface PermissionFormProps {
    permission?: Permission;
    onCancel: () => void;
}

const PermissionForm: React.FC<PermissionFormProps> = ({ permission, onCancel }) => {
    // Mapeo de acciones en español a inglés
    const actions = [
        { value: 'view', label: 'Ver' },
        { value: 'create', label: 'Crear' },
        { value: 'update', label: 'Editar' },
        { value: 'delete', label: 'Eliminar' }
    ];

    // Módulos disponibles
    const modules = [
        { value: 'users', label: 'Usuarios' },
        { value: 'roles', label: 'Roles' },
        { value: 'permissions', label: 'Permisos' },
        { value: 'categories', label: 'Categorías' },
        { value: 'products', label: 'Productos' },
        { value: 'reports', label: 'Reportes' }
    ];

    // Extraer acción y módulo del nombre del permiso si existe (para edición)
    const extractActionAndModule = (name: string = '') => {
        if (!name) return { action: '', module: '' };

        const parts = name.split('-');
        if (parts.length < 2) return { action: '', module: '' };

        // Para permisos view-module-module
        if (parts[0] === 'view' && parts.length === 3) {
            return { action: 'view', module: parts[1] };
        }

        return { action: parts[0], module: parts[1] };
    };

    const initialPermission = permission || { name: '', label: '', module: '', description: '' };
    const { action: initialAction, module: initialModule } = extractActionAndModule(initialPermission.name);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        action: initialAction,
        module: initialModule,
        label: initialPermission.label || '',
        description: initialPermission.description || '',
        name: initialPermission.name || '',
    });

    // Función para generar el name en formato correcto
    const generatePermissionName = (action: string, module: string) => {
        if (!action || !module) return '';

        // Formato especial para view (view-module-module)
        if (action === 'view') {
            return `view-${module}-module`;
        }

        // Formato estándar para otros (action-module)
        return `${action}-${module}`;
    };

    // Función para generar el label descriptivo
    const generatePermissionLabel = (action: string, module: string) => {
        if (!action || !module) return '';

        const actionMap: Record<string, string> = {
            'view': 'Ver',
            'create': 'Crear',
            'update': 'Editar',
            'delete': 'Eliminar'
        };

        const moduleMap: Record<string, string> = {
            'users': 'Usuarios',
            'roles': 'Roles',
            'permissions': 'Permisos',
            'categories': 'Categorías',
            'products': 'Productos'
        };

        const actionLabel = actionMap[action] || action;
        const moduleLabel = moduleMap[module] || module;

        return `${actionLabel} ${moduleLabel}`;
    };

    // Actualizar name y label cuando cambien action o module
    useEffect(() => {
        const generatedName = generatePermissionName(data.action, data.module);
        const generatedLabel = generatePermissionLabel(data.action, data.module);

        setData({
            ...data,
            name: generatedName,
            label: generatedLabel
        });
    }, [data.action, data.module]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (permission?.id) {
            put(route('permissions.update', permission.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Permiso actualizado correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onCancel();
                },
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al actualizar el permiso",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        } else {
            post(route('permissions.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Permiso creado correctamente",
                        showConfirmButton: false,
                        timer: 2200
                    });
                    reset();
                    onCancel();
                },
                onError: () => {
                    Swal.fire({
                        position: "center",
                        icon: "error",
                        title: "Error al crear el permiso",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label htmlFor="action" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Acción *
                    </label>
                    <select
                        id="action"
                        value={data.action}
                        onChange={(e) => setData('action', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                        required
                    >
                        <option value="">Seleccione una acción</option>
                        {actions.map((action) => (
                            <option key={action.value} value={action.value}>
                                {action.label}
                            </option>
                        ))}
                    </select>
                    {errors.action && <p className="mt-1 text-sm text-red-600">{errors.action}</p>}
                </div>

                <div>
                    <label htmlFor="module" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Módulo *
                    </label>
                    <select
                        id="module"
                        value={data.module}
                        onChange={(e) => setData('module', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                        required
                    >
                        <option value="">Seleccione un módulo</option>
                        {modules.map((module) => (
                            <option key={module.value} value={module.value}>
                                {module.label}
                            </option>
                        ))}
                    </select>
                    {errors.module && <p className="mt-1 text-sm text-red-600">{errors.module}</p>}
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre técnico *
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={data.name}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Formato: acción-módulo (en inglés). Ej: view-users-module, create-categories
                    </p>
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre descriptivo *
                    </label>
                    <input
                        type="text"
                        id="label"
                        value={data.label}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        required
                    />
                    {errors.label && <p className="mt-1 text-sm text-red-600">{errors.label}</p>}
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descripción
                    </label>
                    <textarea
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                        placeholder="Descripción detallada del permiso (opcional)"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300 dark:border-gray-600">
                <Button
                    type="button"
                    onClick={onCancel}
                    variant="outline"
                    disabled={processing}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={processing}
                >
                    {processing ? 'Guardando...' : (permission?.id ? 'Actualizar Permiso' : 'Crear Permiso')}
                </Button>
            </div>
        </form>
    );
};

export default PermissionForm;
