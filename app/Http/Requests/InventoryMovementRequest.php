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
            'type' => ['required', 'in:Entrada,Salida,Devolucion Cliente,Devolucion Proveedor,Consignacion Entrada,Consignacion Salida,Cambio Entrada,Cambio Salida,Ajuste Inventario'],
            'product_id' => ['required', 'exists:products,id'],
            // El proveedor nunca lo decide el cliente: el formulario lo
            // autocompleta del producto y lo deja en solo lectura, y el
            // controller lo vuelve a fijar desde `$product->supplier_id` sin
            // importar qué llegue acá — esta regla es solo para que el campo
            // no rompa la validación si no llega en el request.
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            // Si viene de "Recibir Pedido", enlaza el movimiento a la orden
            // para sumar a quantity_received y poder cerrarla sola.
            'purchase_order_id' => ['nullable', 'exists:purchase_orders,id'],
            // "Ajuste Inventario" guarda el conteo físico real del producto
            // (puede ser 0 si de verdad no queda ninguno) — cualquier otro
            // tipo exige al menos 1 unidad. Nunca se acepta un valor
            // negativo, sin excepción.
            'quantity' => ['required', 'integer', 'min:0', function ($attribute, $value, $fail) {
                if ($this->type !== 'Ajuste Inventario' && $value < 1) {
                    $fail('La cantidad debe ser mayor a 0 para este tipo de movimiento.');
                }
            }],
            // Nunca a futuro — evita registrar movimientos "adelantados" que
            // no reflejan un hecho real todavía, sin depender del `max` del
            // input (que un POST manipulado a mano puede ignorar).
            'date' => ['required', 'date', 'before_or_equal:today'],
            // Obligatorio solo para un ajuste manual real (sin pedido de por
            // medio) — ahí es donde importa dejar constancia del motivo para
            // auditoría; si viene de "Recibir Pedido" ya está justificado por
            // el pedido mismo.
            'notes' => ['nullable', 'string', 'max:1000', function ($attribute, $value, $fail) {
                if ($this->type === 'Ajuste Inventario' && ! $this->purchase_order_id && ! $value) {
                    $fail('Debes indicar el motivo del ajuste manual de inventario.');
                }
            }],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in' => 'El tipo debe ser uno de: Entrada, Salida, Devolución Cliente, Devolución Proveedor, Consignación Entrada, Consignación Salida, Cambio Entrada, Cambio Salida, Ajuste Inventario.',
            'product_id.required' => 'Debes seleccionar un producto.',
            'product_id.exists' => 'El producto seleccionado no existe.',
            'supplier_id.exists' => 'El proveedor seleccionado no existe.',
            'date.before_or_equal' => 'La fecha no puede ser futura.',
        ];
    }
}
