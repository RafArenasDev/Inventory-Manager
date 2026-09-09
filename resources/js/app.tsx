import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#000000FF',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Registro del service worker (ver public/sw.js) — habilita instalar la app
// (Android/desktop/iOS) y un fallback razonable sin conexión. `load` en vez
// de correrlo apenas se importa este módulo: no debe competir por ancho de
// banda con la carga inicial de la propia app.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.error('No se pudo registrar el service worker:', error);
        });
    });
}
