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
/** Si las tablas del monitoreo existen en Mercury y cuántos registros fallaron: sin ellas las vistas quedan vacías aunque se envíe. */
export interface StorageStatus { ready: boolean; missingTables: string[]; migrations: string[]; recordFailures: number }
export interface HealthResponse { generatedAt: string; overall: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN'; services: ServiceHealth[]; storage?: StorageStatus }

export interface ApplicationChoice { id: string; name: string }
/** Las aplicaciones que la persona puede mirar. Sin elegir una, el monitoreo cubre todas las de Mercury. */
export interface ApplicationsResponse { applications: ApplicationChoice[]; available: boolean }

export interface Outage {
  id: string; service: string; status: ServiceState; cause: string; causeText: string; startedAt: string; endedAt: string | null; durationSeconds: number; ongoing: boolean;
}
/** Una página del historial: la ventana consultada (`range` es `custom` si se eligió una propia), la página y cuántas caídas hay en total. */
export interface OutagesResponse {
  range: string; outages: Outage[]; from?: string | null; to?: string | null; page?: number; size?: number; total?: number; totalPages?: number;
}

/** El periodo del historial: el de la página, uno fijo o uno propio (`from`/`to`, UTC). */
export type OutagePeriod = 'page' | '24h' | '7d' | '30d' | '90d' | 'custom';

/** Lo que se busca en el historial de caídas. `from`/`to` son valores de `<input type="datetime-local">` leídos como UTC. */
export interface OutageFilter { period: OutagePeriod; from: string; to: string; q: string; status: '' | 'DOWN' | 'DEGRADED'; page: number }

/** Cómo llegan los datos: por el stream, por consultas periódicas, o no llegan. */
export type Connection = 'connecting' | 'live' | 'polling' | 'offline';

export type AlertType = 'FAILURE_RATE' | 'QUEUE_STUCK' | 'SERVICE_DOWN';

export interface AlertRule {
  id: string; type: AlertType; threshold: number; windowMinutes: number; minVolume: number; service: string | null; notifyEmails: string[];
  enabled: boolean; createdAt: string; updatedAt: string;
}
export interface AlertRulesResponse { rules: AlertRule[] }
export interface AlertRuleRequest {
  type: AlertType; threshold?: number; windowMinutes?: number; minVolume?: number; service?: string; notifyEmails?: string[]; enabled?: boolean;
}
export interface AlertEvent {
  id: string; ruleId: string; type: AlertType; status: 'FIRING' | 'RESOLVED'; value: number; detail: string; startedAt: string; resolvedAt: string | null;
}
export interface AlertsResponse { range: string; firing: number; alerts: AlertEvent[] }
