import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import { ReferenceItem, UsableTemplate } from '../../../core/models';

/**
 * Listas que llenan los selectores de los formularios (`/templates/types`, `/templates/severities` y `/templates/defined` del BFF).
 * Se piden cuando hacen falta (tipos y severidades, una sola vez por sesión); si fallan (por ejemplo 403 sin permiso de lectura) el formulario conserva un campo de texto.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/templates`;

  private readonly lists = new Map<string, Promise<ReferenceItem[]>>();

  /** Los tipos de plantilla. Casi nunca cambian: se piden una vez por sesión (y otra vez si la primera falló). */
  templateTypes(): Promise<ReferenceItem[]> {
    return this.once('types');
  }

  /** Las severidades; igual que los tipos, una vez por sesión. */
  severityTypes(): Promise<ReferenceItem[]> {
    return this.once('severities');
  }

  private once(path: string): Promise<ReferenceItem[]> {
    let request = this.lists.get(path);
    if (!request) {
      request = firstValueFrom(this.http.get<ReferenceItem[]>(`${this.url}/${path}`)).catch((error: unknown) => {
        this.lists.delete(path);
        throw error;
      });
      this.lists.set(path, request);
    }
    return request;
  }

  /** Plantillas que la aplicación puede usar en una campaña. */
  usableTemplates(): Promise<UsableTemplate[]> {
    return firstValueFrom(this.http.get<UsableTemplate[]>(`${this.url}/defined`));
  }
}
