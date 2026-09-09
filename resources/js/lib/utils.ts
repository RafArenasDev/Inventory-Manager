import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

/**
 * Escapa un valor antes de interpolarlo en un `html:` de SweetAlert2 (o
 * cualquier otro string que se renderice como HTML). Sin esto, un nombre de
 * cliente/producto/proveedor/etc. con `<img onerror=...>` se ejecuta como
 * script real en el navegador de quien vea la confirmación.
 */
export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
