import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import Swal from '@/lib/swal';
import { escapeHtml } from '@/lib/utils';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { PackageSearch, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import PurchaseOrderForm from './purchaseOrderForm';
import PurchaseOrdersTable from './purchaseOrdersTable';

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

interface PurchaseOrdersIndexProps {
    purchaseOrders: {
        data: PurchaseOrder[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    suppliers: Supplier[];
    products: Product[];
    filters: {
        search?: string;
        per_page?: string;
        status?: string;
        date_from?: string;
        date_to?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pedidos', href: '/purchase-orders' }];

export default function PurchaseOrdersIndex({ purchaseOrders, suppliers, products, filters, totalCount, filteredCount }: PurchaseOrdersIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    // Proveedor actualmente elegido en "Nuevo Pedido" — se necesita para
    // saber, cuando el primer producto que se agrega resulta estar en
    // alerta, si ESE proveedor ya tiene un pedido por alertas activo.
    const [createSupplier, setCreateSupplier] = useState<Supplier | null>(null);
    // Modo EFECTIVO que reporta el formulario (deducido del primer producto
    // elegido) — para reflejarlo en el título del modal ("Nuevo Pedido" →
    // "Pedido Stock Bajo"/"Pedido Nuevo") y para decidir si hace falta
    // preguntar (ver handleCreateProductFilterChange).
    const [detectedCreateMode, setDetectedCreateMode] = useState<'alert-only' | 'non-alert-only' | undefined>(undefined);
    // Pedidos "Solicitado" con is_low_stock_order=true por proveedor.
    const [activeLowStockOrdersBySupplier, setActiveLowStockOrdersBySupplier] = useState<Record<number, PurchaseOrder>>({});

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions || [];

    const isFormOpen = isCreating || !!editingOrder;

    const closeForm = () => {
        setIsCreating(false);
        setEditingOrder(null);
        setIsFormDirty(false);
        setCreateSupplier(null);
        setDetectedCreateMode(undefined);
    };

    useEffect(() => {
        if (!isCreating) return;
        fetch(route('notifications.low-stock-by-provider'))
            .then((r) => r.json())
            .then((data) => {
                const bySupplier: Record<number, PurchaseOrder> = {};
                (data.groups || []).forEach((g: { supplier: { id: number }; active_orders: PurchaseOrder[] }) => {
                    const lowStockOrder = g.active_orders.find((o) => o.is_low_stock_order);
                    if (lowStockOrder) bySupplier[g.supplier.id] = lowStockOrder;
                });
                setActiveLowStockOrdersBySupplier(bySupplier);
            })
            .catch(() => {});
    }, [isCreating]);

    // Solo registra a qué proveedor se está pidiendo — el aviso de
    // conflicto NO sale acá (elegir el proveedor no implica nada todavía).
    const handleCreateSupplierChange = (supplier: Supplier | null) => setCreateSupplier(supplier);

    // Sale justo cuando el producto que se acaba de elegir resulta estar en
    // alerta de stock bajo (no antes, y no por productos fuera de esa
    // lista) y ese proveedor ya tiene un pedido "por alertas" activo —
    // ofrece editarlo en vez de dejar que se arme uno redundante.
    const handleCreateProductFilterChange = (filter: 'alert-only' | 'non-alert-only' | undefined) => {
        setDetectedCreateMode(filter);
        if (filter !== 'alert-only' || !createSupplier) return;

        const existing = activeLowStockOrdersBySupplier[createSupplier.id];
        if (!existing) return;

        // Un producto en alerta SIEMPRE pertenece al pedido "Stock Bajo" del
        // proveedor — nunca a uno nuevo aparte. Si ya existe uno activo, no
        // hay nada que decidir: solo se avisa qué ya tiene y se pasa directo
        // a editarlo (nada de un botón "seguir con este" que invite a crear
        // un duplicado).
        const [firstItem, ...rest] = existing.items;
        const itemsPreview = firstItem
            ? `${escapeHtml(firstItem.product_name)}${rest.length > 0 ? ` y ${rest.length} más` : ''}`
            : 'otros productos';
        Swal.fire({
            icon: 'info',
            title: 'Ya hay un pedido activo por stock bajo',
            html: `<b>${escapeHtml(createSupplier.name)}</b> tiene un pedido "Solicitado" con ${itemsPreview}. Se abre ese pedido para agregar este producto ahí.`,
            timer: 3200,
            showConfirmButton: false,
        }).then(() => {
            setIsCreating(false);
            setEditingOrder(existing);
        });
    };

    const refreshTable = () => {
        router.post(
            route('purchase-orders.search'),
            {
                ...filters,
                page: 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleOrderCreated = () => {
        closeForm();
        // Refresca la tabla en el lugar (mismo POST que ya usa la búsqueda/
        // filtros) en vez de dejar que el store() navegue a otra vista —
        // así el nuevo pedido aparece al instante sin salir de Pedidos.
        refreshTable();

        // Ya no se abre WhatsApp automáticamente al crear — el envío es una
        // acción explícita del usuario desde el botón dedicado en la tabla.
    };

    const handleOrderSaved = () => {
        closeForm();
    };

    // Tiempo real: cualquier sesión que cree/edite/reciba un pedido avisa
    // por WebSocket, y esta tabla se refresca sola al instante, tenga o no
    // el foco. El listener de "focus" queda como respaldo silencioso por
    // si el servidor Reverb no está disponible en ese momento.
    useLiveRefresh(['purchase-orders'], refreshTable);

    useEffect(() => {
        window.addEventListener('focus', refreshTable);
        return () => window.removeEventListener('focus', refreshTable);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const attemptCloseForm = () => {
        if (!isFormDirty) {
            closeForm();
            return;
        }
        setShowDiscardConfirm(true);
    };

    const handleSearch = (search: string) => {
        router.post(
            route('purchase-orders.search'),
            {
                ...filters,
                search,
                page: 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // purchase-orders.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handlePeriodChange = (range: { date_from?: string; date_to?: string }) => {
        router.post(
            route('purchase-orders.search'),
            {
                ...filters,
                date_from: range.date_from ?? '',
                date_to: range.date_to ?? '',
                page: 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pedidos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={PackageSearch} title="Pedidos" description="Órdenes de compra a proveedores para reabastecer stock.">
                    {userPermissions.includes('Crear Pedidos') && (
                        <Button onClick={() => setIsCreating(true)} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Pedido
                        </Button>
                    )}
                </PageHeader>
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <PurchaseOrdersTable
                            purchaseOrders={purchaseOrders}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={handlePerPageChange}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            onPeriodChange={handlePeriodChange}
                            userPermissions={userPermissions}
                            extraFilters={{ date_from: filters.date_from, date_to: filters.date_to }}
                            onEdit={(order) => setEditingOrder(order)}
                        />
                    </div>
                </div>
            </div>

            <Dialog
                open={isFormOpen}
                onOpenChange={(open) => {
                    if (!open) attemptCloseForm();
                }}
            >
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>
                            {editingOrder
                                ? `Editar Pedido: ${editingOrder.supplier?.name ?? 'Proveedor eliminado'} — ${editingOrder.created_at.slice(0, 10).split('-').reverse().join('-')}`
                                : detectedCreateMode === 'alert-only'
                                  ? 'Pedido Stock Bajo'
                                  : detectedCreateMode === 'non-alert-only'
                                    ? 'Pedido Nuevo'
                                    : 'Nuevo Pedido'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingOrder
                                ? 'Ajusta los productos, cantidades o notas del pedido.'
                                : 'Selecciona el proveedor y los productos a solicitar.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingOrder ? (
                        <PurchaseOrderForm
                            suppliers={suppliers}
                            products={products}
                            order={editingOrder}
                            productFilter={editingOrder.is_low_stock_order ? 'alert-only' : 'non-alert-only'}
                            onCancel={attemptCloseForm}
                            onSaved={handleOrderSaved}
                            onDirtyChange={setIsFormDirty}
                        />
                    ) : (
                        <PurchaseOrderForm
                            suppliers={suppliers}
                            products={products}
                            mode="inline"
                            onSupplierChange={handleCreateSupplierChange}
                            onProductFilterChange={handleCreateProductFilterChange}
                            onCancel={attemptCloseForm}
                            onSaved={handleOrderCreated}
                            onDirtyChange={setIsFormDirty}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                title="¿Descartar cambios?"
                description="Tienes cambios sin guardar que se perderán."
                confirmText="Sí, descartar"
                cancelText="Seguir editando"
                onConfirm={closeForm}
            />
        </AppLayout>
    );
}
