<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('Crear Ventas');
    }

    public function rules(): array
    {
        return [
            // Cliente obligatorio de verdad: ya no se acepta una venta con
            // solo un número de documento sin resolver a un cliente real.
            'client_id' => ['required', 'exists:clients,id'],
            'sale_date' => ['required', 'date'],
            'sale_time' => ['required', 'date_format:H:i:s'],
            'discount_type' => ['required', Rule::in(['percentage', 'fixed'])],
            'discount' => [
                'required',
                'numeric',
                'min:0',
                Rule::when(fn () => $this->input('discount_type') === 'percentage', ['max:100']),
            ],
            'payment_method' => ['required', Rule::in(['Efectivo', 'Nequi'])],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            // price_at_sale, subtotal y los totales NO se validan como input:
            // el controlador los recalcula siempre desde Product::sale_price,
            // nunca confía en lo que mande el cliente.
        ];
    }
}
