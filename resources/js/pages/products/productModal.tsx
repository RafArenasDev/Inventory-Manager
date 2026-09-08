import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CalendarClock, Expand, Image as ImageIcon, Package, TrendingUp, Truck } from 'lucide-react';
import { useState } from 'react';

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
    low_stock_threshold?: number | null;
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

const DEFAULT_LOW_STOCK_THRESHOLD = 7;

const formatCOP = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
        return '-';
    }
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (value?: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const getStockStatus = (stock: number, threshold: number) => {
    const criticalThreshold = Math.max(1, Math.floor(threshold / 2));

    if (stock === 0) {
        return { label: 'Sin Stock', color: 'bg-rose-600 text-white dark:bg-rose-700' };
    } else if (stock <= criticalThreshold) {
        return { label: 'Crítico', color: 'bg-rose-600 text-white dark:bg-rose-700' };
    } else if (stock <= threshold) {
        return { label: 'Bajo', color: 'bg-amber-600 text-white dark:bg-amber-700' };
    }
    return { label: 'Saludable', color: 'bg-emerald-600 text-white dark:bg-emerald-700' };
};

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
    const [isImageExpanded, setIsImageExpanded] = useState(false);

    if (!product) return null;

    const threshold = product.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const stockStatus = getStockStatus(product.stock, threshold);

    const calculatedIvaValue =
        product.price_with_tax !== undefined && product.price_without_tax !== undefined
            ? (product.price_with_tax ?? 0) - (product.price_without_tax ?? 0)
            : 0;

    const displayIvaValue = product.iva_value !== null && product.iva_value !== undefined ? product.iva_value : calculatedIvaValue;

    const cost = product.price_with_tax ?? 0;
    const profitAmount = (product.sale_price ?? 0) - cost;
    const profitPercent = cost > 0 ? ((profitAmount / cost) * 100).toFixed(1) : null;

    const createdAtLabel = formatDate(product.created_at);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-w-4xl">
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="flex flex-col sm:flex-row">
                            {/* Imagen protagonista */}
                            <div className="relative shrink-0 sm:w-2/5">
                                {product.image_path ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsImageExpanded(true)}
                                        className="group relative flex h-56 w-full items-center justify-center overflow-hidden rounded-t-2xl bg-gray-100 sm:h-full sm:min-h-[420px] sm:rounded-l-2xl sm:rounded-tr-none dark:bg-white/[0.03]"
                                    >
                                        <img
                                            src={product.image_path}
                                            alt={product.name}
                                            className="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-[1.04]"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                                            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                                                <Expand className="h-3.5 w-3.5" />
                                                Ampliar
                                            </span>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="flex h-56 w-full items-center justify-center rounded-t-2xl bg-gray-100 sm:h-full sm:min-h-[420px] sm:rounded-l-2xl sm:rounded-tr-none dark:bg-white/[0.03]">
                                        <ImageIcon className="h-12 w-12 text-gray-300 dark:text-gray-700" />
                                    </div>
                                )}
                                <span className="absolute top-3 left-3 w-fit rounded-full bg-zinc-800/90 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm dark:bg-zinc-700/90">
                                    {product.category || 'Sin categoría'}
                                </span>
                            </div>

                            {/* Información */}
                            <div className="min-w-0 flex-1 space-y-5 p-4 sm:p-6">
                                <div className="space-y-1.5">
                                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{product.name}</DialogTitle>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(product.code)}
                                        title="Copiar código"
                                        className="rounded-full bg-sky-600 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm transition-colors hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
                                    >
                                        {product.code}
                                    </button>
                                    <DialogDescription className="pt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                        {product.description || 'Sin descripción disponible'}
                                    </DialogDescription>
                                </div>

                                {/* Precio de venta destacado */}
                                <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 py-3 text-center dark:border-sky-900/30 dark:from-sky-950/20 dark:to-indigo-950/20">
                                    <h3 className="mb-0.5 text-sm font-semibold text-sky-600 dark:text-sky-400">Precio de Venta</h3>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCOP(product.sale_price)}</p>
                                    {profitPercent !== null && (
                                        <p
                                            className={`mt-1 flex items-center justify-center gap-1 text-xs font-medium ${
                                                profitAmount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}
                                        >
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            {profitAmount < 0 ? '-' : ''}
                                            {formatCOP(Math.abs(profitAmount))} de utilidad ({profitPercent}%)
                                        </p>
                                    )}
                                </div>

                                {/* Desglose de costos — sin encabezado propio, es una
                                    continuación directa del precio de venta de arriba */}
                                <div className="space-y-1.5 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                                    {product.price_without_tax !== undefined && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Costo sin IVA</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {formatCOP(product.price_without_tax)}
                                            </span>
                                        </div>
                                    )}
                                    {displayIvaValue > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">IVA</span>
                                            <span className="font-medium text-emerald-700 dark:text-emerald-400">+{formatCOP(displayIvaValue)}</span>
                                        </div>
                                    )}
                                    {product.price_with_tax !== undefined && (
                                        <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 text-sm dark:border-gray-800">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">Costo con IVA</span>
                                            <span className="font-semibold text-sky-700 dark:text-sky-300">{formatCOP(product.price_with_tax)}</span>
                                        </div>
                                    )}

                                    {product.iva_value !== null &&
                                        product.iva_value !== undefined &&
                                        product.iva_value !== calculatedIvaValue &&
                                        calculatedIvaValue > 0 && (
                                            <p className="pt-1 text-xs text-amber-700 dark:text-amber-400">
                                                El IVA guardado difiere del calculado con los precios actuales ({formatCOP(calculatedIvaValue)}).
                                            </p>
                                        )}
                                </div>

                                {/* Stock + Proveedor */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                                        <Package className="h-5 w-5 shrink-0 text-gray-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Stock actual</p>
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{product.stock} unidades</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${stockStatus.color}`}>
                                            {stockStatus.label}
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Proveedor</p>
                                            <p className="leading-snug font-semibold break-words text-gray-900 dark:text-gray-100">
                                                {product.supplier || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {product.low_stock_threshold && (
                                    <p className="-mt-2 text-xs text-gray-400 dark:text-gray-500">
                                        Umbral de alerta configurado para este producto: {product.low_stock_threshold} unidades.
                                    </p>
                                )}

                                {/* Metadatos: alta del movimiento inicial. Las notas del
                                    movimiento (ej. "Carga inicial - catálogo de prueba") son
                                    internas del historial de inventario, no información de
                                    producto — no se muestran acá. */}
                                {createdAtLabel && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        <span>Registrado el {createdAtLabel}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Lightbox: se ajusta al tamaño real de la imagen (hasta un
                máximo) en vez de forzar siempre el mismo rectángulo grande —
                una imagen cuadrada o vertical no debe quedar perdida en una
                caja panorámica gigante. */}
            {product.image_path && (
                <Dialog open={isImageExpanded} onOpenChange={setIsImageExpanded}>
                    <DialogContent className="flex max-h-[92vh] w-fit max-w-[95vw] items-center justify-center border-none bg-transparent p-0 shadow-none sm:max-w-[90vw]">
                        <DialogTitle className="sr-only">{product.name}</DialogTitle>
                        <img
                            src={product.image_path}
                            alt={product.name}
                            className="max-h-[92vh] max-w-[95vw] rounded-lg object-contain shadow-2xl sm:max-w-[90vw]"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
