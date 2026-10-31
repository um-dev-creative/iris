/** Perfil de la persona con sesión, tal como lo devuelve el BFF (`/auth/me`): nunca incluye tokens. */
export interface User {
  id: string;
  username: string;
  /** Nombre para mostrar (nombre y apellido, o el usuario si no hay). */
  name: string;
  firstname?: string;
  lastname?: string;
  /** Solo si Backbone lo incluye en el token de sesión. */
  email?: string;
  avatarUrl?: string;
  /** Instante (ISO 8601) en que caduca la sesión. */
  expiresAt?: string;
}

export interface LoginCredentials {
  /** Correo o alias; el BFF lo acepta en el campo `email`. */
  email: string;
  password: string;
}

/** `unknown` hasta que se sabe si hay sesión (inicio, o servidor SSR); después `authenticated` o `anonymous`. */
/** Alta pública de una cuenta. El rol y la aplicación los decide el BFF, nunca el navegador. */
export interface RegistrationRequest {
  alias: string;
  email: string;
  password: string;
  person: { firstName: string; lastName: string; gender: string; birthdate: string };
  notificationEmail: boolean;
  notificationSms: boolean;
  privacyDataOutActive: boolean;
  language: 'es' | 'en';
}

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';
