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
            'department_id' => 'nullable|integer',
            'city_id' => 'nullable|integer',
            'phone' => 'nullable|string|max:20',
            'cellphone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'email' => 'nullable|email',
        ];
    }
}
