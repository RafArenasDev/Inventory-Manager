import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Importa la interfaz unificada (puedes importarla desde productsTable o definirla aquí)
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
    iva_value?: number | null; // Nuevo campo
    sale_price?: number | null;
    supplier?: string | null;
    stock: number;
    created_at?: string;
    updated_at?: string;
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
    const formatCOP = (value: number | null | undefined) => {
        if (value === null || value === undefined || isNaN(value)) {
            return '-';
        }
        return new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getStockStatus = (stock: number) => {
        if (stock === 0) {
            return {
                variant: 'destructive' as const,
                label: 'Sin Stock',
                color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600'
            };
        } else if (stock <= 3) {
            return {
                variant: 'destructive' as const,
                label: 'Bajo',
                color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600'
            };
        } else if (stock <= 7) {
            return {
                variant: 'secondary' as const,
                label: 'Medio',
                color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-600'
            };
        } else if (stock <= 15) {
            return {
                variant: 'secondary' as const,
                label: 'Bueno',
                color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-600'
            };
        } else {
            return {
                variant: 'default' as const,
                label: 'Óptimo',
                color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-600'
            };
        }
    };

    if (!product) return null;

    const stockStatus = getStockStatus(product.stock);

    // Calcular IVA calculado para mostrar (si no hay iva_value guardado)
    const calculatedIvaValue = product.price_with_tax !== undefined &&
                              product.price_without_tax !== undefined
        ? (product.price_with_tax ?? 0) - (product.price_without_tax ?? 0)
        : 0;

    // Usar el valor guardado si existe, sino el calculado
    const displayIvaValue = product.iva_value !== null && product.iva_value !== undefined
        ? product.iva_value
        : calculatedIvaValue;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] bg-white dark:bg-[oklch(0.100205_0_0)] rounded-xl p-6 shadow-lg">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {product.name}
                    </DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-gray-400">
                        Detalles completos del producto
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Imagen */}
                    {product.image_path && (
                        <div className="flex justify-center">
                            <img
                                src={product.image_path}
                                alt={product.name}
                                className="h-35 w-35 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            />
                        </div>
                    )}

                    {/* Información principal */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="border-b pb-4">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Código</h4>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{product.code}</p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría</h4>
                            <Badge variant="outline" className="text-sm font-medium">
                                {product.category || 'Sin categoría'}
                            </Badge>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Stock</h4>
                            <Badge
                                variant={stockStatus.variant}
                                className={`text-sm font-medium ${stockStatus.color}`}
                            >
                                {stockStatus.label} ({product.stock})
                            </Badge>
                        </div>

                        {/* Precios */}
                        <div className="space-y-2">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Precio de Venta</h4>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {formatCOP(product.sale_price)}
                                </p>
                            </div>

                            {product.price_without_tax !== undefined && (
                                <>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Precio sin IVA</h4>
                                        <p className="text-base text-gray-700 dark:text-gray-300">
                                            {formatCOP(product.price_without_tax)}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Precio con IVA</h4>
                                        <p className="text-base text-gray-700 dark:text-gray-300">
                                            {formatCOP(product.price_with_tax)}
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Mostrar el valor del IVA (guardado o calculado) */}
                            {displayIvaValue !== undefined && displayIvaValue !== null && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        Valor IVA
                                    </h4>
                                    <p className="text-base text-gray-700 dark:text-gray-300">
                                        {formatCOP(displayIvaValue)}
                                    </p>
                                </div>
                            )}

                            {/* Mostrar diferencia si hay iva_value guardado y es diferente al calculado */}
                            {product.iva_value !== null && product.iva_value !== undefined &&
                             product.iva_value !== calculatedIvaValue &&
                             calculatedIvaValue > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-600">
                                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                        ⚠️ Nota: El IVA guardado ({formatCOP(product.iva_value)})
                                        difiere del calculado ({formatCOP(calculatedIvaValue)})
                                        basado en los precios actuales.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Proveedor</h4>
                            <p className="text-base text-gray-900 dark:text-gray-100">
                                {product.supplier || '-'}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción</h4>
                            <p className="text-base text-gray-900 dark:text-gray-100">
                                {product.description || '-'}
                            </p>
                        </div>

                        {/* Fechas */}
                        {(product.created_at || product.updated_at) && (
                            <div className="space-y-1 pt-2">
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fechas</h4>
                                {product.created_at && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Creado: {new Date(product.created_at).toLocaleDateString('es-CO', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                                {product.updated_at && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Actualizado: {new Date(product.updated_at).toLocaleDateString('es-CO', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
