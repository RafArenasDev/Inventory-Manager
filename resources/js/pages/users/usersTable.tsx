import { IconActionButton } from '@/components/icon-action-button';
import { StatusToggle } from '@/components/status-toggle';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Swal from '@/lib/swal';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Pencil, Trash2, Users as UsersIcon } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    is_active: boolean;
}

interface Role {
    id: number;
    name: string;
    label: string;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface UsersTableProps {
    users: {
        data: User[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    roles: Role[];
    perPage: string;
    onPerPageChange: (value: string) => void;
    onEditUser: (user: User) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    userPermissions: string[];
}

export default function UsersTable({
    users,
    perPage,
    onPerPageChange,
    onEditUser,
    totalCount,
    filteredCount,
    search,
    onSearch,
    roles,
    userPermissions,
}: UsersTableProps) {
    const { auth } = usePage<SharedData>().props;

    const handleDelete = (userId: number, userName: string) => {
        Swal.fire({
            title: '¿Estás seguro?',
            text: `Esta acción eliminará al usuario ${userName} permanentemente`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar!',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('users.destroy', userId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Eliminado!',
                            text: 'El usuario ha sido eliminado.',
                            icon: 'success',
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'No se pudo eliminar el usuario.',
                            icon: 'error',
                        });
                    },
                });
            }
        });
    };

    const getRoleLabel = (roleName: string) => {
        if (!roleName) return 'Sin rol';
        const role = roles.find((r) => r.name === roleName);
        return role ? role.label : roleName;
    };

    const showActionsColumn = userPermissions.includes('Editar Usuarios') || userPermissions.includes('Eliminar Usuarios');

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    placeholder="Buscar usuarios por nombre o email..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:max-w-lg"
                />
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Estado</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.data.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-2">
                                        {user.roles.length > 0 ? (
                                            user.roles.map((roleName) => {
                                                const roleLabel = getRoleLabel(roleName);
                                                return (
                                                    <span
                                                        key={roleName}
                                                        className="w-fit min-w-[100px] rounded-full bg-blue-600 px-3 py-0.5 text-center text-xs font-bold text-white shadow-sm dark:bg-blue-700"
                                                    >
                                                        {roleLabel}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="w-fit min-w-[100px] rounded-full bg-gray-200 px-3 py-0.5 text-center text-xs font-medium text-gray-800 shadow-sm dark:bg-gray-600 dark:text-gray-200">
                                                Sin rol
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusToggle
                                        id={user.id}
                                        isActive={user.is_active}
                                        toggleRouteName="users.toggle-active"
                                        entityLabel="usuario"
                                        entityName={user.name}
                                        disabled={user.id === auth.user.id}
                                        disabledReason="No puedes desactivar tu propia cuenta"
                                    />
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Usuarios') && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => onEditUser(user)}
                                                    className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                    label="Editar usuario"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Eliminar Usuarios') && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    disabled={user.id === auth.user.id}
                                                    className="text-red-600 hover:bg-red-100 hover:text-red-700 disabled:pointer-events-auto disabled:opacity-40 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                    label={user.id === auth.user.id ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {users.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 5 : 4} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <UsersIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron usuarios</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={users}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="users.search"
            />
        </div>
    );
}
