<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use BroadcastsModelChanges, HasFactory;

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

    public static function generateInvoiceNumber()
    {
        $lastSale = static::orderBy('id', 'desc')->first();

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
