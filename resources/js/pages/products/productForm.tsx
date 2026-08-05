import React, { useEffect, useState } from "react";
import { useForm, router } from '@inertiajs/react';
import Swal from '@/lib/swal';
import { Button } from "@/components/ui/button";

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
  userPermissions,
  isCreating
}) => {
  const { data, setData, post, processing, errors, reset } = useForm({
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
    if (product) {
      setImagePreview(product.image_path || null);
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

    setData({
      ...data,
      price_without_tax: newPriceWithoutTax.toString(),
      price_with_tax: newPriceWithTax.toString(),
      iva_value: newIvaValue.toString(),
    });
  };

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData('image', file);
      setImagePreview(URL.createObjectURL(file));
    }
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
        onCancel();
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
            <select
              value={data.category_id}
              onChange={handleInputChange('category_id')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            >
              <option value="" disabled>Seleccionar Categoría</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imagen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Vista previa" className="h-24 w-24 object-cover rounded-md" />
              </div>
            )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio de venta *
            </label>
            <input
              type="text"
              value={formatCOP(data.sale_price)}
              onChange={handleInputChange('sale_price')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
            {errors.sale_price && <p className="mt-1 text-sm text-red-600">{errors.sale_price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Proveedor
            </label>
            <select
              value={data.supplier_id}
              onChange={handleInputChange('supplier_id')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            >
              <option value="">Seleccionar Proveedor</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
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
              <select
                value={data.movement_type}
                onChange={handleInputChange('movement_type')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                required
              >
                <option value="" disabled>Seleccionar Tipo de Movimiento</option>
                {movementTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
