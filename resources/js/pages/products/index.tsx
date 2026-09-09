import { ConfirmDialog } from '@/components/confirm-dialog';
import { InventoryImportDialog } from '@/components/inventory-import-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Package, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import ProductForm from './productForm';
import ProductsTable from './productsTable';

interface Category {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    name: string;
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

interface ProductForForm {
    id?: number;
    code: string;
    category_id: number;
    name: string;
    description: string;
    image_path?: string | null;
    price_without_tax: string;
    price_with_tax: string;
    iva_value: string;
    sale_price: string;
    supplier_id?: number | string;
    stock?: number;
    movement_notes: string;
}

interface ProductIndexProps {
    products: {
        data: Product[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    categories: Category[];
    suppliers: Supplier[];
    filters: {
        search?: string;
        per_page?: string;
    };
    totalCount: number;
    filteredCount: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/products',
    },
];

export default function ProductIndex({ products, categories, suppliers, filters, totalCount, filteredCount }: ProductIndexProps) {
    useLiveRefresh(['inventory'], () => router.reload());

    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingProduct;

    const handleCreateProduct = () => {
        if (!userPermissions.includes('Crear Productos')) {
            return;
        }
        setEditingProduct({
            code: '',
            category_id: categories[0]?.id ?? 0,
            name: '',
            description: '',
            image_path: '',
            price_without_tax: '',
            price_with_tax: '',
            iva_value: '',
            sale_price: '',
            supplier_id: '',
            movement_notes: '',
        });
        setIsCreating(true);
    };

    const handleEditProduct = (product: Product) => {
        if (!userPermissions.includes('Editar Productos')) {
            return;
        }
        const categoryIdRaw = categories.find((cat) => cat.name === product.category)?.id ?? product.category_id ?? categories[0]?.id ?? 0;
        const categoryId = typeof categoryIdRaw === 'string' ? parseInt(categoryIdRaw, 10) : categoryIdRaw;

        setEditingProduct({
            id: product.id,
            code: product.code || '',
            category_id: categoryId,
            name: product.name || '',
            description: product.description || '',
            image_path: product.image_path || '',
            price_without_tax: product.price_without_tax?.toString() || '',
            price_with_tax: product.price_with_tax?.toString() || '',
            iva_value: product.iva_value?.toString() || '',
            sale_price: product.sale_price?.toString() || '',
            supplier_id: product.supplier_id?.toString() || '',
            stock: product.stock,
            movement_notes: product.movement_notes || '',
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingProduct(null);
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
            route('products.search'),
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

    const hasMultiplePages = filteredCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader icon={Package} title="Productos" description="Consulta y administra el inventario de productos.">
                    {userPermissions.includes('Crear Movimientos Inventario') && (
                        <Button onClick={() => setIsImporting(true)} variant="outline" className="bg-card hover:bg-card/70 gap-1">
                            <Upload className="h-4 w-4" />
                            Carga Masiva
                        </Button>
                    )}
                    {userPermissions.includes('Crear Productos') && (
                        <Button onClick={handleCreateProduct} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nuevo Producto
                        </Button>
                    )}
                </PageHeader>
                <div
                    className={`bg-card relative overflow-hidden rounded-xl shadow-lg shadow-black/10 dark:shadow-black/60 ${hasMultiplePages ? 'flex-1' : ''}`}
                >
                    <div className="h-full px-6 py-4">
                        <ProductsTable
                            products={products}
                            perPage={filters.per_page || '10'}
                            onPerPageChange={() => {}}
                            onEditProduct={handleEditProduct}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ''}
                            onSearch={handleSearch}
                            userPermissions={userPermissions}
                        />
                    </div>
                </div>
            </div>

            <Dialog
                open={isModalOpen}
                onOpenChange={(open) => {
                    if (!open) attemptCloseForm();
                }}
            >
                <DialogContent
                    className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden sm:max-w-4xl lg:max-w-6xl"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{isCreating ? 'Nuevo Producto' : `Editar Producto: ${editingProduct?.name}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating ? 'Completa los datos para registrar un nuevo producto.' : 'Actualiza los datos del producto.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingProduct && (
                        <ProductForm
                            product={editingProduct}
                            categories={categories}
                            suppliers={suppliers}
                            onCancel={attemptCloseForm}
                            onSaved={closeForm}
                            onDirtyChange={setIsFormDirty}
                            userPermissions={userPermissions}
                            isCreating={isCreating}
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

            <InventoryImportDialog open={isImporting} onOpenChange={setIsImporting} mode="products" />
        </AppLayout>
    );
}
