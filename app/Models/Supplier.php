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

    /**
     * Dígito de Verificación (DV) del NIT — algoritmo oficial de la DIAN
     * (módulo 11 con tabla de pesos fija). Se calcula siempre en el
     * servidor a partir del número de NIT: nunca se confía en un DV
     * enviado por el cliente.
     */
    public static function calculateNitCheckDigit(int|string $nitNumber): int
    {
        $weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
        $digits = array_reverse(str_split((string) $nitNumber));

        $sum = 0;
        foreach ($digits as $index => $digit) {
            $sum += ((int) $digit) * ($weights[$index] ?? 0);
        }

        $remainder = $sum % 11;

        return $remainder < 2 ? $remainder : 11 - $remainder;
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
