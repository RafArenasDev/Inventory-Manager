<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CashRegisterCloseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()->hasPermissionTo('Actualizar Caja');
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('notes')) {
            $this->merge(['notes' => trim((string) $this->notes)]);
        }
    }

    public function rules(): array
    {
        return [
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [];
    }
}
