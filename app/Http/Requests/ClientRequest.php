<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type' => 'required|in:CC,TI,CE,Pasaporte,NIT',
            'document_number' => [
                'required',
                Rule::when(in_array($this->document_type, ['CC', 'TI', 'NIT']), 'integer'),
                Rule::when(in_array($this->document_type, ['CE', 'Pasaporte']), 'string|max:255'),
                Rule::unique('clients')->where('document_type', $this->document_type)->ignore($this->route('client')),
            ],
            'verification_digit' => [
                'nullable',
                'integer',
                'min:0',
                'max:9',
                Rule::requiredIf($this->document_type === 'NIT'),
            ],
            'name' => 'required|string|max:255',
            // Departamento, ciudad, dirección, celular y email pasan a
            // obligatorios de verdad. Para una venta de mostrador sin datos
            // reales del comprador, usar el cliente "Consumidor Final"
            // (documento 222222222222) que la DIAN recomienda para estos
            // casos — precargado en la migración
            // 2026_09_08_212432_seed_dian_default_client — en vez de crear
            // un cliente nuevo a medias.
            'department_id' => 'required|integer|exists:departments,id',
            'city_id' => 'required|integer|exists:cities,id',
            'phone' => 'nullable|string|max:20',
            'cellphone' => 'required|string|max:20',
            'address' => 'required|string',
            'email' => 'required|email',
        ];
    }
}
