/**
 * Formato de fecha/hora ÚNICO para toda la app — antes cada tabla lo hacía a
 * su manera (una en el backend con PHP, otra en el frontend con Intl), y
 * terminaban viéndose distinto (AM/PM en mayúscula vs "a. m." en minúscula).
 * Todo pasa por acá para que sea imposible que se desincronicen de nuevo.
 */

export function formatDate(value: string | null | undefined): string {
    if (!value) return '-';

    // "YYYY-MM-DD" puro (columnas DATE, sin hora) no se manda a `Date`: JS lo
    // interpreta como medianoche UTC, y en zonas horarias detrás de UTC
    // (como Colombia) eso muestra el día anterior. Se arma el string a mano.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(value: string | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '-';

    return `${formatDate(value)} - ${formatTime(value)}`;
}
