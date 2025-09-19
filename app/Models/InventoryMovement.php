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
        return $query->where('type', 'entry');
    }

    // Scope para movimientos de salida
    public function scopeExits($query)
    {
        return $query->where('type', 'exit');
    }

    // Scope por rango de fechas
    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('date', [$from, $to]);
    }

    // Accesor para tipo legible
    public function getTypeLabelAttribute()
    {
        return $this->type === 'entry' ? 'Entrada' : 'Salida';
    }

    // Accesor para tipo con color
    public function getTypeClassAttribute()
    {
        return $this->type === 'entry' ? 'success' : 'danger';
    }

    protected static function boot()
    {
        parent::boot();

        static::created(function ($movement) {
            $product = $movement->product;
            $delta   = $movement->type === 'entry' ? $movement->quantity : -$movement->quantity;
            $product->update(['stock' => $product->stock + $delta]);
        });

        static::updated(function ($movement) {
            // Si se actualiza la cantidad o el tipo, recalcular el stock
            if ($movement->isDirty(['quantity', 'type'])) {
                $oldDelta = $movement->getOriginal('type') === 'entry'
                    ? $movement->getOriginal('quantity')
                    : -$movement->getOriginal('quantity');

                $newDelta = $movement->type === 'entry'
                    ? $movement->quantity
                    : -$movement->quantity;

                $product = $movement->product;
                $product->update(['stock' => $product->stock + ($newDelta - $oldDelta)]);
            }
        });

        static::deleted(function ($movement) {
            // Revertir el stock al eliminar
            $delta = $movement->type === 'entry' ? -$movement->quantity : $movement->quantity;
            $movement->product->increment('stock', $delta);
        });
    }
}
