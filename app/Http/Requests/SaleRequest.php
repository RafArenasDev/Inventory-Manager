<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'client_id'             => 'nullable|exists:clients,id',
            'user_id'               => 'required|exists:users,id',
            'sale_date'             => 'required|date',
            'total_without_tax'     => 'required|integer|min:0',
            'total_with_tax'        => 'required|integer|min:0',
            'discount'              => 'integer|min:0',
            'total_paid'            => 'required|integer|min:0',
            'payment_method'        => 'required|in:Efectivo,Nequi',
            'notes'                 => 'nullable|string',
            'items'                 => 'required|array|min:1',
            'items.*.product_id'    => 'required|exists:products,id',
            'items.*.quantity'      => 'required|integer|min:1',
            'items.*.item_discount' => 'integer|min:0',
        ];
    }
}
