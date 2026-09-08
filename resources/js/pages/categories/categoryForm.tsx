import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import React, { useEffect } from 'react';

interface Category {
    id?: number;
    name: string;
    description: string;
}

interface CategoryFormProps {
    category?: Category;
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    userPermissions: string[]; // Añadido
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onCancel, onSaved, onDirtyChange, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
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

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // console.log(`Enviando datos para ${category?.id ? 'editar' : 'crear'} categoría:`, data);

        if (category?.id) {
            put(route('categories.update', category.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Categoría actualizada correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al actualizar la categoría',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        } else {
            post(route('categories.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Categoría creada correctamente',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                    reset();
                    onSaved();
                },
                onError: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'error',
                        title: 'Error al crear la categoría',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        }
    };

    // Verificar permisos para el botón de submit
    const canSubmit = category?.id ? userPermissions.includes('Actualizar Categorías') : userPermissions.includes('Crear Categorías');
    const isFormValid = data.name.trim() !== '';

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto p-1">
                {/* Información básica */}
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre de la Categoría *
                        </Label>
                        <Input
                            type="text"
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            aria-invalid={!!errors.name}
                            className="w-full"
                            placeholder="Ingrese el nombre de la categoría"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div>
                        <Label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Descripción
                        </Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            aria-invalid={!!errors.description}
                            rows={3}
                            className="w-full"
                            placeholder="Descripción de la categoría (opcional)"
                        />
                        <InputError message={errors.description} />
                    </div>
                </div>
            </div>

            {/* Botones de acción */}
            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing || !isFormValid}>
                        {processing ? 'Guardando...' : category?.id ? 'Actualizar Categoría' : 'Crear Categoría'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default CategoryForm;
