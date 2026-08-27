import { IconActionButton } from '@/components/icon-action-button';
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildPurchaseOrderMessage, openWhatsApp } from '@/lib/whatsapp';
import PurchaseOrderForm from '@/pages/purchaseOrders/purchaseOrderForm';
import { router } from '@inertiajs/react';
import { Pencil, Truck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type StockTier = 'advertencia' | 'critico' | 'agotado';

interface AlertProduct {
    id: number;
    code: string;
    name: string;
    stock: number;
    tier: StockTier;
    has_active_order: boolean;
}

interface ActiveOrderItem {
    id: number;
    product_id: number;
    product_name: string;
    product_code: string;
    quantity_requested: number;
    quantity_received: number;
    unit_cost: number | null;
}

interface ActiveOrder {
    id: number;
    notes: string | null;
    expected_at: string | null;
    created_at: string;
    supplier: { id: number; name: string; phone?: string | null } | null;
    items: ActiveOrderItem[];
}

interface SupplierGroup {
    supplier: { id: number; name: string; phone: string | null };
    active_orders: ActiveOrder[];
    products: AlertProduct[];
}

interface Supplier {
    id: number;
    name: string;
    phone?: string | null;
    cellphone?: string | null;
}

interface Product {
    id: number;
    code: string;
    name: string;
    supplier_id: number | null;
    stock: number;
    price_without_tax: number;
}

interface DraftItem {
    product_id: number;
    product_code: string;
    product_name: string;
    quantity_requested: number;
}

const formatCOP = (value: number): string =>
    `$ ${Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const formatDate = (value: string): string => value.slice(0, 10).split('-').reverse().join('-');

const TIER_BADGE: Record<StockTier, string> = {
    advertencia: 'bg-amber-600 text-white',
    critico: 'bg-rose-600 text-white',
    agotado: 'bg-rose-800 text-white',
};

const TIER_LABEL: Record<StockTier, string> = {
    advertencia: 'Bajo',
    critico: 'Crítico',
    agotado: 'Agotado',
};

const TIER_ORDER: StockTier[] = ['agotado', 'critico', 'advertencia'];

interface StockAlertModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderCreated: () => void;
}

export function StockAlertModal({ open, onOpenChange, onOrderCreated }: StockAlertModalProps) {
    const [groups, setGroups] = useState<SupplierGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [tab, setTab] = useState<'alertas' | 'resumen'>('alertas');
    // Se edita un pedido activo desde el Resumen mismo (no navega a Pedidos).
    const [editingOrder, setEditingOrder] = useState<ActiveOrder | null>(null);

    const fetchAlerts = () => {
        setLoading(true);
        return fetch(route('notifications.low-stock-by-provider'))
            .then((r) => r.json())
            .then((data) => {
                setGroups(data.groups || []);
                setAllSuppliers(data.suppliers || []);
                setAllProducts(data.products || []);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!open) return;
        setEditingOrder(null);
        fetchAlerts();
    }, [open]);

    // Un proveedor sale de "Alertas" apenas todos sus productos bajos quedan
    // cubiertos por un pedido activo — ahí ya no hace falta pedir nada más,
    // solo queda revisarlo/editarlo desde "Resumen".
    const alertGroups = useMemo(() => groups.filter((g) => g.products.some((p) => !p.has_active_order)), [groups]);
    // Un proveedor puede tener más de un pedido activo a la vez (por
    // productos distintos) — se aplana a una lista de {supplier, order} para
    // mostrar una tarjeta por pedido, no por proveedor.
    const activeOrderCards = useMemo(() => groups.flatMap((g) => g.active_orders.map((order) => ({ supplier: g.supplier, order }))), [groups]);

    // Pestaña por defecto: si queda algo por pedir, ahí es donde hace falta
    // actuar; si no, el Resumen es lo único relevante para mostrar.
    useEffect(() => {
        if (loading) return;
        setTab(alertGroups.length > 0 ? 'alertas' : 'resumen');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, groups]);

    const handleOrderSaved = (group: SupplierGroup, result?: { supplier: Supplier | null; items: DraftItem[] }) => {
        onOrderCreated();

        // Este modal se abre desde la campana en CUALQUIER página — si el
        // usuario está justo en Pedidos, esto refresca la tabla; en
        // cualquier otra página es una recarga parcial silenciosa de props
        // que ya tenía esa página, sin efecto visible.
        router.reload();

        // El éxito ya lo anuncia PurchaseOrderForm (con el nombre del
        // proveedor); acá solo el efecto propio de este modal: WhatsApp +
        // refrescar el agrupado.
        const phone = result?.supplier?.cellphone ?? result?.supplier?.phone ?? group.supplier?.phone;
        if (phone && result?.items.length) {
            openWhatsApp(phone, buildPurchaseOrderMessage(result.items));
        }

        fetchAlerts();
    };

    const handleEditSaved = () => {
        onOrderCreated();
        router.reload();
        setEditingOrder(null);
        fetchAlerts();
    };

    const closeEditForm = () => setEditingOrder(null);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-5xl" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader className="shrink-0">
                    <DialogTitle>Alertas de Stock Bajo</DialogTitle>
                    <DialogDescription>Productos agotados o en nivel crítico, agrupados por proveedor.</DialogDescription>
                </DialogHeader>

                {loading && <p className="text-muted-foreground py-8 text-center text-sm">Cargando...</p>}

                {!loading && groups.length === 0 && (
                    <p className="text-muted-foreground py-8 text-center text-sm">No hay productos con stock bajo en este momento.</p>
                )}

                {!loading && groups.length > 0 && (
                    <Tabs value={tab} onValueChange={(v) => setTab(v as 'alertas' | 'resumen')} className="flex min-h-0 flex-1 flex-col">
                        {alertGroups.length > 0 && activeOrderCards.length > 0 && (
                            <TabsList className="w-fit shrink-0">
                                <TabsTrigger value="alertas">Alertas ({alertGroups.length})</TabsTrigger>
                                <TabsTrigger value="resumen">Resumen ({activeOrderCards.length})</TabsTrigger>
                            </TabsList>
                        )}

                        {alertGroups.length > 0 && (
                            <TabsContent value="alertas" className="min-h-0 flex-1 overflow-y-auto p-1.5">
                                <p className="text-muted-foreground mb-2 text-sm">Expande un proveedor para armar y enviar el pedido.</p>
                                <Accordion type="single" collapsible className="w-full">
                                    {alertGroups.map((group) => {
                                        const uncovered = group.products.filter((p) => !p.has_active_order);
                                        const tierCounts = uncovered.reduce(
                                            (acc, p) => {
                                                acc[p.tier] = (acc[p.tier] ?? 0) + 1;
                                                return acc;
                                            },
                                            {} as Partial<Record<StockTier, number>>,
                                        );

                                        return (
                                            <AccordionItem key={group.supplier.id} value={String(group.supplier.id)}>
                                                <AccordionTrigger className="hover:no-underline">
                                                    <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pr-2">
                                                        <div className="flex items-center gap-2 font-medium">
                                                            <Truck className="text-muted-foreground h-4 w-4" />
                                                            {group.supplier.name}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            {TIER_ORDER.filter((tier) => tierCounts[tier]).map((tier) => (
                                                                <span
                                                                    key={tier}
                                                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE[tier]}`}
                                                                >
                                                                    {tierCounts[tier]} {TIER_LABEL[tier]}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <PurchaseOrderForm
                                                        suppliers={allSuppliers}
                                                        products={allProducts}
                                                        mode="inline"
                                                        initialSupplierId={group.supplier.id}
                                                        initialProductIds={uncovered.map((p) => p.id)}
                                                        productFilter="alert-only"
                                                        onDirtyChange={() => {}}
                                                        onSaved={(result) => handleOrderSaved(group, result)}
                                                        submitLabel="Enviar pedido"
                                                        submitIcon={<WhatsAppIcon className="h-4 w-4" />}
                                                    />
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                            </TabsContent>
                        )}

                        {activeOrderCards.length > 0 && (
                            <TabsContent value="resumen" className="min-h-0 flex-1 overflow-y-auto p-1.5">
                                {editingOrder ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold">
                                                Editar Pedido: {editingOrder.supplier?.name ?? 'Proveedor eliminado'} —{' '}
                                                {formatDate(editingOrder.created_at)}
                                            </h3>
                                        </div>
                                        <PurchaseOrderForm
                                            suppliers={allSuppliers}
                                            products={allProducts}
                                            mode="inline"
                                            order={editingOrder}
                                            productFilter="alert-only"
                                            onCancel={closeEditForm}
                                            onDirtyChange={() => {}}
                                            onSaved={handleEditSaved}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground/70 mb-1 text-xs">
                                            Pedidos activos — lo que ya se solicitó y sigue pendiente de llegar. Un proveedor puede tener más de uno:
                                            un pedido por alertas de stock bajo y otro pedido nuevo, por ejemplo.
                                        </p>
                                        {activeOrderCards.map(({ supplier, order }) => {
                                            const hasAnyPrice = order.items.some((i) => i.unit_cost !== null);
                                            const total = order.items.reduce((sum, i) => sum + (i.unit_cost ?? 0) * i.quantity_requested, 0);

                                            return (
                                                <div key={order.id} className="border-input rounded-lg border p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 font-medium">
                                                            <Truck className="text-muted-foreground h-4 w-4" />
                                                            {supplier.name}
                                                        </div>
                                                        <IconActionButton
                                                            variant="ghost"
                                                            onClick={() => setEditingOrder(order)}
                                                            className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                            label="Editar pedido"
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </IconActionButton>
                                                    </div>
                                                    <div className="text-muted-foreground mt-2 space-y-1 text-sm">
                                                        {order.items.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between">
                                                                <span>
                                                                    {item.product_name} <span className="text-xs">({item.product_code})</span> x
                                                                    {item.quantity_requested}
                                                                </span>
                                                                {item.unit_cost !== null && (
                                                                    <span>{formatCOP(item.unit_cost * item.quantity_requested)}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {hasAnyPrice && (
                                                        <div className="border-input mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                                                            <span>Total</span>
                                                            <span>{formatCOP(total)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
