import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StockAlertModal } from '@/components/stock-alert-modal';

type StockTier = 'advertencia' | 'critico' | 'agotado';

interface LowStockProduct {
    id: number;
    code: string;
    name: string;
    stock: number;
    tier: StockTier;
    has_active_order: boolean;
}

const POLL_INTERVAL_MS = 45000;
// Recordatorio nativo del navegador/SO mientras un producto siga
// crítico/agotado SIN pedido activo — antes eran 30 min (SweetAlert
// bloqueante), demasiado seguido; ahora es una notificación pasiva y
// bastante más espaciada.
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

export function NotificationBell() {
    const [uncoveredCount, setUncoveredCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // { [productId]: timestamp de la última notificación nativa disparada }
    const notifiedRef = useRef<Record<number, number>>(loadJSON(NOTIFIED_STATE_KEY, {}));

    useEffect(() => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const fetchAlerts = async () => {
            try {
                const res = await fetch(route('notifications.low-stock'));
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const list: LowStockProduct[] = data.products || [];

                const uncovered = list.filter((p) => p.tier !== 'advertencia' && !p.has_active_order);
                setUncoveredCount(uncovered.length);

                if ('Notification' in window && Notification.permission === 'granted' && isWithinBusinessHours()) {
                    const now = Date.now();
                    const memory = notifiedRef.current;
                    const next: Record<number, number> = {};
                    const toNotify: LowStockProduct[] = [];

                    uncovered.forEach((p) => {
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
                        const notification = new Notification(
                            hasAgotado ? 'Productos agotados' : 'Stock crítico',
                            {
                                body: toNotify.length === 1
                                    ? `${toNotify[0].name} — sin pedido activo`
                                    : `${toNotify.length} productos sin pedido activo`,
                                tag: 'inventory-pos-stock-alert',
                            }
                        );
                        notification.onclick = () => window.focus();
                    }
                }
            } catch {
                // silencioso: no bloquear la UI por un fallo de red puntual
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="group relative h-9 w-9 cursor-pointer"
                onClick={() => setIsModalOpen(true)}
            >
                <Bell className="!size-5 opacity-80 group-hover:opacity-100" />
                {uncoveredCount > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-rose-400/50"
                    >
                        {uncoveredCount > 9 ? '9+' : uncoveredCount}
                    </span>
                )}
            </Button>

            <StockAlertModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onOrderCreated={() => {
                    // El conteo real se recalcula solo en el próximo poll;
                    // esto solo baja el badge de inmediato para que se sienta
                    // instantáneo tras crear el pedido.
                    setUncoveredCount((prev) => Math.max(0, prev - 1));
                }}
            />
        </>
    );
}
