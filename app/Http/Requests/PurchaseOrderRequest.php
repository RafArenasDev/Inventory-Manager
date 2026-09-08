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
        // La regla de "un proveedor no puede tener dos pedidos Solicitado a
        // la vez" vive en el controller (store()/update()), no acá — así
        // puede devolver el pedido en conflicto completo para que el
        // frontend ofrezca editarlo en vez de solo un mensaje de error.
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
            // No tiene sentido "esperar" una entrega en una fecha ya pasada.
            'expected_at' => ['nullable', 'date', 'after_or_equal:today'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'distinct', 'exists:products,id'],
            'items.*.quantity_requested' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'supplier_id.required' => 'Selecciona un proveedor.',
            'items.required' => 'Agrega al menos un producto al pedido.',
            'items.*.product_id.distinct' => 'No repitas el mismo producto en un pedido.',
            'items.*.quantity_requested.min' => 'La cantidad debe ser mayor a 0.',
        ];
    }
}
