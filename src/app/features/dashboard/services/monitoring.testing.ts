import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/config';
import { MonitoringOverview, OverviewCampaign } from '../models/monitoring.model';

const CHANNELS = ['sms', 'whatsapp', 'email'];

/** Treinta campañas repartidas entre canales y estados: entregadas, fallidas y en curso. */
export function campaignsFixture(count = 30): OverviewCampaign[] {
  return Array.from({ length: count }, (_, i) => {
    const number = String(i + 1).padStart(2, '0');
    const shape = [
      { delivered: 9, failed: 1, pending: 0 },
      { delivered: 0, failed: 10, pending: 0 },
      { delivered: 2, failed: 0, pending: 8 },
    ][i % 3];
    return {
      id: `id-${number}`,
      name: `Campaña ${number}`,
      channel: CHANNELS[i % CHANNELS.length],
      status: 'ACTIVE',
      createdAt: `2026-01-${number} 10:00:00`,
      total: 10,
      sent: 10,
      ...shape,
    };
  });
}

export function overviewFixture(overrides: Partial<MonitoringOverview> = {}): MonitoringOverview {
  return {
    generatedAt: '2026-01-31T10:00:00Z',
    campaignsAvailable: true,
    totals: { total: 100, sent: 90, delivered: 80, failed: 10, pending: 10, deliveryRate: 80 / 90 },
    campaigns: campaignsFixture(),
    services: [
      { name: 'Mercury', status: 'operational', latencyMs: 40 },
      { name: 'Backbone', status: 'degraded', latencyMs: 1200 },
    ],
    ...overrides,
  };
}

export const monitoringProviders = [
  provideHttpClient(),
  provideHttpClientTesting(),
  { provide: API_BASE_URL, useValue: '/mrc/api/v1' },
];
