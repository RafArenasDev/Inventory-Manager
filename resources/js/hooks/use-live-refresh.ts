import { echo } from '@/lib/echo';
import { useEffect, useRef } from 'react';

interface ModelChangedPayload {
    model: string;
    action: 'created' | 'updated' | 'deleted';
    id: number;
}

// Guardar/editar un pedido (o cualquier registro con hijos, como sus ítems)
// dispara VARIOS eventos de "model.changed" casi juntos (uno por modelo
// tocado) — sin agrupar, cada uno disparaba su propio refetch en cada
// pestaña abierta, y esa ráfaga de peticiones simultáneas era justo lo que
// saturaba el pool local de PHP y devolvía 503 intermitentes. Se agrupan
// en uno solo.
const DEBOUNCE_MS = 400;

/**
 * Se suscribe a uno o más canales de dominio (p.ej. "purchase-orders") y
 * ejecuta el callback cuando cualquier otra sesión crea/edita/borra algo
 * ahí — sin importar si esta pestaña tiene el foco. Pensado para refrescos
 * silenciosos (recargar props de la página actual), no para mostrar avisos.
 * Varios eventos seguidos (p.ej. un pedido + sus ítems guardándose casi
 * juntos) se agrupan en un solo refresco.
 */
export function useLiveRefresh(channels: string[], onChange: (payload: ModelChangedPayload) => void) {
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let lastPayload: ModelChangedPayload | null = null;

        const handle = (payload: ModelChangedPayload) => {
            lastPayload = payload;
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (lastPayload) onChangeRef.current(lastPayload);
            }, DEBOUNCE_MS);
        };

        channels.forEach((name) => echo.private(name).listen('.model.changed', handle));

        return () => {
            if (timeout) clearTimeout(timeout);
            channels.forEach((name) => echo.leave(name));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channels.join(',')]);
}
