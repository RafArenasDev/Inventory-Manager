<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegister extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'finance';

    protected $fillable = [
        'register_date',
        'opened_by',
        'opened_by_name',
        'closed_by',
        'closed_by_name',
        'opening_amount',
        'closing_amount',
        'total_sales',
        'total_income',
        'total_expenses',
        'difference',
        'opened_at',
        'closed_at',
        'is_closed',
        'notes',
    ];

    protected $casts = [
        'register_date' => 'date',
        'opening_amount' => 'integer',
        'closing_amount' => 'integer',
        'total_sales' => 'integer',
        'total_income' => 'integer',
        'total_expenses' => 'integer',
        'difference' => 'integer',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'is_closed' => 'boolean',
    ];

    public function auditLabel(): string
    {
        return 'Caja '.$this->register_date->format('d/m/Y');
    }

    public function openedBy()
    {
        return $this->belongsTo(User::class, 'opened_by');
    }

    public function closedBy()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    // Scope para caja del día
    public function scopeToday($query)
    {
        return $query->where('register_date', today());
    }

    // Scope para cajas abiertas
    public function scopeOpen($query)
    {
        return $query->where('is_closed', false);
    }

    // Accesor para saber si hay faltante
    public function getHasShortageAttribute()
    {
        return $this->difference < 0;
    }

    // Accesor para saber si hay sobrante
    public function getHasSurplusAttribute()
    {
        return $this->difference > 0;
    }

    // Formatos
    public function getFormattedOpeningAmountAttribute()
    {
        return '$'.number_format($this->opening_amount, 0, ',', '.');
    }

    public function getFormattedClosingAmountAttribute()
    {
        return '$'.number_format($this->closing_amount ?? 0, 0, ',', '.');
    }

    public function getFormattedDifferenceAttribute()
    {
        if (is_null($this->difference)) {
            return null;
        }
        $sign = $this->difference >= 0 ? '+' : '';

        return $sign.'$'.number_format($this->difference, 0, ',', '.');
    }
}
