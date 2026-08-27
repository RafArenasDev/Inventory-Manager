import { router, usePage } from '@inertiajs/react';

import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { type SharedData } from '@/types';

/**
 * Si un admin desactiva a este mismo usuario desde otra sesión, el
 * middleware `active` ya cierra la sesión en la próxima petición — este
 * watcher evita que haya que esperar a que el usuario navegue por su
 * cuenta: al llegar el evento, se fuerza un reload inmediato de la página
 * actual, que el middleware redirige a /login con el aviso genérico.
 */
export default function UserDeactivationWatcher() {
    const { auth } = usePage<SharedData>().props;
    const userId = auth.user?.id;

    useLiveRefresh(['admin'], (payload) => {
        if (payload.model === 'User' && payload.id === userId) {
            router.reload();
        }
    });

    return null;
}
