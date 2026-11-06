import { Injectable, inject } from '@angular/core';
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

/**
 * Plantillas de Mercury a través de `/templates` del BFF, que agrega las credenciales de la aplicación y fija la aplicación.
 * El contenido se guarda con bloqueo optimista: `saveContent` envía la huella leída y Mercury responde 412 si alguien guardó antes.
 */
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/templates`;

  /** Las aplicaciones de Backbone; cada una tiene sus propias plantillas (su carpeta en Mercury). */
  applications(): Promise<ApplicationSummary[]> {
    return firstValueFrom(this.http.get<ApplicationSummary[]>(`${this.url}/applications`));
  }

  /** Lista las plantillas de `filters.applicationId`; sin ella, las de la aplicación que el BFF tiene configurada. */
  search(filters: TemplateSearchParams = {}): Promise<TemplateSearchResult> {
    const { applicationId, ...rest } = filters;
    let params = new HttpParams();
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return firstValueFrom(this.http.get<TemplateSearchResult>(this.scope(applicationId), { params }));
  }

  get(id: string): Promise<TemplateSummary> {
    return firstValueFrom(this.http.get<TemplateSummary>(this.item(id)));
  }

  create(input: TemplateInput, applicationId?: string): Promise<TemplateSummary> {
    return firstValueFrom(this.http.post<TemplateSummary>(this.scope(applicationId), input));
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
  saveContent(id: string, content: string, etag: string | null, confirmSystem = false): Promise<TemplateContent> {
    const headers: Record<string, string> = etag === null ? { 'If-None-Match': '*' } : { 'If-Match': `"${etag}"` };
    const params: Record<string, boolean> = confirmSystem ? { confirmSystem: true } : {};
    return firstValueFrom(this.http.put<TemplateContent>(`${this.item(id)}/content`, { content }, { headers, params }));
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
  restore(id: string, version: number, etag: string, confirmSystem = false): Promise<TemplateContent> {
    const params: Record<string, boolean> = confirmSystem ? { confirmSystem: true } : {};
    return firstValueFrom(
      this.http.post<TemplateContent>(`${this.item(id)}/versions/${version}/restore`, null, { headers: { 'If-Match': `"${etag}"` }, params }),
    );
  }

  /** Renderiza contenido sin guardar, con parámetros de ejemplo. No envía ni guarda nada. */
  preview(name: string, content: string, params: Record<string, string>, applicationId?: string): Promise<TemplatePreviewResult> {
    return firstValueFrom(this.http.post<TemplatePreviewResult>(`${this.scope(applicationId)}/preview`, { name, content, params }));
  }

  /** La raíz de las rutas que dependen de la aplicación: `/templates/applications/{id}`, o `/templates` sin aplicación. */
  private scope(applicationId?: string): string {
    return applicationId ? `${this.url}/applications/${encodeURIComponent(applicationId)}` : this.url;
  }

  private item(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}
