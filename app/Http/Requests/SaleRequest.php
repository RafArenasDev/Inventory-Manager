<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermissionTo('Crear Ventas');
    }

    public function rules(): array
    {
        return [
            'client_id'              => ['required_without:client_document_number', 'nullable', 'exists:clients,id'],
            'client_document_number' => ['required_without:client_id', 'nullable', 'string'],
            'sale_date'              => ['required', 'date'],
            'sale_time'              => ['required', 'date_format:H:i:s'],
            'discount'               => ['required', 'numeric', 'min:0', 'max:100'],
            'payment_method'         => ['required', Rule::in(['Efectivo', 'Nequi'])],
            'notes'                  => ['nullable', 'string'],
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.product_id'     => ['required', 'exists:products,id'],
            'items.*.quantity'       => ['required', 'integer', 'min:1'],
            'items.*.price_at_sale'  => ['required', 'numeric', 'min:0'],
            'items.*.subtotal'       => ['required', 'numeric', 'min:0'],
            'total_without_tax'      => ['required', 'numeric', 'min:0'],
            'total_with_discount'    => ['required', 'numeric', 'min:0'],
            'total_paid'             => ['required', 'numeric', 'min:0'],
        ];
    }
}
