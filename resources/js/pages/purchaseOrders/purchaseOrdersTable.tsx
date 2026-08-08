import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { IconActionButton } from "@/components/icon-action-button";
import { Ban, Download, FileSpreadsheet, PackageCheck, PackageSearch, Trash2 } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import SearchInput from "@/components/ui/search-input";
import { PeriodFilter } from "@/components/period-filter";
import { InventoryImportDialog } from "@/components/inventory-import-dialog";
import { router } from "@inertiajs/react";
import { useState } from "react";
import Swal from "@/lib/swal";

interface PurchaseOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity_requested: number;
    quantity_received: number;
}

interface PurchaseOrder {
    id: number;
    status: 'Solicitado' | 'Recibido' | 'Cancelado';
    notes: string | null;
    expected_at: string | null;
    received_at: string | null;
    created_at: string;
    supplier: { id: number; name: string; phone?: string | null } | null;
    requested_by: string | null;
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
}

const STATUS_BADGE: Record<PurchaseOrder['status'], string> = {
    Solicitado: 'bg-amber-600 dark:bg-amber-700',
    Recibido: 'bg-emerald-600 dark:bg-emerald-700',
    Cancelado: 'bg-rose-600 dark:bg-rose-700',
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
}: PurchaseOrdersTableProps) {
    const [importingOrderId, setImportingOrderId] = useState<number | null>(null);

    const handleExport = () => {
        window.open(route('purchase-orders.export'), '_blank');
    };

    const handleCancel = (order: PurchaseOrder) => {
        Swal.fire({
            title: '¿Estás seguro?',
            html: `Esta acción cancelará el pedido a <b>${order.supplier?.name ?? 'proveedor eliminado'}</b>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Seguir esperando',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.put(route('purchase-orders.update', order.id), { status: 'Cancelado' }, {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Pedido cancelado.', timer: 2200, showConfirmButton: false });
                },
            });
        });
    };

    const handleReceive = (order: PurchaseOrder) => {
        Swal.fire({
            title: '¿Ya llegó el pedido?',
            html: `Se registrará la entrada de stock de todos los productos de <b>${order.supplier?.name ?? 'este pedido'}</b> y se marcará como recibido.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, ya llegó',
            cancelButtonText: 'Todavía no',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.post(route('purchase-orders.receive', order.id), {}, {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Pedido recibido — stock actualizado.', timer: 2200, showConfirmButton: false });
                },
            });
        });
    };

    const handleDelete = (order: PurchaseOrder) => {
        Swal.fire({
            title: '¿Estás seguro?',
            html: `Esta acción eliminará permanentemente el pedido a <b>${order.supplier?.name ?? 'proveedor eliminado'}</b>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (!result.isConfirmed) return;
            router.delete(route('purchase-orders.destroy', order.id), {
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({ icon: 'success', title: 'Pedido eliminado.', timer: 2200, showConfirmButton: false });
                },
            });
        });
    };

    const showActionsColumn = userPermissions.includes('Actualizar Pedidos') || userPermissions.includes('Eliminar Pedidos');

    return (
        <>
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-full items-center gap-2 sm:max-w-md">
                    <SearchInput
                        placeholder="Buscar por proveedor o notas..."
                        searchValue={search}
                        onSearch={onSearch}
                        className="min-w-0 flex-1"
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

            <div className="rounded-md bg-card shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Productos</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Solicitado por</TableHead>
                            <TableHead>Fecha Esperada</TableHead>
                            <TableHead>Fecha</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {purchaseOrders.data.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.supplier?.name ?? 'Proveedor eliminado'}</TableCell>
                                <TableCell className="max-w-xs truncate" title={order.items.map((i) => `${i.product_name} (x${i.quantity_requested})`).join(', ')}>
                                    {order.items.map((i) => `${i.product_name} (x${i.quantity_requested})`).join(', ')}
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded-full text-white shadow-sm ${STATUS_BADGE[order.status]}`}>
                                        {order.status}
                                    </span>
                                </TableCell>
                                <TableCell>{order.requested_by ?? '-'}</TableCell>
                                <TableCell>{order.expected_at ?? '-'}</TableCell>
                                <TableCell>{order.created_at.slice(0, 10).split('-').reverse().join('/')}</TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
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
                                            {userPermissions.includes('Actualizar Pedidos') && order.status === 'Solicitado' && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => setImportingOrderId(order.id)}
                                                    className="text-sky-600 hover:bg-sky-100 hover:text-sky-700 dark:text-sky-500 dark:hover:bg-sky-950/40 dark:hover:text-sky-400"
                                                    label="Cargar recepción por Excel/CSV"
                                                >
                                                    <FileSpreadsheet className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Actualizar Pedidos') && order.status === 'Solicitado' && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleCancel(order)}
                                                    className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                    label="Cancelar pedido"
                                                >
                                                    <Ban className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Eliminar Pedidos') && order.status !== 'Recibido' && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleDelete(order)}
                                                    className="text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:text-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                                    label="Eliminar pedido"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {purchaseOrders.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 7 : 6} className="h-24 text-center text-gray-500 dark:text-gray-400">
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

        {importingOrderId !== null && (
            <InventoryImportDialog
                open={importingOrderId !== null}
                onOpenChange={(open) => { if (!open) setImportingOrderId(null); }}
                purchaseOrderId={importingOrderId}
            />
        )}
        </>
    );
}
