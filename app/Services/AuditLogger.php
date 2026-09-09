<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Registro inmutable de acciones críticas (anular venta, ajuste manual de
 * inventario, anonimizar/eliminar cliente, cambio de precio) — protege al
 * dueño del negocio ante fraude interno: queda quién, qué, cuándo y por qué.
 */
class AuditLogger
{
    public static function log(string $action, ?Model $subject = null, ?string $reason = null, ?array $changes = null): void
    {
        AuditLog::create([
            'user_id' => auth()->id(),
            'user_name' => auth()->user()?->name ?? 'Sistema',
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'reason' => $reason,
            'changes' => $changes,
            'created_at' => now(),
        ]);
    }
}
