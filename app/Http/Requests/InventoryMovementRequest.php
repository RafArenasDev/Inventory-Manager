<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InventoryMovementRequest extends FormRequest
{
    public function authorize()
    {return true;}

    public function rules()
    {
        return [
            'product_id' => 'required|exists:products,id',
            'type'       => 'required|in:entry,exit',
            'quantity'   => 'required|integer|min:1',
            'date'       => 'required|date',
            'notes'      => 'nullable|string|max:500',
        ];
    }

    public function messages()
    {
        return [
            'product_id.required' => 'Debe seleccionar un producto.',
            'product_id.exists'   => 'El producto seleccionado no existe.',
            'type.required'       => 'Debe seleccionar el tipo de movimiento.',
            'type.in'             => 'El tipo de movimiento debe ser entrada o salida.',
            'quantity.required'   => 'La cantidad es obligatoria.',
            'quantity.integer'    => 'La cantidad debe ser un número entero.',
            'quantity.min'        => 'La cantidad debe ser mayor a 0.',
            'date.required'       => 'La fecha es obligatoria.',
            'date.date'           => 'La fecha debe tener un formato válido.',
            'notes.max'           => 'Las notas no pueden exceder 500 caracteres.',
        ];
    }
}
