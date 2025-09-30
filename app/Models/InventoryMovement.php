<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'supplier_id', 'type', 'quantity', 'date', 'notes', 'cancelled_at',
    ];

    protected $casts = [
        'date'         => 'date',
        'quantity'     => 'integer',
        'cancelled_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
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
