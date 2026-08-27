<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'finance';

    protected $fillable = [
        'transaction_category_id',
        'sale_id',
        'user_id',
        'type',
        'amount',
        'transaction_date',
        'transaction_time',
        'payment_method',
        'invoice_number',
        'description',
        'notes',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'transaction_time' => 'datetime:H:i:s',
        'amount' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(TransactionCategory::class, 'transaction_category_id');
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeIncome($query)
    {
        return $query->where('type', 'Ingreso');
    }

    public function scopeExpense($query)
    {
        return $query->where('type', 'Gasto');
    }

    public function scopeDateRange($query, $from, $to)
    {
        return $query->whereBetween('transaction_date', [$from, $to]);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('transaction_date', today());
    }

    // Accesor para formato de monto
    public function getFormattedAmountAttribute()
    {
        return '$'.number_format($this->amount, 0, ',', '.');
    }

    // Accesor para tipo con color
    public function getTypeClassAttribute()
    {
        return $this->type === 'Ingreso' ? 'success' : 'danger';
    }
}
