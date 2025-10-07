<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashRegister extends Model
{
    use HasFactory;

    protected $fillable = [
        'register_date',
        'opened_by',
        'closed_by',
        'opening_balance',
        'total_sales',
        'total_income',
        'total_expenses',
        'expected_balance',
        'actual_balance',
        'difference',
        'opened_at',
        'closed_at',
        'is_closed',
        'opening_notes',
        'closing_notes',
    ];

    protected $casts = [
        'register_date'    => 'date',
        'opening_balance'  => 'integer',
        'total_sales'      => 'integer',
        'total_income'     => 'integer',
        'total_expenses'   => 'integer',
        'expected_balance' => 'integer',
        'actual_balance'   => 'integer',
        'difference'       => 'integer',
        'opened_at'        => 'datetime',
        'closed_at'        => 'datetime',
        'is_closed'        => 'boolean',
    ];

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

    // Accesor para formato de balance
    public function getFormattedExpectedBalanceAttribute()
    {
        return '$' . number_format($this->expected_balance, 0, ',', '.');
    }

    public function getFormattedActualBalanceAttribute()
    {
        return '$' . number_format($this->actual_balance, 0, ',', '.');
    }

    public function getFormattedDifferenceAttribute()
    {
        $sign = $this->difference >= 0 ? '+' : '';
        return $sign . '$' . number_format($this->difference, 0, ',', '.');
    }
}
