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

    const showActionsColumn = userPermissions.includes('Editar Usuarios') || userPermissions.includes('Eliminar Usuarios');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar usuarios por Nombre o Email..."
                    searchValue={search}
                    onSearch={onSearch}
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
                                                    <span
                                                        key={roleName}
                                                        className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-bold w-fit min-w-[100px] text-center shadow-sm dark:bg-blue-700"
                                                    >
                                                        {roleLabel}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="text-xs px-3 py-1 rounded-full bg-gray-200 text-gray-800 font-medium w-fit min-w-[100px] text-center shadow-sm dark:bg-gray-600 dark:text-gray-200">
                                                Sin rol
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Usuarios') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onEditUser(user)}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                    aria-label="Editar usuario"
                                                >
                                                    <Pencil className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Usuarios') && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => handleDelete(user.id, user.name)}
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    aria-label="Eliminar usuario"
                                                >
                                                    <Trash2 className="h-4 w-4 text-white" />
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
