import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';

interface Category {
    id?: number;
    name: string;
    description: string;
}

interface CategoryFormProps {
    category?: Category;
    onCancel: () => void;
    userPermissions: string[]; // Añadido
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onCancel, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: category?.name || '',
        description: category?.description || '',
    });

    useEffect(() => {
        if (category) {
            setData({
                name: category.name || '',
                description: category.description || '',
            });
        }
    }, [category, setData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log(`Enviando datos para ${category?.id ? 'editar' : 'crear'} categoría:`, data);

        if (category?.id) {
            put(route('categories.update', category.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Categoría actualizada correctamente",
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
                        title: "Error al actualizar la categoría",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        } else {
            post(route('categories.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: "center",
                        icon: "success",
                        title: "Categoría creada correctamente",
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
                        title: "Error al crear la categoría",
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                },
            });
        }
    };

    // Verificar permisos para el botón de submit
    const canSubmit = category?.id
        ? userPermissions.includes('Actualizar Categorías')
        : userPermissions.includes('Crear Categorías');

    return (
        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información básica */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre de la Categoría *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                            placeholder="Ingrese el nombre de la categoría"
                            required
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
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
                            placeholder="Descripción de la categoría (opcional)"
                        />
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        onClick={onCancel}
                        variant="outline"
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    {canSubmit && (
                        <Button
                            type="submit"
                            disabled={processing}
                        >
                            {processing ? 'Guardando...' : (category?.id ? 'Actualizar Categoría' : 'Crear Categoría')}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;
