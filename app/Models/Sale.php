<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'sales';

    protected $fillable = [
        'invoice_number',
        'client_id',
        'user_id',
        'sale_date',
        'sale_time',
        'total_without_tax',
        'total_with_discount',
        'discount',
        'discount_type',
        'total_paid',
        'payment_method',
        'notes',
        'invoice_path',
        'public_invoice_url',
        'is_cancelled',
    ];

    protected $casts = [
        'is_cancelled' => 'boolean',
        'sale_date' => 'date',
        'sale_time' => 'datetime:H:i:s',
    ];

    public function auditLabel(): string
    {
        return 'Venta '.($this->invoice_number ?? '#'.$this->id);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transaction()
    {
        return $this->hasOne(Transaction::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    /**
     * `lockForUpdate` es obligatorio y debe llamarse DENTRO de la misma
     * DB::transaction() que crea la venta — sin esto, dos ventas
     * registradas casi al mismo tiempo pueden leer la misma "última venta"
     * y calcular el mismo siguiente número, chocando contra el `unique` de
     * `invoice_number` (o peor, si no lo hubiera, generando dos facturas
     * con el mismo número). El lock serializa: la segunda transacción
     * espera a que la primera confirme antes de leer, así siempre ve el
     * número ya actualizado.
     */
    public static function generateInvoiceNumber()
    {
        $lastSale = static::orderBy('id', 'desc')->lockForUpdate()->first();

        if (! $lastSale || ! $lastSale->invoice_number) {
            return 'A-000001';
        }

        $parts = explode('-', $lastSale->invoice_number);
        $letter = $parts[0];
        $number = intval($parts[1]);

        if ($number >= 999999) {
            $letter = chr(ord($letter) + 1);
            $number = 1;

            if ($letter > 'Z') {
                $letter = 'A';
            }
        } else {
            $number++;
        }

        return $letter.'-'.str_pad($number, 6, '0', STR_PAD_LEFT);
    }
}
