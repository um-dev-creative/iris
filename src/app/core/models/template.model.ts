/** Aplicación cuyas plantillas puede gestionar la persona (`GET /general/templates/applications`). */
export interface ManagedApplication {
  id: string;
  name: string;
  /** Código corto; también es la carpeta por defecto de las plantillas. */
  codeName: string;
}

/** Carpeta de plantillas de una aplicación. `registered` es `false` mientras no se le haya creado la primera plantilla. */
export interface ApplicationFolder {
  applicationId: string;
  folder: string;
  registered: boolean;
}

/** Elemento de un catálogo de Mercury (tipos de plantilla, severidades). */
export interface ReferenceItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface TemplateSummary {
  id: string;
  description: string;
  /** Nombre del archivo, con carpeta de la aplicación si la tiene. */
  location: string;
  fileFormat: string;
  templateTypeId: string;
  templateTypeName?: string | null;
  applicationId: string;
  severityTypeId: string;
  severityTypeName?: string | null;
  active: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TemplatePage {
  items: TemplateSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateTemplateRequest {
  description: string;
  location: string;
  fileFormat: string;
  templateTypeId: string;
  applicationId: string;
  severityTypeId: string;
}

/** Contenido de una plantilla con su etag: guardar exige devolverlo (`If-Match`) para no pisar un cambio ajeno. */
export interface TemplateContent {
  templateId: string;
  name: string;
  format: string;
  content: string;
  etag: string;
  exists: boolean;
  lastModified?: string | null;
  /** Plantillas del sistema (`zb_`, `sk_`, `iris_`, `ds_`): guardar pide confirmación explícita. */
  system: boolean;
  parameters: string[];
}

export interface TemplateProblem {
  line?: number | null;
  column?: number | null;
  message: string;
}

export interface TemplatePreview {
  ok: boolean;
  format: string;
  output: string;
  problems: TemplateProblem[];
  parameters: string[];
}

/** Formatos de archivo que Mercury renderiza. */
export const TEMPLATE_FORMATS = ['ftl', 'md'] as const;
export const TEMPLATE_LOCATION_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;
