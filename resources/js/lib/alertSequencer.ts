// Coordina el orden de los SweetAlert "espontáneos" que pueden disparar
// varios componentes independientes casi al mismo tiempo al cargar la app
// (aviso de caja automática, resumen de stock bajo, etc.) — sin esto,
// ambos podían aparecer casi juntos, en un orden que no era el esperado.
//
// Usa sessionStorage (no un contador en memoria) a propósito: las páginas
// de esta app no usan el layout persistente de Inertia, así que cada
// navegación desmonta y vuelve a montar CashRegisterNoticeWatcher — un
// contador en memoria con un cleanup en el unmount liberaba el "pending"
// apenas el usuario cambiaba de página, aunque el aviso de caja (que espera
// 30s) nunca hubiera llegado a mostrarse. sessionStorage sobrevive esa
// navegación sin depender de que ningún componente siga montado.
const BLOCK_UNTIL_KEY = 'inventory_pos_alert_block_until';

/**
 * Reserva una ventana de tiempo (ms desde ahora) durante la cual cualquier
 * otro aviso que llame a waitForAlertQueue() debe esperar. Se llama apenas
 * se sabe que se va a mostrar un aviso con prioridad (antes de su propio
 * delay), pasando el tiempo total hasta que ese aviso termine de mostrarse
 * (delay + duración en pantalla).
 */
export function reserveAlertWindow(ms: number): void {
    try {
        const until = Date.now() + ms;
        const current = Number(sessionStorage.getItem(BLOCK_UNTIL_KEY) ?? 0);
        // No acorta una reserva ya vigente más larga (p.ej. si algo vuelve a
        // llamar esto durante la ventana ya reservada).
        if (until > current) sessionStorage.setItem(BLOCK_UNTIL_KEY, String(until));
    } catch {
        // sessionStorage no disponible (modo privado, etc.) — sin
        // coordinación entre avisos, pero no bloquea la app.
    }
}

export function waitForAlertQueue(): Promise<void> {
    return new Promise((resolve) => {
        const check = () => {
            let blockUntil = 0;
            try {
                blockUntil = Number(sessionStorage.getItem(BLOCK_UNTIL_KEY) ?? 0);
            } catch {
                resolve();
                return;
            }
            if (Date.now() >= blockUntil) {
                resolve();
            } else {
                setTimeout(check, 300);
            }
        };
        check();
    });
}
