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
import { Link, router } from "@inertiajs/react"
import { Pagination } from "@/components/ui/pagination"
import SearchInput from "@/components/ui/search-input"
import Swal from 'sweetalert2'

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
}

export default function PermissionsTable({
    permissions,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch
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

    return (
        <div className="space-y-4">
            {/* Barra de búsqueda y controles */}
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar permisos por Nombre..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:w-96"
                />

            </div>

            {/* Tabla de permisos */}
            <div className="rounded-md border dark:border-gray-700">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Nombre</TableHead>
                            <TableHead>Módulo</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right w-[120px]">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {permissions.data.length > 0 ? (
                            permissions.data.map((permission) => (
                                <TableRow key={permission.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{permission.label}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-600 text-white font-medium shadow-sm">
                                            {permission.module}
                                        </span>
                                    </TableCell>
                                    <TableCell>{permission.description}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={route('permissions.edit', permission.id)}>
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
