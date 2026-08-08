import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { LinkProps, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import CategoriesTable from './categoriesTable';
import { Button } from '@/components/ui/button';
import { Plus, Tags } from 'lucide-react';
import CategoryForm from './categoryForm';
import { PageHeader } from '@/components/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';

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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categorías',
        href: '/categories',
    },
];

export default function CategoryIndex({ categories, filters, totalCount, filteredCount }: CategoryIndexProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryForForm | null>(null);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const userPermissions = auth.permissions;

    const isModalOpen = isCreating || !!editingCategory;

    const handleCreateCategory = () => {
        if (!userPermissions.includes('Crear Categorías')) {
            return;
        }
        setEditingCategory({ name: '', description: '' });
        setIsCreating(true);
    };

    const handleEditCategory = (category: Category) => {
        if (!userPermissions.includes('Actualizar Categorías')) {
            return;
        }
        setEditingCategory({
            id: category.id,
            name: category.name,
            description: category.description,
        });
        setIsCreating(false);
    };

    const closeForm = () => {
        setEditingCategory(null);
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
        router.post(route('categories.search'), {
            ...filters,
            search,
            page: 1
        }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    // Cuando hay más de una página, la card se estira (flex-1) para que el
    // margen inferior respecto al módulo quede igual al superior — igual
    // que el panel de Resumen Financiero del Dashboard. Con pocos registros
    // se deja del tamaño natural, sin espacio muerto forzado abajo.
    const hasMultiplePages = totalCount > Number(filters.per_page || 10);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorías" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <PageHeader
                    icon={Tags}
                    title="Categorías"
                    description="Organiza el catálogo de productos por categorías."
                >
                    {userPermissions.includes('Crear Categorías') && (
                        <Button onClick={handleCreateCategory} className="gap-1">
                            <Plus className="h-4 w-4" />
                            Nueva Categoría
                        </Button>
                    )}
                </PageHeader>
                <div className={`relative rounded-xl bg-card shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden ${hasMultiplePages ? 'flex-1' : ''}`}>
                    <div className={`h-full ${hasMultiplePages ? 'px-6 py-4' : 'p-6'}`}>
                        <CategoriesTable
                            categories={categories}
                            perPage={filters.per_page || "10"}
                            onPerPageChange={() => { }}
                            onEditCategory={handleEditCategory}
                            totalCount={totalCount}
                            filteredCount={filteredCount}
                            search={filters.search || ""}
                            onSearch={handleSearch}
                            userPermissions={userPermissions}
                        />
                    </div>
                </div>
            </div>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) attemptCloseForm(); }}>
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>{isCreating ? 'Nueva Categoría' : `Editar Categoría: ${editingCategory?.name}`}</DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Completa los datos para crear una nueva categoría.'
                                : 'Actualiza los datos de la categoría.'}
                        </DialogDescription>
                    </DialogHeader>
                    {editingCategory && (
                        <CategoryForm
                            category={editingCategory}
                            onCancel={attemptCloseForm}
                            onSaved={closeForm}
                            onDirtyChange={setIsFormDirty}
                            userPermissions={userPermissions}
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
