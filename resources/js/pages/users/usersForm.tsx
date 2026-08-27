import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { generateSecurePassword } from '@/lib/generate-password';
import Swal from '@/lib/swal';
import { useForm } from '@inertiajs/react';
import { Wand2 } from 'lucide-react';
import React, { useEffect } from 'react';

interface Role {
    id: number;
    name: string;
    label: string;
}

interface User {
    id?: number;
    name: string;
    email: string;
    roles: string[];
    password?: string;
    confirm_password?: string;
}

interface UserFormProps {
    user?: User;
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    roles: Role[];
    userPermissions: string[];
}

const UserForm: React.FC<UserFormProps> = ({ user, roles, onCancel, onSaved, onDirtyChange, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset, isDirty } = useForm({
        name: user?.name || '',
        email: user?.email || '',
        password: user?.password || '',
        confirm_password: user?.confirm_password || '',
        roles: user?.roles || [],
    });

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const currentRoleName = data.roles?.[0] || '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (user?.id) {
            put(route('users.update', user.id), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Usuario actualizado correctamente',
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
                        title: 'Error al actualizar el usuario',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        } else {
            post(route('users.store'), {
                onSuccess: () => {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Usuario creado correctamente',
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
                        title: 'Error al crear el usuario',
                        text: 'Verifica los datos ingresados.',
                        showConfirmButton: false,
                        timer: 2200,
                    });
                },
            });
        }
    };

    const handleRoleChange = (value: string) => {
        setData('roles', [value]);
    };

    const handleGeneratePassword = () => {
        const generated = generateSecurePassword();
        setData((current) => ({
            ...current,
            password: generated,
            confirm_password: generated,
        }));
    };

    const isEditing = !!user?.id;
    const passwordRequired = !isEditing;

    const canSubmit = isEditing ? userPermissions.includes('Editar Usuarios') : userPermissions.includes('Crear Usuarios');

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Nombre *
                    </Label>
                    <Input
                        type="text"
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el nombre del usuario"
                        required
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                    <Label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email *
                    </Label>
                    <Input
                        type="email"
                        id="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full"
                        placeholder="Ingrese el email del usuario"
                        required
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Contraseña {passwordRequired ? '*' : '(opcional)'}
                        </Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGeneratePassword}
                            className="h-auto gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                        >
                            <Wand2 className="h-3 w-3" />
                            Generar contraseña
                        </Button>
                    </div>
                    <PasswordInput
                        id="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full"
                        placeholder={isEditing ? 'Dejar vacío para mantener la contraseña actual' : 'Ingrese la contraseña'}
                        required={passwordRequired}
                        minLength={12}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Mínimo 12 caracteres, con mayúsculas, minúsculas, números y símbolos.
                    </p>
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                    <Label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirmar Contraseña {passwordRequired ? '*' : '(opcional)'}
                    </Label>
                    <PasswordInput
                        id="confirm_password"
                        value={data.confirm_password}
                        onChange={(e) => setData('confirm_password', e.target.value)}
                        className="w-full"
                        placeholder={isEditing ? 'Dejar vacío para mantener la contraseña actual' : 'Confirme la contraseña'}
                        required={passwordRequired}
                    />
                    {errors.confirm_password && <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>}
                </div>

                <div>
                    <Label htmlFor="roles" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Roles *
                    </Label>
                    <Combobox
                        items={roles}
                        itemToStringLabel={(r: Role) => r.label}
                        itemToStringValue={(r: Role) => r.name}
                        value={roles.find((r) => r.name === currentRoleName) ?? null}
                        onValueChange={(r: Role | null) => handleRoleChange(r?.name ?? '')}
                    >
                        <ComboboxInput placeholder="Seleccione un rol" className="w-full" />
                        <ComboboxContent>
                            <ComboboxEmpty>No se encontraron roles.</ComboboxEmpty>
                            <ComboboxList>
                                {(role: Role) => (
                                    <ComboboxItem key={role.id} value={role}>
                                        {role.label}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.roles && <p className="mt-1 text-sm text-red-600">{errors.roles}</p>}
                </div>
            </div>

            <div className="flex justify-end space-x-3 border-t border-gray-300 pt-4 dark:border-gray-600">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Guardando...' : isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default UserForm;
