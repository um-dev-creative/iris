import { HttpErrorResponse } from '@angular/common/http';
import { serviceMessage } from '../../../core/utils/service-message';

export type CampaignAction = 'cargar' | 'crear' | 'editar' | 'pausar' | 'reanudar' | 'eliminar';

export type LoadFailure = 'forbidden' | 'unavailable' | 'failed';

/** Por qué no se pudo cargar: sin permiso (403), gestión sin configurar (503) u otra causa. */
export function loadFailure(error: unknown): LoadFailure {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (status === 403) return 'forbidden';
  if (status === 503) return 'unavailable';
  return 'failed';
}

/** Mensaje para la persona cuando Mercury rechaza una acción; nunca incluye datos de la campaña. */
export function actionErrorMessage(error: unknown, action: CampaignAction): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  switch (status) {
    case 400:
    case 422:
      return `Mercury rechazó los datos al ${action} la campaña. Revisa la plantilla, el canal y los destinatarios.`;
    case 403:
      return `No puedes ${action} esta campaña: solo quien la creó puede hacerlo, y la aplicación necesita permiso de escritura en Mercury.`;
    case 404:
      return 'La campaña ya no existe. Actualiza la lista.';
    case 409:
      return serviceMessage(error) ?? `No se pudo ${action} la campaña porque ya existe una igual.`;
    case 503:
      return 'La gestión de campañas no está configurada en este entorno.';
    default:
      return `No se pudo ${action} la campaña. Inténtalo de nuevo.`;
  }
}
