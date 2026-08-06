import { useEffect, useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Swal from '@/lib/swal';

type StockTier = 'advertencia' | 'critico' | 'agotado';

interface LowStockProduct {
    id: number;
    code: string;
    name: string;
    stock: number;
    tier: StockTier;
}

const TIER_STYLES: Record<StockTier, { badge: string; label: (stock: number) => string }> = {
    advertencia: { badge: 'bg-amber-500 text-white', label: (stock) => `Stock: ${stock}` },
    critico: { badge: 'bg-red-500 text-white', label: (stock) => `Stock: ${stock}` },
    agotado: { badge: 'bg-red-700 text-white', label: () => 'Agotado' },
};

// Solo "crítico" y "agotado" disparan la alerta emergente; "advertencia" se
// queda pasiva en la lista de la campana para no saturar con avisos poco urgentes.
const TIER_SEVERITY: Record<StockTier, number> = { advertencia: 0, critico: 1, agotado: 2 };
const ALERT_MIN_SEVERITY = TIER_SEVERITY.critico;

const SEEN_KEY = 'inventory_pos_seen_low_stock_ids';
const ALERT_STATE_KEY = 'inventory_pos_alert_state_v1';
const POLL_INTERVAL_MS = 45000;
// Recordatorio: mientras un producto siga crítico/agotado sin que un
// movimiento nuevo cambie su stock, se vuelve a alertar cada 30 minutos.
const REPEAT_INTERVAL_MS = 30 * 60 * 1000;

interface AlertMemory {
    stock: number;
    lastAlertedAt: number;
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

function loadSeenIds(): Set<number> {
    return new Set(loadJSON<number[]>(SEEN_KEY, []));
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function NotificationBell() {
    const [products, setProducts] = useState<LowStockProduct[]>([]);
    const [total, setTotal] = useState(0);
    const [unseenCount, setUnseenCount] = useState(0);
    const seenIdsRef = useRef<Set<number>>(loadSeenIds());
    // Se persiste en localStorage (no solo en memoria) porque Inertia remonta
    // este componente en cada navegación entre páginas — sin esto, el "cada
    // 30 minutos" se reiniciaría cada vez que el usuario cambia de módulo.
    const alertMemoryRef = useRef<Record<number, AlertMemory>>(loadJSON(ALERT_STATE_KEY, {}));

    useEffect(() => {
        let cancelled = false;

        const fetchAlerts = async () => {
            try {
                const res = await fetch(route('notifications.low-stock'));
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const list: LowStockProduct[] = data.products || [];

                const memory = alertMemoryRef.current;
                const nextMemory: Record<number, AlertMemory> = {};
                const now = Date.now();
                const toAlert: LowStockProduct[] = [];

                list.forEach((p) => {
                    if (TIER_SEVERITY[p.tier] < ALERT_MIN_SEVERITY) return;

                    const prev = memory[p.id];
                    const stockChanged = !prev || prev.stock !== p.stock;
                    const dueForReminder = !!prev && !stockChanged && now - prev.lastAlertedAt >= REPEAT_INTERVAL_MS;

                    if (stockChanged || dueForReminder) {
                        toAlert.push(p);
                        nextMemory[p.id] = { stock: p.stock, lastAlertedAt: now };
                    } else {
                        nextMemory[p.id] = prev;
                    }
                });
                // Los productos que ya no están en la lista (se resolvieron) se
                // descartan al no copiarse a nextMemory: si vuelven a bajar de
                // stock más adelante, se tratan como una alerta nueva.
                alertMemoryRef.current = nextMemory;
                saveJSON(ALERT_STATE_KEY, nextMemory);

                if (toAlert.length > 0) {
                    const hasAgotado = toAlert.some((p) => p.tier === 'agotado');
                    const items = toAlert
                        .map(
                            (p) =>
                                `<li style="margin-bottom:4px;"><strong>${escapeHtml(p.name)}</strong> ` +
                                `<span style="opacity:.7">(${escapeHtml(p.code)})</span> — ${TIER_STYLES[p.tier].label(p.stock)}</li>`
                        )
                        .join('');

                    Swal.fire({
                        icon: hasAgotado ? 'error' : 'warning',
                        title: hasAgotado ? 'Productos agotados' : 'Stock crítico',
                        html: `<ul style="text-align:left;max-height:240px;overflow-y:auto;padding-left:1.2em;margin:0;">${items}</ul>`,
                        confirmButtonText: 'Entendido',
                    });
                }

                setProducts(list);
                setTotal(data.total || 0);
                setUnseenCount(list.filter((p) => !seenIdsRef.current.has(p.id)).length);
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

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen && products.length > 0) {
            const next = new Set(seenIdsRef.current);
            products.forEach((p) => next.add(p.id));
            seenIdsRef.current = next;
            saveJSON(SEEN_KEY, [...next]);
            setUnseenCount(0);
        }
    };

    return (
        <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="group relative h-9 w-9 cursor-pointer">
                    <Bell className="!size-5 opacity-80 group-hover:opacity-100" />
                    {total > 0 && (
                        <span
                            className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ${
                                unseenCount > 0 ? 'animate-pulse' : ''
                            }`}
                        >
                            {total > 9 ? '9+' : total}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-800">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Alertas de Inventario</span>
                    {total > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {total} producto{total !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {products.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                            Sin alertas de stock bajo
                        </div>
                    ) : (
                        products.map((p) => (
                            <Link
                                key={p.id}
                                href={route('products.index', { search: p.code })}
                                className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.code}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_STYLES[p.tier].badge}`}>
                                    {TIER_STYLES[p.tier].label(p.stock)}
                                </span>
                            </Link>
                        ))
                    )}
                </div>
                {total > products.length && (
                    <Link
                        href={route('products.index', { stock_filter: 'low_stock' })}
                        className="block border-t border-gray-200 px-3 py-2 text-center text-xs font-medium text-blue-600 hover:underline dark:border-gray-800 dark:text-blue-400"
                    >
                        Ver todos ({total})
                    </Link>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
