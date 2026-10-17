import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { BFF_CSRF_HEADER, BFF_CSRF_VALUE, isAuthUrl, isBffUrl } from '../config';
import { ROUTE_PATHS, routeUrl } from '../routes';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

/**
 * Autenticación de las llamadas al BFF.
 *
 * - Toda llamada al BFF (`/mrc/api/**`, `/bkd/api/**`) viaja con cookies (`withCredentials`) y la cabecera CSRF.
 * - Un 401 en un recurso, con sesión abierta, significa que la sesión expiró: se limpia el estado, se avisa
 *   **una sola vez** y se lleva al login con `returnUrl`. Varios 401 simultáneos no se repiten porque el primero
 *   deja el estado en `anonymous` y el resto ya no entra.
 * - Un 401 de `/auth/*` no cuenta: es lo esperado al fallar el login o al preguntar `/auth/me` sin sesión.
 *
 * Orden en `provideHttpClient`: `authInterceptor` primero y `httpErrorInterceptor` después, de modo que el
 * segundo (que no avisa de los 401 del BFF) ve el error antes y este lo gestiona al final.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const notifications = inject(NotificationService);

  if (!isBffUrl(req.url)) return next(req);

  const bffRequest = req.clone({ withCredentials: true, setHeaders: { [BFF_CSRF_HEADER]: BFF_CSRF_VALUE } });

  return next(bffRequest).pipe(
    catchError((error: unknown) => {
      const expired =
        error instanceof HttpErrorResponse && error.status === 401 && !isAuthUrl(req.url) && auth.isAuthenticated();
      if (expired) {
        auth.clearSession();
        notifications.warning('Tu sesión expiró', 'Inicia sesión de nuevo para continuar.');
        void router.navigate([routeUrl(ROUTE_PATHS.LOGIN)], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
