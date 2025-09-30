import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import ProductsTable from './productsTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import ProductForm from './productForm';

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
    stock: string;
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

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/products',
    },
];

export default function ProductIndex({
    products,
    categories,
    suppliers,
    filters,
    totalCount,
    filteredCount,
}: ProductIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Producto',
                    href: '/products/create',
                },
            ]);
            window.history.replaceState({}, '', route('products.create'));
        } else if (editingProduct?.id) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Producto: ${editingProduct.name}`,
                    href: `/products/${editingProduct.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('products.edit', editingProduct.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('products.index'));
        }
    }, [isCreating, editingProduct]);

    const handleCreateProduct = () => {
        const newProduct: ProductForForm = {
            code: '',
            category_id: (categories[0]?.id ?? 0),
            name: '',
            description: '',
            image_path: '',
            price_without_tax: '',
            price_with_tax: '',
            iva_value: '',
            sale_price: '',
            supplier_id: '',
            stock: '0',
            movement_notes: '',
        };
        setEditingProduct(newProduct);
        setIsCreating(true);
    };

    const handleEditProduct = (product: Product) => {
        const categoryIdRaw =
            categories.find((cat) => cat.name === product.category)?.id ??
            product.category_id ??
            categories[0]?.id ??
            0;
        const categoryId = typeof categoryIdRaw === 'string' ? parseInt(categoryIdRaw, 10) : categoryIdRaw;

        const productForForm: ProductForForm = {
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
            stock: product.stock?.toString() || '0',
            movement_notes: product.movement_notes || '',
        };
        setEditingProduct(productForForm);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingProduct(null);
        setIsCreating(false);
    };

    const handleSearch = (search: string) => {
        router.get(
            route('products.index'),
            {
                ...filters,
                search,
                page: 1,
            },
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {isCreating || editingProduct ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nuevo Producto' : `Editar Producto: ${editingProduct?.name}`}
                            </h2>
                            <Button onClick={handleCancelForm} className="gap-1">
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <ProductForm
                            product={editingProduct as ProductForForm}
                            categories={categories}
                            suppliers={suppliers}
                            onCancel={handleCancelForm}
                            userPermissions={userPermissions}
                            isCreating={isCreating}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Productos</h2>
                            <div className="flex items-center gap-2">
                                {userPermissions.includes('Crear Productos') && (
                                    <Button onClick={handleCreateProduct} className="gap-1">
                                        <Plus className="h-4 w-4" />
                                        Nuevo Producto
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
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
                    </>
                )}
            </div>
        </AppLayout>
    );
}
