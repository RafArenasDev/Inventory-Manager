<?php

namespace App\Http\Requests;

use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * El Dígito de Verificación (DV) del NIT nunca se confía al cliente:
     * se recalcula siempre en el servidor a partir del número de NIT antes
     * de validar, aunque el frontend ya lo muestre calculado y de solo
     * lectura.
     */
    protected function prepareForValidation(): void
    {
        if ($this->filled('nit_number') && preg_match('/^\d+$/', (string) $this->nit_number)) {
            $this->merge(['nit_digit' => Supplier::calculateNitCheckDigit($this->nit_number)]);
        }
    }

    public function rules(): array
    {
        $supplierId = $this->route('supplier');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('suppliers', 'name')->ignore($supplierId)],
            'representative' => ['required', 'string', 'max:255'],
            'nit_number' => [
                'required',
                'digits_between:1,15',
                Rule::unique('suppliers', 'nit_number')->ignore($supplierId),
            ],
            'nit_digit' => 'required|integer|between:0,9',
            'phone' => 'nullable|string|max:20',
            'cellphone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'email' => ['required', 'email', 'max:255'],
            'description' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del proveedor es obligatorio.',
            'name.unique' => 'Ya existe un proveedor con este nombre.',
            'representative.required' => 'El representante legal es obligatorio.',
            'nit_number.required' => 'El número de NIT es obligatorio.',
            'nit_number.digits_between' => 'El número de NIT debe tener entre 1 y 15 dígitos.',
            'nit_number.unique' => 'Ya existe un proveedor con este NIT.',
            'nit_digit.required' => 'El dígito de verificación es obligatorio.',
            'nit_digit.between' => 'El dígito de verificación debe estar entre 0 y 9.',
            'email.required' => 'El email es obligatorio.',
            'email.email' => 'El email no tiene un formato válido.',
        ];
    }
}
