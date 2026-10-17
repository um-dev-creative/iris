import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config';
import { AuthStatus, LoginCredentials, User } from '../models';

interface SessionResponse {
  authenticated: boolean;
  user?: User;
}

/**
 * Estado de autenticación de la aplicación. La sesión vive en cookies httpOnly que gestiona el BFF: aquí solo se
 * guarda quién es la persona (nunca tokens) y si hay sesión. Las cookies y la cabecera CSRF las agrega
 * `authInterceptor` a toda llamada al BFF.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${inject(API_BASE_URL)}/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _user = signal<User | null>(null);
  private readonly _status = signal<AuthStatus>('unknown');
  private restoring: Promise<void> | null = null;

  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  /**
   * Inicia sesión. Si las credenciales son inválidas o el BFF falla, la promesa se rechaza con el `HttpErrorResponse`
   * y el estado no cambia.
   */
  async login(credentials: LoginCredentials): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<SessionResponse>(`${this.authUrl}/access-token`, credentials),
    );
    this.setSession(response.user);
  }

  /** Cierra la sesión. El estado local pasa a `anonymous` aunque el BFF falle: nunca se queda a medias. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.authUrl}/logout`, {}));
    } catch {
      // el BFF borra las cookies de todos modos en su siguiente respuesta; localmente la sesión ya terminó
    } finally {
      this.clearSession();
    }
  }

  /**
   * Averigua si el navegador ya tiene una sesión válida (al recargar la página). En el servidor (SSR) no hace nada:
   * el estado queda en `unknown`. Las llamadas simultáneas comparten una sola petición.
   */
  restoreSession(): Promise<void> {
    if (!this.isBrowser) return Promise.resolve();
    this.restoring ??= this.fetchSession().finally(() => (this.restoring = null));
    return this.restoring;
  }

  /** Marca la sesión como terminada sin llamar al BFF (p. ej. cuando una petición recibe 401). */
  clearSession(): void {
    this._user.set(null);
    this._status.set('anonymous');
  }

  private async fetchSession(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>(`${this.authUrl}/me`));
      this.setSession(response.user);
    } catch {
      // 401 (sin sesión) o BFF inaccesible: se trata como anónimo y el guard llevará al login
      this.clearSession();
    }
  }

  private setSession(user: User | undefined): void {
    if (!user) {
      this.clearSession();
      return;
    }
    this._user.set(user);
    this._status.set('authenticated');
  }
}
