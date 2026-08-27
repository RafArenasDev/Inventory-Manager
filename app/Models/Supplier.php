<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'inventory';

    protected $fillable = [
        'name',
        'representative',
        'nit_number',
        'nit_digit',
        'phone',
        'cellphone',
        'address',
        'email',
        'description',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'nit_number' => 'integer',
        'nit_digit' => 'string',
    ];

    public function getNitAttribute()
    {
        return $this->nit_number.'-'.$this->nit_digit;
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function inventoryMovements()
    {
        return $this->hasManyThrough(InventoryMovement::class, Product::class);
    }

    public function purchaseOrders()
    {
        return $this->hasMany(PurchaseOrder::class);
    }

    public function getShortDescriptionAttribute()
    {
        return Str::limit($this->description ?? '', 100);
    }

    public function getMainContactAttribute()
    {
        return $this->representative ?? $this->name;
    }

    public function getMainPhoneAttribute()
    {
        return $this->cellphone ?? $this->phone;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
