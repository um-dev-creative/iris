import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    // Retry automático 1 vez solo para errores 5xx, con delay de 1 segundo
    retry({
      count: 1,
      delay: (error: HttpErrorResponse) => {
        if (error.status >= 500) {
          return timer(1000);
        }
        return throwError(() => error);
      },
    }),
    catchError((error: HttpErrorResponse) => {
      let title = 'Error';
      let message = 'Ha ocurrido un error inesperado.';

      switch (error.status) {
        case 401:
          title = 'No autorizado';
          message = 'Tu sesión ha expirado o no tienes permisos. Por favor, inicia sesión nuevamente.';
          break;
        case 403:
          title = 'Acceso denegado';
          message = 'No tienes permisos para acceder a este recurso.';
          break;
        case 404:
          title = 'No encontrado';
          message = 'El recurso solicitado no fue encontrado.';
          break;
        case 500:
          title = 'Error del servidor';
          message = 'El servidor ha encontrado un error. Por favor, intenta de nuevo más tarde.';
          break;
        default:
          if (error.status >= 500) {
            title = 'Error del servidor';
            message = `Error ${error.status}: ${error.statusText || 'Error interno del servidor'}`;
          } else if (error.status === 0) {
            title = 'Sin conexión';
            message = 'No se pudo conectar al servidor. Verifica tu conexión a internet.';
          }
          break;
      }

      notificationService.error(title, message);
      return throwError(() => error);
    })
  );
};
