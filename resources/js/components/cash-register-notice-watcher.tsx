import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

import { reserveAlertWindow } from '@/lib/alertSequencer';
import Swal from '@/lib/swal';

const DELAY_MS = 30000;
const SWAL_TIMER_MS = 3500;
const STATE_KEY = 'inventory_pos_cash_register_notice_state';

interface NoticeState {
    message: string;
    scheduledAt: number;
    shown: boolean;
}

function loadState(): NoticeState | null {
    try {
        const raw = sessionStorage.getItem(STATE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveState(state: NoticeState) {
    try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
        // sessionStorage no disponible — el aviso igual se muestra en esta
        // pestaña, solo no sobrevive una navegación a mitad del delay.
    }
}

/**
 * Cuando el login abre la caja del día sola (dentro del horario comercial),
 * el aviso no aparece de inmediato — se espera 30 segundos para no
 * interrumpir apenas se aterriza en el dashboard, tal como se pidió.
 *
 * El estado del "cuándo mostrar" vive en sessionStorage (no en un timer
 * atado al ciclo de vida del componente): las páginas de esta app no usan
 * el layout persistente de Inertia, así que cada navegación desmonta este
 * componente — con un setTimeout normal, navegar antes de los 30s cancelaba
 * el aviso para siempre y liberaba el turno del aviso de stock bajo sin que
 * el de caja llegara a mostrarse nunca.
 */
export default function CashRegisterNoticeWatcher() {
    const { flash } = usePage().props as unknown as { flash?: { cash_register_notice?: string | null } };

    useEffect(() => {
        const flashMessage = flash?.cash_register_notice;

        // Inertia solo manda el flash UNA vez (en la respuesta del login) —
        // en cualquier página siguiente flashMessage viene vacío, así que
        // acá también hay que retomar lo que ya haya quedado guardado en
        // sessionStorage de un mount anterior, no solo reaccionar al flash.
        let state = loadState();
        if (flashMessage && (!state || state.message !== flashMessage)) {
            state = { message: flashMessage, scheduledAt: Date.now() + DELAY_MS, shown: false };
            saveState(state);
        }

        if (!state || state.shown) return;
        const { message, scheduledAt } = state;

        // Reserva hasta el momento en que el Swal debería terminar de
        // mostrarse — así cualquier otro aviso (p.ej. stock bajo) que
        // llame a waitForAlertQueue() espera, sin importar si este
        // componente sigue montado cuando eso pasa.
        reserveAlertWindow(Math.max(0, scheduledAt - Date.now()) + SWAL_TIMER_MS + 500);

        const remaining = Math.max(0, scheduledAt - Date.now());
        const timer = setTimeout(() => {
            Swal.fire({
                title: 'Caja abierta automáticamente',
                text: message,
                icon: 'success',
                showConfirmButton: false,
                timer: SWAL_TIMER_MS,
            }).then(() => {
                saveState({ message, scheduledAt, shown: true });
            });
        }, remaining);

        return () => clearTimeout(timer);
    }, [flash?.cash_register_notice]);

    return null;
}
