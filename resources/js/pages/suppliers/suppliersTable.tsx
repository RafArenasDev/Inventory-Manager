import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Phone } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
import SearchInput from "@/components/ui/search-input"

interface Supplier {
    id: number
    name: string
    representative: string | null
    nit_number: number
    nit_digit: string
    phone: string | null
    cellphone: string | null
    address: string | null
    email: string | null
    description: string | null
    products_count: number
    main_contact: string
    main_phone: string
    created_at: string
    updated_at: string
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface SuppliersTableProps {
    suppliers: {
        data: Supplier[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    perPage: string
    onPerPageChange: () => void
    onEditSupplier: (supplier: Supplier) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
    userPermissions: string[]
}

export default function SuppliersTable({
    suppliers,
    perPage,
    onPerPageChange,
    onEditSupplier,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions
}: SuppliersTableProps) {

    const handleDelete = (supplierId: number, supplierName: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará el proveedor ${supplierName} permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('suppliers.destroy', supplierId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminado!",
                            text: "El proveedor ha sido eliminado.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar el proveedor.",
                            icon: "error"
                        });
                    }
                });
            }
        });
    };

    const showActionsColumn = userPermissions.includes('Editar Proveedores') || userPermissions.includes('Eliminar Proveedores');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por nombre, representante o NIT..."
                    searchValue={search}
                    onSearch={onSearch}
                />
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Representante</TableHead>
                            <TableHead>NIT</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Email</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.data.map((supplier) => (
                            <TableRow key={supplier.id}>
                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                <TableCell>{supplier.representative || '-'}</TableCell>
                                <TableCell className="font-mono">{`${supplier.nit_number} - ${supplier.nit_digit}`}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        <span>{supplier.phone || supplier.cellphone || '-'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                    {supplier.email || '-'}
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Editar Proveedores') && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => onEditSupplier(supplier)}
                                                    className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Proveedores') && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => handleDelete(supplier.id, supplier.name)}
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
                data={suppliers}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
            />
        </div>
    )
}
