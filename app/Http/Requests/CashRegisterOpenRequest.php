<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CashRegisterOpenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()->hasPermissionTo('Crear Caja');
    }

    public function rules(): array
    {
        return [
            'opening_amount' => 'required|integer|min:0',
            'notes'          => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'register_date.unique'    => 'Ya existe una caja registrada para esta fecha.',
            'opening_amount.required' => 'El monto inicial es requerido.',
            'opening_amount.min'      => 'El monto inicial debe ser mayor o igual a 0.',
        ];
    }
}
