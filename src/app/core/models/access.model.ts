/** Una aplicación registrada en Backbone. */
export interface AdminApplication {
  id: string;
  name: string;
  codeName?: string | null;
  active?: boolean | null;
}

/** Un rol de una aplicación. */
export interface AdminRole {
  id: string;
  name: string;
  description?: string | null;
  active?: boolean | null;
}

/** Un usuario de una aplicación, como lo lista Backbone. */
export interface AdminUser {
  id: string;
  alias: string;
  displayName?: string | null;
  email?: string | null;
  active?: boolean | null;
}

/** A qué aplicación puede entrar una persona y con qué rol. */
export interface UserAccess {
  applicationId: string;
  applicationName: string;
  codeName?: string | null;
  roleId: string;
  roleName: string;
  active: boolean;
}

/** Lo que se pide para crear un usuario en su aplicación principal. */
export interface CreateUserRequest {
  alias: string;
  displayName: string;
  email: string;
  password: string;
  applicationId: string;
  roleId: string;
  person: { name: string; lastName: string; gender: string; birthdate: string };
}
