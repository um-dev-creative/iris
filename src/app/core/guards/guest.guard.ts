import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ROUTE_PATHS, routeUrl } from '../routes';

/** Rutas solo para visitantes (`/login`): quien ya tiene sesión va directo al dashboard. */
export const guestGuard: CanActivateFn = async () => {
  // todo `inject` va antes del primer `await`: después ya no hay contexto de inyección
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!isBrowser) return true;

  if (auth.status() === 'unknown') await auth.restoreSession();

  return auth.isAuthenticated() ? router.createUrlTree([routeUrl(ROUTE_PATHS.DASHBOARD)]) : true;
};
