import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config';
import { ReferenceItem, UsableTemplate } from '../../../core/models';

/**
 * Listas que llenan los selectores de los formularios (`/templates/types`, `/templates/severities` y `/templates/defined` del BFF).
 * Se piden cuando hacen falta; si fallan (por ejemplo 403 sin permiso de lectura) el formulario conserva un campo de texto.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceDataService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/templates`;

  templateTypes(): Promise<ReferenceItem[]> {
    return firstValueFrom(this.http.get<ReferenceItem[]>(`${this.url}/types`));
  }

  severityTypes(): Promise<ReferenceItem[]> {
    return firstValueFrom(this.http.get<ReferenceItem[]>(`${this.url}/severities`));
  }

  /** Plantillas que la aplicación puede usar en una campaña. */
  usableTemplates(): Promise<UsableTemplate[]> {
    return firstValueFrom(this.http.get<UsableTemplate[]>(`${this.url}/defined`));
  }
}
