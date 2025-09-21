<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'type', 'quantity', 'date', 'notes',
    ];

    protected $casts = [
        'date'     => 'date',
        'quantity' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Scope para movimientos de entrada
    public function scopeEntries($query)
    {
        return $query->where('type', 'Entrada');
    }

    // Scope para movimientos de salida
    public function scopeExits($query)
    {
        return $query->where('type', 'Salida');
    }

    // Scope por rango de fechas
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    // Accesor para tipo legible
    public function getTypeLabelAttribute()
    {
        return $this->type === 'Entrada' ? 'Entrada' : 'Salida';
    }

    // Accesor para tipo con color
    public function getTypeClassAttribute()
    {
        return $this->type === 'Entrada' ? 'success' : 'danger';
    }
}
