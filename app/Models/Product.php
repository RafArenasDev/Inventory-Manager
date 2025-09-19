<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'category_id', 'name', 'description',
        'image_path', 'price_without_tax', 'price_with_tax', 'iva_value',
        'sale_price', 'supplier', 'stock',
    ];

    protected $casts = [
        'price_without_tax' => 'integer', // Cambiado a integer para consistencia con la migración
        'price_with_tax'    => 'integer',
        'iva_value'         => 'integer',
        'sale_price'        => 'integer',
        'stock'             => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function movements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    // Acceso para obtener el nombre corto
    public function getShortDescriptionAttribute()
    {
        return Str::limit($this->description ?? '', 50);
    }

    // Acceso para obtener el IVA calculado (mantener para compatibilidad)
    public function getTaxValueAttribute()
    {
        return $this->iva_value;
    }

    // Scope para productos con bajo stock
    public function scopeLowStock($query, $threshold = 5)
    {
        return $query->where('stock', '<=', $threshold);
    }

    // Scope para productos sin stock
    public function scopeOutOfStock($query)
    {
        return $query->where('stock', 0);
    }
}
