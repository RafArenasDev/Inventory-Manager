import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Ban, FileText, Eye, Download, Receipt } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
import SearchInput from "@/components/ui/search-input"

interface SaleItem {
    id: number;
    product_id: number;
    product_name?: string;
    product_code?: string;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
}

interface Client {
    id: number;
    name: string;
    document_type: string;
    document_number: string;
    verification_digit?: number;
    department?: string;
    city?: string;
    email?: string;
    phone?: string;
    cellphone?: string;
    address?: string;
}

interface Sale {
    id: number;
    invoice_number: string;
    client?: Client;
    user: { id: number; name: string };
    sale_date: string;
    sale_time: string;
    total_without_tax: number;
    total_with_discount: number;
    discount: number;
    total_paid: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
    discount_percentage: number;
    public_invoice_url: string | null;
    is_cancelled: boolean;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface SalesTableProps {
    sales: {
        data: Sale[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    perPage: string;
    onPerPageChange: () => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    userPermissions: string[];
    onViewInvoice: (url: string) => void;
    filters: {
        search?: string;
        per_page?: string;
    };
}

const formatCurrency = (value: number): string => {
    return `$ ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function SalesTable({
    sales,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions,
    onViewInvoice,
    filters = {}, // Default to empty object to avoid undefined
}: SalesTableProps) {
    const handleCancel = (sale: Sale) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción anulará la venta ${sale.invoice_number}`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, anular!",
            cancelButtonText: "Cancelar",
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('sales.cancel', sale.id), {}, {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Anulada!",
                            text: "La venta ha sido anulada.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo anular la venta.",
                            icon: "error",
                        });
                    },
                });
            }
        });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search); // Safely access filters.search
        const exportUrl = route('sales.export') + (params.toString() ? '?' + params.toString() : '');
        window.open(exportUrl, '_blank');
    };

    const showActionsColumn = userPermissions.includes('Eliminar Ventas') || sales.data.some(sale => sale.public_invoice_url);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por Cliente, Documento o Nº Factura..."
                    searchValue={search}
                    onSearch={onSearch}
                />
                {userPermissions.includes('Exportar Ventas') && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        title="Exportar ventas a Excel"
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Exportar Excel
                    </Button>
                )}
            </div>

            {filteredCount !== totalCount && (
                <div className="text-sm text-muted-foreground">
                    Mostrando {filteredCount} de {totalCount} ventas
                </div>
            )}

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nº Factura</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Hora</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Productos</TableHead>
                            <TableHead>Estado</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sales.data.map((sale) => (
                            <TableRow key={sale.id} className={sale.is_cancelled ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                                <TableCell>{formatDate(sale.sale_date)}</TableCell>
                                <TableCell>{sale.sale_time}</TableCell>
                                <TableCell>{sale.client?.name || 'Cliente no especificado'}</TableCell>
                                <TableCell className="font-semibold">{formatCurrency(sale.total_paid)}</TableCell>
                                <TableCell>{sale.items.length}</TableCell>
                                <TableCell>
                                    {sale.is_cancelled ? (
                                        <span className="text-xs px-3 py-1 rounded-full bg-red-600 text-white font-bold w-fit shadow-sm dark:bg-red-700">
                                            Anulada
                                        </span>
                                    ) : (
                                        <span className="text-xs px-3 py-1 rounded-full bg-green-600 text-white font-bold w-fit shadow-sm dark:bg-green-700">
                                            Activa
                                        </span>
                                    )}
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="default"
                                                size="icon"
                                                onClick={() => router.visit(route('sales.show', sale.id))}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                aria-label="Ver detalles"
                                            >
                                                <Eye className="h-4 w-4 text-white" />
                                            </Button>
                                            {sale.public_invoice_url && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => onViewInvoice(sale.public_invoice_url!)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    aria-label="Ver factura"
                                                >
                                                    <FileText className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                            {userPermissions.includes('Eliminar Ventas') && !sale.is_cancelled && (
                                                <Button
                                                    variant="default"
                                                    size="icon"
                                                    onClick={() => handleCancel(sale)}
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    aria-label="Anular venta"
                                                >
                                                    <Ban className="h-4 w-4 text-white" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {sales.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 8 : 7} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Receipt className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron ventas</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={sales}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
            />
        </div>
    );
}
