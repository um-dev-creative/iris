import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import {
  AlertRulesResponse, AlertsResponse, FailuresResponse, HealthResponse, MessagePage, OutagesResponse, SeriesResponse, SummaryResponse, VerificationCodeStats,
} from '../models/monitoring-live.model';

export const summaryFixture = (): SummaryResponse => ({
  range: '24h',
  generatedAt: '2026-11-17T08:00:00',
  totals: { sent: 90, failed: 10, queued: 5, successRate: 0.9 },
  channels: [
    { channel: 'EMAIL', providerConnected: true, sent: 80, failed: 10, queued: 2, successRate: 0.89 },
    { channel: 'TELEGRAM', providerConnected: true, sent: 10, failed: 0, queued: 0, successRate: 1 },
    { channel: 'SMS', providerConnected: false, sent: 0, failed: 0, queued: 3, successRate: null },
  ],
  kinds: [
    { kind: 'TRANSACTIONAL', sent: 50, failed: 5, successRate: 0.91 },
    { kind: 'CAMPAIGN', sent: 30, failed: 5, successRate: 0.86 },
    { kind: 'VERIFICATION_CODE', sent: 10, failed: 0, successRate: 1 },
  ],
});

export const seriesFixture = (): SeriesResponse => ({
  range: '24h',
  unit: 'hour',
  points: [
    { bucket: '2026-11-17T06:00:00', sent: 10, failed: 1 },
    { bucket: '2026-11-17T07:00:00', sent: 20, failed: 4 },
  ],
});

export const failuresFixture = (): FailuresResponse => ({
  range: '24h',
  stuckAfterMinutes: 15,
  causes: [{ cause: 'SEND_FAILED', channel: 'EMAIL', total: 10 }],
  stuck: [{ channel: 'SMS', providerConnected: false, waiting: 3, oldestMinutes: 90 }],
});

export const codesFixture = (): VerificationCodeStats => ({
  range: '24h', generated: 20, confirmed: 15, expired: 3, pending: 2, failedSends: 1, confirmationRate: 0.75,
});

export const healthFixture = (): HealthResponse => ({
  generatedAt: '2026-11-17T08:00:00',
  overall: 'DEGRADED',
  services: [
    { service: 'SMTP', status: 'DEGRADED', latencyMs: 300, cause: 'QUOTA_EXCEEDED', causeText: 'The sending limit of the account was exceeded', since: '2026-11-17T07:00:00', lastCheckedAt: '2026-11-17T08:00:00' },
    { service: 'KAFKA', status: 'NOT_CONFIGURED', latencyMs: null, cause: null, causeText: null, since: null, lastCheckedAt: null },
    { service: 'POSTGRES', status: 'UP', latencyMs: 4, cause: null, causeText: null, since: null, lastCheckedAt: '2026-11-17T08:00:00' },
  ],
});

export const outagesFixture = (): OutagesResponse => ({
  range: '24h',
  outages: [
    { id: 'o-1', service: 'SMTP', status: 'DEGRADED', cause: 'QUOTA_EXCEEDED', causeText: 'The sending limit of the account was exceeded', startedAt: '2026-11-17T07:00:00', endedAt: null, durationSeconds: 3600, ongoing: true },
    { id: 'o-2', service: 'MONGO', status: 'DOWN', cause: 'CONNECTION_FAILED', causeText: 'The connection failed', startedAt: '2026-11-16T07:00:00', endedAt: '2026-11-16T07:10:00', durationSeconds: 600, ongoing: false },
  ],
});

export const messagesFixture = (total = 45): MessagePage => ({
  page: 0,
  size: 20,
  total,
  items: [
    { id: 'm-1', occurredAt: '2026-11-17T07:30:00', channel: 'EMAIL', kind: 'CAMPAIGN', status: 'FAILED', messageId: null, campaignId: null, templateDefinedId: null, recipient: 'j***@e***.com', errorCause: 'SEND_FAILED' },
    { id: 'm-2', occurredAt: '2026-11-17T07:31:00', channel: 'TELEGRAM', kind: 'TRANSACTIONAL', status: 'SENT', messageId: null, campaignId: null, templateDefinedId: null, recipient: null, errorCause: null },
  ],
});

export const alertsFixture = (): AlertsResponse => ({
  range: '24h',
  firing: 1,
  alerts: [
    { id: 'a-1', ruleId: 'r-1', type: 'FAILURE_RATE', status: 'FIRING', value: 33.3, detail: '33.3% of the messages failed in the last 15 min (10 of 30)', startedAt: '2026-11-17T07:45:00', resolvedAt: null },
    { id: 'a-2', ruleId: 'r-2', type: 'SERVICE_DOWN', status: 'RESOLVED', value: 12, detail: 'SMTP DOWN for at least 10 min', startedAt: '2026-11-16T07:00:00', resolvedAt: '2026-11-16T07:30:00' },
  ],
});

export const rulesFixture = (): AlertRulesResponse => ({
  rules: [
    { id: 'r-1', type: 'FAILURE_RATE', threshold: 20, windowMinutes: 15, minVolume: 10, service: null, notifyEmails: ['ops@example.com'], enabled: true, createdAt: '2026-11-01T00:00:00', updatedAt: '2026-11-01T00:00:00' },
    { id: 'r-2', type: 'SERVICE_DOWN', threshold: 1, windowMinutes: 10, minVolume: 0, service: 'SMTP', notifyEmails: [], enabled: false, createdAt: '2026-11-01T00:00:00', updatedAt: '2026-11-01T00:00:00' },
  ],
});

/** What Mercury would answer for a path of `/monitoring`. */
export function bodyFor(path: string): object {
  if (path.endsWith('/summary')) return summaryFixture();
  if (path.endsWith('/series')) return seriesFixture();
  if (path.endsWith('/failures')) return failuresFixture();
  if (path.endsWith('/verification-codes')) return codesFixture();
  if (path.endsWith('/health')) return healthFixture();
  if (path.endsWith('/outages')) return outagesFixture();
  if (path.endsWith('/alerts/rules')) return rulesFixture();
  if (path.endsWith('/alerts')) return alertsFixture();
  return messagesFixture();
}

/** Answers every request in flight with its fixture, or with an error; returns what was asked. */
export function answerAll(http: HttpTestingController, failWith?: number): TestRequest[] {
  const requests = http.match(() => true);
  for (const request of requests) {
    if (failWith) request.flush({}, { status: failWith, statusText: 'error' });
    else request.flush(bodyFor(request.request.url));
  }
  return requests;
}

export const paths = (requests: TestRequest[]) => requests.map((r) => r.request.url.replace('/mrc/api/v1/monitoring/', '')).sort((a, b) => a.localeCompare(b));

/** A stand-in for the browser's EventSource that a test drives by hand. */
export class FakeEventSource {
  static readonly instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  closed = false;
  private readonly listeners = new Map<string, (event: Event) => void>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: (event: Event) => void): void {
    this.listeners.set(name, listener);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  emit(name: string, data: unknown): void {
    this.listeners.get(name)?.(new MessageEvent(name, { data: typeof data === 'string' ? data : JSON.stringify(data) }));
  }

  fail(readyState: number): void {
    this.readyState = readyState;
    this.onerror?.();
  }
}
