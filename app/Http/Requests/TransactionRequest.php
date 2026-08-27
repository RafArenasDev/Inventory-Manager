<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransactionRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'type' => 'required|in:Ingreso,Gasto',
            'transaction_category_id' => 'required|exists:transaction_categories,id',
            'amount' => 'required|integer|min:0',
            'transaction_date' => 'required|date',
            'transaction_time' => 'required|date_format:H:i',
            'payment_method' => 'required|in:Efectivo,Nequi',
            'reference_number' => 'nullable|string|max:255', // Cambiar aquí
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'type.required' => 'El tipo es requerido.',
            'type.in' => 'El tipo debe ser Ingreso o Gasto.',
            'transaction_category_id.required' => 'La categoría es requerida.',
            'transaction_category_id.exists' => 'La categoría seleccionada no es válida.',
            'amount.required' => 'El monto es requerido.',
            'amount.integer' => 'El monto debe ser un número entero.',
            'amount.min' => 'El monto debe ser mayor o igual a 0.',
            'transaction_date.required' => 'La fecha es requerida.',
            'transaction_time.required' => 'La hora es requerida.',
            'payment_method.required' => 'El método de pago es requerido.',
            'payment_method.in' => 'El método de pago seleccionado no es válido.',
            'reference_number.max' => 'El número de referencia no debe exceder los 255 caracteres.', // Cambiar aquí
        ];
    }
}
