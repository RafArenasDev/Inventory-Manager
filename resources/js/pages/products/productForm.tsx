import React, { useEffect, useState } from "react";
import { useForm } from '@inertiajs/react'; // Cambiar a useForm para consistencia con RoleForm
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id?: number;
  code: string;
  category_id?: number | string;
  name: string;
  description: string;
  image_path?: string | null;
  price_without_tax?: number | null;
  price_with_tax?: number | null;
  iva_value?: number | null;
  sale_price?: number | null;
  supplier?: string | null;
  stock: number;
  movement_date?: string;
  movement_notes?: string;
  initial_movement_id?: number;
}

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onCancel: () => void;
  userPermissions: string[];  // Ya incluido
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const cleanNumber = (value: string): string => {
  return value.replace(/[^\d]/g, '');
};

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  onCancel,
  userPermissions
}) => {
  // Cambiar a useForm para consistencia con RoleForm
  const { data, setData, post, put, processing, errors, reset } = useForm({
    code: '',
    category_id: '',
    name: '',
    description: '',
    image: null as File | null,
    image_path: '',
    price_without_tax: '',
    price_with_tax: '',
    iva_value: '',
    sale_price: '',
    supplier: '',
    stock: '',
    movement_date: '',
    movement_notes: '',
    initial_movement_id: '',
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ivaType, setIvaType] = useState("19");
  const [customIva, setCustomIva] = useState("");

  // Fecha actual en America/Bogota
  const now = new Date();
  const bogotaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Bogota"}));
  const year = bogotaTime.getFullYear();
  const month = String(bogotaTime.getMonth() + 1).padStart(2, '0');
  const day = String(bogotaTime.getDate()).padStart(2, '0');
  const formattedToday = `${year}-${month}-${day}`;

  // Inicializar datos del formulario
  useEffect(() => {
    if (product?.id) {
      const initialData = {
        code: product.code || "",
        category_id: product.category_id ? String(product.category_id) : "",
        name: product.name || "",
        description: product.description || "",
        image: null,
        image_path: product.image_path || "",
        price_without_tax:
          product.price_without_tax !== null && product.price_without_tax !== undefined
            ? product.price_without_tax.toString()
            : "",
        price_with_tax:
          product.price_with_tax !== null && product.price_with_tax !== undefined
            ? product.price_with_tax.toString()
            : "",
        iva_value:
          product.iva_value !== null && product.iva_value !== undefined
            ? product.iva_value.toString()
            : "",
        sale_price:
          product.sale_price !== null && product.sale_price !== undefined
            ? product.sale_price.toString()
            : "",
        supplier: product.supplier || "",
        stock: product.stock !== null && product.stock !== undefined
            ? product.stock.toString()
            : "",
        movement_date: product.movement_date || formattedToday,
        movement_notes: product.movement_notes || "",
        initial_movement_id: product.initial_movement_id ? product.initial_movement_id.toString() : "",
      };

      setData(initialData);
      setImagePreview(product.image_path || null);

      // Calcular IVA inicial
      if (product.price_without_tax && product.price_with_tax) {
        const ivaPercentage = product.price_without_tax > 0
          ? Math.round(((product.price_with_tax - product.price_without_tax) / product.price_without_tax) * 100)
          : 0;
        if (ivaPercentage === 0) {
          setIvaType("0");
        } else if (ivaPercentage === 19) {
          setIvaType("19");
        } else {
          setIvaType("custom");
          setCustomIva(ivaPercentage.toString());
        }
      }
    } else {
      // Para nuevo producto
      setData({
        code: '',
        category_id: categories[0]?.id?.toString() || '',
        name: '',
        description: '',
        image: null,
        image_path: '',
        price_without_tax: '',
        price_with_tax: '',
        iva_value: '',
        sale_price: '',
        supplier: '',
        stock: '',
        movement_date: formattedToday,
        movement_notes: '',
        initial_movement_id: '',
      });
      setImagePreview(null);
      setIvaType("19");
      setCustomIva("");
    }
  }, [product, categories, setData]);

  const getIvaRate = () => {
    if (ivaType === "custom") {
      return parseFloat(customIva) || 0;
    }
    return parseFloat(ivaType);
  };

  const ivaValueNum = parseInt(data.iva_value || "0", 10);

  const isFormValid = data.code.trim() !== '' &&
                      data.name.trim() !== '' &&
                      data.category_id !== '' &&
                      parseInt(data.stock || "0") >= 0 &&
                      parseInt(data.sale_price || "0") > 0 &&
                      (parseInt(data.price_without_tax || "0") > 0 || parseInt(data.price_with_tax || "0") > 0);

  // Handlers para precios (mantener la lógica existente)
  const handlePriceWithoutTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = cleanNumber(e.target.value);
    const num = parseInt(rawValue || "0", 10);
    const iva = getIvaRate();
    const withTax = Math.round(num * (1 + iva / 100));
    const newIvaValue = withTax - num;

    setData({
      ...data,
      price_without_tax: rawValue,
      price_with_tax: withTax ? withTax.toString() : "",
      iva_value: newIvaValue ? newIvaValue.toString() : "",
    });
  };

  const handlePriceWithTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = cleanNumber(e.target.value);
    const num = parseInt(rawValue || "0", 10);
    const iva = getIvaRate();
    const withoutTax = Math.round(num / (1 + iva / 100));
    const newIvaValue = num - withoutTax;

    setData({
      ...data,
      price_with_tax: rawValue,
      price_without_tax: withoutTax ? withoutTax.toString() : "",
      iva_value: newIvaValue ? newIvaValue.toString() : "",
    });
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = cleanNumber(e.target.value);
    setData({ ...data, sale_price: rawValue });
  };

  const handleInputBlur = (field: 'price_without_tax' | 'price_with_tax' | 'sale_price') => {
    let newData = { ...data };
    const value = newData[field];
    const num = parseInt(value || "0", 10);

    if (num > 0) {
      newData[field] = num.toString();

      if (field === 'sale_price') {
        setData(newData);
        return;
      }

      const iva = getIvaRate();

      if (field === 'price_without_tax') {
        const withTax = Math.round(num * (1 + iva / 100));
        const newIvaValue = withTax - num;
        newData.price_with_tax = withTax.toString();
        newData.iva_value = newIvaValue.toString();
      }

      if (field === 'price_with_tax') {
        const withoutTax = Math.round(num / (1 + iva / 100));
        const newIvaValue = num - withoutTax;
        newData.price_without_tax = withoutTax.toString();
        newData.iva_value = newIvaValue.toString();
      }
    }

    setData(newData);
  };

  const handleIvaTypeChange = (newIvaType: string) => {
    setIvaType(newIvaType);

    if (newIvaType !== "custom") {
      setCustomIva("");
    }

    const iva = newIvaType === "custom" ? (parseFloat(customIva) || 0) : parseFloat(newIvaType);
    let newData = { ...data };
    const withoutTaxNum = parseInt(newData.price_without_tax || "0");
    const withTaxNum = parseInt(newData.price_with_tax || "0");

    let newWithoutTax = withoutTaxNum;
    let newWithTax = withTaxNum;
    let newIvaValue = 0;

    if (newIvaType === "0") {
      newWithTax = withoutTaxNum;
      newIvaValue = 0;
    } else {
      if (withTaxNum > 0) {
        newWithoutTax = Math.round(withTaxNum / (1 + iva / 100));
        newIvaValue = withTaxNum - newWithoutTax;
      } else if (withoutTaxNum > 0) {
        newWithTax = Math.round(withoutTaxNum * (1 + iva / 100));
        newIvaValue = newWithTax - withoutTaxNum;
      }
    }

    newData.price_without_tax = newWithoutTax.toString();
    newData.price_with_tax = newWithTax.toString();
    newData.iva_value = newIvaValue.toString();

    setData(newData);
  };

  const handleCustomIvaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomIva(value);

    // Recalcular precios si hay valores previos
    const iva = parseFloat(value) || 0;
    let newData = { ...data };
    const withoutTaxNum = parseInt(newData.price_without_tax || "0");
    const withTaxNum = parseInt(newData.price_with_tax || "0");

    let newWithoutTax = withoutTaxNum;
    let newWithTax = withTaxNum;
    let newIvaValue = 0;

    if (withTaxNum > 0) {
      newWithoutTax = Math.round(withTaxNum / (1 + iva / 100));
      newIvaValue = withTaxNum - newWithoutTax;
    } else if (withoutTaxNum > 0) {
      newWithTax = Math.round(withoutTaxNum * (1 + iva / 100));
      newIvaValue = newWithTax - withoutTaxNum;
    }

    newData.price_without_tax = newWithoutTax.toString();
    newData.price_with_tax = newWithTax.toString();
    newData.iva_value = newIvaValue.toString();

    setData(newData);
  };

  // NUEVO: Calcular canSubmit (igual que RoleForm)
  const canSubmit = product?.id
      ? userPermissions.includes('Actualizar Productos')
      : userPermissions.includes('Crear Productos');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log(`Enviando datos para ${product?.id ? 'actualizar' : 'crear'} producto:`, data);

    // Preparar datos para envío (manejar imagen)
    const submitData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'image' && data.image) {
        submitData.append('image', data.image);
      } else if (key !== 'image' && data[key as keyof typeof data] !== '') {
        submitData.append(key, data[key as keyof typeof data] as string);
      }
    });

    if (product?.id) {
      put(route('products.update', product.id), {
        data: submitData,
        forceFormData: true,
        onSuccess: () => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Producto actualizado correctamente",
            showConfirmButton: false,
            timer: 2200
          });
          reset();
          onCancel();
        },
        onError: () => {
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Error al actualizar el producto",
            text: 'Verifica los datos ingresados.',
            showConfirmButton: false,
            timer: 2200
          });
        },
      });
    } else {
      post(route('products.store'), {
        data: submitData,
        forceFormData: true,
        onSuccess: () => {
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Producto creado correctamente",
            showConfirmButton: false,
            timer: 2200
          });
          reset();
          onCancel();
        },
        onError: () => {
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Error al crear el producto",
            text: 'Verifica los datos ingresados.',
            showConfirmButton: false,
            timer: 2200
          });
        },
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData('image', file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Resto de handlers (code, name, description, etc.)
  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setData(field, e.target.value);
  };

  return (
    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <div className="space-y-4">
          {/* Código */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código *
            </label>
            <input
              type="text"
              value={data.code}
              onChange={handleInputChange('code')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              placeholder="Código del producto"
              required
            />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
          </div>

          {/* Categoría */}
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
              <option value="">Seleccione una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={data.name}
              onChange={handleInputChange('name')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              placeholder="Nombre del producto"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              value={data.description}
              onChange={handleInputChange('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              placeholder="Descripción del producto (opcional)"
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imagen
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-md border"
                />
              </div>
            )}
          </div>
        </div>

        {/* Precios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio sin IVA *
            </label>
            <div className="relative">
              <input
                type="text"
                value={
                  data.price_without_tax
                    ? formatCOP(parseInt(data.price_without_tax))
                    : ""
                }
                onChange={handlePriceWithoutTaxChange}
                onBlur={() => handleInputBlur('price_without_tax')}
                placeholder="0"
                required
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                $
              </span>
            </div>
            {errors.price_without_tax && <p className="mt-1 text-sm text-red-600">{errors.price_without_tax}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Precio con IVA *
            </label>
            <div className="relative">
              <input
                type="text"
                value={
                  data.price_with_tax
                    ? formatCOP(parseInt(data.price_with_tax))
                    : ""
                }
                onChange={handlePriceWithTaxChange}
                onBlur={() => handleInputBlur('price_with_tax')}
                placeholder="0"
                required
                className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                $
              </span>
            </div>
            {errors.price_with_tax && <p className="mt-1 text-sm text-red-600">{errors.price_with_tax}</p>}
          </div>
        </div>

        {/* Selector de IVA */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de IVA
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "0", label: "Exento (0%)" },
              { value: "19", label: "General (19%)" },
              { value: "custom", label: "Personalizado" }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleIvaTypeChange(option.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  ivaType === option.value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {ivaType === "custom" && (
            <div className="mt-2">
              <input
                type="number"
                value={customIva}
                onChange={handleCustomIvaChange}
                placeholder="Porcentaje"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          )}
        </div>

        {/* Precio de Venta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Precio de Venta *
          </label>
          <div className="relative">
            <input
              type="text"
              value={
                data.sale_price
                  ? formatCOP(parseInt(data.sale_price))
                  : ""
              }
              onChange={handleSalePriceChange}
              onBlur={() => handleInputBlur('sale_price')}
              placeholder="0"
              required
              className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
              $
            </span>
          </div>
          {errors.sale_price && <p className="mt-1 text-sm text-red-600">{errors.sale_price}</p>}
        </div>

        {/* Valor del IVA */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor IVA ({getIvaRate()}%)
          </label>
          <input
            type="text"
            value={ivaValueNum ? formatCOP(ivaValueNum) : ""}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 cursor-not-allowed text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Proveedor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Proveedor
          </label>
          <input
            type="text"
            value={data.supplier}
            onChange={handleInputChange('supplier')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
          />
          {errors.supplier && <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>}
        </div>

        {/* Stock */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stock Inicial
          </label>
          <input
            type="number"
            value={data.stock}
            onChange={handleInputChange('stock')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            min="0"
          />
          {errors.stock && <p className="mt-1 text-sm text-red-600">{errors.stock}</p>}
        </div>

        {/* Campos de movimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fecha de Entrada Inicial
          </label>
          <input
            type="date"
            value={data.movement_date}
            onChange={handleInputChange('movement_date')}
            max={formattedToday}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
          />
          {errors.movement_date && <p className="mt-1 text-sm text-red-600">{errors.movement_date}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notas de Entrada Inicial
          </label>
          <textarea
            value={data.movement_notes}
            onChange={handleInputChange('movement_notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            placeholder="Ej: Primer pedido Distriandina"
          />
          {errors.movement_notes && <p className="mt-1 text-sm text-red-600">{errors.movement_notes}</p>}
        </div>

        {/* Botones - CONDICIONADO */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing || !isFormValid}
          >
            Cancelar
          </Button>
          {canSubmit && (
            <Button
              type="submit"
              disabled={processing || !isFormValid}
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
