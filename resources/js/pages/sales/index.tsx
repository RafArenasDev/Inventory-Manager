import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import SalesTable from './salesTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import SaleForm from './saleForm';

interface SaleItem {
    id: number;
    product_id: number;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
    item_discount: number;
}

interface Sale {
    id: number;
    client?: { id: number; name: string };
    user: { id: number; name: string };
    sale_date: string;
    total_without_tax: number;
    total_with_tax: number;
    discount: number;
    total_paid: number;
    payment_method: string;
    notes?: string;
    items: SaleItem[];
}

interface Product {
    id: number;
    name: string;
    sale_price: number;
    stock: number;
}

interface Client {
    id: number;
    name: string;
}

interface SaleForForm {
    id?: number;
    client_id?: number | null;
    sale_date: string;
    discount: number;
    payment_method: string;
    notes?: string;
    items: { product_id: number; quantity: number; item_discount: number }[];
    total_without_tax: number;
    total_with_tax: number;
    total_paid: number;
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
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ventas',
        href: '/sales',
    },
];

export default function SaleIndex({ sales, products, clients, filters, totalCount, filteredCount }: SaleIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingSale, setEditingSale] = useState<SaleForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

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
        const newSale: SaleForForm = {
            sale_date: new Date().toISOString().split('T')[0],
            discount: 0,
            payment_method: 'Efectivo',
            notes: '',
            items: [],
            total_without_tax: 0,
            total_with_tax: 0,
            total_paid: 0,
        };
        setEditingSale(newSale);
        setIsCreating(true);
    };

    const handleEditSale = (sale: Sale) => {
        const saleForForm: SaleForForm = {
            id: sale.id,
            client_id: sale.client?.id || null,
            sale_date: sale.sale_date,
            discount: sale.discount,
            payment_method: sale.payment_method,
            notes: sale.notes,
            items: sale.items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                item_discount: item.item_discount,
            })),
            total_without_tax: sale.total_without_tax,
            total_with_tax: sale.total_with_tax,
            total_paid: sale.total_paid,
        };
        setEditingSale(saleForForm);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingSale(null);
        setIsCreating(false);
    };

    const handleSearch = (search: string) => {
        router.get(
            route('sales.index'),
            {
                ...filters,
                search,
                page: '1',
            },
            {
                preserveState: true,
                replace: true,
            }
        );
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
                                perPage={filters.per_page || '10'}
                                onPerPageChange={() => {}}
                                onEditSale={handleEditSale}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ''}
                                onSearch={handleSearch}
                                userPermissions={userPermissions}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
