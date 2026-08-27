import { StockAlertModal } from '@/components/stock-alert-modal';
import { Button } from '@/components/ui/button';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { waitForAlertQueue } from '@/lib/alertSequencer';
import { playAlertBeep } from '@/lib/sound';
import Swal from '@/lib/swal';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type StockTier = 'advertencia' | 'critico' | 'agotado';

interface AlertProduct {
    id: number;
    code: string;
    name: string;
    stock: number;
    tier: StockTier;
    has_active_order: boolean;
}

interface SupplierGroup {
    supplier: { id: number; name: string; phone: string | null } | null;
    products: AlertProduct[];
}

const POLL_INTERVAL_MS = 45000;
// Cada cuánto se repite el aviso (SweetAlert con timer + notificación
// nativa) mientras un producto siga crítico/agotado sin pedido activo —
// por producto, así que se resetea si se resuelve y vuelve a bajar.
const REMINDER_INTERVAL_MS = 2 * 60 * 60 * 1000;
const BUSINESS_OPEN = '08:00';
const BUSINESS_CLOSE = '18:30';

const NOTIFIED_STATE_KEY = 'inventory_pos_stock_notified_v1';

function isWithinBusinessHours(): boolean {
    const now = new Date().toTimeString().slice(0, 5);
    return now >= BUSINESS_OPEN && now <= BUSINESS_CLOSE;
}

function loadJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(key: string, value: unknown) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // localStorage no disponible (modo privado, etc.) — no es crítico
    }
}

// Para notificaciones nativas / SweetAlert: solo lo crítico o agotado sin
// pedido activo interrumpe de verdad — "bajo" (advertencia) no dispara
// avisos, solo cambia el color de la campana (ver bellState más abajo).
const isRelevant = (p: AlertProduct) => p.tier !== 'advertencia';

// Color de la campana = severidad más alta presente en TODO el stock bajo,
// sin importar si ya tiene pedido activo o no (eso lo resuelve el modal de
// alertas con sus pestañas Alertas/Resumen): rojo si hay algo crítico o
// agotado, amarillo si lo único que hay es "bajo", neutro si no hay nada.
type BellState = 'critical' | 'warning' | 'clear';

