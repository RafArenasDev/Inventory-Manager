import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import CategoriesTable from './categoriesTable';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus } from 'lucide-react';
import CategoryForm from './categoryForm';

interface Category {
    id: number
    name: string
    description: string
    created_at: string
    updated_at: string
    products_count?: number
}

interface CategoryForForm {
    id?: number;
    name: string;
    description: string;
}

interface CategoryIndexProps {
    categories: {
        data: Category[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    filters: {
        search?: string
        per_page?: string
    }
    totalCount: number
    filteredCount: number
}

const initialBreadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categorías',
        href: '/categories',
    },
];

export default function CategoryIndex({ categories, filters, totalCount, filteredCount }: CategoryIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryForForm | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(initialBreadcrumbs);

    useEffect(() => {
        if (isCreating) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: 'Crear Categoría',
                    href: '/categories/create',
                },
            ]);
            // Usamos replace: true para evitar agregar una nueva entrada al historial
            window.history.replaceState({}, '', route('categories.create'));
        } else if (editingCategory) {
            setBreadcrumbs([
                ...initialBreadcrumbs,
                {
                    title: `Editar Categoría`,
                    href: `/categories/${editingCategory.id}/edit`,
                },
            ]);
            window.history.replaceState({}, '', route('categories.edit', editingCategory.id));
        } else {
            setBreadcrumbs(initialBreadcrumbs);
            window.history.replaceState({}, '', route('categories.index'));
        }
    }, [isCreating, editingCategory]);

    const handleCreateCategory = () => {
        const newCategory: CategoryForForm = {
            name: '',
            description: '',
        };
        setEditingCategory(newCategory);
        setIsCreating(true);
    };

    const handleEditCategory = (category: Category) => {
        const categoryForForm: CategoryForForm = {
            id: category.id,
            name: category.name,
            description: category.description,
        };
        setEditingCategory(categoryForForm);
        setIsCreating(false);
    };

    const handleCancelForm = () => {
        setEditingCategory(null);
        setIsCreating(false);
    };

    const handleSearch = (search: string) => {
        router.get(route('categories.index'), {
            ...filters,
            search,
            page: 1 // Reset to first page when searching
        }, {
            preserveState: true,
            replace: true
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Mostrar formulario o lista según el estado */}
                {isCreating || editingCategory ? (
                    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {isCreating ? 'Nueva Categoría' : `Editar Categoría: ${editingCategory?.name}`}
                            </h2>
                            <Button
                                onClick={handleCancelForm}
                                className="gap-1"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Atrás
                            </Button>
                        </div>
                        <CategoryForm
                            category={editingCategory ?? undefined}
                            onCancel={handleCancelForm}
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold tracking-tight">Categorías</h2>
                            <Button onClick={handleCreateCategory} className="gap-1">
                                <Plus className="h-4 w-4" />
                                Nueva Categoría
                            </Button>
                        </div>
                        <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
                            <CategoriesTable
                                categories={categories}
                                perPage={filters.per_page || "10"}
                                onPerPageChange={() => { }}
                                onEditCategory={handleEditCategory}
                                totalCount={totalCount}
                                filteredCount={filteredCount}
                                search={filters.search || ""}
                                onSearch={handleSearch}
                            />
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
