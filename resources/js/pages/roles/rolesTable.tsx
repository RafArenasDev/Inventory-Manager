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
import { Link } from "@inertiajs/react"
import { Pagination } from "@/components/ui/pagination" // Ajusta la ruta según tu estructura

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
    permissions: Permission[]
    perPage: string
    onPerPageChange: (value: string) => void
}

const handleDelete = (roleId: number, roleLabel: string) => {
    if (confirm(`¿Estás seguro de eliminar el rol ${roleLabel}?`)) {
        window.location.href = route('roles.destroy', roleId);
    }
};

export default function RolesTable({ roles, perPage, onPerPageChange }: RolesTableProps) {
    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Permisos</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
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
                                            {/* Badge del módulo - Azul más intenso */}
                                            <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-medium w-fit shadow-sm">
                                                {module}
                                            </span>

                                            {/* Contenedor de permisos - Azules más claros */}
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
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Link href={route('roles.edit', role.id)}>
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
                                        onClick={() => handleDelete(role.id, role.label)}
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

            {/* Componente de paginación */}
            <Pagination
                data={roles}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={roles.total}
                filteredCount={0}
                search=""
            />
        </div>
    )
}
