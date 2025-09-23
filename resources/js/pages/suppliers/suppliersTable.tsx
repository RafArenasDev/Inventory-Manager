import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Phone, Smartphone, Download } from "lucide-react"
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
    is_active: boolean
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
    filters: {
        search?: string;
        per_page?: string;
    }
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
    userPermissions,
    filters
}: SuppliersTableProps) {
    const handleExport = () => {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        const exportUrl = route('suppliers.export') + '?' + params.toString();
        window.open(exportUrl, '_blank');
    };

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

    const renderPhones = (supplier: Supplier) => {
        const hasPhone = supplier.phone && supplier.phone.trim() !== '';
        const hasCellphone = supplier.cellphone && supplier.cellphone.trim() !== '';

        if (!hasPhone && !hasCellphone) {
            return <span>-</span>;
        }

        return (
            <div className="space-y-1">
                {hasPhone && (
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{supplier.phone}</span>
                    </div>
                )}
                {hasCellphone && (
                    <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-gray-500" />
                        <span>{supplier.cellphone}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por nombre, representante o NIT..."
                    searchValue={search}
                    onSearch={onSearch}
                />
                {userPermissions.includes('Exportar Proveedores') && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        title="Exportar proveedores a Excel"
                        className="gap-2 hover:bg-green-50 hover:border-green-300"
                    >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                )}
            </div>

            {filteredCount !== totalCount && (
                <div className="text-sm text-muted-foreground">
                    Mostrando {filteredCount} de {totalCount} proveedores
                </div>
            )}

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Representante</TableHead>
                            <TableHead>NIT</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Estado</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.data.length > 0 ? (
                            suppliers.data.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.representative || '-'}</TableCell>
                                    <TableCell className="font-mono">{`${supplier.nit_number}-${supplier.nit_digit}`}</TableCell>
                                    <TableCell>
                                        {renderPhones(supplier)}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                        {supplier.email || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded-full border w-20 text-center shadow-sm ${
                                            supplier.is_active
                                                ? 'bg-green-600 text-white dark:bg-green-700'
                                                : 'bg-red-600 text-white dark:bg-red-700 '
                                        }`}>
                                            {supplier.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {userPermissions.includes('Editar Proveedores') && (
                                                    <Button
                                                        variant="default"
                                                        size="icon"
                                                        onClick={() => onEditSupplier(supplier)}
                                                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                                        aria-label="Editar proveedor"
                                                    >
                                                        <Pencil className="h-4 w-4 text-white" />
                                                    </Button>
                                                )}
                                                {userPermissions.includes('Eliminar Proveedores') && (
                                                    <Button
                                                        variant="default"
                                                        size="icon"
                                                        onClick={() => handleDelete(supplier.id, supplier.name)}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                        aria-label="Eliminar proveedor"
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
                                <TableCell colSpan={showActionsColumn ? 7 : 6} className="h-24 text-center">
                                    No se encontraron proveedores.
                                </TableCell>
                            </TableRow>
                        )}
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
