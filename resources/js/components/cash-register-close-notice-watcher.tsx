import { useCallback, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';

import Swal from '@/lib/swal';
import { waitForAlertQueue } from '@/lib/alertSequencer';

const POLL_INTERVAL_MS = 60000;
// Si el usuario elige "Más tarde", no se vuelve a molestar antes de este
// tiempo — suficiente para que no sea invasivo, pero corto para que la caja
// no quede abierta toda la noche solo porque nadie cerró la pestaña.
const REMINDER_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Hasta ahora el cierre automático de la caja solo pasaba en el logout — si
 * el usuario se quedaba con la sesión abierta después del horario de cierre
 * (6:30pm), la caja seguía abierta indefinidamente sin que nadie se
 * enterara. Este watcher revisa cada minuto (mientras la sesión siga
 * activa, sin importar en qué página esté) y ofrece cerrarla ahí mismo apenas
 * se cruza la hora de cierre.
 */
export default function CashRegisterCloseNoticeWatcher() {
    const { auth } = usePage().props as unknown as { auth: { permissions: string[] } };
    const canClose = auth.permissions?.includes('Actualizar Caja') ?? false;
    const lastShownRef = useRef(0);
    const promptingRef = useRef(false);

    const checkStatus = useCallback(async () => {
        if (!canClose || promptingRef.current) return;

        try {
            const res = await fetch(route('cash-register.status'));
            if (!res.ok) return;
            const data: { open_register_id: number | null; past_close_time: boolean } = await res.json();

            if (!data.open_register_id || !data.past_close_time) return;
            if (Date.now() - lastShownRef.current < REMINDER_INTERVAL_MS) return;

            lastShownRef.current = Date.now();
            promptingRef.current = true;

            await waitForAlertQueue();

            const result = await Swal.fire({
                icon: 'warning',
                title: 'Ya pasó la hora de cierre',
                text: 'La caja de hoy sigue abierta. ¿Querés cerrarla ahora?',
                showCancelButton: true,
                confirmButtonColor: '#059669',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Cerrar caja',
                cancelButtonText: 'Más tarde',
            });

            if (result.isConfirmed) {
                router.put(route('cash-register.update', data.open_register_id), {
                    notes: 'Cerrada manualmente tras aviso de fin de horario.',
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({ icon: 'success', title: 'Caja cerrada correctamente.', timer: 2200, showConfirmButton: false });
                    },
                    onError: () => {
                        Swal.fire({ icon: 'error', title: 'No se pudo cerrar la caja', text: 'Intenta desde el módulo de Caja.' });
                    },
                });
            }

            promptingRef.current = false;
        } catch {
            promptingRef.current = false;
            // silencioso: un fallo de red puntual no debe interrumpir la app
        }
    }, [canClose]);

    useEffect(() => {
        if (!canClose) return;
        checkStatus();
        const interval = setInterval(checkStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [canClose, checkStatus]);

    return null;
}
