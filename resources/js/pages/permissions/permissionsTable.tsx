import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { IconActionButton } from "@/components/icon-action-button"
import { Key, Pencil, Trash2 } from "lucide-react"
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

    const canEdit = userPermissions.includes('Editar Permisos');
    const canDelete = userPermissions.includes('Eliminar Permisos');
    const showActionsColumn = canEdit || canDelete;

    const groupedByModule = permissions.data.reduce((acc, permission) => {
        if (!acc[permission.module]) {
            acc[permission.module] = [];
        }
        acc[permission.module].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

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

            {/* Tabla de permisos, agrupada por módulo */}
            <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead className="w-[180px]">Módulo</TableHead>
                            <TableHead>Permisos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(groupedByModule).length > 0 ? (
                            Object.entries(groupedByModule).map(([module, modulePermissions]) => (
                                <TableRow key={module} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                    <TableCell className="align-top">
                                        <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-bold w-fit shadow-sm dark:bg-blue-700">
                                            {module}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            {modulePermissions.map((permission) => (
                                                <div
                                                    key={permission.id}
                                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-white/5 pl-3 pr-1 py-1 text-xs"
                                                    title={permission.description || undefined}
                                                >
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                                        {permission.label}
                                                    </span>
                                                    {showActionsColumn && (
                                                        <div className="flex items-center">
                                                            {canEdit && (
                                                                <IconActionButton
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                                    label={`Editar permiso: ${permission.label}`}
                                                                    onClick={() => onEditPermission?.(permission)}
                                                                >
                                                                    <Pencil className="h-3 w-3" />
                                                                </IconActionButton>
                                                            )}
                                                            {canDelete && (
                                                                <IconActionButton
                                                                    variant="ghost"
                                                                    className="h-6 w-6 text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                                    label={`Eliminar permiso: ${permission.label}`}
                                                                    onClick={() => handleDelete(permission.id, permission.label)}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </IconActionButton>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Key className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">
                                            No se encontraron permisos
                                            {search && (
                                                <>
                                                    {' '}para "<span className="font-medium">{search}</span>"
                                                </>
                                            )}
                                        </span>
                                    </div>
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
