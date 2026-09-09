<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\CashRegister;
use App\Models\Category;
use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\TransactionCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Registro inmutable de acciones críticas — protege al dueño del negocio ante
 * fraude interno: queda quién, qué, cuándo, sobre qué registro y por qué.
 *
 * Dos vías alimentan el log:
 *  - Llamadas manuales (este método) para acciones con contexto de negocio
 *    específico: anular venta, anonimizar/eliminar cliente, ajuste manual de
 *    inventario — todas exigen un motivo escrito.
 *  - El trait `Auditable` en los demás modelos, que registra automáticamente
 *    cualquier creación/edición/eliminación no cubierta arriba.
 *
 * `suppress()` evita que ambas vías dupliquen el mismo evento físico (ej. el
 * `$sale->save()` dentro de `cancel()` no debe generar además un genérico
 * "sale.updated" al lado del "sale.cancelled" ya logueado a mano).
 */
class AuditLogger
{
    /** @var array<string, true> */
    protected static array $suppressed = [];

    /**
     * @param  int|null  $actorId  Solo necesario para acciones sin sesión
     *                             autenticada donde igual se conoce quién
     *                             actuó (login fallido, reseteo de
     *                             contraseña por correo) — de lo contrario
     *                             se toma de auth() como siempre.
     */
    public static function log(
        string $action,
        ?Model $subject = null,
        ?string $reason = null,
        ?array $changes = null,
        ?string $label = null,
        ?int $actorId = null,
        ?string $actorName = null,
    ): void {
        if ($subject) {
            static::suppress($subject);
        }

        AuditLog::create([
            'user_id' => $actorId ?? auth()->id(),
            'user_name' => $actorName ?? (auth()->user()?->name ?? 'Sistema'),
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'subject_label' => $label ?? ($subject ? static::describe($subject) : null),
            'reason' => $reason,
            'changes' => $changes,
            'created_at' => now(),
        ]);
    }

    /**
     * Marca este registro como "ya logueado a mano en esta petición" — el
     * trait Auditable lo consulta antes de generar su propio log genérico
     * para el mismo save/delete.
     */
    public static function suppress(Model $subject): void
    {
        static::$suppressed[$subject::class.':'.$subject->getKey()] = true;
    }

    public static function isSuppressed(Model $subject): bool
    {
        return isset(static::$suppressed[$subject::class.':'.$subject->getKey()]);
    }

    /**
     * Nombre de módulo legible para agrupar/mostrar en la tabla de
     * auditoría — depende solo de la clase, no de la fila, así que no hace
     * falta guardarlo aparte: se resuelve al leer.
     */
    public static function moduleLabel(?string $subjectType): ?string
    {
        if (! $subjectType) {
            return null;
        }

        return match ($subjectType) {
            Sale::class => 'Ventas',
            Client::class => 'Clientes',
            Product::class => 'Productos',
            Category::class => 'Categorías',
            Supplier::class => 'Proveedores',
            PurchaseOrder::class => 'Pedidos',
            CashRegister::class => 'Caja',
            Transaction::class, TransactionCategory::class => 'Finanzas',
            InventoryMovement::class => 'Movimientos Inventario',
            User::class => 'Usuarios',
            Role::class => 'Roles y Permisos',
            default => class_basename($subjectType),
        };
    }

    /**
     * Descripción legible del registro afectado, calculada en el momento
     * (no un lookup en vivo) — así sigue siendo legible aunque el registro
     * se elimine o cambie después. Cada modelo relevante sabe describirse a
     * sí mismo vía `auditLabel()` (ver trait Auditable); esto es el
     * fallback para cuando el log se genera manualmente con el modelo ya
     * en memoria.
     */
    public static function describe(Model $subject): string
    {
        if (method_exists($subject, 'auditLabel')) {
            return $subject->auditLabel();
        }

        return class_basename($subject).' #'.$subject->getKey();
    }
}
