<?php

namespace App\Models;

use App\Models\Concerns\BroadcastsModelChanges;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    // Solo tiempo real (para que la pantalla de Auditoría se refresque sola
    // si dos administradores la tienen abierta a la vez) — nunca `Auditable`,
    // el log no se audita a sí mismo.
    use BroadcastsModelChanges;

    protected $broadcastChannelName = 'admin';

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'user_name', 'action', 'subject_type', 'subject_id', 'subject_label', 'reason', 'changes', 'created_at',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
