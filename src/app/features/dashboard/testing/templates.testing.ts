import { Provider } from '@angular/core';
import { TemplatesService } from '../services/templates.service';
import { TemplateContent, TemplatePreviewResult, TemplateSearchResult, TemplateSummary } from '../../../core/models';

export const summary = (id: string, extra: Partial<TemplateSummary> = {}): TemplateSummary => ({
  id,
  description: `Plantilla ${id}`,
  location: `plantilla-${id}.md`,
  fileFormat: 'MD',
  templateTypeId: 't1',
  templateTypeName: 'WELCOME',
  severityTypeId: 's1',
  severityTypeName: 'INFO',
  active: true,
  updatedAt: '2026-02-01 10:00:00',
  ...extra,
});

export const contentOf = (id: string, extra: Partial<TemplateContent> = {}): TemplateContent => ({
  templateId: id, name: `plantilla-${id}.md`, format: 'MARKDOWN', content: '# Hola ${name}', etag: 'etag-1', exists: true,
  readOnly: false, parameters: ['name'], ...extra,
});

export const previewOf = (extra: Partial<TemplatePreviewResult> = {}): TemplatePreviewResult => ({
  ok: true, format: 'MARKDOWN', output: '<h1>Hola Ana</h1>', problems: [], parameters: ['name'], ...extra,
});

export const searchOf = (items: TemplateSummary[], extra: Partial<TemplateSearchResult> = {}): TemplateSearchResult => ({
  items, page: 0, size: 10, totalElements: items.length, totalPages: 1, ...extra,
});

/** Sustituto de `TemplatesService` para las pruebas de páginas. */
export function fakeTemplates(items: TemplateSummary[] = []) {
  const service = {
    search: vi.fn().mockResolvedValue(searchOf(items)),
    get: vi.fn().mockResolvedValue(items[0] ?? summary('a')),
    create: vi.fn().mockResolvedValue(summary('new')),
    update: vi.fn().mockResolvedValue(summary('a')),
    deactivate: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue(contentOf('a')),
    saveContent: vi.fn().mockResolvedValue(contentOf('a', { etag: 'etag-2', content: 'nuevo' })),
    preview: vi.fn().mockResolvedValue(previewOf()),
  };
  return { service, provider: { provide: TemplatesService, useValue: service } as Provider };
}
