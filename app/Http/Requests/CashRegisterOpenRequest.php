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
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'register_date.unique' => 'Ya existe una caja registrada para esta fecha.',
        ];
    }
}
