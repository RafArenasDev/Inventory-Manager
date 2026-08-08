import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { IconActionButton } from "@/components/icon-action-button"
import { StatusToggle } from "@/components/status-toggle"
import { Pencil, Trash2, Phone, Smartphone, Download, Truck } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from '@/lib/swal';
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
    onPerPageChange: (value: string) => void
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
            <div className="space-y-0.5 text-xs">
                {hasPhone && (
                    <div className="flex items-center gap-1.5">
                        <Phone className="size-3.5 text-gray-500" />
                        <span>{supplier.phone}</span>
                    </div>
                )}
                {hasCellphone && (
                    <div className="flex items-center gap-1.5">
                        <Smartphone className="size-3.5 text-gray-500" />
                        <span>{supplier.cellphone}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    placeholder="Buscar por nombre, representante o NIT..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:max-w-md"
                />
                {userPermissions.includes('Exportar Proveedores') && (
                    <Button
                        size="sm"
                        onClick={handleExport}
                        title="Exportar proveedores a Excel"
                        className="gap-2 bg-gray-500 text-white hover:bg-gray-600"
                    >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                )}
            </div>


            <div className="rounded-md bg-card shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden">
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
                                        <StatusToggle
                                            id={supplier.id}
                                            isActive={supplier.is_active}
                                            toggleRouteName="suppliers.toggle-active"
                                            entityLabel="proveedor"
                                            entityName={supplier.name}
                                        />
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {userPermissions.includes('Editar Proveedores') && (
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => onEditSupplier(supplier)}
                                                        className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                        label="Editar proveedor"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </IconActionButton>
                                                )}
                                                {userPermissions.includes('Eliminar Proveedores') && (
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => handleDelete(supplier.id, supplier.name)}
                                                        className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                        label="Eliminar proveedor"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </IconActionButton>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 7 : 6} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Truck className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron proveedores</span>
                                    </div>
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
                searchRoute="suppliers.search"
            />
        </div>
    )
}
