import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Permission {
    id: number;
    name: string;
    label: string;
    module: string;
}

interface Role {
    id?: number;
    name: string;
    label: string;
    description?: string;
    is_active?: boolean;
    guard_name?: string;
    permissions?: Permission[];
}

interface CatalogModule {
    id: number;
    key: string;
    label: string;
}

interface RoleFormProps {
    role?: Role;
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    permissions: Permission[];
    catalogModules: CatalogModule[];
    userPermissions: string[];
}

const RoleForm: React.FC<RoleFormProps> = ({ role, onCancel, onSaved, onDirtyChange, permissions, catalogModules, userPermissions }) => {
    // Cada módulo solo muestra sus propios permisos reales (algunos módulos
    // tienen acciones particulares, ej. Caja tiene Abrir/Cerrar, Finanzas tiene
    // Cancelar Transacciones) en vez de un catálogo genérico de acciones.
    const permissionsByModule = useMemo(() => {
        const map = new Map<number, Permission[]>();
        catalogModules.forEach((module) => {
            map.set(
                module.id,
                permissions.filter((p) => p.module === module.label),
            );
        });
        return map;
    }, [permissions, catalogModules]);

    const initialPermissionIds = useMemo(() => new Set((role?.permissions ?? []).map((p) => p.id)), [role]);

    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
        name: role?.name || '',
        label: role?.label || '',
        description: role?.description || '',
        is_active: true, // Siempre activo
        guard_name: 'web', // Siempre web
        permissions: Array.from(initialPermissionIds),
    });

    const [selectedIds, setSelectedIds] = useState<Set<number>>(initialPermissionIds);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);

    // Actualizar el campo name cada vez que cambie label
    useEffect(() => {
        const generatedName = data.label.toLowerCase().replace(/\s+/g, '-');
        setData('name', generatedName);
    }, [data.label, setData]);

    // Sincronizar selectedIds con el formulario
    useEffect(() => {
        setData('permissions', Array.from(selectedIds));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds]);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    // Textarea autoajustable: crece con el contenido, sin scroll interno
    useEffect(() => {
        const el = descriptionRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, [data.description]);

    const handlePermissionToggle = (permissionId: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(permissionId)) {
                next.delete(permissionId);
            } else {
                next.add(permissionId);
            }
            return next;
        });
    };

    const handleToggleAllInModule = (modulePermissions: Permission[], allSelected: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            modulePermissions.forEach((permission) => {
                if (allSelected) {
                    next.delete(permission.id);
                } else {
                    next.add(permission.id);
                }
            });
            return next;
        });
    };

    const allGloballySelected = permissions.length > 0 && permissions.every((p) => selectedIds.has(p.id));

    const handleToggleAllGlobal = () => {
        setSelectedIds(allGloballySelected ? new Set() : new Set(permissions.map((p) => p.id)));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (role?.id) {
            put(route('roles.update', role.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Rol actualizado correctamente',
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
                        title: 'Error al actualizar el rol',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        } else {
            post(route('roles.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Rol creado correctamente',
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
                        title: 'Error al crear el rol',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        }
    };

    const canSubmit = role?.id ? userPermissions.includes('Actualizar Roles y Permisos') : userPermissions.includes('Crear Roles y Permisos');

    // El rol Administrador siempre conserva todos los permisos (forzado
    // también en el backend) — se deshabilita la edición acá para no
    // sugerir un cambio que el servidor va a ignorar igual.
    const isAdminRole = role?.name === 'admin';
    const isFormValid = data.label.trim() !== '' && (isAdminRole || selectedIds.size > 0);

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-6">
            {/* Información básica */}
            <div className="shrink-0 space-y-2">
                <div>
                    <Label htmlFor="label" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nombre del Rol *
                    </Label>
                    <Input
                        type="text"
                        id="label"
                        value={data.label}
                        onChange={(e) => setData('label', e.target.value)}
                        aria-invalid={!!errors.label}
                        className="w-full"
                        placeholder="Ingrese el nombre del rol"
                    />
                    <InputError message={errors.label} />
                </div>

                <div>
                    <Label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Descripción
                    </Label>
                    <Textarea
                        ref={descriptionRef}
                        id="description"
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        aria-invalid={!!errors.description}
                        rows={1}
                        className="min-h-[42px] w-full resize-none overflow-hidden"
                        placeholder="Descripción del rol (opcional)"
                    />
                    <InputError message={errors.description} />
                </div>

                {/* Campos ocultos */}
                <input type="hidden" name="is_active" value="1" />
                <input type="hidden" name="guard_name" value="web" />
            </div>

            {/* Selección de Permisos */}
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex shrink-0 items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Permisos por Módulo *</label>
                    {!isAdminRole && (
                        <button
                            type="button"
                            onClick={handleToggleAllGlobal}
                            className="text-sm font-medium whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
                        >
                            {allGloballySelected ? 'Desmarcar todo' : 'Marcar todo'}
                        </button>
                    )}
                </div>
                {isAdminRole && (
                    <p className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                        El rol Administrador siempre tiene todos los permisos y no puede modificarse.
                    </p>
                )}
                <div className="min-h-0 flex-1 divide-y divide-gray-200 overflow-y-auto rounded-md border border-gray-200 p-1.5 dark:divide-gray-700 dark:border-gray-700">
                    {catalogModules.map((module) => {
                        const modulePermissions = permissionsByModule.get(module.id) ?? [];
                        if (modulePermissions.length === 0) return null;

                        const selectedCount = modulePermissions.filter((p) => selectedIds.has(p.id)).length;
                        const allSelected = selectedCount === modulePermissions.length;

                        return (
                            <div key={module.id} className="p-4">
                                {/* Título del módulo */}
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{module.label}</span>
                                    <div className="flex shrink-0 items-center gap-2 text-xs">
                                        <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {selectedCount}/{modulePermissions.length}
                                        </span>
                                        {!isAdminRole && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleAllInModule(modulePermissions, allSelected)}
                                                className="font-medium whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                {allSelected ? 'Quitar todos' : 'Marcar todos'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Permisos del módulo, en fila */}
                                <div className="flex flex-wrap gap-x-6 gap-y-2">
                                    {modulePermissions.map((permission) => {
                                        const isSelected = selectedIds.has(permission.id);
                                        return (
                                            <label
                                                key={permission.id}
                                                htmlFor={`permission-${permission.id}`}
                                                className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                            >
                                                <Checkbox
                                                    id={`permission-${permission.id}`}
                                                    checked={isAdminRole ? true : isSelected}
                                                    disabled={isAdminRole}
                                                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                                                />
                                                {permission.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <InputError message={errors.permissions} />
            </div>

            {/* Botones de acción */}
            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing || !isFormValid}>
                        {processing ? 'Guardando...' : role?.id ? 'Actualizar Rol' : 'Crear Rol'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default RoleForm;
