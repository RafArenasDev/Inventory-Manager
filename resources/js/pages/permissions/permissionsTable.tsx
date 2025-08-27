import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { router } from "@inertiajs/react"
import { Pagination } from "@/components/ui/pagination"
import SearchInput from "@/components/ui/search-input"
import Swal from 'sweetalert2'
import { Badge } from "@/components/ui/badge" // Importar componente Badge

interface Permission {
    id: number;
    name: string;
    label: string;
    module: string;
    description: string;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface PermissionsTableProps {
    permissions: {
        data: Permission[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
        per_page: number;
    };
    perPage: string;
    onPerPageChange: (value: string) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    onEditPermission?: (permission: Permission) => void; // Añadir esta prop
}

export default function PermissionsTable({
    permissions,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onEditPermission // Añadir esta prop
}: PermissionsTableProps) {

    const handleDelete = (permissionId: number, permissionLabel: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará el permiso "${permissionLabel}" permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('permissions.destroy', permissionId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminado!",
                            text: "El permiso ha sido eliminado.",
                            icon: "success",
                            timer: 2000,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar el permiso.",
                            icon: "error"
                        });
                    }
                });
            }
        });
    };

    const handleEdit = (permission: Permission, e: React.MouseEvent) => {
        e.preventDefault();
        if (onEditPermission) {
            onEditPermission(permission);
        } else {
            router.visit(route('permissions.edit', permission.id));
        }
    };

    return (
        <div className="space-y-4">
            {/* Barra de búsqueda y controles */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <SearchInput
                    placeholder="Buscar permisos por nombre o módulo..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:w-96"
                />
            </div>

            {/* Tabla de permisos */}
            <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Módulo</TableHead>
                            <TableHead className="w-[200px]">Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right w-[120px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissions.data.length > 0 ? (
                            permissions.data.map((permission) => (
                                <TableRow key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {permission.module}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{permission.name}</span>
                                            {/* <span className="text-xs text-gray-500 dark:text-gray-400">{permission.name}</span> */}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-300">
                                        {permission.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => handleEdit(permission, e)}
                                                className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleDelete(permission.id, permission.label)}
                                                className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    No se encontraron permisos
                                    {search && (
                                        <span>
                                            {' '}para "<span className="font-medium">{search}</span>"
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginación */}
            <Pagination
                data={permissions}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
            />
        </div>
    );
}
