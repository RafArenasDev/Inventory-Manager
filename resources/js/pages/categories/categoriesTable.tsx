import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
import SearchInput from "@/components/ui/search-input"

interface Category {
    id: number
    name: string
    description: string
    created_at: string
    updated_at: string
    products_count?: number
}

interface LinkProps {
    active: boolean;
    label: string;
    url: string | null;
}

interface CategoriesTableProps {
    categories: {
        data: Category[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    perPage: string
    onPerPageChange: () => void
    onEditCategory: (category: Category) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
}

export default function CategoriesTable({
    categories,
    perPage,
    onPerPageChange,
    onEditCategory,
    totalCount,
    filteredCount,
    search,
    onSearch
}: CategoriesTableProps) {

    const handleDelete = (categoryId: number, categoryName: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará la categoría ${categoryName} permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('categories.destroy', categoryId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminada!",
                            text: "La categoría ha sido eliminada.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar la categoría.",
                            icon: "error"
                        });
                    }
                });
            }
        });
    };

    return (
        <div className="space-y-4">
            {/* Añadimos el SearchInput aquí */}
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por nombre de categoría..."
                    searchValue={search}
                    onSearch={onSearch}
                />
            </div>

            <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead>Productos</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.data.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="max-w-xs">
                                    <span className="text-gray-600 dark:text-gray-400 line-clamp-2">
                                        {category.description || 'Sin descripción'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    category.products_count === 0
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    }`}
                                >
                                    {category.products_count || 0} producto
                                    {category.products_count !== 1 ? 's' : ''}
                                </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => onEditCategory(category)}
                                            className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDelete(category.id, category.name)}
                                            className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    No se encontraron categorías.
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
            />
        </div>
    )
}
