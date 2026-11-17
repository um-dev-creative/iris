/** Lo que Mercury responde en `/api/v1/monitoring/*` (pasa por el BFF sin cambios). Las fechas son ISO sin zona, en UTC. */

export type MonitoringRange = '1h' | '24h' | '7d' | '30d';
export type MessageStatus = 'SENT' | 'FAILED';

export interface Totals { sent: number; failed: number; queued: number; successRate: number | null }
export interface ChannelSummary { channel: string; providerConnected: boolean; sent: number; failed: number; queued: number; successRate: number | null }
export interface KindSummary { kind: string; sent: number; failed: number; successRate: number | null }
export interface SummaryResponse { range: string; generatedAt: string; totals: Totals; channels: ChannelSummary[]; kinds: KindSummary[] }

export interface SeriesPoint { bucket: string; sent: number; failed: number }
export interface SeriesResponse { range: string; unit: string; points: SeriesPoint[] }

export interface FailureCause { cause: string; channel: string; total: number }
export interface StuckQueue { channel: string; providerConnected: boolean; waiting: number; oldestMinutes: number }
export interface FailuresResponse { range: string; stuckAfterMinutes: number; causes: FailureCause[]; stuck: StuckQueue[] }

export interface VerificationCodeStats {
  range: string; generated: number; confirmed: number; expired: number; pending: number; failedSends: number; confirmationRate: number | null;
}

export interface MessageItem {
  id: string; occurredAt: string; channel: string; kind: string; status: MessageStatus; messageId: string | null; campaignId: string | null;
  templateDefinedId: string | null; recipient: string | null; errorCause: string | null;
}
export interface MessagePage { page: number; size: number; total: number; items: MessageItem[] }

export type ServiceState = 'UP' | 'DEGRADED' | 'DOWN' | 'NOT_CONFIGURED' | 'UNKNOWN';
export interface ServiceHealth {
  service: string; status: ServiceState; latencyMs: number | null; cause: string | null; causeText: string | null; since: string | null; lastCheckedAt: string | null;
}
export interface HealthResponse { generatedAt: string; overall: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN'; services: ServiceHealth[] }

export interface Outage {
  id: string; service: string; status: ServiceState; cause: string; causeText: string; startedAt: string; endedAt: string | null; durationSeconds: number; ongoing: boolean;
}
export interface OutagesResponse { range: string; outages: Outage[] }

/** Cómo llegan los datos: por el stream, por consultas periódicas, o no llegan. */
export type Connection = 'connecting' | 'live' | 'polling' | 'offline';
