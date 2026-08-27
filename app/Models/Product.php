<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'inventory';

    protected $fillable = [
        'code', 'category_id', 'name', 'description',
        'image_path', 'price_without_tax', 'price_with_tax', 'iva_value',
        'sale_price', 'supplier_id', 'stock', 'initial_movement_id',
    ];

    protected $casts = [
        'price_without_tax' => 'integer',
        'price_with_tax' => 'integer',
        'iva_value' => 'integer',
        'sale_price' => 'integer',
        'stock' => 'integer',
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

    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
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

    /**
     * Mismos cortes que el semáforo de productsTable.tsx / la campana de
     * notificaciones — un solo lugar para no repetir los números 0/3 en
     * cada controlador que necesite clasificar stock bajo.
     */
    public static function stockTier(int $stock): string
    {
        if ($stock === 0) {
            return 'agotado';
        }

        if ($stock <= 3) {
            return 'critico';
        }

        return 'advertencia';
    }
}
