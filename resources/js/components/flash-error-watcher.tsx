import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

import Swal from '@/lib/swal';
import { type SharedData } from '@/types';

/**
 * Muchas acciones (bloquear una venta sin caja abierta, no poder borrar una
 * categoría con productos, etc.) devuelven `back()->with('error', ...)` —
 * una redirección normal, no un error de validación — así que el
 * `onError` de Inertia nunca se dispara para ellas y el mensaje quedaba sin
 * mostrarse en ningún lado. Este componente global sí lo muestra.
 */
export default function FlashErrorWatcher() {
    const { flash } = usePage<SharedData & { flash?: { success?: string | null; error?: string | null } }>().props;
    const lastShown = useRef<string | null>(null);

    useEffect(() => {
        if (flash?.error && flash.error !== lastShown.current) {
            lastShown.current = flash.error;
            Swal.fire({
                title: 'Error',
                text: flash.error,
                icon: 'error',
            });
        }
    }, [flash?.error]);

    return null;
}
