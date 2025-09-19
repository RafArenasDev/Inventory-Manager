<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        $productId = $this->route('product')?->id ?? $this->input('id');

        $rules = [
            'code' => ['required', 'string', 'max:50', $productId ? "unique:products,code,{$productId}" : 'unique:products,code'],
            'category_id'       => ['required', 'integer', 'exists:categories,id'],
            'name'              => ['required', 'string', 'max:255'],
            'description'       => ['nullable', 'string'],
            'image'             => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'],
            'image_path'        => ['nullable', 'string', 'max:255'],
            'price_without_tax' => ['required', 'integer', 'min:0'],
            'price_with_tax'    => ['required', 'integer', 'min:0'],
            'iva_value'         => ['nullable', 'integer', 'min:0'],
            'sale_price'        => ['required', 'integer', 'min:0'],
            'supplier'          => ['nullable', 'string', 'max:255'],
            'stock'             => ['nullable', 'integer', 'min:0'],
        ];

        return $rules;
    }

    public function messages()
    {
        return [
            'code.required'              => 'El código del producto es obligatorio.',
            'code.unique'                => 'Ya existe un producto con este código.',
            'category_id.required'       => 'Debe seleccionar una categoría.',
            'category_id.exists'         => 'La categoría seleccionada no es válida.',
            'name.required'              => 'El nombre del producto es obligatorio.',
            'image.image'                => 'El archivo debe ser una imagen.',
            'image.mimes'                => 'La imagen debe ser un archivo JPEG, PNG, JPG o GIF.',
            'image.max'                  => 'La imagen no puede ser mayor a 2MB.',
            'price_without_tax.required' => 'El precio sin IVA es obligatorio.',
            'price_without_tax.integer'  => 'El precio sin IVA debe ser un número entero.',
            'price_with_tax.required'    => 'El precio con IVA es obligatorio.',
            'price_with_tax.integer'     => 'El precio con IVA debe ser un número entero.',
            'sale_price.required'        => 'El precio de venta es obligatorio.',
            'sale_price.integer'         => 'El precio de venta debe ser un número entero.',
            'stock.min'                  => 'El stock no puede ser negativo.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'code'              => $this->input('code'),
            'category_id'       => $this->input('category_id'),
            'name'              => $this->input('name'),
            'description'       => $this->input('description'),
            'price_without_tax' => $this->input('price_without_tax'),
            'price_with_tax'    => $this->input('price_with_tax'),
            'iva_value'         => $this->input('iva_value'),
            'sale_price'        => $this->input('sale_price'),
            'supplier'          => $this->input('supplier'),
            'stock'             => $this->input('stock'),
            'image_path'        => $this->input('image_path'),
        ]);
    }
}
