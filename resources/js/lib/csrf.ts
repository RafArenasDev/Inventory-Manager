// La app no tiene <meta name="csrf-token"> en el layout (Inertia maneja el
// CSRF de sus propios visits internamente), así que para fetch() manuales
// se usa la cookie XSRF-TOKEN que Laravel ya setea en cada respuesta —
// mismo mecanismo que usa axios por defecto (xsrfCookieName/xsrfHeaderName).
export function csrfHeader(): Record<string, string> {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    if (!match) return {};
    return { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) };
}
