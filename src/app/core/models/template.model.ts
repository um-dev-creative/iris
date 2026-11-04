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
