import { IconActionButton } from '@/components/icon-action-button';
import { PeriodFilter } from '@/components/period-filter';
import { Button } from '@/components/ui/button';
import { CurrencyCell } from '@/components/ui/currency-cell';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-datetime';
import Swal from '@/lib/swal';
import { escapeHtml } from '@/lib/utils';
import { BUSINESS_NAME, buildPurchaseOrderMessage, openWhatsApp } from '@/lib/whatsapp';
import { router } from '@inertiajs/react';
import { Download, Eye, Mail, MessageCircle, PackageCheck, PackageSearch, Pencil } from 'lucide-react';
import { useState } from 'react';
import { PurchaseOrderDetailModal } from './purchaseOrderDetailModal';

interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity_requested: number;
    quantity_received: number;
    unit_cost: number | null;
}

interface PurchaseOrder {
    id: number;
    status: 'Solicitado' | 'Recibido' | 'Cancelado';
    notes: string | null;
    expected_at: string | null;
    received_at: string | null;
    created_at: string;
    updated_at: string | null;
    is_low_stock_order: boolean;
    supplier: { id: number; name: string; phone?: string | null; email?: string | null } | null;
    requested_by: string | null;
    received_by: string | null;
    updated_by: string | null;
    items: PurchaseOrderItem[];
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface PurchaseOrdersTableProps {
    purchaseOrders: {
        data: PurchaseOrder[];
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
    extraFilters?: Record<string, string | undefined>;
    onEdit: (order: PurchaseOrder) => void;
}

const STATUS_BADGE: Record<PurchaseOrder['status'], string> = {
    Solicitado: 'bg-amber-600 dark:bg-amber-700',
    Recibido: 'bg-emerald-600 dark:bg-emerald-700',
    Cancelado: 'bg-rose-600 dark:bg-rose-700',
};

// Referencia interna, no una cotización — se calcula con el precio ya
// registrado en cada producto al momento de armar el pedido.
const approxTotal = (order: PurchaseOrder): number | null => {
    if (!order.items.some((i) => i.unit_cost !== null)) return null;
    return order.items.reduce((sum, i) => sum + (i.unit_cost ?? 0) * i.quantity_requested, 0);
};

export default function PurchaseOrdersTable({
    purchaseOrders,
    perPage,
    onPerPageChange,
    totalCount,
    filteredCount,
    search,
    onSearch,
    onPeriodChange,
    userPermissions,
    extraFilters,
    onEdit,
}: PurchaseOrdersTableProps) {
    const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);

    const handleExport = () => {
        window.open(route('purchase-orders.export'), '_blank');
    };

    const handleSendWhatsApp = (order: PurchaseOrder) => {
        const phone = order.supplier?.phone;
        if (!phone) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin número de contacto',
                html: `<b>${escapeHtml(order.supplier?.name ?? 'Este proveedor')}</b> no tiene un teléfono registrado.`,
            });
            return;
        }
        openWhatsApp(phone, buildPurchaseOrderMessage(order.items));
    };

    const handleSendEmail = (order: PurchaseOrder) => {
        const email = order.supplier?.email;
        if (!email) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin correo registrado',
                html: `<b>${escapeHtml(order.supplier?.name ?? 'Este proveedor')}</b> no tiene un correo registrado.`,
            });
            return;
        }
        const subject = `Pedido — ${BUSINESS_NAME}`;
        const body = buildPurchaseOrderMessage(order.items);
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleReceive = (order: PurchaseOrder) => {
        Swal.fire({
            title: '¿Ya llegó el pedido?',
            html: `Se registrará la entrada de stock de todos los productos de <b>${escapeHtml(order.supplier?.name ?? 'este pedido')}</b> y se marcará como recibido.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, ya llegó',
            cancelButtonText: 'Todavía no',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.post(
                route('purchase-orders.receive', order.id),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: 'success', title: 'Pedido recibido — stock actualizado.', timer: 2200, showConfirmButton: false });
                    },
                },
            );
        });
    };

    return (
        <>
            <div className="space-y-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2 sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center">
                        <SearchInput
                            placeholder="Buscar por proveedor o notas..."
                            searchValue={search}
                            onSearch={onSearch}
                            className="w-full sm:max-w-lg"
                        />
                        <PeriodFilter onChange={onPeriodChange} />
                    </div>
                    {userPermissions.includes('Exportar Pedidos') && (
                        <Button
                            size="sm"
                            onClick={handleExport}
                            title="Exportar pedidos a Excel"
                            className="gap-2 bg-gray-500 text-white hover:bg-gray-600"
                        >
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </Button>
                    )}
                </div>

                <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                    <Table>
                        <TableHeader className="bg-gray-400 dark:bg-gray-700">
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Productos</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Solicitado</TableHead>
                                <TableHead>Recibido</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.data.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.supplier?.name ?? 'Proveedor eliminado'}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm ${order.is_low_stock_order ? 'bg-indigo-600 dark:bg-indigo-700' : 'bg-sky-600 dark:bg-sky-700'}`}
                                        >
                                            {order.is_low_stock_order ? 'Stock Bajo' : 'Pedido Nuevo'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {order.items.length} producto{order.items.length === 1 ? '' : 's'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {(() => {
                                            const total = approxTotal(order);
                                            return total !== null ? <CurrencyCell value={total} /> : '-';
                                        })()}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm ${STATUS_BADGE[order.status]}`}
                                        >
                                            {order.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs font-medium">{order.requested_by ?? '-'}</div>
                                        <div className="text-muted-foreground text-xs">{formatDateTime(order.created_at)}</div>
                                    </TableCell>
                                    <TableCell>
                                        {order.received_by ? (
                                            <>
                                                <div className="text-xs font-medium">{order.received_by}</div>
                                                {order.received_at && (
                                                    <div className="text-muted-foreground text-xs">{formatDateTime(order.received_at)}</div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <IconActionButton
                                                variant="ghost"
                                                onClick={() => setViewingOrder(order)}
                                                className="text-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:text-sky-500 dark:hover:bg-sky-950/40 dark:hover:text-sky-400"
                                                label="Ver detalle del pedido"
                                            >
                                                <Eye className="size-3.5" />
                                            </IconActionButton>
                                            {order.status === 'Solicitado' && (
                                                <>
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => handleSendWhatsApp(order)}
                                                        className="text-green-600 hover:bg-green-100 hover:text-green-700 dark:text-green-500 dark:hover:bg-green-950/40 dark:hover:text-green-400"
                                                        label="Enviar pedido por WhatsApp"
                                                    >
                                                        <MessageCircle className="size-3.5" />
                                                    </IconActionButton>
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => handleSendEmail(order)}
                                                        className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 dark:text-indigo-500 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400"
                                                        label="Enviar pedido por correo"
                                                    >
                                                        <Mail className="size-3.5" />
                                                    </IconActionButton>
                                                </>
                                            )}
                                            {userPermissions.includes('Actualizar Pedidos') && order.status === 'Solicitado' && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => onEdit(order)}
                                                    className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                    label="Editar pedido"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Actualizar Pedidos') && order.status === 'Solicitado' && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleReceive(order)}
                                                    className="text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:text-emerald-500 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                                                    label="Registrar recepción completa"
                                                >
                                                    <PackageCheck className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {purchaseOrders.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <PackageSearch className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                            <span className="text-sm font-medium">No se encontraron pedidos</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    data={purchaseOrders}
                    perPage={perPage}
                    onPerPageChange={onPerPageChange}
                    totalCount={totalCount}
                    filteredCount={filteredCount}
                    search={search}
                    searchRoute="purchase-orders.search"
                    extraFilters={extraFilters}
                />
            </div>

            <PurchaseOrderDetailModal
                order={viewingOrder}
                onOpenChange={(open) => {
                    if (!open) setViewingOrder(null);
                }}
            />
        </>
    );
}
