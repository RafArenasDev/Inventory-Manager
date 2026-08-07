import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

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
                color: 'bg-red-600 text-white font-bold dark:bg-red-700'
            };
        } else if (stock <= 3) {
            return {
                variant: 'destructive' as const,
                label: 'Bajo',
                color: 'bg-red-600 text-white font-bold dark:bg-red-700'
            };
        } else if (stock <= 7) {
            return {
                variant: 'secondary' as const,
                label: 'Medio',
                color: 'bg-orange-600 text-white font-bold dark:bg-orange-700'
            };
        } else if (stock <= 15) {
            return {
                variant: 'secondary' as const,
                label: 'Bueno',
                color: 'bg-yellow-600 text-white font-bold dark:bg-yellow-700'
            };
        } else {
            return {
                variant: 'default' as const,
                label: 'Óptimo',
                color: 'bg-green-600 text-white font-bold dark:bg-green-700'
            };
        }
    };

    if (!product) return null;

    const stockStatus = getStockStatus(product.stock);

    const calculatedIvaValue = product.price_with_tax !== undefined &&
                              product.price_without_tax !== undefined
        ? (product.price_with_tax ?? 0) - (product.price_without_tax ?? 0)
        : 0;

    const displayIvaValue = product.iva_value !== null && product.iva_value !== undefined
        ? product.iva_value
        : calculatedIvaValue;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[550px] max-w-[95vw] max-h-[95vh] bg-white dark:bg-[oklch(0.100205_0_0)] dark:border-gray-800 rounded-2xl p-0 shadow-2xl [&>button]:absolute [&>button]:top-4 [&>button]:right-4 [&>button]:z-10 [&>button]:p-2 [&>button]:rounded-full [&>button]:bg-white/90 [&>button]:dark:bg-gray-800/90 [&>button]:hover:bg-white [&>button]:dark:hover:bg-gray-700 [&>button]:transition-colors [&>button]:shadow-md [&>button]:border-0"
            >
                <div className="relative">

                    {product.image_path && (
                        <div className="relative">
                            <img
                                src={product.image_path}
                                alt={product.name}
                                className="w-full h-48 object-cover rounded-t-2xl"
                            />
                        </div>
                    )}

                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {product.name}
                            </DialogTitle>

                            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {product.description || 'Sin descripción disponible'}
                            </DialogDescription>

                            <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                                <span className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white font-bold w-fit shadow-sm dark:bg-blue-700 font-mono cursor-pointer" onClick={() => navigator.clipboard.writeText(product.code)}>
                                    {product.code}
                                </span>
                                <span className="text-xs px-3 py-1 rounded-full bg-gray-600 text-white font-bold w-fit shadow-sm dark:bg-gray-700">
                                    {product.category || 'Sin categoría'}
                                </span>
                            </div>
                        </div>

                        <div className="text-center py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-0.5">Precio de Venta</h3>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                {formatCOP(product.sale_price)}
                            </p>
                        </div>

                        <div className="flex justify-between items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Stock:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100 ml-1">
                                    {product.stock}
                                </span>
                                <span></span>
                                <span className={`text-xs px-3 py-1 rounded-full ${stockStatus.color} w-fit shadow-sm`}>
                                    {stockStatus.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Proveedor:</span>
                                <span className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white font-bold w-fit shadow-sm dark:bg-emerald-700">
                                    {product.supplier || '-'}
                                </span>
                            </div>
                        </div>

                        {(product.price_without_tax !== undefined || displayIvaValue > 0) && (
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                                {isMobile ? (
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
                                    <div className="grid grid-cols-3 gap-2">
                                        {product.price_without_tax !== undefined ? (
                                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                                                <p className="text-xs text-black dark:text-gray-400">Sin IVA</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                                                    {formatCOP(product.price_without_tax)}
                                                </p>
                                            </div>
                                        ) : (
                                            <div></div>
                                        )}

                                        {product.price_with_tax !== undefined ? (
                                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs text-black dark:text-gray-400">Con IVA</p>
                                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-0.5">
                                                    {formatCOP(product.price_with_tax)}
                                                </p>
                                            </div>
                                        ) : (
                                            <div></div>
                                        )}

                                        {displayIvaValue > 0 ? (
                                            <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                                <p className="text-xs text-black dark:text-gray-400">Valor IVA</p>
                                                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mt-0.5">
                                                    {formatCOP(displayIvaValue)}
                                                </p>
                                            </div>
                                        ) : (
                                            <div></div>
                                        )}
                                    </div>
                                )}

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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
