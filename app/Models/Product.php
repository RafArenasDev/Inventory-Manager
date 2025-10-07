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
        'sale_price', 'supplier_id', 'stock', 'initial_movement_id',
    ];

    protected $casts = [
        'price_without_tax' => 'integer',
        'price_with_tax'    => 'integer',
        'iva_value'         => 'integer',
        'sale_price'        => 'integer',
        'stock'             => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function movements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    // AGREGAR ESTA RELACIÓN
    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function getShortDescriptionAttribute()
    {
        return Str::limit($this->description ?? '', 50);
    }

    public function getTaxValueAttribute()
    {
        return $this->iva_value;
    }

    public function scopeLowStock($query, $threshold = 5)
    {
        return $query->where('stock', '<=', $threshold);
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('stock', 0);
    }
}
