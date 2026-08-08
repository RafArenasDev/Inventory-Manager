import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

import Swal from '@/lib/swal';

/**
 * Cuando el login abre la caja del día sola (dentro del horario comercial),
 * el aviso no aparece de inmediato — se espera 30 segundos para no
 * interrumpir apenas se aterriza en el dashboard, tal como se pidió.
 */
export default function CashRegisterNoticeWatcher() {
    const { flash } = usePage().props as unknown as { flash?: { cash_register_notice?: string | null } };
    const lastShown = useRef<string | null>(null);

    useEffect(() => {
        const message = flash?.cash_register_notice;
        if (!message || message === lastShown.current) return;

        lastShown.current = message;

        const timer = setTimeout(() => {
            Swal.fire({
                title: 'Caja abierta automáticamente',
                text: message,
                icon: 'info',
                confirmButtonText: 'Entendido',
            });
        }, 30000);

        return () => clearTimeout(timer);
    }, [flash?.cash_register_notice]);

    return null;
}
