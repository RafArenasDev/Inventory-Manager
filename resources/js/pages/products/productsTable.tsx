import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Package, Eye } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { router } from "@inertiajs/react"
import Swal from 'sweetalert2'
import SearchInput from "@/components/ui/search-input"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import ProductModal from "./productModal"
import { LinkProps } from '@/types';

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
    iva_value?: number | null;
    sale_price?: number | null;
    supplier?: string | null;
    stock: number;
    created_at?: string;
    updated_at?: string;
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
            return { variant: 'destructive' as const, label: 'Sin Stock', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600' };
        } else if (stock <= 3) {
            return { variant: 'destructive' as const, label: 'Bajo', color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600' };
        } else if (stock <= 7) {
            return { variant: 'secondary' as const, label: 'Medio', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-600' };
        } else if (stock <= 15) {
            return { variant: 'secondary' as const, label: 'Bueno', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-600' };
        } else {
            return { variant: 'default' as const, label: 'Óptimo', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600' };
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

    const handleEditProduct = (product: Product) => {
        // Asegurar que category_id esté presente para el formulario
        const productWithCategoryId = {
            ...product,
            category_id: product.category_id || (product.id ?? 0) // fallback si no hay category_id
        };

        console.log('Producto seleccionado para editar:', productWithCategoryId);
        console.log('Category ID:', productWithCategoryId.category_id);
        onEditProduct(productWithCategoryId);
    };

    // Calcular si mostrar columna de acciones (igual que roles)
    const showActionsColumn = userPermissions.includes('Ver Productos') ||
                              userPermissions.includes('Editar Productos') ||
                              userPermissions.includes('Eliminar Productos');

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <SearchInput
                    placeholder="Buscar por código, nombre o proveedor..."
                    searchValue={search}
                    onSearch={onSearch}
                />
            </div>

            <div className="rounded-md border dark:border-gray-700 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-400 dark:bg-gray-700">
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Imagen</TableHead>
                            <TableHead className="max-w-[200px] sm:max-w-[250px]">Nombre</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead>Proveedor</TableHead>
                            {showActionsColumn && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.data.map((product) => {
                            const stockStatus = getStockStatus(product.stock);
                            return (
                                <TableRow key={product.id ?? product.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <TableCell className="font-medium">{product.code}</TableCell>
                                    <TableCell>
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
                                    <TableCell className="max-w-[200px] sm:max-w-[250px] w-48">
                                        <div className="font-medium line-clamp-2 break-words">
                                            {product.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {product.category || 'Sin categoría'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant={stockStatus.variant}
                                            className={`text-xs font-medium ${stockStatus.color}`}
                                        >
                                            {stockStatus.label} ({product.stock})
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatPrice(product.sale_price)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {product.supplier || '-'}
                                    </TableCell>
                                    {showActionsColumn && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {userPermissions.includes('Ver Productos') && (  // CONDICIONADO: botón ver
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleViewProduct(product)}
                                                        className="text-blue-600 hover:text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-900/30"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {userPermissions.includes('Editar Productos') && (  // CONDICIONADO: botón editar
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleEditProduct(product)}
                                                        className="text-yellow-600 hover:text-yellow-700 border-yellow-300 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {userPermissions.includes('Eliminar Productos') && (  // CONDICIONADO: botón eliminar
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => handleDelete(product.id!, product.name)}
                                                        className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                                    <div className="flex flex-col items-center gap-2">
                                        <Package className="h-8 w-8 text-gray-400" />
                                        <span>No se encontraron productos.</span>
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
            />
        </div>
    )
}
