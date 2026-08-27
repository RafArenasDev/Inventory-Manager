<?php

namespace App\Models\Concerns;

use App\Events\ModelChanged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Emite un evento liviano ({model, action, id}, sin datos del registro) por
 * el canal privado del modelo cada vez que se crea, edita o borra — así
 * cualquier sesión abierta puede refrescar sus propios datos al instante en
 * vez de esperar a que el usuario vuelva a la pestaña o recargue a mano.
 */
trait BroadcastsModelChanges
{
    public static function bootBroadcastsModelChanges(): void
    {
        static::created(fn ($model) => $model->broadcastModelChange('created'));
        static::updated(fn ($model) => $model->broadcastModelChange('updated'));
        static::deleted(fn ($model) => $model->broadcastModelChange('deleted'));
    }

    protected function broadcastModelChange(string $action): void
    {
        $channel = $this->broadcastChannel();
        $model = class_basename($this);
        $id = $this->getKey();

        // El tiempo real es una mejora de UX, no un requisito para que la
        // operación real (guardar el registro) funcione — si Reverb está
        // caído (PC apagado, watchdog reiniciando, etc.) esto NO debe tumbar
        // la petición ni, peor, dejar creer al usuario que su guardado falló
        // cuando en realidad sí se guardó (eso fue lo que generó pedidos
        // duplicados: el store() ya había hecho commit, pero el broadcast
        // fallaba después y la respuesta llegaba como error 500).
        DB::afterCommit(function () use ($channel, $model, $action, $id) {
            try {
                ModelChanged::dispatch($channel, $model, $action, $id);
            } catch (Throwable $e) {
                Log::warning('No se pudo emitir el evento de tiempo real (Reverb caído?)', [
                    'channel' => $channel,
                    'model' => $model,
                    'action' => $action,
                    'id' => $id,
                    'error' => $e->getMessage(),
                ]);
            }
        });
    }

    public function broadcastChannel(): string
    {
        return property_exists($this, 'broadcastChannelName')
            ? $this->broadcastChannelName
            : Str::kebab(Str::pluralStudly(class_basename($this)));
    }
}
