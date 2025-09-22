<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use HasFactory;

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
        'is_active'  => 'boolean',
        'nit_number' => 'integer',
        'nit_digit'  => 'string',
    ];

    // Accesor para NIT completo
    public function getNitAttribute()
    {
        return $this->nit_number . '-' . $this->nit_digit;
    }

    // Relaciones
    public function products()
    {
        return $this->hasMany(Product::class, 'supplier');
    }

    public function inventoryMovements()
    {
        return $this->hasManyThrough(InventoryMovement::class, Product::class, 'supplier', 'product_id');
    }

    // Accesor para descripción corta
    public function getShortDescriptionAttribute()
    {
        return Str::limit($this->description ?? '', 100);
    }

    // Accesor para contacto principal
    public function getMainContactAttribute()
    {
        return $this->representative ?? $this->name;
    }

    // Accesor para teléfono principal
    public function getMainPhoneAttribute()
    {
        return $this->cellphone ?? $this->phone;
    }

    // Scope para proveedores activos
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
