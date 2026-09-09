<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Product extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'inventory';

    protected $fillable = [
        'code', 'category_id', 'name', 'description',
        'image_path', 'price_without_tax', 'price_with_tax', 'iva_value',
        'sale_price', 'supplier_id', 'stock', 'low_stock_threshold', 'initial_movement_id',
    ];

    /**
     * Umbral de alerta de stock usado cuando el producto no define uno
     * propio (columna `low_stock_threshold` nula) — mismo valor que se
     * usaba hardcodeado antes en DashboardController.
     */
    public const DEFAULT_LOW_STOCK_THRESHOLD = 7;

    protected $casts = [
        'price_without_tax' => 'integer',
        'price_with_tax' => 'integer',
        'iva_value' => 'integer',
        'sale_price' => 'integer',
        'stock' => 'integer',
    ];

    public function auditLabel(): string
    {
        return 'Producto '.$this->code.' — '.$this->name;
    }

    /**
     * Un cambio de stock por sí solo ya queda registrado con contexto real
     * (quién vendió qué, o el motivo del ajuste manual) en la Venta o el
     * Movimiento que lo causó — auditarlo de nuevo acá sería un duplicado
     * sin información nueva. Cualquier otro cambio (precio, nombre,
     * categoría) sí se audita.
     */
    public function shouldAudit(string $event): bool
    {
        if ($event !== 'updated') {
            return true;
        }

        return array_diff(array_keys($this->getChanges()), ['updated_at']) !== ['stock'];
    }

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

    public function getEffectiveLowStockThresholdAttribute(): int
    {
        return $this->low_stock_threshold ?? self::DEFAULT_LOW_STOCK_THRESHOLD;
    }

    /**
     * Mismos cortes que la campana de notificaciones — un solo lugar para
     * no repetir la clasificación en cada controlador. "Crítico" es la
     * mitad del umbral de alerta (mínimo 1), para que escale junto con el
     * umbral configurable por producto en vez de quedar fijo en 3.
     */
    public static function stockTier(int $stock, ?int $threshold = null): string
    {
        if ($stock === 0) {
            return 'agotado';
        }

        $threshold ??= self::DEFAULT_LOW_STOCK_THRESHOLD;
        $criticalThreshold = max(1, intdiv($threshold, 2));

        if ($stock <= $criticalThreshold) {
            return 'critico';
        }

        return 'advertencia';
    }
}
