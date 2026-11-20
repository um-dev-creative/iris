import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import {
  ApplicationSummary,
  TemplateContent,
  TemplateInput,
  TemplatePreviewResult,
  TemplateSearchParams,
  TemplateSearchResult,
  TemplateSummary,
  TemplateVersion,
} from '../../../core/models';

/** Lo último que se supo de una plantilla: sus datos, su contenido y los parámetros de ejemplo que la persona escribió. */
export interface TemplateSnapshot { summary: TemplateSummary; content: TemplateContent; samples: string | null }

/** Cuánto vale una vista previa guardada: lo bastante para no repetirla al volver a la misma plantilla, poco para no quedar vieja. */
const PREVIEW_TTL_MS = 60_000;
const PREVIEW_CACHE_SIZE = 20;
/** Cuánto tiempo una plantilla cuenta como «recién guardada» en la lista. */
const RECENT_MS = 120_000;

/**
 * Plantillas de Mercury a través de `/templates` del BFF, que agrega las credenciales de la aplicación y fija la aplicación.
 * El contenido se guarda con bloqueo optimista: `saveContent` envía la huella leída y Mercury responde 412 si alguien guardó antes.
 *
 * Recuerda en memoria (solo durante la sesión de la pestaña) lo último que leyó o guardó: así, al guardar una plantilla nueva y
 * abrirla, o al volver a la lista, la pantalla se dibuja al instante con esos datos y se confirma con el servidor en segundo plano.
 * Nada de esto sustituye al servidor: cada página vuelve a pedir los datos, y el guardado sigue usando la huella (412 si cambió).
 */
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/templates`;

  private readonly summaries = new Map<string, TemplateSummary>();
  private readonly contents = new Map<string, TemplateContent>();
  private readonly samples = new Map<string, string>();
  private readonly searches = new Map<string, TemplateSearchResult>();
  private readonly previews = new Map<string, { at: number; result: TemplatePreviewResult }>();
  private applicationsRequest: Promise<ApplicationSummary[]> | null = null;
  private readonly lastSaved = signal<{ id: string; at: number } | null>(null);

  /** Las aplicaciones de Backbone; cada una tiene sus propias plantillas (su carpeta en Mercury). Se piden una vez por sesión. */
  applications(): Promise<ApplicationSummary[]> {
    this.applicationsRequest ??= firstValueFrom(this.http.get<ApplicationSummary[]>(`${this.url}/applications`)).catch((error: unknown) => {
      this.applicationsRequest = null;
      throw error;
    });
    return this.applicationsRequest;
  }

  /** Lista las plantillas de `filters.applicationId`; sin ella, las de la aplicación que el BFF tiene configurada. */
  async search(filters: TemplateSearchParams = {}): Promise<TemplateSearchResult> {
    const { applicationId, ...rest } = filters;
    let params = new HttpParams();
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    const result = await firstValueFrom(this.http.get<TemplateSearchResult>(this.scope(applicationId), { params }));
    this.searches.set(searchKey(filters), result);
    for (const item of result?.items ?? []) this.summaries.set(item.id, item);
    return result;
  }

  async get(id: string): Promise<TemplateSummary> {
    return this.rememberSummary(await firstValueFrom(this.http.get<TemplateSummary>(this.item(id))));
  }

  async create(input: TemplateInput, applicationId?: string): Promise<TemplateSummary> {
    const created = this.rememberSummary(await firstValueFrom(this.http.post<TemplateSummary>(this.scope(applicationId), input)));
    // a new template changes what every list shows: the next visit asks the server instead of showing an old page
    this.searches.clear();
    this.markSaved(created?.id);
    return created;
  }

  async update(id: string, input: Partial<TemplateInput>): Promise<TemplateSummary> {
    const updated = this.rememberSummary(await firstValueFrom(this.http.put<TemplateSummary>(this.item(id), input)));
    this.markSaved(id);
    return updated;
  }

  /** Desactiva la plantilla (borrado lógico). Las campañas y mensajes anteriores no se tocan. */
  async deactivate(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.item(id)));
    this.summaries.delete(id);
    this.contents.delete(id);
    this.searches.clear();
  }

  async content(id: string): Promise<TemplateContent> {
    return this.rememberContent(id, await firstValueFrom(this.http.get<TemplateContent>(`${this.item(id)}/content`)));
  }

  /** Lo último que se supo de la plantilla `id` (datos y contenido), o null si falta alguno. Es para dibujar ya; el servidor manda. */
  peek(id: string): TemplateSnapshot | null {
    const summary = this.summaries.get(id);
    const content = this.contents.get(id);
    return summary && content ? { summary, content, samples: this.samples.get(id) ?? null } : null;
  }

  /** La última respuesta de esta misma búsqueda, o null. */
  peekSearch(filters: TemplateSearchParams = {}): TemplateSearchResult | null {
    return this.searches.get(searchKey(filters)) ?? null;
  }

  /** La vista previa de este mismo contenido con estos mismos parámetros, si se pidió hace poco; null si no. */
  peekPreview(name: string, content: string, params: Record<string, string>, applicationId?: string): TemplatePreviewResult | null {
    const hit = this.previews.get(previewKey(name, content, params, applicationId));
    return hit && Date.now() - hit.at < PREVIEW_TTL_MS ? hit.result : null;
  }

  /** Guarda los parámetros de ejemplo que la persona escribió para la plantilla, para no perderlos al reabrirla. */
  rememberSamples(id: string, text: string): void {
    this.samples.set(id, text);
  }

  /** La plantilla guardada hace menos de dos minutos, o null: la lista la resalta. */
  recentlySaved(): string | null {
    const last = this.lastSaved();
    return last && Date.now() - last.at < RECENT_MS ? last.id : null;
  }

  /**
   * Guarda el contenido. Con `etag`, sobre la versión que se leyó (`If-Match`); con `null`, crea el archivo y falla si ya existe
   * (`If-None-Match: *`). Un 422 trae `error.problems`; un 412, que alguien guardó antes.
   */
  async saveContent(id: string, content: string, etag: string | null, confirmSystem = false): Promise<TemplateContent> {
    const headers: Record<string, string> = etag === null ? { 'If-None-Match': '*' } : { 'If-Match': `"${etag}"` };
    const params: Record<string, boolean> = confirmSystem ? { confirmSystem: true } : {};
    const saved = await firstValueFrom(this.http.put<TemplateContent>(`${this.item(id)}/content`, { content }, { headers, params }));
    this.markSaved(id);
    return this.rememberContent(id, saved);
  }

  /** Las versiones guardadas del contenido, de la más nueva a la más antigua, sin el contenido. */
  versions(id: string): Promise<TemplateVersion[]> {
    return firstValueFrom(this.http.get<TemplateVersion[]>(`${this.item(id)}/versions`));
  }

  /** Una versión con su contenido. */
  version(id: string, version: number): Promise<TemplateVersion> {
    return firstValueFrom(this.http.get<TemplateVersion>(`${this.item(id)}/versions/${version}`));
  }

  /** Guarda una versión antigua como versión nueva (no borra nada). Necesita la huella del contenido actual. */
  async restore(id: string, version: number, etag: string, confirmSystem = false): Promise<TemplateContent> {
    const params: Record<string, boolean> = confirmSystem ? { confirmSystem: true } : {};
    const restored = await firstValueFrom(
      this.http.post<TemplateContent>(`${this.item(id)}/versions/${version}/restore`, null, { headers: { 'If-Match': `"${etag}"` }, params }),
    );
    this.markSaved(id);
    return this.rememberContent(id, restored);
  }

  /** Renderiza contenido sin guardar, con parámetros de ejemplo. No envía ni guarda nada. */
  async preview(name: string, content: string, params: Record<string, string>, applicationId?: string): Promise<TemplatePreviewResult> {
    const result = await firstValueFrom(this.http.post<TemplatePreviewResult>(`${this.scope(applicationId)}/preview`, { name, content, params }));
    const key = previewKey(name, content, params, applicationId);
    this.previews.delete(key);
    this.previews.set(key, { at: Date.now(), result });
    // the oldest entries go first: a Map keeps the order in which keys were added
    while (this.previews.size > PREVIEW_CACHE_SIZE) this.previews.delete(this.previews.keys().next().value as string);
    return result;
  }

  private rememberSummary(summary: TemplateSummary): TemplateSummary {
    if (!summary?.id) return summary;
    this.summaries.set(summary.id, summary);
    // the lists already in memory show the new description, type or subject at once
    for (const [key, result] of this.searches) {
      if (result.items.some((item) => item.id === summary.id)) {
        this.searches.set(key, { ...result, items: result.items.map((item) => (item.id === summary.id ? summary : item)) });
      }
    }
    return summary;
  }

  private rememberContent(id: string, content: TemplateContent): TemplateContent {
    if (content) this.contents.set(id, content);
    return content;
  }

  private markSaved(id: string | undefined): void {
    if (id) this.lastSaved.set({ id, at: Date.now() });
  }

  /** La raíz de las rutas que dependen de la aplicación: `/templates/applications/{id}`, o `/templates` sin aplicación. */
  private scope(applicationId?: string): string {
    return applicationId ? `${this.url}/applications/${encodeURIComponent(applicationId)}` : this.url;
  }

  private item(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}

/** La misma búsqueda da la misma clave, sin importar el orden de los filtros ni los vacíos. */
function searchKey(filters: TemplateSearchParams): string {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value !== '');
  return JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)));
}

function previewKey(name: string, content: string, params: Record<string, string>, applicationId?: string): string {
  return JSON.stringify([applicationId ?? '', name, content, Object.entries(params ?? {}).sort(([a], [b]) => a.localeCompare(b))]);
}
