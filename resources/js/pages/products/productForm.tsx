import React, { useEffect, useRef, useState } from "react";
import { useForm, router } from '@inertiajs/react';
import Swal from '@/lib/swal';
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_IMAGE_SIZE = 2048 * 1024; // 2MB, igual al límite del backend

// Este form usa inputs "planos" (no <Input> de shadcn) de 42px/16px en vez
// del h-9/text-sm estándar de shadcn — se iguala el Combobox a ESE tamaño
// para que no desentone dentro de este form en particular.
const COMBOBOX_CLASSNAME = 'h-auto rounded-md border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-black has-[[data-slot=input-group-control]:focus-visible]:border-blue-500 has-[[data-slot=input-group-control]:focus-visible]:ring-blue-500';
const COMBOBOX_INPUT_CLASSNAME = 'h-auto py-2 text-base text-gray-900 md:text-base dark:text-gray-100';

// Colombia no fija por ley un margen de utilidad para retail (a diferencia
// del IVA, que sí es legalmente 0% o 19%). 30% es un punto de partida común
// en comercio minorista, editable por el usuario.
const DEFAULT_PROFIT_PERCENT = '30';

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

const movementTypes = [
  { value: 'Entry', label: 'Entrada' },
  { value: 'Exit', label: 'Salida' },
  { value: 'CustomerReturn', label: 'Devolución Cliente' },
  { value: 'SupplierReturn', label: 'Devolución Proveedor' },
  { value: 'ConsignmentEntry', label: 'Consignación Entrada' },
  { value: 'ConsignmentExit', label: 'Consignación Salida' },
  { value: 'ExchangeEntry', label: 'Cambio Entrada' },
  { value: 'ExchangeExit', label: 'Cambio Salida' },
  { value: 'InventoryAdjustment', label: 'Ajuste Inventario' },
];

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  suppliers,
  onCancel,
  onSaved,
  onDirtyChange,
  userPermissions,
  isCreating
}) => {
  const { data, setData, processing, errors, reset, isDirty } = useForm({
    code: product?.code || '',
    category_id: isCreating ? '' : (product?.category_id?.toString() || ''),
    name: product?.name || '',
    description: product?.description || '',
    image: null as File | null,
    image_path: product?.image_path || '',
    price_without_tax: product?.price_without_tax?.toString() || '0',
    price_with_tax: product?.price_with_tax?.toString() || '0',
    iva_value: product?.iva_value?.toString() || '0',
    sale_price: product?.sale_price?.toString() || '0',
    supplier_id: isCreating ? '' : (product?.supplier_id?.toString() || ''),
    stock: product?.stock,
    movement_notes: product?.movement_notes || '',
    movement_type: isCreating ? '' : (product?.movement_type || ''),
  });

  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_path || null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [imageRemoved, setImageRemoved] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [priceMode, setPriceMode] = useState<'manual' | 'profit'>('manual');
  const [profitPercent, setProfitPercent] = useState('');
  const [ivaType, setIvaType] = useState(
    product?.iva_value && parseInt(product.iva_value) > 0
      ? parseInt(product.iva_value) === Math.round(0.19 * parseInt(product?.price_without_tax || '0'))
        ? '19'
        : 'custom'
      : isCreating ? '19' : '0'
  );
  const [customIva, setCustomIva] = useState(
    product?.iva_value && parseInt(product.iva_value) > 0 && parseInt(product.iva_value) !== Math.round(0.19 * parseInt(product?.price_without_tax || '0'))
      ? (Math.round((parseInt(product.iva_value) / parseInt(product?.price_without_tax || '1')) * 100)).toString()
      : ''
  );

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

  const updatePrices = (field: 'price_without_tax' | 'price_with_tax', value: string) => {
    const cleanedValue = parseCOP(value);
    const numericValue = parseInt(cleanedValue || '0');
    let newPriceWithoutTax = parseInt(data.price_without_tax || '0');
    let newPriceWithTax = parseInt(data.price_with_tax || '0');
    let newIvaValue = parseInt(data.iva_value || '0');

    const ivaPercentage = ivaType === 'custom' ? parseInt(customIva || '0') : parseInt(ivaType || '0');

    if (field === 'price_without_tax') {
      newPriceWithoutTax = numericValue;
      if (ivaType === '0') {
        newPriceWithTax = newPriceWithoutTax;
        newIvaValue = 0;
      } else {
        newIvaValue = Math.round(newPriceWithoutTax * (ivaPercentage / 100));
        newPriceWithTax = newPriceWithoutTax + newIvaValue;
      }
    } else if (field === 'price_with_tax') {
      newPriceWithTax = numericValue;
      if (ivaType === '0') {
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
      const impliedProfit = hasMeaningfulSalePrice
        ? (((currentSalePrice - cost) / cost) * 100).toFixed(1)
        : DEFAULT_PROFIT_PERCENT;
      setProfitPercent(impliedProfit);
      setData('sale_price', calculateSalePriceFromProfit(cost, impliedProfit));
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

  const handleInputChange = (field: keyof typeof data) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let value: string | number = e.target.value;
    if (['price_without_tax', 'price_with_tax', 'sale_price'].includes(field)) {
      value = parseCOP(value);
      if (field === 'price_without_tax' || field === 'price_with_tax') {
        updatePrices(field, value);
        return;
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
      updatePrices('price_without_tax', data.price_without_tax);
    }
  };

  const validateAndSetImage = (file: File) => {
    setImageError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Solo se permiten imágenes JPEG, PNG o GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('La imagen no puede superar 2MB.');
      return;
    }

    setImageRemoved(false);
    setIsImageLoading(true);
    setData('image', file);
    setImagePreview(URL.createObjectURL(file));
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
    setImageRemoved(true);
  };

  const isFormValid = () => {
    return (
      data.code &&
      data.category_id &&
      data.name &&
      data.price_without_tax &&
      data.price_with_tax &&
      data.sale_price &&
      (isCreating ? data.stock !== undefined && data.movement_type : true)
    );
  };

  const canSubmit = userPermissions.includes(isCreating ? 'Crear Productos' : 'Editar Productos');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    formData.append('movement_notes', data.movement_notes || '');

    if (isCreating && data.movement_type) {
      formData.append('movement_type', data.movement_type);
    }

    // Para actualización, agregar _method para simular PUT
    if (!isCreating) {
      formData.append('_method', 'PUT');
    }

    const url = isCreating
      ? route('products.store')
      : route('products.update', product?.id);

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
        Swal.fire({
          title: 'Error',
          text: isCreating ? 'No se pudo crear el producto' : 'No se pudo actualizar el producto',
          icon: 'error',
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={data.code}
              onChange={handleInputChange('code')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoría *
            </label>
            <Combobox
              items={categories}
              itemToStringLabel={(c: Category) => c.name}
              itemToStringValue={(c: Category) => c.id.toString()}
              value={categories.find(c => c.id.toString() === data.category_id?.toString()) ?? null}
              onValueChange={(c: Category | null) => setData('category_id', c ? c.id.toString() : '')}
            >
              <ComboboxInput placeholder="Seleccionar Categoría" className={COMBOBOX_CLASSNAME} inputClassName={COMBOBOX_INPUT_CLASSNAME} />
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
            {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={data.name}
              onChange={handleInputChange('name')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              value={data.description}
              onChange={handleInputChange('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imagen del Producto
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleImageChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black">
                {isImageLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-black/70">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
                <img
                  src={imagePreview}
                  alt="Vista previa del producto"
                  onLoad={() => setIsImageLoading(false)}
                  onError={() => {
                    setIsImageLoading(false);
                    setImageError('No se pudo cargar la vista previa de la imagen.');
                  }}
                  className="h-56 w-full object-cover sm:h-64"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shadow-md"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Cambiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="shadow-md"
                    onClick={handleRemoveImage}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingImage(false); }}
                onDrop={handleImageDrop}
                className={`flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors sm:h-64 ${
                  isDraggingImage
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-black hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <ImageIcon className="h-10 w-10 text-gray-400" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Haz clic o arrastra una imagen aquí
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG o GIF · Máximo 2MB</p>
              </div>
            )}

            {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
            {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio sin IVA *
            </label>
            <input
              type="text"
              value={formatCOP(data.price_without_tax)}
              onChange={handleInputChange('price_without_tax')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
            {errors.price_without_tax && <p className="mt-1 text-sm text-red-600">{errors.price_without_tax}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio con IVA *
            </label>
            <input
              type="text"
              value={formatCOP(data.price_with_tax)}
              onChange={handleInputChange('price_with_tax')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
            {errors.price_with_tax && <p className="mt-1 text-sm text-red-600">{errors.price_with_tax}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Porcentaje IVA
            </label>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant={ivaType === '0' ? 'default' : 'outline'}
                onClick={() => handleIvaTypeChange('0')}
              >
                0%
              </Button>
              <Button
                type="button"
                variant={ivaType === '19' ? 'default' : 'outline'}
                onClick={() => handleIvaTypeChange('19')}
              >
                19%
              </Button>
              <Button
                type="button"
                variant={ivaType === 'custom' ? 'default' : 'outline'}
                onClick={() => handleIvaTypeChange('custom')}
              >
                Personalizado
              </Button>
            </div>
            {ivaType === 'custom' && (
              <input
                type="number"
                value={customIva}
                onChange={(e) => {
                  setCustomIva(e.target.value);
                  updatePrices('price_without_tax', data.price_without_tax);
                }}
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                placeholder="Porcentaje IVA"
                min="0"
              />
            )}
            {errors.iva_value && <p className="mt-1 text-sm text-red-600">{errors.iva_value}</p>}
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Precio de venta *
              </label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant={priceMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => handlePriceModeChange('manual')}
                >
                  Manual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={priceMode === 'profit' ? 'default' : 'outline'}
                  onClick={() => handlePriceModeChange('profit')}
                >
                  Por utilidad
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {priceMode === 'profit' && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Utilidad deseada (%)
                  </label>
                  <input
                    type="number"
                    value={profitPercent}
                    onChange={(e) => handleProfitPercentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                    min="0"
                    step="0.1"
                  />
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Sugerencia inicial de {DEFAULT_PROFIT_PERCENT}% (Colombia no fija un margen mínimo por ley, solo IVA); ajústala según tu producto.
                  </p>
                </div>
              )}
              <div>
                {priceMode === 'profit' && (
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Precio de venta calculado
                  </label>
                )}
                <input
                  type="text"
                  value={formatCOP(data.sale_price)}
                  onChange={handleInputChange('sale_price')}
                  readOnly={priceMode === 'profit'}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100 ${priceMode === 'profit' ? 'cursor-not-allowed opacity-80' : ''}`}
                  required
                />
              </div>
            </div>

            {currentProfit && (
              <p className={`mt-2 text-xs ${currentProfit.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                Utilidad sobre el costo (precio con IVA): <span className="font-medium">{currentProfit.percent}%</span> ({currentProfit.amount < 0 ? '-' : ''}${formatCOP(Math.abs(currentProfit.amount).toString())})
              </p>
            )}
            {errors.sale_price && <p className="mt-1 text-sm text-red-600">{errors.sale_price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Proveedor
            </label>
            <Combobox
              items={suppliers}
              itemToStringLabel={(s: Supplier) => s.name}
              itemToStringValue={(s: Supplier) => s.id.toString()}
              value={suppliers.find(s => s.id.toString() === data.supplier_id?.toString()) ?? null}
              onValueChange={(s: Supplier | null) => setData('supplier_id', s ? s.id.toString() : '')}
            >
              <ComboboxInput placeholder="Seleccionar Proveedor" showClear className={COMBOBOX_CLASSNAME} inputClassName={COMBOBOX_INPUT_CLASSNAME} />
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
            {errors.supplier_id && <p className="mt-1 text-sm text-red-600">{errors.supplier_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock {isCreating ? 'Inicial *' : ''}
            </label>
            <input
              type="number"
              value={data.stock ?? ''}
              onChange={handleInputChange('stock')}
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required={isCreating}
              min="0"
            />
            {errors.stock && <p className="mt-1 text-sm text-red-600">{errors.stock}</p>}
          </div>

          {isCreating && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Movimiento *
              </label>
              <Combobox
                items={movementTypes}
                value={movementTypes.find(t => t.value === data.movement_type) ?? null}
                onValueChange={(t: { value: string; label: string } | null) => setData('movement_type', t ? t.value : '')}
              >
                <ComboboxInput placeholder="Seleccionar Tipo de Movimiento" className={COMBOBOX_CLASSNAME} inputClassName={COMBOBOX_INPUT_CLASSNAME} />
                <ComboboxContent>
                  <ComboboxEmpty>No se encontraron tipos de movimiento.</ComboboxEmpty>
                  <ComboboxList>
                    {(type: { value: string; label: string }) => (
                      <ComboboxItem key={type.value} value={type}>
                        {type.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {errors.movement_type && <p className="mt-1 text-sm text-red-600">{errors.movement_type}</p>}
            </div>
          )}

          {(isCreating || data.movement_notes) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notas de Movimiento
              </label>
              <textarea
                value={data.movement_notes}
                onChange={handleInputChange('movement_notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                placeholder="Ej: Primer pedido del proveedor"
              />
              {errors.movement_notes && <p className="mt-1 text-sm text-red-600">{errors.movement_notes}</p>}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancelar
          </Button>
          {canSubmit && (
            <Button
              type="submit"
              disabled={processing || !isFormValid()}
            >
              {processing ? 'Guardando...' : (product?.id ? "Actualizar Producto" : "Crear Producto")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
