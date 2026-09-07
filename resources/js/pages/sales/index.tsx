import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import Swal from '@/lib/swal';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SaleModal } from '../saleModal';
import SaleDetailModal, { type Sale as SaleDetail } from './saleDetailModal';
import SaleForm from './saleForm';
import SalesTable from './salesTable';

interface SaleItem {
    id: number;
    product_id: number;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
    item_discount: number;
    product_code?: string;
    product_name?: string;
}

interface Sale {
    id: number;
    invoice_number: string;
    client?: {
        id: number;
        name: string;
        document_number: string;
        department?: string;
        city?: string;
        document_type: string;
        verification_digit?: number;
        email?: string;
        phone?: string;
        cellphone?: string;
        address?: string;
    };
    user: { id: number; name: string };
    sale_date: string;
    sale_time: string;
    total_without_tax: number;
    total_with_discount: number;
    discount: number;
    discount_type: 'percentage' | 'fixed';
    total_paid: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
    public_invoice_url: string | null;
    is_cancelled: boolean;
}

interface Product {
    id: number;
    code: string;
    category_id?: number | string;
    category?: string;
    name: string;
    description: string;
    image_path?: string | null;
    price_without_tax?: number | null;
    price_with_tax?: number | null;
    iva_value?: number | null;
    sale_price?: number | null;
    supplier?: string | null;
    supplier_id?: number | null;
    stock: number;
    created_at?: string;
    updated_at?: string;
    movement_date?: string;
    movement_notes?: string;
    initial_movement_id?: number;
}

interface Client {
    id: number;
    document_type: string;
    document_number: number | string;
    verification_digit?: number;
    name: string;
    department_id?: number;
    department?: string;
    city_id?: number;
    city?: string;
    phone?: string;
    cellphone?: string;
    address?: string;
    email?: string;
    is_active: boolean;
}

interface Department {
    id: number;
    name: string;
}

interface City {
    id: number;
    name: string;
    department_id: number;
}

interface SaleIndexProps {
    sales: {
        data: Sale[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    products: Product[];
    clients: Client[];
    departments: Department[];
    cities: City[];
    filters: {
        search?: string;
        per_page?: string;
        date_from?: string;
        date_to?: string;
    };
    totalCount: number;
    filteredCount: number;
    flash?: {
        success?: string;
        invoice_url?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ventas',
        href: '/sales',
    },
];

export default function SaleIndex({ sales, products, clients, departments, cities, filters, totalCount, filteredCount }: SaleIndexProps) {
    useLiveRefresh(['sales'], () => router.reload());

    const [isCreating, setIsCreating] = useState(false);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [currentInvoiceUrl, setCurrentInvoiceUrl] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailSale, setDetailSale] = useState<SaleDetail | null>(null);
    const [businessName, setBusinessName] = useState('');

    const { auth, flash } = usePage().props as unknown as { auth: { permissions: string[] }; flash: SaleIndexProps['flash'] };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (flash?.invoice_url) {
            setCurrentInvoiceUrl(flash.invoice_url);
            setIsInvoiceModalOpen(true);
        }
    }, [flash]);

    const handleCreateSale = () => {
        setIsCreating(true);
    };

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
        router.post(
            route('sales.search'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    // El cambio de per_page ya lo maneja Pagination internamente (POST a
    // sales.search); este callback solo existe para cumplir la prop.
    const handlePerPageChange = () => {};

    const handlePeriodChange = (range: { date_from?: string; date_to?: string }) => {
        router.post(
            route('sales.search'),
            {
                ...filters,
                date_from: range.date_from ?? '',
                date_to: range.date_to ?? '',
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleViewInvoice = (url: string) => {
        setCurrentInvoiceUrl(url);
        setIsInvoiceModalOpen(true);
    };

    const handleViewDetails = async (saleId: number) => {
        try {
            const response = await fetch(route('sales.show', saleId), {
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Request failed');
            const data = await response.json();
            setDetailSale(data.sale);
            setBusinessName(data.businessName);
            setIsDetailModalOpen(true);
        } catch (error) {
            console.error('Error fetching sale details:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar el detalle de la venta.',
                timer: 2200,
            });
        }
    };

    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={ShoppingCart} title="Ventas" description="Historial y gestión de todas las ventas registradas.">
                    {userPermissions.includes('Crear Ventas') && (
                        <Button onClick={handleCreateSale} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nueva Venta
                        </Button>
                    )}
                </PageHeader>
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <SalesTable
                            sales={sales}
                            filters={filters}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={handlePerPageChange}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            onPeriodChange={handlePeriodChange}
                            userPermissions={userPermissions}
                            onViewInvoice={handleViewInvoice}
                            onViewDetails={handleViewDetails}
                            extraFilters={{ date_from: filters.date_from, date_to: filters.date_to }}
                        />
                    </div>
                </div>
            </div>

            <SaleModal
                open={isCreating}
                onOpenChange={(open) => {
                    if (!open) attemptCloseForm();
                }}
            >
                {isCreating && (
                    <SaleForm
                        products={products}
                        clients={clients}
                        departments={departments}
                        cities={cities}
                        onCancel={attemptCloseForm}
                        onSaved={closeForm}
                        onDirtyChange={setIsFormDirty}
                        userPermissions={userPermissions}
                    />
                )}
            </SaleModal>

            <SaleDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} sale={detailSale} businessName={businessName} />

            <ConfirmDialog
                open={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                title="¿Descartar venta?"
                description="Tienes una venta en progreso que se perderá."
                confirmText="Sí, descartar"
                cancelText="Seguir editando"
                onConfirm={closeForm}
            />

            <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
                <DialogContent className="bg-card max-h-[95vh] max-w-[95vw] rounded-2xl p-0 shadow-2xl sm:max-w-[550px]">
                    <div className="space-y-4 p-6">
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Factura #{currentInvoiceUrl ? currentInvoiceUrl.split('/').pop()?.replace('invoice_', '').replace('.pdf', '') : ''}
                        </DialogTitle>
                        <div className="relative">
                            <iframe
                                src={currentInvoiceUrl}
                                className="h-[60vh] w-full rounded-lg border border-gray-200 dark:border-gray-700"
                                title="Factura PDF"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
