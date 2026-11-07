import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AdminApplication, AdminRole, AdminUser, CreateUserRequest, UserAccess } from '../../../core/models';

/** Raíz de la administración de accesos en el BFF, que reenvía la sesión de la persona; Backbone decide si puede (403 si no). */
export const ADMIN_URL = '/bkd/api/v1/admin';

/** Usuarios y su acceso a las aplicaciones. */
@Injectable({ providedIn: 'root' })
export class UserAccessService {
  private readonly http = inject(HttpClient);

  applications(): Promise<AdminApplication[]> {
    return firstValueFrom(this.http.get<AdminApplication[]>(`${ADMIN_URL}/applications`));
  }

  users(applicationId: string): Promise<AdminUser[]> {
    return firstValueFrom(this.http.get<AdminUser[]>(`${ADMIN_URL}/applications/${encodeURIComponent(applicationId)}/users`));
  }

  roles(applicationId: string): Promise<AdminRole[]> {
    return firstValueFrom(this.http.get<AdminRole[]>(`${ADMIN_URL}/applications/${encodeURIComponent(applicationId)}/roles`));
  }

  access(userId: string): Promise<UserAccess[]> {
    return firstValueFrom(this.http.get<UserAccess[]>(`${ADMIN_URL}/users/${encodeURIComponent(userId)}/access`));
  }

  /** Da a la persona ese rol en esa aplicación (reemplaza el que tenía allí). */
  grant(userId: string, applicationId: string, roleId: string): Promise<UserAccess> {
    return firstValueFrom(
      this.http.put<UserAccess>(
        `${ADMIN_URL}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(applicationId)}/role/${encodeURIComponent(roleId)}`,
        {},
      ),
    );
  }

  revoke(userId: string, applicationId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${ADMIN_URL}/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(applicationId)}`),
    );
  }

  create(request: CreateUserRequest): Promise<unknown> {
    return firstValueFrom(this.http.post<unknown>(`${ADMIN_URL}/users`, request));
  }
}
