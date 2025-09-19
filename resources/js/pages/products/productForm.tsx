import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";
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
}

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  onCancel: () => void;
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
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    category_id: "",
    name: "",
    description: "",
    image: null as File | null,
    image_path: "",
    price_without_tax: "",
    price_with_tax: "",
    iva_value: "",
    sale_price: "",
    supplier: "",
    stock: "",
  });

  // IVA
  const [ivaType, setIvaType] = useState("19");
  const [customIva, setCustomIva] = useState("");

  const getIvaRate = () => {
    if (ivaType === "custom") {
      return parseFloat(customIva) || 0;
    }
    return parseFloat(ivaType);
  };

  const detectIvaType = () => {
    const withoutTax = parseInt(formData.price_without_tax || "0");
    const withTax = parseInt(formData.price_with_tax || "0");

    if (withoutTax === 0 && withTax === 0) {
      return;
    }

    const calculatedIva = withTax - withoutTax;
    const ivaPercentage = withoutTax > 0 ? Math.round((calculatedIva / withoutTax) * 100) : 0;

    if (ivaPercentage === 0) {
      setIvaType("0");
    } else if (ivaPercentage === 19) {
      setIvaType("19");
    } else if (ivaPercentage === 5) {
      setIvaType("5");
    } else {
      setIvaType("custom");
      setCustomIva(ivaPercentage.toString());
    }
  };

  const handlePriceWithoutTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = cleanNumber(e.target.value);
    const num = parseInt(rawValue || "0", 10);
    const iva = getIvaRate();
    const withTax = Math.round(num * (1 + iva / 100));
    const newIvaValue = withTax - num;

    setFormData((prev) => ({
      ...prev,
      price_without_tax: rawValue,
      price_with_tax: withTax ? withTax.toString() : "",
      iva_value: newIvaValue ? newIvaValue.toString() : "",
    }));
    detectIvaType();
  };

  const handlePriceWithTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = cleanNumber(e.target.value);
    const num = parseInt(rawValue || "0", 10);
    const iva = getIvaRate();
    const withoutTax = Math.round(num / (1 + iva / 100));
    const newIvaValue = num - withoutTax;

    setFormData((prev) => ({
      ...prev,
      price_with_tax: rawValue,
      price_without_tax: withoutTax ? withoutTax.toString() : "",
      iva_value: newIvaValue ? newIvaValue.toString() : "",
    }));
    detectIvaType();
  };

  const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = cleanNumber(e.target.value);
    setFormData((prev) => ({
      ...prev,
      sale_price: rawValue,
    }));
  };

  const handleInputBlur = (field: 'price_without_tax' | 'price_with_tax' | 'sale_price') => {
    const value = formData[field];
    const num = parseInt(value || "0", 10);
    if (num > 0) {
      const newValue = num.toString();
      setFormData(prev => ({
        ...prev,
        [field]: newValue
      }));

      detectIvaType();

      if (field === 'sale_price') {
        return;
      }

      if (field === 'price_without_tax') {
        const iva = getIvaRate();
        const withTax = Math.round(num * (1 + iva / 100));
        const newIvaValue = withTax - num;
        setFormData(prev => ({
          ...prev,
          price_with_tax: withTax.toString(),
          iva_value: newIvaValue.toString()
        }));
      }

      if (field === 'price_with_tax') {
        const iva = getIvaRate();
        const withoutTax = Math.round(num / (1 + iva / 100));
        const newIvaValue = num - withoutTax;
        setFormData(prev => ({
          ...prev,
          price_without_tax: withoutTax.toString(),
          iva_value: newIvaValue.toString()
        }));
      }
    }
  };

  const handleIvaTypeChange = (newIvaType: string) => {
    setIvaType(newIvaType);

    if (newIvaType !== "custom") {
      setCustomIva("");
    }

    const withoutTaxNum = parseInt(formData.price_without_tax || "0");
    const withTaxNum = parseInt(formData.price_with_tax || "0");
    const iva = newIvaType === "custom" ? (parseFloat(customIva) || 0) : parseFloat(newIvaType);

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

    setFormData(prev => ({
      ...prev,
      price_without_tax: newWithoutTax.toString(),
      price_with_tax: newWithTax.toString(),
      iva_value: newIvaValue.toString(),
    }));
  };

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
      };

      setFormData(initialData);
      setImagePreview(product.image_path || null);

      if (product.price_without_tax && product.price_with_tax) {
        const ivaPercentage = product.price_without_tax > 0
          ? Math.round(((product.price_with_tax - product.price_without_tax) / product.price_without_tax) * 100)
          : 0;
        if (ivaPercentage === 0) {
          setIvaType("0");
        } else if (ivaPercentage === 19) {
          setIvaType("19");
        } else if (ivaPercentage === 5) {
          setIvaType("5");
        } else {
          setIvaType("custom");
          setCustomIva(ivaPercentage.toString());
        }
      }
    } else {
      setFormData({
        code: "",
        category_id: "",
        name: "",
        description: "",
        image: null,
        image_path: "",
        price_without_tax: "",
        price_with_tax: "",
        iva_value: "",
        sale_price: "",
        supplier: "",
        stock: "",
      });
      setImagePreview(null);
      setIvaType("19");
      setCustomIva("");
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form data being submitted:', formData);
    console.log('IVA Type:', ivaType, 'Custom IVA:', customIva);

    const data = new FormData();
    data.append("code", formData.code);
    data.append("category_id", formData.category_id);
    data.append("name", formData.name);
    data.append("description", formData.description);
    data.append("price_without_tax", formData.price_without_tax);
    data.append("price_with_tax", formData.price_with_tax);
    data.append("iva_value", formData.iva_value || "0");
    data.append("sale_price", formData.sale_price);
    data.append("supplier", formData.supplier);
    data.append("stock", formData.stock);

    if (formData.image) {
      data.append("image", formData.image);
    } else if (formData.image_path) {
      data.append("image_path", formData.image_path);
    }

    console.log('FormData entries:');
    for (const pair of data.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    if (product?.id) {
      data.append('_method', 'PUT');
      router.post(route("products.update", product.id), data, {
        onSuccess: () => {
          console.log('Update success');
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Producto actualizado correctamente",
            showConfirmButton: false,
            timer: 2200,
          });
          onCancel();
        },
        onError: (errors) => {
          console.error("Update errors:", errors);
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Error al actualizar el producto",
            text: "Verifica los datos ingresados.",
            showConfirmButton: false,
            timer: 2200,
          });
        },
      });
    } else {
      router.post(route("products.store"), data, {
        onSuccess: () => {
          console.log('Create success');
          Swal.fire({
            position: "center",
            icon: "success",
            title: "Producto creado correctamente",
            showConfirmButton: false,
            timer: 2200,
          });
          onCancel();
        },
        onError: (errors) => {
          console.error("Create errors:", errors);
          Swal.fire({
            position: "center",
            icon: "error",
            title: "Error al crear el producto",
            text: "Verifica los datos ingresados.",
            showConfirmButton: false,
            timer: 2200,
          });
        },
      });
    }
  };

  const ivaValueNum =
    parseInt(formData.price_with_tax || "0") -
    parseInt(formData.price_without_tax || "0");

  const isFormValid =
    formData.code &&
    formData.name &&
    formData.price_without_tax &&
    formData.category_id;

  return (
    <div className="bg-white dark:bg-[oklch(0.100205_0_0)] overflow-hidden shadow-sm sm:rounded-lg p-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        encType="multipart/form-data"
      >
        <div className="space-y-4">
          {/* Código */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código *
            </label>
            <input
              id="code"
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, code: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Categoría *
            </label>
            <select
              id="category_id"
              value={formData.category_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            >
              <option value="" disabled>
                Selecciona una categoría
              </option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Imagen */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Imagen
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="h-32 w-32 object-cover rounded border border-gray-200"
                />
              </div>
            )}
          </div>

          {/* IVA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tarifa de IVA
            </label>
            <select
              value={ivaType}
              onChange={(e) => handleIvaTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            >
              <option value="19">General (19%)</option>
              <option value="5">Tarifa del 5%</option>
              <option value="0">Exento (0%)</option>
              <option value="custom">Personalizada</option>
            </select>
            {ivaType === "custom" && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IVA personalizado (%)
                </label>
                <input
                  type="number"
                  value={customIva}
                  onChange={(e) => {
                    setCustomIva(e.target.value);
                    handleIvaTypeChange("custom");
                  }}
                  placeholder="19"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
          </div>

          {/* Precios */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio sin IVA *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={
                    formData.price_without_tax
                      ? formatCOP(parseInt(formData.price_without_tax))
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio con IVA *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={
                    formData.price_with_tax
                      ? formatCOP(parseInt(formData.price_with_tax))
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Precio de Venta *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={
                    formData.sale_price
                      ? formatCOP(parseInt(formData.sale_price))
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
            </div>
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
              value={formData.supplier}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, supplier: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stock Inicial
            </label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, stock: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={!isFormValid}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid}
          >
            {product?.id ? "Actualizar Producto" : "Crear Producto"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
