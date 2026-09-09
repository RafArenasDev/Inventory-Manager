<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionCategory extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'finance';

    protected $fillable = [
        'name',
        'type',
        'description',
        'is_active',
        'is_system',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_system' => 'boolean',
    ];

    public function auditLabel(): string
    {
        return 'Categoría Finanzas '.$this->name;
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    // Scope para categorías activas
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope para ingresos
    public function scopeIncome($query)
    {
        return $query->where('type', 'Ingreso');
    }

    // Scope para gastos
    public function scopeExpense($query)
    {
        return $query->where('type', 'Gasto');
    }
}
