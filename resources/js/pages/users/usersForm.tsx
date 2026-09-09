import InputError from '@/components/input-error';
import { PasswordRequirements } from '@/components/password-requirements';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { generateSecurePassword } from '@/lib/generate-password';
import { passwordMeetsPolicy } from '@/lib/password-policy';
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

    // En edición, la contraseña es opcional — pero si se toca CUALQUIERA de
    // los dos campos (password o confirmación), ambos pasan a exigirse
    // completos y coincidentes, para no permitir un envío a medias.
    const passwordTouched = data.password.length > 0 || data.confirm_password.length > 0;
    const passwordMustValidate = passwordRequired || passwordTouched;
    const passwordPolicyOk = passwordMeetsPolicy(data.password);
    const passwordsMatch = data.password.length > 0 && data.password === data.confirm_password;
    const passwordOk = passwordMustValidate ? passwordPolicyOk && passwordsMatch : true;

    const isFormValid = data.name.trim() !== '' && data.email.trim() !== '' && data.roles.length > 0 && passwordOk;

    const canSubmit = isEditing ? userPermissions.includes('Editar Usuarios') : userPermissions.includes('Crear Usuarios');

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto p-1">
                <div className="space-y-2">
                    <div>
                        <Label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nombre *
                        </Label>
                        <Input
                            type="text"
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            aria-invalid={!!errors.name}
                            className="w-full"
                            placeholder="Ingrese el nombre del usuario"
                        />
                        <InputError message={errors.name} />
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
                            aria-invalid={!!errors.email}
                            className="w-full"
                            placeholder="Ingrese el email del usuario"
                        />
                        <InputError message={errors.email} />
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
                            aria-invalid={!!errors.password}
                            className="w-full"
                            placeholder={isEditing ? 'Dejar vacío para mantener la contraseña actual' : 'Ingrese la contraseña'}
                        />
                        {(passwordRequired || passwordTouched) && <PasswordRequirements value={data.password} />}
                        <InputError message={errors.password} />
                    </div>

                    <div>
                        <Label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Confirmar Contraseña {passwordRequired ? '*' : '(opcional)'}
                        </Label>
                        <PasswordInput
                            id="confirm_password"
                            value={data.confirm_password}
                            onChange={(e) => setData('confirm_password', e.target.value)}
                            aria-invalid={!!errors.confirm_password || (passwordTouched && data.confirm_password.length > 0 && !passwordsMatch)}
                            className="w-full"
                            placeholder={isEditing ? 'Dejar vacío para mantener la contraseña actual' : 'Confirme la contraseña'}
                        />
                        <InputError
                            message={
                                errors.confirm_password ||
                                (passwordTouched && data.confirm_password.length > 0 && !passwordsMatch ? 'Las contraseñas no coinciden.' : undefined)
                            }
                        />
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
                            <ComboboxInput placeholder="Seleccione un rol" aria-invalid={!!errors.roles} className="w-full" />
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
                        <InputError message={errors.roles} />
                    </div>
                </div>
            </div>

            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" onClick={onCancel} variant="outline" disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing || !isFormValid}>
                        {processing ? 'Guardando...' : isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default UserForm;
