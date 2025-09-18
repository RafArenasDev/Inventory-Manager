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
    const actions = [
        { value: 'Ver', label: 'Ver' },
        { value: 'Crear', label: 'Crear' },
        { value: 'Editar', label: 'Editar' },
        { value: 'Actualizar', label: 'Actualizar' },
        { value: 'Eliminar', label: 'Eliminar' }
    ];

    const modules = [
        { value: 'Usuarios', label: 'Usuarios' },
        { value: 'Roles', label: 'Roles' },
        { value: 'Permisos', label: 'Permisos' },
        { value: 'Categorías', label: 'Categorías' },
        { value: 'Productos', label: 'Productos' },
        { value: 'Reportes', label: 'Reportes' }
    ];

    const initialPermission = permission || { name: '', label: '', module: '', description: '' };
    const initialAction = initialPermission.name ? initialPermission.name.split(' ')[0] : '';
    const initialModule = initialPermission.module || '';

    const { data, setData, post, put, processing, errors, reset } = useForm({
        action: initialAction,
        module: initialModule,
        label: initialPermission.label || '',
        description: initialPermission.description || '',
        name: initialPermission.name || '',
    });

    const generatePermissionNameAndLabel = (action: string, module: string) => {
        if (!action || !module) return { name: '', label: '' };
        const name = `${action} ${module}`;
        return { name, label: name };
    };

    const generateDescription = (action: string, module: string) => {
        if (!action || !module) return '';
        return action === 'Ver' ? `Permite ver el módulo de ${module}` : `Permite ${action.toLowerCase()} ${module}`;
    };

    useEffect(() => {
        const { name, label } = generatePermissionNameAndLabel(data.action, data.module);
        const description = generateDescription(data.action, data.module);
        setData({ ...data, name, label, description });
    }, [data.action, data.module]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (permission?.id) {
            console.log('Valores originales (BD):', permission);
            console.log('Nuevos valores enviados:', data);
        } else {
            console.log('Creando nuevo permiso:', data);
        }
        const routeAction = permission?.id ? put : post;
        const routeName = permission?.id ? 'permissions.update' : 'permissions.store';
        const routeParams = permission?.id ? permission.id : undefined;

        routeAction(route(routeName, routeParams), {
            onSuccess: () => {
                Swal.fire({
                    position: "center",
                    icon: "success",
                    title: permission?.id ? "Permiso actualizado correctamente" : "Permiso creado correctamente",
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
                    title: permission?.id ? "Error al actualizar el permiso" : "Error al crear el permiso",
                    text: 'Verifica los datos ingresados.',
                    showConfirmButton: false,
                    timer: 2200
                });
            },
        });
    };

    return (
        <div className="space-y-6">
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
                        Formato: Acción Módulo (en español). Ej: Ver Usuarios, Crear Categorías
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
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                        rows={3}
                        placeholder="Descripción generada automáticamente"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>
            </div>

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
                    type="button"
                    onClick={handleSubmit}
                    disabled={processing}
                >
                    {processing ? 'Guardando...' : (permission?.id ? 'Actualizar Permiso' : 'Crear Permiso')}
                </Button>
            </div>
        </div>
    );
};

export default PermissionForm;
