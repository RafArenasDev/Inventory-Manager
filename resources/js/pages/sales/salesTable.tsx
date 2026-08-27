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
import { Ban, Printer, Eye, Download, Receipt } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import axios from "axios"
import Swal from '@/lib/swal';
import SearchInput from "@/components/ui/search-input"
import { PeriodFilter } from "@/components/period-filter"
import { formatDate } from "@/lib/format-datetime"

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
    onPerPageChange: (value: string) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    onPeriodChange: (range: { date_from: string; date_to: string }) => void;
    userPermissions: string[];
    onViewInvoice: (url: string) => void;
    onViewDetails: (saleId: number) => void;
    filters: {
        search?: string;
        per_page?: string;
        date_from?: string;
        date_to?: string;
    };
    extraFilters?: Record<string, string | undefined>;
}

const formatCurrency = (value: number): string => {
    return `$ ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export default function SalesTable({
    sales,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    userPermissions,
    onViewInvoice,
    onViewDetails,
    filters = {}, // Default to empty object to avoid undefined
    extraFilters,
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
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                    <SearchInput
                        placeholder="Buscar por cliente, documento o n.° de factura..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="w-full sm:max-w-lg"
                    />
                    <PeriodFilter onChange={onPeriodChange} />
                </div>
                {userPermissions.includes('Exportar Ventas') && (
                    <Button
                        size="sm"
                        onClick={handleExport}
                        title="Exportar ventas a Excel"
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
                                        <span className="text-xs px-3 py-0.5 rounded-full bg-rose-600 text-white font-bold w-fit shadow-sm dark:bg-rose-700">
                                            Anulada
                                        </span>
                                    ) : (
                                        <span className="text-xs px-3 py-0.5 rounded-full bg-emerald-600 text-white font-bold w-fit shadow-sm dark:bg-emerald-700">
                                            Activa
                                        </span>
                                    )}
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <IconActionButton
                                                variant="ghost"
                                                onClick={() => onViewDetails(sale.id)}
                                                className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                                label="Ver detalles"
                                            >
                                                <Eye className="size-3.5" />
                                            </IconActionButton>
                                            {sale.public_invoice_url && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => onViewInvoice(sale.public_invoice_url!)}
                                                    className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                                    label="Imprimir factura"
                                                >
                                                    <Printer className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Eliminar Ventas') && !sale.is_cancelled && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleCancel(sale)}
                                                    className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                    label="Anular venta"
                                                >
                                                    <Ban className="size-3.5" />
                                                </IconActionButton>
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
                searchRoute="sales.search"
                extraFilters={extraFilters}
            />
        </div>
    );
}
