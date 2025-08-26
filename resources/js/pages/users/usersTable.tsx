import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "@inertiajs/react";
import { Pagination } from "@/components/ui/pagination";
import SearchInput from "@/components/ui/search-input";

interface User {
    id: number;
    name: string;
    email: string;
    roles: string;
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
        data: User[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    roles: Role[]
    perPage: string
    onPerPageChange: (value: string) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
}


export default function UsersTable({
    users,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch
}: UsersTableProps) {
    const handleDelete = (userId: number, userName: string) => {
        if (confirm(`¿Estás seguro de eliminar al usuario ${userName}?`)) {
            window.location.href = route('users.destroy', userId);
        }
    };

    // Función para determinar el estilo del badge según el rol
    const getRoleBadgeStyle = (roleLabel: string) => {
        const baseStyle = "text-xs px-3 py-1 rounded-full text-center min-w-[100px]";

        if (roleLabel === 'Administrador') {
            return `${baseStyle} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
        } else if (roleLabel === 'Vendedor') {
            return `${baseStyle} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
        }

        return `${baseStyle} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`;
    };

    return (
        <div className="space-y-4">
            {/* Barra de búsqueda y controles */}
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
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.data.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-2">
                                        {user.roles && user.roles.split(', ').map((roleLabel, index) => (
                                            <span
                                                key={index}
                                                className={getRoleBadgeStyle(roleLabel)}
                                            >
                                                {roleLabel}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Link href={route('users.edit', user.id)}>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
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
                search=""
            />
        </div>
    );
}
