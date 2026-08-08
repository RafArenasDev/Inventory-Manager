import * as SwitchPrimitive from '@radix-ui/react-switch';
import { router } from '@inertiajs/react';

import { cn } from '@/lib/utils';
import Swal from '@/lib/swal';

interface StatusToggleProps {
    id: number;
    isActive: boolean;
    /** Nombre de ruta Laravel, ej. 'users.toggle-active' */
    toggleRouteName: string;
    /** Sustantivo en minúscula para los mensajes, ej. 'usuario', 'proveedor' */
    entityLabel: string;
    /** Nombre/identificador a mostrar en el mensaje de confirmación */
    entityName: string;
    disabled?: boolean;
    /** Texto accesible cuando está deshabilitado, ej. "No puedes desactivar tu propia cuenta" */
    disabledReason?: string;
    /** true para sustantivos femeninos, ej. 'categoría' → activada/desactivada */
    feminine?: boolean;
    /**
     * true para sustantivos comunes que necesitan artículo, ej. 'categoría'
     * → "la categoría **Accesorios**". false (default) para nombres propios
     * (usuario, proveedor, cliente) → simplemente "**Marcela Duque**", sin
     * repetir el sustantivo ni forzar un artículo/género que no aplica.
     */
    useArticle?: boolean;
    className?: string;
}

/**
 * Switch de Estado (verde=activo / rojo=inactivo) reutilizado en todas las
 * tablas con activo/inactivo (Usuarios, Proveedores, Categorías, Clientes).
 * Es autocontenido: confirma con SweetAlert2 y dispara el PATCH él mismo,
 * para no repetir ese bloque en cada tabla.
 */
export function StatusToggle({
    id,
    isActive,
    toggleRouteName,
    entityLabel,
    entityName,
    disabled = false,
    disabledReason,
    feminine = false,
    useArticle = false,
    className,
}: StatusToggleProps) {
    const verb = (activating: boolean): string => (activating ? 'activad' : 'desactivad') + (feminine ? 'a' : 'o');
    // "la categoría <b>Accesorios</b>" (con artículo) o solo "<b>Marcela Duque</b>"
    // (nombre propio) — una sola forma de nombrar la entidad, reusada en los
    // tres mensajes para no repetir esta decisión en cada uno.
    const describe = (capitalize = false): string => {
        if (!useArticle) return `<b>${entityName}</b>`;
        const article = feminine ? 'la' : 'el';
        return `${capitalize ? article[0].toUpperCase() + article.slice(1) : article} ${entityLabel} <b>${entityName}</b>`;
    };

    const handleCheckedChange = () => {
        const willActivate = !isActive;

        Swal.fire({
            title: '¿Estás seguro?',
            html: `Esta acción ${willActivate ? 'activará' : 'desactivará'} ${useArticle ? describe() : 'a ' + describe()}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: willActivate ? 'Sí, activar' : 'Sí, desactivar',
            cancelButtonText: 'Cancelar',
        }).then((result) => {
            if (!result.isConfirmed) return;

            router.patch(
                route(toggleRouteName, id),
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            html: `${describe(true)} fue ${verb(willActivate)} correctamente.`,
                            icon: 'success',
                            timer: 2200,
                            showConfirmButton: false,
                        });
                    },
                    onError: () => {
                        Swal.fire({
                            title: 'Error',
                            html: `No se pudo actualizar el estado de ${describe()}.`,
                            icon: 'error',
                        });
                    },
                }
            );
        });
    };

    return (
        <div className={cn('flex items-center gap-2', className)} title={disabled ? disabledReason : undefined}>
            <SwitchPrimitive.Root
                checked={isActive}
                onCheckedChange={handleCheckedChange}
                disabled={disabled}
                aria-label={`${isActive ? 'Desactivar' : 'Activar'} ${useArticle ? entityLabel + ' ' : ''}${entityName}`}
                className={cn(
                    'peer inline-flex h-4 w-7 shrink-0 items-center rounded-full border-2 border-transparent shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                    'data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-rose-600'
                )}
            >
                <SwitchPrimitive.Thumb
                    className="pointer-events-none block size-3 rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0"
                />
            </SwitchPrimitive.Root>
            <span
                className={cn(
                    'text-xs font-bold',
                    isActive ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'
                )}
            >
                {isActive ? (feminine ? 'Activa' : 'Activo') : (feminine ? 'Inactiva' : 'Inactivo')}
            </span>
        </div>
    );
}
