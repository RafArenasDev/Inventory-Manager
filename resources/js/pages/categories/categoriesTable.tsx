import { IconActionButton } from '@/components/icon-action-button';
import { StatusToggle } from '@/components/status-toggle';
import { Pagination } from '@/components/ui/pagination';
import SearchInput from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Swal from '@/lib/swal';
import { escapeHtml } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Pencil, Tags, Trash2 } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    products_count?: number;
    is_active: boolean;
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface CategoriesTableProps {
    categories: {
        data: Category[];
        links: LinkProps[];
        from: number;
        to: number;
        total: number;
    };
    perPage: string;
    onPerPageChange: () => void;
    onEditCategory: (category: Category) => void;
    totalCount: number;
    filteredCount: number;
    search: string;
    onSearch: (search: string) => void;
    userPermissions: string[];
}

export default function CategoriesTable({
    categories,
    perPage,
    onPerPageChange,
    onEditCategory,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions,
}: CategoriesTableProps) {
    const handleDelete = (categoryId: number, categoryName: string) => {
        Swal.fire({
            title: '¿Estás seguro?',
            html: `Esta acción eliminará la categoría <b>${escapeHtml(categoryName)}</b> permanentemente`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar!',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('categories.destroy', categoryId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: 'Eliminada!',
                            text: 'La categoría ha sido eliminada.',
                            icon: 'success',
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error!',
                            text: 'No se pudo eliminar la categoría.',
                            icon: 'error',
                        });
                    },
                });
            }
        });
    };

    // Check if the user has any permissions to show the "Acciones" column
    const showActionsColumn = userPermissions.includes('Actualizar Categorías') || userPermissions.includes('Eliminar Categorías');

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    placeholder="Buscar por nombre de categoría..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:max-w-lg"
                />
            </div>

            <div className="bg-card overflow-hidden rounded-md shadow-lg shadow-black/10 dark:shadow-black/60">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Productos</TableHead>
                            <TableHead>Estado</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.data.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="max-w-xs">
                                    <span className="line-clamp-2 text-gray-600 dark:text-gray-400">{category.description || 'Sin descripción'}</span>
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex w-28 items-center justify-center rounded-full px-2.5 py-0.5 text-center text-xs font-bold shadow-sm ${
                                            category.products_count === 0
                                                ? 'bg-rose-600 text-white dark:bg-rose-700'
                                                : 'bg-emerald-600 text-white dark:bg-emerald-700'
                                        }`}
                                    >
                                        {category.products_count || 0} - Producto
                                        {category.products_count !== 1 ? 's' : ''}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <StatusToggle
                                        id={category.id}
                                        isActive={category.is_active}
                                        toggleRouteName="categories.toggle-active"
                                        entityLabel="categoría"
                                        entityName={category.name}
                                        feminine
                                        useArticle
                                    />
                                </TableCell>
                                {showActionsColumn && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {userPermissions.includes('Actualizar Categorías') && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => onEditCategory(category)}
                                                    className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                    label="Editar categoría"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                            {userPermissions.includes('Eliminar Categorías') && (
                                                <IconActionButton
                                                    variant="ghost"
                                                    onClick={() => handleDelete(category.id, category.name)}
                                                    className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                    label="Eliminar categoría"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </IconActionButton>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {categories.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 5 : 4} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Tags className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron categorías</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination
                data={categories}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="categories.search"
            />
        </div>
    );
}
