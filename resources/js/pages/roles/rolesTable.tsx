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
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
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
                                                <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-medium w-fit shadow-sm">
                                                    {module}
                                                </span>
                                                <div className="flex flex-wrap gap-2 pl-3">
                                                    {modulePermissions.map((permission) => (
                                                        <span
                                                            key={permission.id}
                                                            className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium"
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
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => onEditRole(role)}
                                                    className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Roles') && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleDelete(role.id, role.label)}
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
