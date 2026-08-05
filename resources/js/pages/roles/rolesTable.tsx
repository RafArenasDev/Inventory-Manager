import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { IconActionButton } from "@/components/icon-action-button"
import { Pencil, Shield, Trash2 } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from '@/lib/swal';
import SearchInput from "@/components/ui/search-input"

interface Role {
    id: number
    name: string
    label: string
    description: string
    permissions: Permission[]
    created_at: string
    updated_at: string
}

interface Permission {
    id: number
    name: string
    label: string
    module: string
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface RolesTableProps {
    roles: {
        data: Role[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    permissions: Record<string, Permission[]>
    perPage: string
    onPerPageChange: () => void
    onEditRole: (role: Role) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
    userPermissions: string[]
}

export default function RolesTable({
    roles,
    perPage,
    onPerPageChange,
    onEditRole,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions
}: RolesTableProps) {

    const handleDelete = (roleId: number, roleLabel: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará el rol ${roleLabel} permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('roles.destroy', roleId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminado!",
                            text: "El rol ha sido eliminado.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar el rol.",
                            icon: "error"
                        });
                    }
                });
            }
        });
    };

    // Check if the user has any permissions to show the "Acciones" column
    const showActionsColumn = userPermissions.includes('Editar Roles') || userPermissions.includes('Eliminar Roles');

    return (
        <div className="space-y-4">
            {/* Añadimos el SearchInput aquí */}
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por Nombre..."
                    searchValue={search}
                    onSearch={onSearch}
                />
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Permisos</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.data.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell>{role.label}</TableCell>
                                <TableCell>{role.description}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-3">
                                        {Object.entries(
                                            role.permissions.reduce((acc, permission) => {
                                                if (!acc[permission.module]) {
                                                    acc[permission.module] = [];
                                                }
                                                acc[permission.module].push(permission);
                                                return acc;
                                            }, {} as Record<string, Permission[]>)
                                        ).map(([module, modulePermissions]) => (
                                            <div key={module} className="flex flex-col gap-1.5">
                                                <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-bold w-fit shadow-sm dark:bg-blue-700">
                                                    {module}
                                                </span>
                                                <div className="flex flex-wrap gap-2 pl-3">
                                                    {modulePermissions.map((permission) => (
                                                        <span
                                                            key={permission.id}
                                                            className="text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-800 font-medium border border-gray-300 shadow-sm dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500"
                                                        >
                                                            {permission.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Roles') && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => onEditRole(role)}
                                                    className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                    label="Editar rol"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Eliminar Roles') && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleDelete(role.id, role.label)}
                                                    className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                    label="Eliminar rol"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </IconActionButton>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {roles.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 4 : 3} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Shield className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron roles</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={roles}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
            />
        </div>
    )
}
