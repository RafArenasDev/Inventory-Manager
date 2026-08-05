import React from 'react';
import { useForm } from '@inertiajs/react';
import Swal from '@/lib/swal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    roles: Role[];
    onCancel: () => void;
    userPermissions: string[];
}

const UserForm: React.FC<UserFormProps> = ({ user, roles, onCancel, userPermissions }) => {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: user?.name || '',
        email: user?.email || '',
        password: user?.password || '',
        confirm_password: user?.confirm_password || '',
        roles: user?.roles || [],
    });

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
                    onCancel();
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
                    onCancel();
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

    const isEditing = !!user?.id;
    const passwordRequired = !isEditing;

    const canSubmit = isEditing
        ? userPermissions.includes('Editar Usuarios')
        : userPermissions.includes('Crear Usuarios');

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contraseña {passwordRequired ? '*' : '(opcional)'}
                    </Label>
                    <Input
                        type="password"
                        id="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full"
                        placeholder={isEditing ? 'Dejar vacío para mantener la contraseña actual' : 'Ingrese la contraseña'}
                        required={passwordRequired}
                        minLength={6}
                    />
                    {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                    <Label
                        htmlFor="confirm_password"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                        Confirmar Contraseña {passwordRequired ? '*' : '(opcional)'}
                    </Label>
                    <Input
                        type="password"
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
                    <Label htmlFor="roles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Roles *
                    </Label>
                    <Select value={currentRoleName} onValueChange={handleRoleChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((role) => (
                                <SelectItem key={role.id} value={role.name}>
                                    {role.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.roles && <p className="mt-1 text-sm text-red-600">{errors.roles}</p>}
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-300 dark:border-gray-600">
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
