<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'purchase-orders';

    protected $fillable = [
        'supplier_id',
        'requested_by',
        'status',
        'notes',
        'expected_at',
        'received_at',
        'received_by',
        'is_low_stock_order',
        'updated_by',
    ];

    protected $casts = [
        'expected_at' => 'date',
        'received_at' => 'datetime',
        'is_low_stock_order' => 'boolean',
    ];

    public function auditLabel(): string
    {
        return 'Pedido #'.$this->id.' — '.($this->supplier?->name ?? 'proveedor #'.$this->supplier_id);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'Solicitado');
    }

    public function isFullyReceived(): bool
    {
        return $this->items->every(fn (PurchaseOrderItem $item) => $item->quantity_received >= $item->quantity_requested);
    }
}
