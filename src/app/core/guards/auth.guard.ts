import { CanActivateFn } from '@angular/router';

/**
 * Guard placeholder para proteger rutas.
 * En un MVP se permite todo el acceso; se puede extender con lógica de auth.
 */
export const authGuard: CanActivateFn = () => {
  // TODO: Implementar lógica de autenticación real
  return true;
};
