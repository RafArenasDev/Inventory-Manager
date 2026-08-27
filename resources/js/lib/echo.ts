import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { csrfHeader } from '@/lib/csrf';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

// Un solo cliente Echo compartido por toda la app, inicializado una vez.
// El servidor Reverb corre en localhost — pensado para sesiones en el
// mismo equipo (varios navegadores/perfiles); una sesión abierta por túnel
// o desde otro dispositivo en la red seguirá cargando datos normalmente,
// solo sin el empuje instantáneo por WebSocket.
export const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: { name: string }) => ({
        authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
            fetch('/broadcasting/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...csrfHeader() },
                credentials: 'same-origin',
                body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
            })
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Broadcasting auth failed: ${r.status}`))))
                .then((data) => callback(null, data))
                .catch((error) => callback(error instanceof Error ? error : new Error(String(error)), null));
        },
    }),
});

window.Echo = echo;
