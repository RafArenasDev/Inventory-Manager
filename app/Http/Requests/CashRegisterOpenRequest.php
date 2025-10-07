<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CashRegisterOpenRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'register_date'   => 'required|date|unique:cash_registers,register_date',
            'opening_balance' => 'required|integer|min:0',
            'opening_notes'   => 'nullable|string',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'register_date.required'   => 'La fecha es requerida.',
            'register_date.unique'     => 'Ya existe una caja registrada para esta fecha.',
            'opening_balance.required' => 'El balance inicial es requerido.',
            'opening_balance.min'      => 'El balance inicial debe ser mayor o igual a 0.',
        ];
    }
}
