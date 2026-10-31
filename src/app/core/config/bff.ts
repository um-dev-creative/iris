/** Cabecera que el BFF exige en toda llamada que cambia estado (anti-CSRF). */
export const BFF_CSRF_HEADER = 'x-iris-csrf';
export const BFF_CSRF_VALUE = '1';

/** Prefijos de las APIs que sirve el BFF (Mercury y Backbone detrás de él). */
const BFF_API_PREFIXES = ['/mrc/api/', '/bkd/api/'];

/** `true` si la URL es una llamada al BFF: las únicas que llevan cookies de sesión y la cabecera CSRF. */
export function isBffUrl(url: string): boolean {
  return BFF_API_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/** `true` para `/auth/*`: ahí un 401 es una respuesta esperada (credenciales malas, o aún no hay sesión). */
export function isAuthUrl(url: string): boolean {
  return /^\/(?:mrc|bkd)\/api\/[^/]+\/auth\//.test(url);
}
