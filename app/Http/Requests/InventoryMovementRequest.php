<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InventoryMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'        => ['required', 'in:Entrada,Salida,Devolucion Cliente,Devolucion Proveedor,Consignacion Entrada,Consignacion Salida,Cambio Entrada,Cambio Salida,Ajuste Inventario'],
            'product_id'  => ['required', 'exists:products,id'],
            'supplier_id' => ['required', 'exists:suppliers,id'],
            // Si viene de "Recibir Pedido", enlaza el movimiento a la orden
            // para sumar a quantity_received y poder cerrarla sola.
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            'quantity'    => ['required', 'integer', function ($attribute, $value, $fail) {
                if ($this->type !== 'Ajuste Inventario' && $value < 1) {
                    $fail('La cantidad debe ser mayor a 0 para este tipo de movimiento.');
                }
            }],
            'date'        => ['required', 'date'],
            'notes'       => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in'              => 'El tipo debe ser uno de: Entrada, Salida, Devolución Cliente, Devolución Proveedor, Consignación Entrada, Consignación Salida, Cambio Entrada, Cambio Salida, Ajuste Inventario.',
            'product_id.exists'    => 'El producto seleccionado no existe.',
            'supplier_id.exists'   => 'El proveedor seleccionado no existe.',
            'supplier_id.required' => 'El proveedor es requerido.',
        ];
    }
}
