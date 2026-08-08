import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { IconActionButton } from "@/components/icon-action-button"
import { Pencil, Trash2, Package, Eye } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from '@/lib/swal';
import SearchInput from "@/components/ui/search-input"
import { useState } from "react"
import ProductModal from "./productModal"
import { LinkProps } from '@/types';

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

interface ProductsTableProps {
    products: {
        data: Product[]
        links: LinkProps[]
        from: number
        to: number
        total: number
    }
    perPage: string
    onPerPageChange: () => void
    onEditProduct: (product: Product) => void
    totalCount: number
    filteredCount: number
    search: string
    onSearch: (search: string) => void
    userPermissions: string[]
}

export default function ProductsTable({
    products,
    perPage,
    onPerPageChange,
    onEditProduct,
    totalCount,
    filteredCount,
    search,
    onSearch,
    userPermissions
}: ProductsTableProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    const handleDelete = (productId: number, productName: string) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Esta acción eliminará el producto ${productName} permanentemente`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Sí, eliminar!",
            cancelButtonText: "Cancelar"
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('products.destroy', productId), {
                    onSuccess: () => {
                        Swal.fire({
                            title: "Eliminado!",
                            text: "El producto ha sido eliminado.",
                            icon: "success",
                            timer: 2200,
                            showConfirmButton: false
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: "Error!",
                            text: "No se pudo eliminar el producto.",
                            icon: "error"
                        });
                    }
                });
            }
        });
    };

    const getStockStatus = (stock: number) => {
        if (stock === 0) {
            return { label: 'Sin Stock', color: 'bg-rose-600 text-white font-bold dark:bg-rose-700' };
        } else if (stock <= 3) {
            return { label: 'Bajo', color: 'bg-rose-600 text-white font-bold dark:bg-rose-700' };
        } else if (stock <= 7) {
            return { label: 'Medio', color: 'bg-orange-600 text-white font-bold dark:bg-orange-700' };
        } else if (stock <= 15) {
            return { label: 'Bueno', color: 'bg-amber-600 text-white font-bold dark:bg-amber-700' };
        } else {
            return { label: 'Óptimo', color: 'bg-emerald-600 text-white font-bold dark:bg-emerald-700' };
        }
    };

    const formatPrice = (price: number | null | undefined) => {
        if (price === null || price === undefined || isNaN(price)) {
            return '-';
        }
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const handleViewProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const showActionsColumn = userPermissions.includes('Ver Productos') ||
                              userPermissions.includes('Editar Productos') ||
                              userPermissions.includes('Eliminar Productos');

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchInput
                    placeholder="Buscar por código, nombre o proveedor..."
                    searchValue={search}
                    onSearch={onSearch}
                    className="w-full sm:max-w-md"
                />
            </div>

            <div className="rounded-md bg-card shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Imagen</TableHead>
                            <TableHead className="max-w-[200px] sm:max-w-[250px]">Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Proveedor</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.data.map((product) => {
                            const stockStatus = getStockStatus(product.stock);
                            return (
                                <TableRow key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableCell className="font-medium text-left">{product.code}</TableCell>
                                    <TableCell className="text-left">
                                        {product.image_path ? (
                                            <img
                                                src={product.image_path}
                                                alt={product.name}
                                                className="h-12 w-12 object-cover rounded"
                                            />
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">Sin imagen</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] sm:max-w-[250px] w-48 text-left">
                                        <div className="font-medium line-clamp-2 break-words">
                                            {product.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <span className="text-xs px-3 py-0.5 rounded-full bg-blue-600 text-white font-bold w-fit shadow-sm dark:bg-blue-700">
                                            { product.category }
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <span className={`inline-flex items-center gap-2 text-xs px-3 py-0.5 rounded-full ${stockStatus.color} w-fit shadow-sm`}>
                                            <span className="font-bold">{product.stock}</span>
                                            <span>{stockStatus.label}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-left font-medium">
                                        {formatPrice(product.sale_price)}
                                    </TableCell>
                                    <TableCell className="text-xs text-left">
                                        <span className="text-xs px-3 py-0.5 rounded-full bg-zinc-600 text-white font-bold w-fit shadow-sm dark:bg-zinc-700">
                                            {product.supplier || '-'}
                                        </span>
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {userPermissions.includes('Ver Productos') && (
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => handleViewProduct(product)}
                                                        className="text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                                        label="Ver producto"
                                                    >
                                                        <Eye className="size-3.5" />
                                                    </IconActionButton>
                                                )}
                                                {userPermissions.includes('Editar Productos') && (
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => onEditProduct(product)}
                                                        className="text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-950/40 dark:hover:text-amber-400"
                                                        label="Editar producto"
                                                    >
                                                        <Pencil className="size-3.5" />
                                                    </IconActionButton>
                                                )}
                                                {userPermissions.includes('Eliminar Productos') && (
                                                    <IconActionButton
                                                        variant="ghost"
                                                        onClick={() => handleDelete(product.id, product.name)}
                                                        className="text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                                        label="Eliminar producto"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </IconActionButton>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                        {products.data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={showActionsColumn ? 8 : 7} className="h-24 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Package className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                        <span className="text-sm font-medium">No se encontraron productos</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={selectedProduct}
            />

            <Pagination
                data={products}
                perPage={perPage}
                onPerPageChange={onPerPageChange}
                totalCount={totalCount}
                filteredCount={filteredCount}
                search={search}
                searchRoute="products.search"
            />
        </div>
    )
}
