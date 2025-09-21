// Modified roleForm.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge"
import { X, ChevronDown } from "lucide-react";
import {
    Checkbox,
} from "@/components/ui/checkbox"

interface Role {
    id?: number;
    name: string;
    label: string;
    description?: string;
    is_active?: boolean;
    guard_name?: string;
    permissions?: number[];
}

interface Permission {
    id: number;
    name: string;
    label: string;
    module: string;
}

interface RoleFormProps {
    role?: Role;
    onCancel: () => void;
    permissions: Record<string, Permission[]>;
    userPermissions: string[];
}

const RoleForm: React.FC<RoleFormProps> = ({ role, onCancel, permissions, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: role?.name || '',
        label: role?.label || '',
        description: role?.description || '',
        is_active: true, // Siempre activo
        guard_name: 'web', // Siempre web
        permissions: role?.permissions || [],
    });

    const [selectedPermissions, setSelectedPermissions] = useState<number[]>(role?.permissions || []);
    // Todos los módulos comprimidos por defecto (array vacío)
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

    // Actualizar el campo name cada vez que cambie label
    useEffect(() => {
        const generatedName = data.label.toLowerCase().replace(/\s+/g, '-');
        setData('name', generatedName);
    }, [data.label, setData]);

    // Sincronizar selectedPermissions con el formulario
    useEffect(() => {
        setData('permissions', selectedPermissions);
    }, [selectedPermissions, setData]);

    const handlePermissionToggle = (permissionId: number) => {
        setSelectedPermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const toggleModule = (module: string) => {
        setExpandedModules(prev =>
            prev.includes(module)
                ? prev.filter(m => m !== module)
                : [...prev, module]
        );
    };

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

    const allPermissions = Object.values(permissions).flat();

    const canSubmit = role?.id
        ? userPermissions.includes('Actualizar Roles')
        : userPermissions.includes('Crear Roles');

    return (
        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
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

                    {/* Campos ocultos */}
                    <input type="hidden" name="is_active" value="1" />
                    <input type="hidden" name="guard_name" value="web" />
                </div>

                {/* Selección de Permisos */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                            Permisos
                        </label>
                        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
                            {Object.entries(permissions).map(([module, modulePermissions]) => {
                                const isExpanded = expandedModules.includes(module);
                                const selectedCount = modulePermissions.filter(p => selectedPermissions.includes(p.id)).length;

                                return (
                                    <div key={module} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                        {/* Header del módulo */}
                                        <div
                                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                            onClick={() => toggleModule(module)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <ChevronDown
                                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                                    {module}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    {selectedCount} de {modulePermissions.length} seleccionados
                                                </span>
                                            </div>
                                        </div>

                                        {/* Contenido colapsable */}
                                        {isExpanded && (
                                            <div className="p-3 bg-gray-50/50 dark:bg-gray-800/20 animate-in slide-in-from-top-2 duration-200">
                                                <div className="space-y-2">
                                                    {modulePermissions.map((permission) => {
                                                        const isSelected = selectedPermissions.includes(permission.id);
                                                        return (
                                                            <div
                                                                key={permission.id}
                                                                className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                                                            >
                                                                <Checkbox
                                                                    id={`permission-${permission.id}`}
                                                                    checked={isSelected}
                                                                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                                                                    className="h-4 w-4 rounded data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                                />
                                                                <label
                                                                    htmlFor={`permission-${permission.id}`}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer text-gray-700 dark:text-gray-300"
                                                                >
                                                                    {permission.label}
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Permisos seleccionados */}
                    {selectedPermissions.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Permisos Seleccionados ({selectedPermissions.length})
                            </label>
                            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800/50">
                                {allPermissions
                                    .filter(p => selectedPermissions.includes(p.id))
                                    .map((permission) => (
                                        <Badge
                                            key={permission.id}
                                            variant="secondary"
                                            className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 text-xs px-3 py-1"
                                        >
                                            <span className="truncate max-w-[120px]">{permission.label}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 -mr-1 hover:bg-blue-200"
                                                onClick={() => handlePermissionToggle(permission.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    )}
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
                            {processing ? 'Guardando...' : (role?.id ? 'Actualizar Rol' : 'Crear Rol')}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default RoleForm;
