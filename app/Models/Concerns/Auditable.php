<?php

namespace App\Models\Concerns;

use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Registra automáticamente creación/edición/eliminación en el log de
 * auditoría para cualquier modelo que lo use — así "cualquier acción en
 * cualquier módulo" queda cubierta sin tener que instrumentar cada
 * controlador a mano, siguiendo el mismo patrón ya usado por
 * `BroadcastsModelChanges` en estos mismos modelos.
 *
 * Un modelo con una acción de negocio más específica (anular, anonimizar)
 * ya la loguea a mano con más contexto (motivo, detalle) — para que este
 * trait no genere un segundo log genérico duplicado del mismo save/delete,
 * el controlador llama a `AuditLogger::suppress($model)` antes (o el propio
 * `AuditLogger::log()` ya lo hace).
 *
 * Un modelo puede afinar el comportamiento:
 *  - `auditLabel(): string` — descripción legible para la columna
 *    "Registro afectado" (si no existe, cae a "Modelo #id").
 *  - `shouldAudit(string $event): bool` — para saltar casos ruidosos (ej.
 *    una Transacción generada automáticamente por una Venta no necesita su
 *    propio log, la Venta ya generó el suyo).
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(fn ($model) => $model->recordAudit('created'));
        static::updated(fn ($model) => $model->recordAudit('updated'));
        static::deleted(fn ($model) => $model->recordAudit('deleted'));
    }

    protected function recordAudit(string $event): void
    {
        if (! auth()->check() || AuditLogger::isSuppressed($this)) {
            return;
        }

        if (method_exists($this, 'shouldAudit') && ! $this->shouldAudit($event)) {
            return;
        }

        $changes = $event === 'updated' ? $this->onlyMeaningfulChanges($this->getChanges()) : null;

        // En "updated", si tras filtrar timestamps no queda ningún cambio
        // real, no tiene sentido dejar una entrada vacía en el log.
        if ($event === 'updated' && empty($changes)) {
            return;
        }

        $action = Str::snake(class_basename($this)).'.'.$event;

        DB::afterCommit(function () use ($action, $changes) {
            AuditLogger::log($action, $this, null, $changes ?: null);
        });
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    /**
     * `getChanges()` solo trae el valor NUEVO de cada campo — para que el
     * modal "Ver detalle" pueda mostrar antes/después de verdad, se arma acá
     * el par [antes, después] con `getOriginal()`.
     *
     * $this->getHidden() ya excluye password/remember_token en User —
     * reusarlo evita que un hash de contraseña termine expuesto en el log
     * de auditoría además de en la tabla real.
     *
     * @param  array<string, mixed>  $changes
     * @return array<string, array{0: mixed, 1: mixed}>
     */
    protected function onlyMeaningfulChanges(array $changes): array
    {
        return collect($changes)
            ->except(array_merge(['updated_at', 'created_at'], $this->getHidden()))
            ->map(fn ($after, $field) => [$this->getOriginal($field), $after])
            ->toArray();
    }
}
