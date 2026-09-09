import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie-consent-acknowledged';

/**
 * Aviso informativo de cookies técnicas (sesión de Laravel) — no rastreo ni
 * publicidad, así que un aviso simple con "Entendido" basta (Ley 1581 no
 * exige un gestor de consentimiento granular para esto). Se recuerda por
 * navegador vía localStorage, no por usuario — no necesita backend.
 */
export default function CookieConsentBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            if (!localStorage.getItem(STORAGE_KEY)) {
                setVisible(true);
            }
        } catch {
            // Almacenamiento no disponible (modo privado, etc.) — no bloquea nada, simplemente no se muestra.
        }
    }, []);

    const handleAcknowledge = () => {
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            // Sin acceso a localStorage: el aviso volverá a aparecer la próxima vez, no es crítico.
        }
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                    <span>
                        Este sistema utiliza cookies técnicas esenciales para mantener su sesión activa de forma segura. Al continuar navegando,
                        acepta su uso.
                    </span>
                </div>
                <Button onClick={handleAcknowledge} size="sm" className="shrink-0">
                    Entendido
                </Button>
            </div>
        </div>
    );
}
