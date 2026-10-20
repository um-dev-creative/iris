import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROUTE_PATHS, routeUrl } from '../routes';

/**
 * Protege las rutas del dashboard: espera a saber si hay sesión y, si no la hay, redirige a
 * `/login?returnUrl=<ruta pedida>`. En el servidor (SSR) deja renderizar y la decisión la toma el navegador,
 * donde sí existen las cookies de sesión.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  // todo `inject` va antes del primer `await`: después ya no hay contexto de inyección
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!isBrowser) return true;

  if (auth.status() === 'unknown') await auth.restoreSession();

  return auth.isAuthenticated()
    ? true
    : router.createUrlTree([routeUrl(ROUTE_PATHS.LOGIN)], { queryParams: { returnUrl: state.url } });
};
