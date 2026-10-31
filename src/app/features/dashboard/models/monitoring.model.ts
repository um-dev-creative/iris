import { LucideIconData } from 'lucide-angular';

export interface MonitoringKpi {
  title: string;
  value: string;
  /** Diferencia con la lectura anterior; `null` en la primera lectura. */
  trend: number | null;
  trendSuffix: string;
  trendLabel: string;
  invertTrend?: boolean;
  icon: LucideIconData;
  sparklineData: number[];
  sparklineColor: string;
  iconBgClass: string;
  iconTextClass: string;
}

/** Una campaña en las tablas del dashboard. */
export interface LogEntry {
  id: string;
  name: string;
  provider: string;
  status: 'delivered' | 'failed' | 'pending';
  timestamp: string;
  total: number;
  delivered: number;
  failed: number;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  icon: LucideIconData;
}

export interface OverviewCampaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  createdAt?: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

/** Respuesta de `GET /mrc/api/v1/monitoring/overview`. */
export interface MonitoringOverview {
  generatedAt: string;
  campaignsAvailable: boolean;
  totals: { total: number; sent: number; delivered: number; failed: number; pending: number; deliveryRate: number | null };
  campaigns: OverviewCampaign[];
  services: { name: string; status: ServiceStatus['status']; latencyMs: number }[];
}
