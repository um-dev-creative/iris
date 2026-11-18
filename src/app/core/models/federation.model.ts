/** Un proveedor que Iris ofrece en la pantalla de acceso (Google, Microsoft, Apple, GitHub, Meta). */
export interface FederationProvider {
  provider: string;
  displayName: string;
}

/** Una cuenta externa enlazada al usuario. */
export interface LinkedIdentity {
  id: string;
  provider: string;
  email?: string | null;
  displayName?: string | null;
  linkedAt?: string | null;
  lastLoginAt?: string | null;
}

/**
 * Códigos que el BFF pone en `/login?error=` (o `?linkError=`): cada uno se muestra con su mensaje y ninguno repite texto
 * del proveedor ni revela si una cuenta existe más de lo necesario.
 */
export const FEDERATION_MESSAGES: Readonly<Record<string, string>> = {
  denied: 'Cancelaste el inicio de sesión con el proveedor.',
  expired: 'El inicio de sesión expiró o no es válido. Inténtalo de nuevo.',
  failed: 'No pudimos verificar tu cuenta con el proveedor.',
  not_registered: 'Tu cuenta no está registrada en Iris. Pide acceso a un administrador.',
  not_allowed: 'Esta cuenta no tiene permiso para entrar.',
  not_linked: 'Esta cuenta aún no está enlazada: entra con tu contraseña y enlázala desde «Mi cuenta».',
  conflict: 'Esa cuenta ya está enlazada a otro usuario.',
  unavailable: 'El servicio no está disponible. Inténtalo de nuevo en unos minutos.',
  rate_limited: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
};

/** @returns el mensaje del código, o el de «falló» si el código no se conoce; `null` si no hay código */
export function federationMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return FEDERATION_MESSAGES[code] ?? FEDERATION_MESSAGES['failed'];
}
