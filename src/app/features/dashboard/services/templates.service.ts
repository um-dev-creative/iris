import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import {
  ApplicationFolder,
  CreateTemplateRequest,
  ManagedApplication,
  ReferenceItem,
  TemplateContent,
  TemplatePage,
  TemplatePreview,
  TemplateSummary,
} from '../../../core/models';

/**
 * Aplicaciones que usan Mercury y sus plantillas. Habla con `/general/templates/*` del BFF, que reenvía la sesión de la persona;
 * Mercury decide con su permiso en Backbone qué aplicaciones y plantillas puede gestionar (403 si ninguna).
 */
@Injectable({ providedIn: 'root' })
export class TemplatesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/general/templates`;

  private readonly _applications = signal<ManagedApplication[]>([]);
  private readonly _loading = signal(false);

  readonly applications = this._applications.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Carga las aplicaciones que la persona puede gestionar. Si falla se rechaza y la lista anterior se conserva. */
  async loadApplications(): Promise<void> {
    this._loading.set(true);
    try {
      const list = await firstValueFrom(this.http.get<ManagedApplication[]>(`${this.url}/applications`));
      this._applications.set([...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
    } finally {
      this._loading.set(false);
    }
  }

  folder(applicationId: string): Promise<ApplicationFolder> {
    return firstValueFrom(this.http.get<ApplicationFolder>(`${this.url}/applications/${encodeURIComponent(applicationId)}/folder`));
  }

  /** Pone un nombre más claro a la carpeta (no mueve archivos). `409` si otra aplicación ya la usa. */
  assignFolder(applicationId: string, folder: string): Promise<ApplicationFolder> {
    return firstValueFrom(this.http.put<ApplicationFolder>(`${this.url}/applications/${encodeURIComponent(applicationId)}/folder`, { folder }));
  }

  templateTypes(): Promise<ReferenceItem[]> {
    return firstValueFrom(this.http.get<ReferenceItem[]>(`${this.url}/types`));
  }

  severities(): Promise<ReferenceItem[]> {
    return firstValueFrom(this.http.get<ReferenceItem[]>(`${this.url}/severities`));
  }

  search(applicationId: string, query = '', page = 0, size = 50): Promise<TemplatePage> {
    let params = new HttpParams().set('applicationId', applicationId).set('page', page).set('size', size).set('sort', 'description,asc');
    if (query.trim()) params = params.set('q', query.trim());
    return firstValueFrom(this.http.get<TemplatePage>(this.url, { params }));
  }

  create(request: CreateTemplateRequest): Promise<TemplateSummary> {
    return firstValueFrom(this.http.post<TemplateSummary>(this.url, request));
  }

  content(id: string): Promise<TemplateContent> {
    return firstValueFrom(this.http.get<TemplateContent>(`${this.url}/${encodeURIComponent(id)}/content`));
  }

  /**
   * Guarda el contenido sobre la versión leída (`If-Match`), o crea el archivo si aún no existe (`If-None-Match: *`).
   * `412` significa que alguien lo cambió entretanto; `422` trae los errores de sintaxis con línea y columna.
   */
  saveContent(id: string, content: string, etag: string | null, confirmSystem: boolean): Promise<TemplateContent> {
    const headers = etag === null ? new HttpHeaders({ 'If-None-Match': '*' }) : new HttpHeaders({ 'If-Match': `"${etag}"` });
    const params = confirmSystem ? new HttpParams().set('confirmSystem', true) : new HttpParams();
    return firstValueFrom(this.http.put<TemplateContent>(`${this.url}/${encodeURIComponent(id)}/content`, { content }, { headers, params }));
  }

  /** Renderiza contenido sin guardar, con parámetros de ejemplo. */
  preview(applicationId: string, name: string, content: string, params: Record<string, unknown> = {}): Promise<TemplatePreview> {
    return firstValueFrom(this.http.post<TemplatePreview>(`${this.url}/preview`, { applicationId, name, content, params }));
  }
}
