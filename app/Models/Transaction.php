<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

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

    public function auditLabel(): string
    {
        return 'Transacción '.$this->type.' — '.($this->category?->name ?? 'sin categoría');
    }

    /**
     * Una transacción generada automáticamente por una venta no necesita su
     * propio log de creación — la Venta ya deja su propia entrada. Editarla
     * o eliminarla después sí es una acción manual y se audita.
     */
    public function shouldAudit(string $event): bool
    {
        return ! ($event === 'created' && $this->sale_id !== null);
    }

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
