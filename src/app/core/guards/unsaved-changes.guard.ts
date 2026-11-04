import { CanDeactivateFn } from '@angular/router';

/** Una página que sabe si el usuario tiene cambios sin guardar. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const UNSAVED_CHANGES_MESSAGE = 'Tienes cambios sin guardar. ¿Salir sin guardarlos?';

/** Pregunta antes de salir de una página con cambios sin guardar. Sin cambios, deja pasar sin preguntar. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || typeof window === 'undefined' || window.confirm(UNSAVED_CHANGES_MESSAGE);
