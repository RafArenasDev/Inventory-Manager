<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id'             => ['required', 'exists:suppliers,id'],
            'notes'                   => ['nullable', 'string', 'max:1000'],
            'expected_at'             => ['nullable', 'date'],
            'items'                   => ['required', 'array', 'min:1'],
            'items.*.product_id'      => ['required', 'distinct', 'exists:products,id'],
            'items.*.quantity_requested' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost'       => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required'          => 'Selecciona un proveedor.',
            'items.required'                => 'Agrega al menos un producto al pedido.',
            'items.*.product_id.distinct'   => 'No repitas el mismo producto en un pedido.',
            'items.*.quantity_requested.min' => 'La cantidad debe ser mayor a 0.',
        ];
    }
}
