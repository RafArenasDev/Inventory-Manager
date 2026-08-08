import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Truck, ShoppingCart } from 'lucide-react';
import PurchaseOrderForm from '@/pages/purchaseOrders/purchaseOrderForm';
import { ConfirmDialog } from '@/components/confirm-dialog';

type StockTier = 'advertencia' | 'critico' | 'agotado';

interface AlertProduct {
    id: number;
    code: string;
    name: string;
    stock: number;
    tier: StockTier;
    has_active_order: boolean;
}

interface SupplierGroup {
    supplier: { id: number; name: string; phone: string | null } | null;
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
}

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
    const [orderDraft, setOrderDraft] = useState<{ supplierId: number | null; productIds: number[] } | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        fetch(route('notifications.low-stock-by-provider'))
            .then((r) => r.json())
            .then((data) => {
                setGroups(data.groups || []);
                setAllSuppliers(data.suppliers || []);
                setAllProducts(data.products || []);
            })
            .finally(() => setLoading(false));
    }, [open]);

    const closeOrderForm = () => {
        setOrderDraft(null);
        setIsFormDirty(false);
    };

    const attemptCloseOrderForm = () => {
        if (!isFormDirty) {
            closeOrderForm();
            return;
        }
        setShowDiscardConfirm(true);
    };

    const handleOrderSaved = () => {
        closeOrderForm();
        onOrderCreated();
        // Refresca el agrupado para que el producto ya pedido salga de la lista.
        setLoading(true);
        fetch(route('notifications.low-stock-by-provider'))
            .then((r) => r.json())
            .then((data) => setGroups(data.groups || []))
            .finally(() => setLoading(false));
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Alertas de Stock Bajo</DialogTitle>
                        <DialogDescription>
                            Productos agotados o en nivel crítico, agrupados por proveedor.
                        </DialogDescription>
                    </DialogHeader>

                    {loading && <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>}

                    {!loading && groups.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No hay productos con stock bajo en este momento.
                        </p>
                    )}

                    <div className="space-y-4">
                        {groups.map((group) => {
                            const uncovered = group.products.filter((p) => !p.has_active_order);
                            return (
                                <div key={group.supplier?.id ?? 'sin-proveedor'} className="rounded-lg border border-input p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 font-medium">
                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                            {group.supplier?.name ?? 'Sin proveedor asignado'}
                                        </div>
                                        {group.supplier && uncovered.length > 0 && (
                                            <Button
                                                size="sm"
                                                className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                                                onClick={() => setOrderDraft({ supplierId: group.supplier!.id, productIds: uncovered.map((p) => p.id) })}
                                            >
                                                <ShoppingCart className="h-3.5 w-3.5" />
                                                Pedir con este proveedor
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        {group.products.map((product) => (
                                            <div key={product.id} className="flex items-center justify-between gap-2 text-sm py-1">
                                                <div className="min-w-0">
                                                    <span className="font-medium">{product.name}</span>{' '}
                                                    <span className="text-muted-foreground">({product.code})</span>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE[product.tier]}`}>
                                                        {TIER_LABEL[product.tier]} · {product.stock}
                                                    </span>
                                                    {product.has_active_order ? (
                                                        <span className="text-xs text-emerald-600 dark:text-emerald-500">Pedido en curso</span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                                                            onClick={() => setOrderDraft({ supplierId: null, productIds: [product.id] })}
                                                        >
                                                            Cambiar de proveedor
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!orderDraft} onOpenChange={(o) => { if (!o) attemptCloseOrderForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Nuevo Pedido</DialogTitle>
                        <DialogDescription>Selecciona el proveedor y confirma los productos a solicitar.</DialogDescription>
                    </DialogHeader>
                    {orderDraft && (
                        <PurchaseOrderForm
                            suppliers={allSuppliers}
                            products={allProducts}
                            initialSupplierId={orderDraft.supplierId}
                            initialProductIds={orderDraft.productIds}
                            onCancel={attemptCloseOrderForm}
                            onSaved={handleOrderSaved}
                            onDirtyChange={setIsFormDirty}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                title="¿Descartar pedido?"
                description="Tienes cambios sin guardar que se perderán."
                confirmText="Sí, descartar"
                cancelText="Seguir editando"
                onConfirm={closeOrderForm}
            />
        </>
    );
}
