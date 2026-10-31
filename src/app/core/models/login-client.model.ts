/** Un servicio backend autorizado a iniciar sesión en Mercury (`POST /api/v1/auth/token`). Nunca incluye contraseña ni hash. */
export interface LoginClient {
  id: string;
  /** Nombre del servicio llamante (p. ej. `smartkin-backend`), no el de una persona. */
  alias: string;
  description?: string | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Respuesta de crear un cliente o rotar su contraseña. `password` solo viene cuando Mercury la **generó**, y se
 * muestra esa única vez: después solo existe un hash.
 */
export interface LoginClientSecret {
  client: LoginClient;
  password?: string;
}

export interface CreateLoginClientRequest {
  alias: string;
  description?: string;
  /** Opcional: sin contraseña, Mercury genera una. */
  password?: string;
}

export interface UpdateLoginClientRequest {
  description?: string;
  active?: boolean;
}

/** Reglas que Mercury exige; se validan también aquí para avisar antes de enviar. */
export const LOGIN_CLIENT_ALIAS_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
export const LOGIN_CLIENT_PASSWORD_PATTERN = /^[\x21-\x7E]{12,72}$/;
export const LOGIN_CLIENT_DESCRIPTION_MAX = 200;
