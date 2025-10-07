import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import SalesTable from './salesTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import SaleForm from './saleForm';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

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
    client?: { id: number; name: string; document_number: string; department?: string; city?: string; document_type: string; verification_digit?: number; email?: string; phone?: string; cellphone?: string; address?: string };
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

interface SaleForForm {
    id?: number;
    client_id?: number | null;
    client_document_number?: string;
    sale_date: string;
    sale_time: string;
    discount: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
    total_without_tax: number;
    total_with_discount: number;
    total_paid: number;
    user_id?: number;
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
    };
    totalCount: number;
    filteredCount: number;
    flash?: {
        success?: string;
        invoice_url?: string;
    };
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ventas',
        href: '/sales',
    },
];

export default function SaleIndex({ sales, products, clients, departments, cities, filters, totalCount, filteredCount }: SaleIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingSale, setEditingSale] = useState<SaleForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [currentInvoiceUrl, setCurrentInvoiceUrl] = useState('');

    const { auth, flash } = usePage().props as unknown as { auth: { permissions: string[] }; flash: SaleIndexProps['flash'] };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (flash?.invoice_url) {
            setCurrentInvoiceUrl(flash.invoice_url);
            setIsInvoiceModalOpen(true);
        }
    }, [flash]);

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Venta',
                    href: '/sales/create',
                },
            ]);
            window.history.replaceState({}, '', route('sales.create'));
        } else if (editingSale) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Venta`,
                    href: `/sales/${editingSale.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('sales.edit', editingSale.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('sales.index'));
        }
    }, [isCreating, editingSale]);

    const handleCreateSale = () => {
        setIsCreating(true);
        setEditingSale(null);
    };

    const handleCancelForm = () => {
        setIsCreating(false);
        setEditingSale(null);
    };

    const handleSearch = (search: string) => {
        router.visit(route('sales.index'), {
            data: {
                ...filters,
                search,
                page: '1',
            },
            preserveState: true,
            replace: true,
        });
    };

    const handleViewInvoice = (url: string) => {
        setCurrentInvoiceUrl(url);
        setIsInvoiceModalOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingSale ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nueva Venta' : `Editar Venta`}
                            </h2>
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <SaleForm
                            sale={editingSale as SaleForForm}
                            products={products}
                            clients={clients}
                            departments={departments}
                            cities={cities}
                            onCancel={handleCancelForm}
                            userPermissions={userPermissions}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Ventas</h2>
                            {userPermissions.includes('Crear Ventas') && (
                                <Button onClick={handleCreateSale} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nueva Venta
                                </Button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <SalesTable
                                sales={sales}
                                filters={filters}
                                perPage={filters.per_page || '10'}
                                onPerPageChange={() => {}}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ''}
                                onSearch={handleSearch}
                                userPermissions={userPermissions}
                                onViewInvoice={handleViewInvoice}
                            />
                        </div>
                    </>
                )}
            </div>
            <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
                <DialogContent
                    className="sm:max-w-[550px] max-w-[95vw] max-h-[95vh] bg-white dark:bg-[oklch(0.100205_0_0)] rounded-2xl p-0 shadow-2xl [&>button]:absolute [&>button]:top-4 [&>button]:right-4 [&>button]:z-10 [&>button]:p-2 [&>button]:rounded-full [&>button]:bg-white/90 [&>button]:dark:bg-gray-800/90 [&>button]:hover:bg-white [&>button]:dark:hover:bg-gray-700 [&>button]:transition-colors [&>button]:shadow-md [&>button]:border-0"
                >
                    <div className="p-6 space-y-4">
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Factura #{currentInvoiceUrl ? currentInvoiceUrl.split('/').pop()?.replace('invoice_', '').replace('.pdf', '') : ''}
                        </DialogTitle>
                        <div className="relative">
                            <iframe
                                src={currentInvoiceUrl}
                                className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-gray-700"
                                title="Factura PDF"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
