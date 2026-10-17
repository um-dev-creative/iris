/**
 * Segmentos de ruta de la aplicación. Es la única fuente de las rutas: el router, el sidebar y cualquier
 * `navigate` las toman de aquí; para una URL absoluta se usa `routeUrl()`.
 */
export const ROUTE_PATHS = {
  ROOT: '',
  DASHBOARD: 'dashboard',
  DATA: 'data',
  SETTINGS: 'settings',
  SHOWCASE: 'showcase',
  /** Página pública de acceso, fuera del layout del dashboard. */
  LOGIN: 'login',
  WILDCARD: '**',
} as const;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

/**
 * URL absoluta a partir de segmentos de `ROUTE_PATHS`; los segmentos vacíos se ignoran.
 * @example routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.DATA) // '/dashboard/data'
 * @example routeUrl() // '/'
 */
export function routeUrl(...segments: readonly string[]): string {
  return `/${segments.filter((segment) => segment !== '').join('/')}`;
}
