<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'inventory';

    protected $fillable = [
        'product_id', 'supplier_id', 'purchase_order_id', 'type', 'quantity', 'date', 'notes', 'cancelled_at',
        'product_code', 'product_name', 'product_deleted_at',
    ];

    protected $casts = [
        'date' => 'date',
        'quantity' => 'integer',
        'cancelled_at' => 'datetime',
        'product_deleted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        // Snapshot automático: si no viene ya seteado (p.ej. por la
        // eliminación de un producto, que lo fija explícitamente), se toma
        // del producto real al momento de crear el movimiento — así el
        // historial sigue siendo legible aunque el producto se borre después.
        static::creating(function (self $movement) {
            if ($movement->product_id && ! $movement->product_code) {
                $product = Product::find($movement->product_id);
                if ($product) {
                    $movement->product_code = $product->code;
                    $movement->product_name = $product->name;
                }
            }
        });
    }

    public function auditLabel(): string
    {
        return 'Movimiento '.$this->type.' — '.($this->product_name ?? $this->product?->name ?? 'producto #'.$this->product_id);
    }

    /**
     * Las creaciones de ajuste manual ya se loguean a mano (con motivo
     * obligatorio) desde el controlador; el resto de tipos son operación
     * rutinaria ya visible completa en su propio módulo. Editar o borrar un
     * movimiento histórico sí es inusual y se audita siempre.
     */
    public function shouldAudit(string $event): bool
    {
        return $event !== 'created';
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    // Scope para movimientos de entrada
    public function scopeEntries($query)
    {
        return $query->whereIn('type', ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada']);
    }

    // Scope para movimientos de salida
    public function scopeExits($query)
    {
        return $query->whereIn('type', ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida']);
    }

    // Scope para ajustes
    public function scopeAdjustments($query)
    {
        return $query->where('type', 'Ajuste Inventario');
    }

    // Scope por rango de fechas
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    // Accesor para tipo legible
    public function getTypeLabelAttribute()
    {
        return $this->type;
    }

    // Accesor para tipo con color
    public function getTypeClassAttribute()
    {
        if (in_array($this->type, ['Entrada', 'Devolucion Cliente', 'Consignacion Entrada', 'Cambio Entrada'])) {
            return 'success';
        } elseif (in_array($this->type, ['Salida', 'Devolucion Proveedor', 'Consignacion Salida', 'Cambio Salida'])) {
            return 'danger';
        } else {
            return 'info';
        }
    }
}
