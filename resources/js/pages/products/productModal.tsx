import {
    Dialog,
    DialogContent,
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
    const formatCOP = (value: number | null | undefined): string => {
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

    // Detectar si es mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] max-w-[95vw] max-h-[95vh] bg-white dark:bg-[oklch(0.100205_0_0)] rounded-2xl p-0 shadow-2xl">
                <div className="relative">
                    {/* Botón de cerrar en esquina superior derecha */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Imagen protagonista */}
                    {product.image_path && (
                        <div className="relative">
                            <img
                                src={product.image_path}
                                alt={product.name}
                                className="w-full h-48 object-cover rounded-t-2xl"
                            />
                        </div>
                    )}

                    {/* Contenido principal */}
                    <div className="p-6 space-y-4">
                        {/* Header: Nombre, Descripción, Código y Categoría */}
                        <div className="space-y-2">
                            {/* Nombre */}
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {product.name}
                            </DialogTitle>

                            {/* Descripción */}
                            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {product.description || 'Sin descripción disponible'}
                            </DialogDescription>

                            {/* Código y Categoría - mismo tamaño */}
                            <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded">
                                    {product.code}
                                </span>
                                <Badge variant="outline" className="text-xs font-medium px-2.5 py-1">
                                    {product.category || 'Sin categoría'}
                                </Badge>
                            </div>
                        </div>

                        {/* Precio de venta - más pequeño */}
                        <div className="text-center py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-0.5">Precio de Venta</h3>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {formatCOP(product.sale_price)}
                            </p>
                        </div>

                        {/* Stock y Proveedor en la misma línea */}
                        <div className="flex justify-between items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Stock:</span>
                                <Badge
                                    variant={stockStatus.variant}
                                    className={`font-medium ${stockStatus.color}`}
                                >
                                    {stockStatus.label} ({product.stock})
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Proveedor:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {product.supplier || '-'}
                                </span>
                            </div>
                        </div>

                        {/* Detalles de precios - SIN leyenda */}
                        {(product.price_without_tax !== undefined || displayIvaValue > 0) && (
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                                {isMobile ? (
                                    /* Mobile: Lista simple sin decoración */
                                    <div className="space-y-2 text-sm">
                                        {product.price_without_tax !== undefined && (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-gray-500 dark:text-gray-400">Sin IVA</span>
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                    {formatCOP(product.price_without_tax)}
                                                </span>
                                            </div>
                                        )}
                                        {product.price_with_tax !== undefined && (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-gray-500 dark:text-gray-400">Con IVA</span>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                    {formatCOP(product.price_with_tax)}
                                                </span>
                                            </div>
                                        )}
                                        {displayIvaValue > 0 && (
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-gray-500 dark:text-gray-400">Valor IVA</span>
                                                <span className="font-semibold text-green-700 dark:text-green-300">
                                                    {formatCOP(displayIvaValue)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Desktop: Cards sutiles con colores diferenciados */
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {product.price_without_tax !== undefined && (
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Sin IVA</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                                                    {formatCOP(product.price_without_tax)}
                                                </p>
                                            </div>
                                        )}
                                        {product.price_with_tax !== undefined && (
                                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs text-white dark:text-white px-1 py-0.5 rounded inline-block">Con IVA</p>
                                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-0.5">
                                                    {formatCOP(product.price_with_tax)}
                                                </p>
                                            </div>
                                        )}
                                        {displayIvaValue > 0 && (
                                            <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                                <p className="text-xs text-white dark:text-white px-1 py-0.5 rounded inline-block">Valor IVA</p>
                                                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mt-0.5">
                                                    {formatCOP(displayIvaValue)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Mostrar diferencia si hay iva_value guardado y es diferente al calculado */}
                                {product.iva_value !== null && product.iva_value !== undefined &&
                                 product.iva_value !== calculatedIvaValue &&
                                 calculatedIvaValue > 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-200 dark:border-yellow-600 mt-2">
                                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                            ⚠️ Nota: El IVA guardado ({formatCOP(product.iva_value)})
                                            difiere del calculado ({formatCOP(calculatedIvaValue)})
                                            basado en los precios actuales.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fechas */}
                        {/* {(product.created_at || product.updated_at) && (
                            <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                                {product.created_at && (
                                    <p className="flex items-center">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
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
                                    <p className="flex items-center">
                                        <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
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
                        )} */}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
