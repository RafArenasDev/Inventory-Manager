<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use Auditable, BroadcastsModelChanges, HasFactory;

    protected $broadcastChannelName = 'clients';

    protected $fillable = [
        'document_type',
        'document_number',
        'verification_digit',
        'name',
        'department_id',
        'city_id',
        'phone',
        'cellphone',
        'address',
        'email',
        'is_active',
        'anonymized_at',
    ];

    protected function casts(): array
    {
        return [
            'anonymized_at' => 'datetime',
        ];
    }

    public function auditLabel(): string
    {
        return 'Cliente '.$this->name.' — '.$this->document_type.' '.$this->document_number;
    }

    /**
     * La anonimización es irreversible (Ley 1581 de 2012, derecho de
     * supresión) — una vez marcado, el registro no vuelve a editarse,
     * eliminarse, reactivarse ni verse en detalle.
     */
    public function isAnonymized(): bool
    {
        return $this->anonymized_at !== null;
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
