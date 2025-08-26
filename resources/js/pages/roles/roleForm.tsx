import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';

interface Role {
    id?: number;
    name: string;
    label: string;
    description?: string;
    is_active?: boolean;
    guard_name?: string;
}

interface Permission {
    id: number;
    name: string;
    label: string;
    // Add other fields as needed
}

interface RoleFormProps {
    role?: Role;
    onCancel: () => void;
    permissions: Record<string, Permission[]>;
}

const RoleForm: React.FC<RoleFormProps> = ({ role, onCancel }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: role?.name || '',
        label: role?.label || '',
        description: role?.description || '',
        is_active: role?.is_active ?? true,
        guard_name: role?.guard_name || 'web',
    });

    // Actualizar el campo name cada vez que cambie label
    useEffect(() => {
        const generatedName = data.label.toLowerCase().replace(/\s+/g, '-');
        setData('name', generatedName);
    }, [data.label, setData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log(`Enviando datos para ${role?.id ? 'editar' : 'crear'} rol:`, data);

        if (role?.id) {
            put(route('roles.update', role.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Rol actualizado correctamente",
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
                        title: "Error al actualizar el rol",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        } else {
            post(route('roles.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Rol creado correctamente",
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
                        title: "Error al crear el rol",
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
            {/* Información básica */}
            <div className="space-y-4">
                <div>
                    <label htmlFor="label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre del Rol *
                    </label>
                    <input
                        type="text"
                        id="label"
                        value={data.label}
                        onChange={(e) => setData('label', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                        placeholder="Ingrese el nombre del rol"
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
                        placeholder="Descripción del rol (opcional)"
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={data.is_active}
                        onChange={(e) => setData('is_active', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <label htmlFor="is_active" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Activo
                    </label>
                    {errors.is_active && <p className="mt-1 text-sm text-red-600">{errors.is_active}</p>}
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
                    {processing ? 'Guardando...' : (role?.id ? 'Actualizar Rol' : 'Crear Rol')}
                </Button>
            </div>
        </form>
    );
};

export default RoleForm;



