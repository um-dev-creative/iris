import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config';
import { FederationProvider, LinkedIdentity } from '../models';

/**
 * Acceso con proveedores sociales a través de backbone. Todo pasa por el BFF (`/auth/federation/*`): aquí solo se
 * pide la lista de proveedores, se navega al inicio del flujo y se administran las cuentas enlazadas. Ningún token ni
 * `state` pasa por el navegador de Angular: el BFF guarda el estado en una cookie httpOnly.
 */
@Injectable({ providedIn: 'root' })
export class FederationService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly baseUrl = `${inject(API_BASE_URL)}/auth/federation`;

  private readonly _providers = signal<FederationProvider[]>([]);
  private readonly _identities = signal<LinkedIdentity[]>([]);
  private readonly _loading = signal(false);

  /** Proveedores ofrecidos; vacío si la función está apagada o el servicio no responde. */
  readonly providers = this._providers.asReadonly();
  /** Cuentas enlazadas del usuario en sesión. */
  readonly identities = this._identities.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Pide los proveedores. En el servidor (SSR) no hace nada. Un fallo deja la lista vacía: el acceso por contraseña sigue. */
  async loadProviders(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const response = await firstValueFrom(
        this.http.get<{ enabled: boolean; providers: FederationProvider[] }>(`${this.baseUrl}/providers`),
      );
      this._providers.set(response.enabled ? (response.providers ?? []) : []);
    } catch {
      this._providers.set([]);
    }
  }

  /** Navega (página completa, no XHR) al inicio del flujo: el BFF redirige al proveedor. */
  signIn(provider: string, returnUrl: string): void {
    this.document.location.assign(`${this.baseUrl}/${encodeURIComponent(provider)}/start?returnTo=${encodeURIComponent(returnUrl)}`);
  }

  /** Carga las cuentas enlazadas; si falla, la lista queda vacía y la promesa se rechaza para que la página avise. */
  async loadIdentities(): Promise<void> {
    this._loading.set(true);
    try {
      const response = await firstValueFrom(this.http.get<{ identities: LinkedIdentity[] }>(`${this.baseUrl}/identities`));
      this._identities.set(response.identities ?? []);
    } catch (error) {
      this._identities.set([]);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  /** Empieza a enlazar otro proveedor: el BFF devuelve la URL del proveedor y el navegador va allí. */
  async link(provider: string, returnUrl: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<{ authorizationUrl: string }>(`${this.baseUrl}/${encodeURIComponent(provider)}/link`, { returnTo: returnUrl }),
    );
    this.document.location.assign(response.authorizationUrl);
  }

  /** Quita un enlace y recarga la lista. */
  async unlink(identityId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/identities/${encodeURIComponent(identityId)}`));
    await this.loadIdentities();
  }
}
