import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import {
  CreateLoginClientRequest,
  LoginClient,
  LoginClientSecret,
  UpdateLoginClientRequest,
} from '../../../core/models';

/**
 * Administración de los servicios backend que pueden iniciar sesión en Mercury. Habla con `/general/login-clients` del BFF,
 * que reenvía la sesión de la persona; Mercury decide con su permiso en Backbone si puede hacerlo (403 si no).
 */
@Injectable({ providedIn: 'root' })
export class LoginClientsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/general/login-clients`;

  private readonly _clients = signal<LoginClient[]>([]);
  private readonly _loading = signal(false);

  readonly clients = this._clients.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Carga la lista. Si falla, la promesa se rechaza con el `HttpErrorResponse` y la lista anterior se conserva. */
  async load(): Promise<void> {
    this._loading.set(true);
    try {
      this.replaceAll(await firstValueFrom(this.http.get<LoginClient[]>(this.url)));
    } finally {
      this._loading.set(false);
    }
  }

  /** Registra un servicio. La contraseña generada (si Mercury la generó) viene solo en esta respuesta. */
  async create(request: CreateLoginClientRequest): Promise<LoginClientSecret> {
    const created = await firstValueFrom(this.http.post<LoginClientSecret>(this.url, request));
    this.upsert(created.client);
    return created;
  }

  /** Cambia la descripción y/o enciende o apaga el servicio. */
  async update(id: string, request: UpdateLoginClientRequest): Promise<LoginClient> {
    const updated = await firstValueFrom(this.http.put<LoginClient>(`${this.url}/${encodeURIComponent(id)}`, request));
    this.upsert(updated);
    return updated;
  }

  /** Cambia la contraseña (la genera Mercury si no se da una) y reactiva el servicio. */
  async rotatePassword(id: string, password?: string): Promise<LoginClientSecret> {
    const body = password ? { password } : {};
    const rotated = await firstValueFrom(
      this.http.put<LoginClientSecret>(`${this.url}/${encodeURIComponent(id)}/password`, body),
    );
    this.upsert(rotated.client);
    return rotated;
  }

  /** Borra el servicio. */
  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`));
    this._clients.update((list) => list.filter((client) => client.id !== id));
  }

  private upsert(client: LoginClient): void {
    this.replaceAll([...this._clients().filter((existing) => existing.id !== client.id), client]);
  }

  private replaceAll(clients: LoginClient[]): void {
    this._clients.set([...clients].sort((a, b) => a.alias.localeCompare(b.alias, undefined, { sensitivity: 'base' })));
  }
}
