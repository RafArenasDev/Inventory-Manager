<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    use BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'purchase-orders';

    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'quantity_requested',
        'quantity_received',
        'unit_cost',
    ];

    protected $casts = [
        'quantity_requested' => 'integer',
        'quantity_received' => 'integer',
        'unit_cost' => 'integer',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function isFulfilled(): bool
    {
        return $this->quantity_received >= $this->quantity_requested;
    }
}
