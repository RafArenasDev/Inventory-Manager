<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InventoryMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'       => ['required', 'in:Entrada,Salida'],
            'product_id' => ['required', 'exists:products,id'],
            'quantity'   => ['required', 'integer', 'min:1'],
            'date'       => ['required', 'date'],
            'notes'      => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in'           => 'El tipo debe ser Entrada o Salida.',
            'product_id.exists' => 'El producto seleccionado no existe.',
            'quantity.min'      => 'La cantidad debe ser mayor a 0.',
        ];
    }
}
