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
import Swal from '@/lib/swal';

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
    onEditPermission?: (permission: Permission) => void;
    userPermissions: string[];
}

export default function PermissionsTable({
    permissions,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onEditPermission,
    userPermissions
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

    // Check if the user has any permissions to show the "Acciones" column
    const showActionsColumn = userPermissions.includes('Editar Permisos') || userPermissions.includes('Eliminar Permisos');

    return (
        <div className="space-y-4">
            {/* Barra de búsqueda y controles */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <SearchInput
                    placeholder="Buscar permisos por nombre o módulo..."
                    searchValue={search}
                    onSearch={onSearch}
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
                            {showActionsColumn && <TableHead className="text-right w-[120px]">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissions.data.length > 0 ? (
                            permissions.data.map((permission) => (
                                <TableRow key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableCell>
                                        <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-bold w-fit min-w-[100px] flex justify-center items-center shadow-sm dark:bg-blue-700">
                                            {permission.module}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="font-semibold">{permission.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600 dark:text-gray-300">
                                        {permission.description || '-'}
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {userPermissions.includes('Editar Permisos') && (
                                                    <Button
                                                        variant="default"
                                                        size="icon"
                                                        onClick={(e) => handleEdit(permission, e)}
                                                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                        aria-label="Editar permiso"
                                                    >
                                                        <Pencil className="h-4 w-4 text-white" />
                                                    </Button>
                                                )}
                                                {userPermissions.includes('Eliminar Permisos') && (
                                                    <Button
                                                        variant="default"
                                                        size="icon"
                                                        onClick={() => handleDelete(permission.id, permission.label)}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                        aria-label="Eliminar permiso"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-white" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 4 : 3} className="text-center py-8 text-gray-500 dark:text-gray-400">
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
