import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import Swal from 'sweetalert2';

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
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

    const getRoleBadgeStyle = (roleLabel: string) => {
        const baseStyle = 'text-xs px-3 py-1 rounded-full text-center min-w-[100px]';

        if (roleLabel === 'Administrador') {
            return `${baseStyle} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
        } else if (roleLabel === 'Vendedor') {
            return `${baseStyle} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
        }

        return `${baseStyle} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
    };

    const showActionsColumn = userPermissions.includes('Editar Usuarios') || userPermissions.includes('Eliminar Usuarios');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar usuarios por Nombre o Email..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:w-96"
                />
            </div>

            <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
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
                                                    <span key={roleName} className={getRoleBadgeStyle(roleLabel)}>
                                                        {roleLabel}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="text-xs text-gray-500">Sin rol</span>
                                        )}
                                    </div>
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Usuarios') && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => onEditUser(user)}
                                                    className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Usuarios') && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
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
            />
        </div>
    );
}
