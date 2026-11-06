/** Una entrada de una lista pequeña de Mercury (tipos de plantilla, severidades) para un selector. */
export interface ReferenceItem {
  id: string;
  name: string;
  description?: string | null;
}

/** Una plantilla que una aplicación puede usar en una campaña (`template_defined`) con su plantilla base. */
export interface UsableTemplate {
  /** Lo que la campaña envía como `templateId`. */
  id: string;
  templateId: string;
  description: string;
  location?: string | null;
  fileFormat?: string | null;
  templateTypeName?: string | null;
}

/** Una plantilla base de Mercury (`TemplateDetailResponse`). */
export interface TemplateSummary {
  id: string;
  description: string;
  /** Nombre del archivo con el contenido (`bienvenida.md`). */
  location: string;
  fileFormat: string;
  templateTypeId: string;
  templateTypeName?: string | null;
  severityTypeId: string;
  severityTypeName?: string | null;
  applicationId?: string;
  active?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TemplateSearchResult {
  items: TemplateSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Una aplicación de Backbone cuyas plantillas se pueden gestionar (`GET /applications`). */
export interface ApplicationSummary {
  id: string;
  name: string;
  codeName?: string | null;
  description?: string | null;
  active?: boolean | null;
}

export interface TemplateSearchParams {
  /** La aplicación de la que se listan; sin ella, la aplicación que el BFF tiene configurada. */
  applicationId?: string;
  q?: string;
  templateTypeId?: string;
  severityTypeId?: string;
  /** Base 0, como Mercury. */
  page?: number;
  size?: number;
  sort?: string;
}

/** Metadatos de una plantilla al crearla o editarla. La aplicación la pone el BFF. */
export interface TemplateInput {
  description: string;
  location: string;
  fileFormat: string;
  templateTypeId: string;
  severityTypeId: string;
}

/** Formato del archivo: `MARKDOWN` si termina en `.md`, `FREEMARKER` en los demás casos. */
export type TemplateSourceFormat = 'FREEMARKER' | 'MARKDOWN';

/** El contenido de una plantilla y lo que el editor necesita para trabajar con él. */
export interface TemplateContent {
  templateId: string;
  name: string;
  format: TemplateSourceFormat;
  content: string;
  /** Huella para guardar con `If-Match`; vacía si el archivo aún no existe. */
  etag: string;
  exists: boolean;
  lastModified?: string | null;
  /** `true` para plantillas del sistema, de las que dependen otros servicios: guardarlas pide confirmación explícita. */
  system: boolean;
  parameters: string[];
}

/** Algo mal en una plantilla, con su posición para señalarlo en el editor. */
export interface TemplateProblem {
  /** Desde 1; 0 si no está ligado a una línea. */
  line: number;
  column: number;
  message: string;
}

export interface TemplatePreviewResult {
  ok: boolean;
  format: TemplateSourceFormat;
  output: string;
  problems: TemplateProblem[];
  parameters: string[];
}

/** Cuerpo de los errores 422 al guardar contenido que FreeMarker no entiende. */
export interface TemplateProblemsBody {
  message: string;
  problems: TemplateProblem[];
}

export const TEMPLATE_DESCRIPTION_MAX = 200;
export const TEMPLATE_CONTENT_MAX_BYTES = 262_144;

/** Una versión guardada del contenido de una plantilla. */
export interface TemplateVersion {
  version: number;
  etag: string;
  sizeBytes: number;
  /** `SAVE` (guardado), `RESTORE` (restauración) o `BASELINE` (el contenido original, antes de la primera edición desde Iris). */
  reason: 'SAVE' | 'RESTORE' | 'BASELINE';
  createdBy?: string | null;
  createdAt?: string | null;
  /** Solo al leer una versión, no en la lista. */
  content?: string | null;
}
