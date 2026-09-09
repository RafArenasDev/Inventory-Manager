import { CurrencyCell } from '@/components/ui/currency-cell';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-datetime';
import { CalendarClock, PackageCheck, PackagePlus, Pencil, StickyNote, Truck, User } from 'lucide-react';

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
    supplier: { id: number; name: string; phone?: string | null } | null;
    requested_by: string | null;
    received_by: string | null;
    updated_by: string | null;
    items: PurchaseOrderItem[];
}

const STATUS_BADGE: Record<PurchaseOrder['status'], string> = {
    Solicitado: 'bg-amber-600 dark:bg-amber-700',
    Recibido: 'bg-emerald-600 dark:bg-emerald-700',
    Cancelado: 'bg-rose-600 dark:bg-rose-700',
};

const formatCOP = (value: number): string =>
    `$ ${Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

interface PurchaseOrderDetailModalProps {
    order: PurchaseOrder | null;
    onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderDetailModal({ order, onOpenChange }: PurchaseOrderDetailModalProps) {
    if (!order) return null;

    const totalValue = order.items.reduce((sum, i) => sum + (i.unit_cost ?? 0) * i.quantity_requested, 0);
    const hasAnyPrice = order.items.some((i) => i.unit_cost !== null);

    return (
        <Dialog open={!!order} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>
                        Pedido: {order.supplier?.name ?? 'Proveedor eliminado'} — {order.created_at.slice(0, 10).split('-').reverse().join('-')}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <span
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm ${STATUS_BADGE[order.status]}`}
                        >
                            {order.status}
                        </span>
                        <span
                            className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-sm ${order.is_low_stock_order ? 'bg-indigo-600 dark:bg-indigo-700' : 'bg-sky-600 dark:bg-sky-700'}`}
                        >
                            {order.is_low_stock_order ? 'Stock Bajo' : 'Pedido Nuevo'}
                        </span>
                    </div>
                    <DialogDescription>Detalle completo del pedido y sus productos.</DialogDescription>
                </DialogHeader>

                <div className="shrink-0 space-y-3">
                    <div className="border-input flex items-start gap-2 rounded-lg border p-4">
                        <Truck className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                            <div className="text-muted-foreground text-xs">Proveedor</div>
                            <div className="font-medium">{order.supplier?.name ?? 'Proveedor eliminado'}</div>
                            {order.supplier?.phone && <div className="text-muted-foreground text-xs">{order.supplier.phone}</div>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="border-input rounded-lg border p-4">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                <PackagePlus className="text-muted-foreground h-4 w-4" />
                                Pedido
                            </div>
                            <div className="flex items-start gap-2">
                                <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <div className="text-muted-foreground text-xs">Solicitado por</div>
                                    <div className="font-medium">{order.requested_by ?? '-'}</div>
                                </div>
                            </div>
                            <div className="mt-2 flex items-start gap-2">
                                <CalendarClock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <div className="text-muted-foreground text-xs">Fecha</div>
                                    <div className="font-medium">{formatDateTime(order.created_at)}</div>
                                </div>
                            </div>
                        </div>

                        {order.updated_at && (
                            <div className="border-input rounded-lg border p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <Pencil className="text-muted-foreground h-4 w-4" />
                                    Actualizado
                                </div>
                                <div className="flex items-start gap-2">
                                    <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <div className="text-muted-foreground text-xs">Modificado por</div>
                                        <div className="font-medium">{order.updated_by ?? '-'}</div>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-start gap-2">
                                    <CalendarClock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <div className="text-muted-foreground text-xs">Fecha</div>
                                        <div className="font-medium">{formatDateTime(order.updated_at)}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {order.received_at && (
                            <div className="border-input rounded-lg border p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <PackageCheck className="text-muted-foreground h-4 w-4" />
                                    Recibido
                                </div>
                                <div className="flex items-start gap-2">
                                    <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <div className="text-muted-foreground text-xs">Recibido por</div>
                                        <div className="font-medium">{order.received_by ?? '-'}</div>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-start gap-2">
                                    <CalendarClock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <div className="text-muted-foreground text-xs">Fecha</div>
                                        <div className="font-medium">{formatDateTime(order.received_at)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {order.notes && (
                        <div className="border-input flex items-start gap-2 rounded-lg border p-4">
                            <StickyNote className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                                <div className="text-muted-foreground text-xs">Notas</div>
                                <div className="font-medium">{order.notes}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-input min-h-0 flex-1 overflow-y-auto rounded-md border p-1.5">
                    <Table>
                        <TableHeader className="bg-background sticky top-0">
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Cantidad</TableHead>
                                {order.status !== 'Solicitado' && <TableHead className="text-right">Recibido</TableHead>}
                                {hasAnyPrice && <TableHead className="text-right">Precio unit.</TableHead>}
                                {hasAnyPrice && <TableHead className="text-right">Subtotal</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.product_name}</div>
                                        <div className="text-muted-foreground text-xs">{item.product_code}</div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity_requested} und</TableCell>
                                    {order.status !== 'Solicitado' && <TableCell className="text-right">{item.quantity_received} und</TableCell>}
                                    {hasAnyPrice && <TableCell>{item.unit_cost !== null ? <CurrencyCell value={item.unit_cost} /> : '-'}</TableCell>}
                                    {hasAnyPrice && (
                                        <TableCell>
                                            {item.unit_cost !== null ? <CurrencyCell value={item.unit_cost * item.quantity_requested} /> : '-'}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="border-input flex shrink-0 items-center justify-between rounded-lg border px-4 py-3">
                    <span className="text-muted-foreground text-sm">
                        {order.items.length} producto{order.items.length === 1 ? '' : 's'}
                    </span>
                    {hasAnyPrice && (
                        <span className="text-base font-bold">
                            Total <span className="font-bold">{formatCOP(totalValue)}</span>
                        </span>
                    )}
                </div>

                {hasAnyPrice && (
                    <p className="text-muted-foreground shrink-0 text-xs">
                        Valor de referencia interno calculado con los precios ya registrados en la app — no es una cotización del proveedor. El valor
                        real, forma de pago y datos de consignación los confirma el proveedor por WhatsApp.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
