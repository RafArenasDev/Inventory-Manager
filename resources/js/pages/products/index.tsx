import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import ProductsTable from './productsTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import ProductForm from './productForm';

// Interface unificada para productos
interface Category {
    id: number;
    name: string;
}

interface Product {
    id?: number;
    code: string;
    category_id?: number | string;
    category?: string;
    name: string;
    description: string;
    image_path?: string | null;
    price_without_tax?: number | null;
    price_with_tax?: number | null;
    sale_price?: number | null;
    supplier?: string | null;
    stock: number;
    created_at?: string;
    updated_at?: string;
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
    filters,
    totalCount,
    filteredCount,
}: ProductIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

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
        const newProduct: Product = {
            code: '',
            category_id: categories[0]?.id || '',
            name: '',
            description: '',
            image_path: '',
            price_without_tax: null,
            price_with_tax: null,
            sale_price: null,
            supplier: '',
            stock: 0,
        };
        setEditingProduct(newProduct);
        setIsCreating(true);
    };

    const handleEditProduct = (product: Product) => {
        // Asegurar que category_id esté presente
        const categoryId = categories.find((cat) => cat.name === product.category)?.id ||
                          product.category_id || '';

        const productForForm: Product = {
            ...product,
            category_id: categoryId,
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
                            product={editingProduct ?? undefined}
                            categories={categories}
                            onCancel={handleCancelForm}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Productos</h2>
                            <div className="flex items-center gap-2">
                                <Button onClick={handleCreateProduct} className="gap-1">
                                    <Plus className="h-4 w-4" />
                                    Nuevo Producto
                                </Button>
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
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
