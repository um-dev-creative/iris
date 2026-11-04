import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import {
  TemplateContent,
  TemplateInput,
  TemplatePreviewResult,
  TemplateSearchParams,
  TemplateSearchResult,
  TemplateSummary,
} from '../../../core/models';

/**
 * Plantillas de Mercury a través de `/templates` del BFF, que agrega las credenciales de la aplicación y fija la aplicación.
 * El contenido se guarda con bloqueo optimista: `saveContent` envía la huella leída y Mercury responde 412 si alguien guardó antes.
 */
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/templates`;

  search(filters: TemplateSearchParams = {}): Promise<TemplateSearchResult> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return firstValueFrom(this.http.get<TemplateSearchResult>(this.url, { params }));
  }

  get(id: string): Promise<TemplateSummary> {
    return firstValueFrom(this.http.get<TemplateSummary>(this.item(id)));
  }

  create(input: TemplateInput): Promise<TemplateSummary> {
    return firstValueFrom(this.http.post<TemplateSummary>(this.url, input));
  }

  update(id: string, input: Partial<TemplateInput>): Promise<TemplateSummary> {
    return firstValueFrom(this.http.put<TemplateSummary>(this.item(id), input));
  }

  /** Desactiva la plantilla (borrado lógico). Las campañas y mensajes anteriores no se tocan. */
  deactivate(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.item(id)));
  }

  content(id: string): Promise<TemplateContent> {
    return firstValueFrom(this.http.get<TemplateContent>(`${this.item(id)}/content`));
  }

  /**
   * Guarda el contenido. Con `etag`, sobre la versión que se leyó (`If-Match`); con `null`, crea el archivo y falla si ya existe
   * (`If-None-Match: *`). Un 422 trae `error.problems`; un 412, que alguien guardó antes.
   */
  saveContent(id: string, content: string, etag: string | null): Promise<TemplateContent> {
    const headers: Record<string, string> = etag === null ? { 'If-None-Match': '*' } : { 'If-Match': `"${etag}"` };
    return firstValueFrom(this.http.put<TemplateContent>(`${this.item(id)}/content`, { content }, { headers }));
  }

  /** Renderiza contenido sin guardar, con parámetros de ejemplo. No envía ni guarda nada. */
  preview(name: string, content: string, params: Record<string, string>): Promise<TemplatePreviewResult> {
    return firstValueFrom(this.http.post<TemplatePreviewResult>(`${this.url}/preview`, { name, content, params }));
  }

  private item(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}
