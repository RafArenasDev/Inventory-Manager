import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import PurchaseOrdersTable from './purchaseOrdersTable';
import PurchaseOrderForm from './purchaseOrderForm';
import { Button } from '@/components/ui/button';
import { PackageSearch, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pedidos', href: '/purchase-orders' },
];

export default function PurchaseOrdersIndex({
    purchaseOrders,
    suppliers,
    products,
    filters,
    totalCount,
    filteredCount,
}: PurchaseOrdersIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions || [];

    const closeForm = () => {
        setIsCreating(false);
        setIsFormDirty(false);
    };

    const attemptCloseForm = () => {
        if (!isFormDirty) {
            closeForm();
            return;
        }
        setShowDiscardConfirm(true);
    };

    const handleSearch = (search: string) => {
        router.post(route('purchase-orders.search'), {
            ...filters,
            search,
            page: 1,
        }, { preserveState: true, preserveScroll: true });
    };

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // purchase-orders.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handlePeriodChange = (range: { date_from?: string; date_to?: string }) => {
        router.post(route('purchase-orders.search'), {
            ...filters,
            date_from: range.date_from ?? '',
            date_to: range.date_to ?? '',
            page: 1,
        }, { preserveState: true, preserveScroll: true });
    };

    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pedidos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader
                    icon={PackageSearch}
                    title="Pedidos"
                    description="Órdenes de compra a proveedores para reabastecer stock."
                >
                    {userPermissions.includes('Crear Pedidos') && (
                        <Button onClick={() => setIsCreating(true)} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Pedido
                        </Button>
                    )}
                </PageHeader>
                <div className={`relative rounded-xl bg-card shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden ${hasMultiplePages ? 'flex-1' : ''}`}>
                    <div className={`h-full ${hasMultiplePages ? 'px-6 py-4' : 'p-6'}`}>
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
                        />
                    </div>
                </div>
            </div>

            <Dialog open={isCreating} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Nuevo Pedido</DialogTitle>
                        <DialogDescription>
                            Selecciona el proveedor y los productos a solicitar.
                        </DialogDescription>
                    </DialogHeader>
                    <PurchaseOrderForm
                        suppliers={suppliers}
                        products={products}
                        onCancel={attemptCloseForm}
                        onSaved={closeForm}
                        onDirtyChange={setIsFormDirty}
                    />
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
