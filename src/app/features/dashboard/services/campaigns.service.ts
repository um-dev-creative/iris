import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import {
  Campaign,
  CampaignProgress,
  ChannelType,
  CreateCampaignRequest,
  CreatedCampaign,
  UpdateCampaignRequest,
} from '../../../core/models';

/**
 * Gestión de campañas de Mercury a través de `/campaigns` del BFF, que agrega las credenciales de la aplicación y fija la
 * aplicación. Mercury decide quién puede cambiar qué: solo quien creó la campaña puede editarla, pausarla o eliminarla (403).
 */
@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/campaigns`;

  private readonly _campaigns = signal<Campaign[]>([]);
  private readonly _loading = signal(false);

  readonly campaigns = this._campaigns.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Carga la lista (las más recientes primero). Si falla, se rechaza y la lista anterior se conserva. */
  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const list = await firstValueFrom(this.http.get<Campaign[]>(this.url));
      this._campaigns.set([...list].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))));
    } finally {
      this._loading.set(false);
    }
  }

  get(id: string): Promise<Campaign> {
    return firstValueFrom(this.http.get<Campaign>(this.item(id)));
  }

  progress(id: string): Promise<CampaignProgress> {
    return firstValueFrom(this.http.get<CampaignProgress>(`${this.item(id)}/progress`));
  }

  channelTypes(): Promise<ChannelType[]> {
    return firstValueFrom(this.http.get<ChannelType[]>(`${this.url}/channel-types`));
  }

  create(request: CreateCampaignRequest): Promise<CreatedCampaign> {
    return firstValueFrom(this.http.post<CreatedCampaign>(this.url, request));
  }

  async update(id: string, request: UpdateCampaignRequest): Promise<Campaign> {
    const updated = await firstValueFrom(this.http.put<Campaign>(this.item(id), request));
    this.replace(updated);
    return updated;
  }

  /** Pausa (`false`) o reanuda (`true`). Actualiza la fila de la lista sin volver a pedirla. */
  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${this.item(id)}/toggle`, null, { params: { enabled } }));
    this._campaigns.update((list) => list.map((c) => (c.id === id ? { ...c, enabled } : c)));
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.item(id)));
    this._campaigns.update((list) => list.filter((c) => c.id !== id));
  }

  private item(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }

  private replace(campaign: Campaign): void {
    this._campaigns.update((list) => list.map((c) => (c.id === campaign.id ? { ...c, ...campaign } : c)));
  }
}