export function NotificationBell() {
    const [supplierCount, setSupplierCount] = useState(0);
    const [bellState, setBellState] = useState<BellState>('clear');
    const [isModalOpen, setIsModalOpen] = useState(false);
    // { [productId]: timestamp de la última notificación nativa disparada }
    const notifiedRef = useRef<Record<number, number>>(loadJSON(NOTIFIED_STATE_KEY, {}));

    // Chrome exige un gesto real del usuario para mostrar el diálogo de
    // permiso de notificaciones — pedirlo de entrada (al montar, sin clic)
    // lo deja atascado en "default" para siempre, sin error ni aviso (Brave
    // es más laxo y sí lo mostraba). Se pide en la primera interacción real
    // con la página, una sola vez.
    useEffect(() => {
        if (!('Notification' in window) || Notification.permission !== 'default') return;

        const requestOnce = () => {
            Notification.requestPermission();
            document.removeEventListener('click', requestOnce);
            document.removeEventListener('keydown', requestOnce);
        };

        document.addEventListener('click', requestOnce, { once: true });
        document.addEventListener('keydown', requestOnce, { once: true });

        return () => {
            document.removeEventListener('click', requestOnce);
            document.removeEventListener('keydown', requestOnce);
        };
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch(route('notifications.low-stock-by-provider'));
            if (!res.ok) return;
            const data = await res.json();
            const groups: SupplierGroup[] = data.groups || [];

            const uncoveredGroups = groups.filter((g) => g.products.some((p) => isRelevant(p) && !p.has_active_order));
            const uncoveredProducts = uncoveredGroups.flatMap((g) => g.products.filter((p) => isRelevant(p) && !p.has_active_order));

            const criticalGroups = groups.filter((g) => g.products.some((p) => p.tier === 'critico' || p.tier === 'agotado'));
            const warningGroups = groups.filter((g) => g.products.some((p) => p.tier === 'advertencia'));

            if (criticalGroups.length > 0) {
                setBellState('critical');
                setSupplierCount(criticalGroups.length);
            } else if (warningGroups.length > 0) {
                setBellState('warning');
                setSupplierCount(warningGroups.length);
            } else {
                setBellState('clear');
                setSupplierCount(0);
            }

            // Throttle por producto: cada uno vuelve a "elegible" recién
            // a las 2h de su último aviso — mismo ciclo para el
            // SweetAlert de resumen y para la notificación nativa, así
            // que ambos se repiten juntos mientras la alerta siga activa
            // (no solo la primera vez del día).
            const now = Date.now();
            const memory = notifiedRef.current;
            const next: Record<number, number> = {};
            const toNotify: AlertProduct[] = [];

            uncoveredProducts.forEach((p) => {
                const lastNotified = memory[p.id];
                if (!lastNotified || now - lastNotified >= REMINDER_INTERVAL_MS) {
                    toNotify.push(p);
                    next[p.id] = now;
                } else {
                    next[p.id] = lastNotified;
                }
            });
            // Los que ya no están bajos (se resolvieron o ya tienen
            // pedido) se sueltan: si vuelven a bajar más adelante, se
            // tratan como una alerta nueva.
            notifiedRef.current = next;
            saveJSON(NOTIFIED_STATE_KEY, next);

            if (toNotify.length > 0) {
                const hasAgotado = toNotify.some((p) => p.tier === 'agotado');

                if ('Notification' in window && Notification.permission === 'granted' && isWithinBusinessHours()) {
                    const notification = new Notification(hasAgotado ? 'Productos agotados' : 'Stock crítico', {
                        body: toNotify.length === 1 ? `${toNotify[0].name} — sin pedido activo` : `${toNotify.length} productos sin pedido activo`,
                        tag: 'inventory-pos-stock-alert',
                    });
                    notification.onclick = () => window.focus();
                }

                // Espera a que termine cualquier aviso con prioridad
                // (p.ej. el de caja automática) antes de mostrar el
                // resumen de stock, para que no aparezcan casi juntos.
                waitForAlertQueue().then(() => {
                    playAlertBeep();
                    Swal.fire({
                        icon: 'warning',
                        title: hasAgotado ? 'Hay productos agotados' : 'Hay stock crítico',
                        text: `${uncoveredProducts.length} producto${uncoveredProducts.length === 1 ? '' : 's'} con stock bajo en ${uncoveredGroups.length} proveedor${uncoveredGroups.length === 1 ? '' : 'es'}, sin pedido activo.`,
                        timer: 8000,
                        timerProgressBar: true,
                        confirmButtonColor: '#059669',
                        confirmButtonText: 'Ver alertas',
                    }).then((result) => {
                        if (result.isConfirmed) setIsModalOpen(true);
                    });
                });
            }
        } catch {
            // silencioso: no bloquear la UI por un fallo de red puntual
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
        // Al volver a esta pestaña (p.ej. después de estar en la sesión de
        // otro usuario) se refresca al toque, sin esperar al próximo poll —
        // sin esto, dos sesiones abiertas a la vez se veían desincronizadas
        // hasta que tocara refrescar a mano.
        window.addEventListener('focus', fetchAlerts);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', fetchAlerts);
        };
    }, [fetchAlerts]);

    // Un pedido creado/recibido en cualquier sesión cambia el panorama de
    // stock — refresca la campana al instante en todas las demás.
    useLiveRefresh(['purchase-orders'], fetchAlerts);

    const bellIconClass =
        bellState === 'critical'
            ? '!size-5 animate-pulse fill-rose-600 text-rose-600 drop-shadow-[0_0_6px_rgba(244,63,94,0.9)]'
            : bellState === 'warning'
              ? '!size-5 fill-amber-500 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.85)]'
              : // Sin alertas: color neutro que sigue el tema (claro/oscuro)
                // en vez de un tono fijo — mismo token que el resto de la UI
                // usa para texto secundario.
                '!size-5 text-muted-foreground opacity-80 group-hover:opacity-100';

    const badgeClass = bellState === 'critical' ? 'bg-rose-600 ring-rose-400/50' : 'bg-amber-500 ring-amber-300/50';

    return (
        <>
            <Button variant="ghost" size="icon" className="group relative h-9 w-9 cursor-pointer" onClick={() => setIsModalOpen(true)}>
                <Bell className={bellIconClass} />
                {bellState !== 'clear' && supplierCount > 0 && (
                    <span
                        className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ${badgeClass}`}
                    >
                        {supplierCount > 9 ? '9+' : supplierCount}
                    </span>
                )}
            </Button>

            <StockAlertModal open={isModalOpen} onOpenChange={setIsModalOpen} onOrderCreated={fetchAlerts} />
        </>
    );
}
