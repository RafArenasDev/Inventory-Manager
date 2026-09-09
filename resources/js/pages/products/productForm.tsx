import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Swal from '@/lib/swal';
import { escapeHtml } from '@/lib/utils';
import { router, useForm } from '@inertiajs/react';
import { Image as ImageIcon, Info, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_IMAGE_SIZE = 2048 * 1024; // 2MB, igual al límite del backend

// Colombia no fija por ley un margen de utilidad para retail (a diferencia
// del IVA, que sí es legalmente 0% o 19%). 30% es un punto de partida común
// en comercio minorista, editable por el usuario.
const DEFAULT_PROFIT_PERCENT = '30';

// Debe coincidir con Product::DEFAULT_LOW_STOCK_THRESHOLD en el backend.
const DEFAULT_LOW_STOCK_THRESHOLD = 7;

interface Category {
    id: number;
    name: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface ProductForForm {
    id?: number;
    code: string;
    category_id: number | string;
    name: string;
    description: string;
    image_path?: string | null;
    price_without_tax: string;
    price_with_tax: string;
    iva_value: string;
    sale_price: string;
    supplier_id?: number | string;
    stock?: number;
    low_stock_threshold?: number | null;
    movement_notes: string;
    movement_type?: string;
}

interface ProductFormProps {
    product?: ProductForForm;
    categories: Category[];
    suppliers: Supplier[];
    onCancel: () => void;
    onSaved: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    userPermissions: string[];
    isCreating: boolean;
}

const cleanNumber = (value: string): string => {
    return value.replace(/[^\d]/g, '');
};

const formatCOP = (value: string | number): string => {
    const num = parseInt(cleanNumber(value.toString())) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseCOP = (value: string): string => {
    return cleanNumber(value);
};

const ProductForm: React.FC<ProductFormProps> = ({
    product,
    categories,
    suppliers,
    onCancel,
    onSaved,
    onDirtyChange,
    userPermissions,
    isCreating,
}) => {
    const { data, setData, processing, errors, setError, clearErrors, reset, isDirty } = useForm({
        code: product?.code || '',
        category_id: isCreating ? '' : product?.category_id?.toString() || '',
        name: product?.name || '',
        description: product?.description || '',
        image: null as File | null,
        image_path: product?.image_path || '',
        price_without_tax: product?.price_without_tax?.toString() || '0',
        price_with_tax: product?.price_with_tax?.toString() || '0',
        iva_value: product?.iva_value?.toString() || '0',
        sale_price: product?.sale_price?.toString() || '0',
        supplier_id: isCreating ? '' : product?.supplier_id?.toString() || '',
        stock: product?.stock,
        low_stock_threshold: product?.low_stock_threshold?.toString() || '',
        movement_notes: product?.movement_notes || '',
    });

    const [imagePreview, setImagePreview] = useState<string | null>(product?.image_path || null);
    const [imageError, setImageError] = useState<{ name?: string; reason: string } | null>(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [imageRemoved, setImageRemoved] = useState(false);
    // Un blob local decodifica casi instantáneo — sin este mínimo, el spinner
    // de carga de imagen apenas alcanza a verse al subir/cambiar una imagen.
    const imageLoadStartRef = useRef(0);
    const MIN_IMAGE_LOADING_MS = 500;
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [priceMode, setPriceMode] = useState<'manual' | 'profit'>('manual');
    const [profitPercent, setProfitPercent] = useState('');
    const [ivaType, setIvaType] = useState(
        product?.iva_value && parseInt(product.iva_value) > 0
            ? parseInt(product.iva_value) === Math.round(0.19 * parseInt(product?.price_without_tax || '0'))
                ? '19'
                : 'custom'
            : isCreating
              ? '19'
              : '0',
    );
    const [customIva, setCustomIva] = useState(
        product?.iva_value &&
            parseInt(product.iva_value) > 0 &&
            parseInt(product.iva_value) !== Math.round(0.19 * parseInt(product?.price_without_tax || '0'))
            ? Math.round((parseInt(product.iva_value) / parseInt(product?.price_without_tax || '1')) * 100).toString()
            : '',
    );
    // Último precio de venta escrito a mano — al volver de "Por utilidad" a
    // "Manual" se restaura este valor, nunca el que quedó calculado (el
    // cálculo solo debe "pegarse" mientras el modo activo es "Por utilidad").
    const [lastManualSalePrice, setLastManualSalePrice] = useState(product?.sale_price?.toString() || '0');

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useEffect(() => {
        if (product) {
            setImagePreview(product.image_path || null);
            setImageError(null);
            setImageRemoved(false);
            setIsImageLoading(false);
        }
    }, [product]);

    // overrideIvaType/overrideCustomIva: al cambiar el tipo de IVA, `setIvaType`
    // aún no se refleja en este closure (stale state) cuando se llama
    // updatePrices() en la misma función — sin el override, el cálculo usaba
    // el tipo VIEJO (p.ej. seguía leyendo "custom" con customIva ya vacío,
    // dando 0% de IVA sin que el usuario lo pidiera).
    const updatePrices = (field: 'price_without_tax' | 'price_with_tax', value: string, overrideIvaType?: string, overrideCustomIva?: string) => {
        const effectiveIvaType = overrideIvaType ?? ivaType;
        const effectiveCustomIva = overrideCustomIva ?? customIva;
        const cleanedValue = parseCOP(value);
        const numericValue = parseInt(cleanedValue || '0');
        let newPriceWithoutTax = parseInt(data.price_without_tax || '0');
        let newPriceWithTax = parseInt(data.price_with_tax || '0');
        let newIvaValue = parseInt(data.iva_value || '0');

        const ivaPercentage = effectiveIvaType === 'custom' ? parseInt(effectiveCustomIva || '0') : parseInt(effectiveIvaType || '0');

        if (field === 'price_without_tax') {
            newPriceWithoutTax = numericValue;
            if (effectiveIvaType === '0') {
                newPriceWithTax = newPriceWithoutTax;
                newIvaValue = 0;
            } else {
                newIvaValue = Math.round(newPriceWithoutTax * (ivaPercentage / 100));
                newPriceWithTax = newPriceWithoutTax + newIvaValue;
            }
        } else if (field === 'price_with_tax') {
            newPriceWithTax = numericValue;
            if (effectiveIvaType === '0') {
                newPriceWithoutTax = newPriceWithTax;
                newIvaValue = 0;
            } else {
                newPriceWithoutTax = Math.round(newPriceWithTax / (1 + ivaPercentage / 100));
                newIvaValue = newPriceWithTax - newPriceWithoutTax;
            }
        }

        const updated: typeof data = {
            ...data,
            price_without_tax: newPriceWithoutTax.toString(),
            price_with_tax: newPriceWithTax.toString(),
            iva_value: newIvaValue.toString(),
        };

        if (priceMode === 'profit') {
            updated.sale_price = calculateSalePriceFromProfit(newPriceWithTax, profitPercent);
        }

        setData(updated);
    };

    const calculateSalePriceFromProfit = (cost: number, profit: string): string => {
        const profitNum = parseFloat(profit || '0');
        return Math.round(cost * (1 + profitNum / 100)).toString();
    };

    const handleProfitPercentChange = (value: string) => {
        setProfitPercent(value);
        setData('sale_price', calculateSalePriceFromProfit(parseInt(data.price_with_tax || '0'), value));
    };

    const handlePriceModeChange = (mode: 'manual' | 'profit') => {
        setPriceMode(mode);
        if (mode === 'profit') {
            const cost = parseInt(data.price_with_tax || '0');
            const currentSalePrice = parseInt(data.sale_price || '0');
            // Colombia no fija por ley un margen de utilidad (a diferencia del IVA,
            // que sí es 0%/19% por ley). Si ya hay un precio de venta real por
            // encima del costo, se respeta esa utilidad implícita; si no (producto
            // nuevo o sin precio de venta aún), se sugiere un margen por defecto
            // razonable para no dejar al usuario calculando manualmente.
            const hasMeaningfulSalePrice = cost > 0 && currentSalePrice > cost;
            const impliedProfit = hasMeaningfulSalePrice ? (((currentSalePrice - cost) / cost) * 100).toFixed(1) : DEFAULT_PROFIT_PERCENT;
            setProfitPercent(impliedProfit);
            setData('sale_price', calculateSalePriceFromProfit(cost, impliedProfit));
        } else {
            // Volver a "Manual" nunca deja pegado el valor que calculó "Por
            // utilidad" — se restaura el último precio escrito a mano.
            setData('sale_price', lastManualSalePrice);
        }
    };

    const currentProfit = (() => {
        const cost = parseInt(data.price_with_tax || '0');
        const sale = parseInt(data.sale_price || '0');
        if (cost <= 0) return null;
        return {
            amount: sale - cost,
            percent: (((sale - cost) / cost) * 100).toFixed(1),
        };
    })();

    const handleInputChange = (field: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        let value: string | number = e.target.value;
        if (['price_without_tax', 'price_with_tax', 'sale_price'].includes(field)) {
            value = parseCOP(value);
            if (field === 'price_without_tax' || field === 'price_with_tax') {
                updatePrices(field, value);
                return;
            }
            if (field === 'sale_price') {
                // Solo se edita a mano en modo Manual (en "Por utilidad" el
                // campo es readOnly) — este es el valor a restaurar si el
                // usuario va y vuelve a "Por utilidad".
                setLastManualSalePrice(value);
            }
        } else if (field === 'stock') {
            value = parseInt(cleanNumber(value) || '0', 10);
        }
        setData(field, value);
    };

    const handleIvaTypeChange = (type: string) => {
        setIvaType(type);
        if (type !== 'custom') {
            setCustomIva('');
            // Pasar `type` explícito: `setIvaType` de arriba todavía no se
            // refleja en este mismo ciclo, así que sin el override
            // updatePrices seguiría leyendo el tipo anterior (p.ej. "custom"
            // con customIva ya vacío, calculando 0% de IVA por error).
            updatePrices('price_without_tax', data.price_without_tax, type, '');
        }
    };

    const validateAndSetImage = (file: File) => {
        setImageError(null);

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            const reason = 'no es una imagen válida. Solo se permiten archivos JPEG, PNG o GIF.';
            setImageError({ name: file.name, reason });
            Swal.fire({ title: 'Archivo no permitido', html: `<b>${escapeHtml(file.name)}</b> ${reason}`, icon: 'error' });
            return;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            const reason = `pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. El máximo permitido es 2MB.`;
            setImageError({ name: file.name, reason });
            Swal.fire({ title: 'Imagen demasiado pesada', html: `<b>${escapeHtml(file.name)}</b> ${reason}`, icon: 'error' });
            return;
        }

        setImageRemoved(false);
        setIsImageLoading(true);
        imageLoadStartRef.current = Date.now();
        setData('image', file);
        setImagePreview(URL.createObjectURL(file));
    };

    const finishImageLoading = () => {
        if (!imageLoadStartRef.current) {
            setIsImageLoading(false);
            return;
        }
        const elapsed = Date.now() - imageLoadStartRef.current;
        const remaining = Math.max(0, MIN_IMAGE_LOADING_MS - elapsed);
        imageLoadStartRef.current = 0;
        setTimeout(() => setIsImageLoading(false), remaining);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) validateAndSetImage(file);
        e.target.value = '';
    };

    const handleImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingImage(false);
        const file = e.dataTransfer.files?.[0];
        if (file) validateAndSetImage(file);
    };

    const handleRemoveImage = () => {
        setData('image', null);
        setData('image_path', '');
        setImagePreview(null);
        setImageError(null);
        setIsImageLoading(false);
        imageLoadStartRef.current = 0;
        setImageRemoved(true);
    };

    const isFormValid = () => {
        return (
            data.code &&
            data.category_id &&
            data.name &&
            (parseInt(data.price_without_tax || '0') || 0) > 0 &&
            (parseInt(data.price_with_tax || '0') || 0) > 0 &&
            (parseInt(data.sale_price || '0') || 0) > 0 &&
            data.supplier_id &&
            (isCreating ? data.stock !== undefined : true)
        );
    };

    const canSubmit = userPermissions.includes(isCreating ? 'Crear Productos' : 'Editar Productos');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        clearErrors();

        const formData = new FormData();

        // Agregar todos los campos al FormData
        formData.append('code', data.code);
        formData.append('category_id', data.category_id.toString());
        formData.append('name', data.name);
        formData.append('description', data.description || '');

        // Solo agregar imagen si se seleccionó una nueva
        if (data.image) {
            formData.append('image', data.image);
        }

        formData.append('image_path', data.image_path || '');
        if (imageRemoved && !data.image) {
            formData.append('remove_image', '1');
        }
        formData.append('price_without_tax', data.price_without_tax);
        formData.append('price_with_tax', data.price_with_tax);
        formData.append('iva_value', data.iva_value || '0');
        formData.append('sale_price', data.sale_price);
        formData.append('supplier_id', data.supplier_id?.toString() || '');
        formData.append('stock', (data.stock ?? 0).toString());
        formData.append('low_stock_threshold', data.low_stock_threshold?.toString() || '');
        formData.append('movement_notes', data.movement_notes || '');

        // El tipo de movimiento nunca lo elige el usuario: al crear siempre es
        // "Entrada"; al editar, solo se registra un movimiento (tipo "Ajuste
        // Inventario") si el stock realmente cambió — si no cambió, no se
        // toca el historial de movimientos del producto.
        const stockChanged = !isCreating && (data.stock ?? 0) !== (product?.stock ?? 0);
        if (isCreating) {
            formData.append('movement_type', 'Entry');
        } else if (stockChanged) {
            formData.append('movement_type', 'InventoryAdjustment');
        }

        // Para actualización, agregar _method para simular PUT
        if (!isCreating) {
            formData.append('_method', 'PUT');
        }

        const url = isCreating ? route('products.store') : route('products.update', product?.id);

        // Usar post() para ambos casos (crear y actualizar)
        // FormData con _method=PUT simula el método PUT
        router.post(url, formData, {
            forceFormData: true,
            onSuccess: () => {
                Swal.fire({
                    title: isCreating ? 'Producto creado correctamente' : 'Producto actualizado correctamente',
                    icon: 'success',
                    timer: 2200,
                    showConfirmButton: false,
                });
                reset();
                setImagePreview(null);
                setImageError(null);
                setImageRemoved(false);
                setIsImageLoading(false);
                onSaved();
            },
            onError: (errors) => {
                console.error('Errores de validación:', errors);
                setError(errors as Record<keyof typeof data, string>);
                const firstError = Object.values(errors)[0];
                Swal.fire({
                    title: isCreating ? 'No se pudo crear el producto' : 'No se pudo actualizar el producto',
                    text: firstError || 'Revisa los campos marcados en rojo e intenta de nuevo.',
                    icon: 'error',
                });
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto px-1 pt-1 pb-2">
                {/*
                    DOS columnas independientes (grid-cols-2, cada una su
                    propio flex-col con gap fijo): cuando aparece/desaparece
                    un campo condicional en la columna 2 (IVA "Otro", Por
                    utilidad), SOLO empuja lo que viene después dentro de esa
                    misma columna — la columna 1 nunca se mueve. Un campo
                    "pareado" (Código+Categoría, Precio sin/con IVA, Stock+
                    Umbral) usa un sub-grid interno de 2 columnas para que
                    cada uno ocupe exactamente la mitad del ancho de su
                    columna; un campo solo ocupa el ancho completo.
                */}
                <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-y-4">
                    {/* Columna 1: identidad del producto */}
                    <div className="flex flex-col gap-2">
                        {/* Fila 1: Código (angosto) · Categoría (ancha) */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Código *</label>
                                <Input
                                    type="text"
                                    value={data.code}
                                    onChange={handleInputChange('code')}
                                    aria-invalid={!!errors.code}
                                    className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                />
                                <InputError message={errors.code} />
                            </div>

                            <div className="col-span-3">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría *</label>
                                <Combobox
                                    items={categories}
                                    itemToStringLabel={(c: Category) => c.name}
                                    itemToStringValue={(c: Category) => c.id.toString()}
                                    value={categories.find((c) => c.id.toString() === data.category_id?.toString()) ?? null}
                                    onValueChange={(c: Category | null) => setData('category_id', c ? c.id.toString() : '')}
                                >
                                    <ComboboxInput
                                        placeholder="Seleccionar categoría"
                                        aria-invalid={!!errors.category_id}
                                        className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                    />
                                    <ComboboxContent>
                                        <ComboboxEmpty>No se encontraron categorías.</ComboboxEmpty>
                                        <ComboboxList>
                                            {(category: Category) => (
                                                <ComboboxItem key={category.id} value={category}>
                                                    {category.name}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                                <InputError message={errors.category_id} />
                            </div>
                        </div>

                        {/* Fila 2: Nombre */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre *</label>
                            <Input
                                type="text"
                                value={data.name}
                                onChange={handleInputChange('name')}
                                aria-invalid={!!errors.name}
                                className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                            />
                            <InputError message={errors.name} />
                        </div>

                        {/* Fila 3: Descripción — 2 inputs de alto por defecto.
                            Solo pasa a 3 inputs cuando "Otro" Y "Por utilidad"
                            están activos a la vez (el bloque de Precio de
                            venta gana una fila extra —Precio de venta
                            calculado— justo cuando ya venía corrido un
                            renglón por el "Valor del IVA" de Otro). Con
                            cualquiera de los dos solo, o ninguno, se queda en
                            2 inputs — solo cambia qué dos filas de la columna
                            derecha caen dentro de su alto. */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                            <Textarea
                                value={data.description}
                                onChange={handleInputChange('description')}
                                aria-invalid={!!errors.description}
                                className={`w-full resize-none border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25 ${
                                    ivaType === 'custom' && priceMode === 'profit' ? 'h-[228px]' : 'h-[136px]'
                                }`}
                            />
                            <InputError message={errors.description} />
                        </div>

                        {/* Fila 4: Imagen — siempre 2 inputs de alto, fija */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen del Producto</label>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif"
                                onChange={handleImageChange}
                                className="hidden"
                            />

                            {imagePreview ? (
                                <div className="animate-in fade-in flex h-44 flex-col overflow-hidden rounded-xl border border-gray-300 duration-300 dark:border-gray-700">
                                    <div className="relative flex min-h-0 flex-1 items-center justify-center bg-gray-100 dark:bg-white/[0.03]">
                                        {isImageLoading && (
                                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-sm dark:bg-black/80">
                                                <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Procesando imagen...</p>
                                            </div>
                                        )}
                                        <img
                                            src={imagePreview}
                                            alt="Vista previa del producto"
                                            onLoad={finishImageLoading}
                                            onError={() => {
                                                finishImageLoading();
                                                setImageError({ reason: 'No se pudo cargar la vista previa de la imagen.' });
                                            }}
                                            className={`h-full w-full object-contain p-2 transition-all duration-500 ${
                                                isImageLoading ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                                            }`}
                                        />
                                    </div>
                                    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-white/[0.02]">
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">Imagen del producto</p>
                                        <div className="flex shrink-0 gap-1.5">
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="secondary"
                                                title="Cambiar imagen"
                                                aria-label="Cambiar imagen"
                                                disabled={isImageLoading}
                                                onClick={() => imageInputRef.current?.click()}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="destructive"
                                                title="Eliminar imagen"
                                                aria-label="Eliminar imagen"
                                                disabled={isImageLoading}
                                                onClick={handleRemoveImage}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => imageInputRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDraggingImage(true);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        setIsDraggingImage(false);
                                    }}
                                    onDrop={handleImageDrop}
                                    className={`flex h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200 ${
                                        isDraggingImage
                                            ? 'scale-[1.01] border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                            : 'border-gray-300 bg-gray-50 hover:border-blue-400 dark:border-gray-600 dark:bg-black dark:hover:border-blue-500'
                                    }`}
                                >
                                    <ImageIcon
                                        className={`h-9 w-9 text-gray-400 transition-transform duration-200 ${isDraggingImage ? 'scale-110' : ''}`}
                                    />
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Haz clic o arrastra una imagen aquí</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG o GIF · Máximo 2MB</p>
                                </div>
                            )}

                            {imageError && (
                                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                    {imageError.name && <strong>{imageError.name}</strong>} {imageError.reason}
                                </p>
                            )}
                            <InputError message={errors.image} className="mt-1" />
                        </div>
                    </div>

                    {/* Columna 2: precios, IVA, inventario comercial — fluye
                        normal: cada campo condicional que aparece empuja lo
                        de abajo, y al ocultarse todo vuelve a subir solo. */}
                    <div className="flex flex-col gap-2">
                        {/* Fila 1: Porcentaje IVA */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Porcentaje IVA</label>
                            <div className="grid grid-cols-3 gap-2">
                                <Button type="button" variant={ivaType === '0' ? 'default' : 'outline'} onClick={() => handleIvaTypeChange('0')}>
                                    0%
                                </Button>
                                <Button type="button" variant={ivaType === '19' ? 'default' : 'outline'} onClick={() => handleIvaTypeChange('19')}>
                                    19%
                                </Button>
                                <Button
                                    type="button"
                                    variant={ivaType === 'custom' ? 'default' : 'outline'}
                                    onClick={() => handleIvaTypeChange('custom')}
                                >
                                    Otro
                                </Button>
                            </div>
                            {/* Espacio de error SIEMPRE reservado aquí (mismo alto
                                    tenga o no mensaje) para que esta fila no cambie de
                                    tamaño al activar "Otro" — si no, Código/Categoría
                                    (columna 1) deja de coincidir con Porcentaje IVA
                                    (columna 2) y arrastra el desfase a todo lo de abajo. */}
                            <InputError message={ivaType !== 'custom' ? errors.iva_value : undefined} />
                        </div>

                        {/* Fila 2 (condicional, solo si IVA = Otro) */}
                        {ivaType === 'custom' && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Valor del IVA (%)</label>
                                <Input
                                    type="number"
                                    value={customIva}
                                    onChange={(e) => {
                                        setCustomIva(e.target.value);
                                        updatePrices('price_without_tax', data.price_without_tax, 'custom', e.target.value);
                                    }}
                                    aria-invalid={!!errors.iva_value}
                                    className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                    placeholder="Otro %"
                                    min="0"
                                />
                                <InputError message={errors.iva_value} />
                            </div>
                        )}

                        {/* Fila 3 (siempre, con o sin "Otro" activo): Precio sin IVA (mitad) · Precio con IVA (mitad) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Precio sin IVA *</label>
                                <Input
                                    type="text"
                                    value={formatCOP(data.price_without_tax)}
                                    onChange={handleInputChange('price_without_tax')}
                                    aria-invalid={!!errors.price_without_tax}
                                    className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                />
                                <InputError message={errors.price_without_tax} />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Precio con IVA *</label>
                                <Input
                                    type="text"
                                    value={formatCOP(data.price_with_tax)}
                                    onChange={handleInputChange('price_with_tax')}
                                    aria-invalid={!!errors.price_with_tax}
                                    className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                />
                                <InputError message={errors.price_with_tax} />
                            </div>
                        </div>

                        {/* Fila 4: Precio de venta (label + toggle en una fila) */}
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Precio de venta *</label>
                                    {priceMode === 'profit' && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    <Info className="h-3.5 w-3.5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Sugerencia inicial de {DEFAULT_PROFIT_PERCENT}% (Colombia no fija un margen mínimo por ley, solo IVA);
                                                ajústala según tu producto.
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className={`text-xs ${priceMode === 'manual' ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                                    >
                                        Manual
                                    </span>
                                    <Switch
                                        id="price_mode"
                                        checked={priceMode === 'profit'}
                                        onCheckedChange={(checked) => handlePriceModeChange(checked ? 'profit' : 'manual')}
                                    />
                                    <span
                                        className={`text-xs ${priceMode === 'profit' ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                                    >
                                        Por utilidad
                                    </span>
                                </div>
                            </div>

                            {priceMode === 'manual' && (
                                <>
                                    <Input
                                        type="text"
                                        value={formatCOP(data.sale_price)}
                                        onChange={handleInputChange('sale_price')}
                                        aria-invalid={!!errors.sale_price}
                                        className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                    />
                                    <InputError message={errors.sale_price} />
                                </>
                            )}

                            {priceMode === 'profit' && (
                                <div className="animate-in fade-in slide-in-from-top-1 flex flex-col gap-3 duration-200">
                                    <div>
                                        <Input
                                            type="number"
                                            value={profitPercent}
                                            onChange={(e) => handleProfitPercentChange(e.target.value)}
                                            className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                            placeholder="Utilidad deseada %"
                                            min="0"
                                            step="0.1"
                                        />
                                        <InputError />
                                    </div>

                                    <div>
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Precio de venta calculado
                                            </label>
                                            {currentProfit && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className={
                                                                currentProfit.amount < 0
                                                                    ? 'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
                                                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                                            }
                                                        >
                                                            <Info className="h-3.5 w-3.5" />
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {currentProfit.percent}% de utilidad ({currentProfit.amount < 0 ? '-' : ''}$
                                                        {formatCOP(Math.abs(currentProfit.amount).toString())}) sobre el costo con IVA
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                        <Input
                                            type="text"
                                            value={formatCOP(data.sale_price)}
                                            readOnly
                                            aria-invalid={!!errors.sale_price}
                                            className="w-full cursor-not-allowed border-gray-300 opacity-80 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                        />
                                        <InputError message={errors.sale_price} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fila 5: Proveedor */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor *</label>
                            <Combobox
                                items={suppliers}
                                itemToStringLabel={(s: Supplier) => s.name}
                                itemToStringValue={(s: Supplier) => s.id.toString()}
                                value={suppliers.find((s) => s.id.toString() === data.supplier_id?.toString()) ?? null}
                                onValueChange={(s: Supplier | null) => setData('supplier_id', s ? s.id.toString() : '')}
                            >
                                <ComboboxInput
                                    placeholder="Seleccionar proveedor"
                                    aria-invalid={!!errors.supplier_id}
                                    className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                />
                                <ComboboxContent>
                                    <ComboboxEmpty>No se encontraron proveedores.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(supplier: Supplier) => (
                                            <ComboboxItem key={supplier.id} value={supplier}>
                                                {supplier.name}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            <InputError message={errors.supplier_id} />
                        </div>

                        {/* Fila 6: Stock inicial (mitad) · Umbral de alerta (mitad) */}
                        <div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Stock {isCreating ? 'Inicial *' : ''}
                                    </label>
                                    <Input
                                        type="number"
                                        value={data.stock ?? ''}
                                        onChange={handleInputChange('stock')}
                                        onKeyPress={(e) => {
                                            if (!/[0-9]/.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        aria-invalid={!!errors.stock}
                                        className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                        min="0"
                                    />
                                    <InputError message={errors.stock} />
                                </div>

                                <div>
                                    <div className="mb-1 flex items-center gap-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Umbral de alerta</label>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    <Info className="h-3.5 w-3.5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                Debajo de este stock, el producto entra en la campana de alertas. Vacío = usa el valor general (
                                                {DEFAULT_LOW_STOCK_THRESHOLD}).
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        type="number"
                                        value={data.low_stock_threshold ?? ''}
                                        onChange={handleInputChange('low_stock_threshold')}
                                        aria-invalid={!!errors.low_stock_threshold}
                                        className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                                        placeholder={`Por defecto: ${DEFAULT_LOW_STOCK_THRESHOLD}`}
                                        min="1"
                                    />
                                    <InputError message={errors.low_stock_threshold} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notas de Movimiento: ancho completo, fuera de las dos columnas */}
                {(isCreating || data.movement_notes) && (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notas de Movimiento</label>
                        <Textarea
                            value={data.movement_notes}
                            onChange={handleInputChange('movement_notes')}
                            rows={3}
                            aria-invalid={!!errors.movement_notes}
                            className="w-full border-gray-300 focus-visible:border-gray-400 focus-visible:ring-gray-400/50 dark:border-gray-600 dark:focus-visible:border-gray-500 dark:focus-visible:ring-gray-300/25"
                            placeholder="Ej: Primer pedido del proveedor"
                        />
                        <InputError message={errors.movement_notes} />
                    </div>
                )}
            </div>

            <div className="flex shrink-0 justify-end space-x-3 pt-1">
                <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                    Cancelar
                </Button>
                {canSubmit && (
                    <Button type="submit" disabled={processing || !isFormValid()}>
                        {processing ? 'Guardando...' : product?.id ? 'Actualizar Producto' : 'Crear Producto'}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ProductForm;
