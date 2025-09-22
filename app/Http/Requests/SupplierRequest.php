<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $supplierId = $this->route('supplier');

        return [
            'name'           => 'required|string|max:255|unique:suppliers,name,' . $supplierId,
            'representative' => 'nullable|string|max:255',
            'nit_number'     => 'required|integer|min:1|unique:suppliers,nit_number,' . $supplierId . ',id,nit_digit,' . $this->nit_digit,
            'nit_digit'      => 'required|integer|between:0,9',
            'phone'          => 'nullable|string|max:20',
            'cellphone'      => 'nullable|string|max:20',
            'address'        => 'nullable|string',
            'email'          => 'nullable|email|max:255',
            'description'    => 'nullable|string',
        ];
    }
}
