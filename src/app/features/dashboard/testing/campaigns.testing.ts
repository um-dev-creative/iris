import { Provider, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CampaignsService } from '../services/campaigns.service';
import { Campaign, CampaignProgress, UsableTemplate } from '../../../core/models';
import { ReferenceDataService } from '../services/reference-data.service';

export const campaign = (id: string, extra: Partial<Campaign> = {}): Campaign => ({
  id,
  name: `Campaña ${id}`,
  channelType: 'email',
  templateId: '11111111-1111-4111-8111-111111111111',
  status: 'DRAFT',
  totalRecipients: 10,
  createdAt: '2026-01-01 10:00:00',
  ...extra,
});

export const progressOf = (id: string, extra: Partial<CampaignProgress> = {}): CampaignProgress => ({
  campaignId: id, totalRecipients: 10, totalSent: 8, delivered: 5, failed: 0, pending: 5, ...extra,
});

export const httpError = (status: number) => new HttpErrorResponse({ status });

/** Sustituto de `CampaignsService` para las pruebas de páginas: la prueba decide qué responde cada llamada. */
export function fakeCampaigns(initial: Campaign[] = []) {
  const campaigns = signal<Campaign[]>(initial);
  const service = {
    campaigns: campaigns.asReadonly(),
    loading: signal(false).asReadonly(),
    load: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(initial[0]),
    progress: vi.fn((id: string) => Promise.resolve(progressOf(id))),
    channelTypes: vi.fn().mockResolvedValue([{ code: 'email', name: 'Email', enabled: true }]),
    create: vi.fn().mockResolvedValue({ campaignId: 'new' }),
    update: vi.fn().mockResolvedValue(initial[0]),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  return { service, campaigns, provider: { provide: CampaignsService, useValue: service } as Provider };
}

export const usableTemplate = (id: string, extra: Partial<UsableTemplate> = {}): UsableTemplate => ({
  id, templateId: `base-${id}`, description: `Plantilla ${id}`, location: `${id}.ftl`, fileFormat: 'FTL', templateTypeName: 'WELCOME', ...extra,
});

/** Sustituto de `ReferenceDataService`: por defecto sin plantillas, como cuando falta el permiso de lectura. */
export function fakeReferences(templates: UsableTemplate[] | Error = []) {
  const service = {
    templateTypes: vi.fn().mockResolvedValue([{ id: 't1', name: 'WELCOME' }]),
    severityTypes: vi.fn().mockResolvedValue([{ id: 's1', name: 'INFO' }]),
    usableTemplates: vi.fn(() => (templates instanceof Error ? Promise.reject(templates) : Promise.resolve(templates))),
  };
  return { service, provider: { provide: ReferenceDataService, useValue: service } as Provider };
}
