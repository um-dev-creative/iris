import { LucideIconData } from 'lucide-angular';

export interface MonitoringKpi {
  title: string;
  value: string;
  trend: number;
  trendSuffix: string;
  trendLabel: string;
  invertTrend?: boolean;
  icon: LucideIconData;
  sparklineData: number[];
  sparklineColor: string;
  iconBgClass: string;
  iconTextClass: string;
}

export interface LogEntry {
  id: string;
  recipient: string;
  provider: 'sms' | 'whatsapp' | 'email';
  status: 'delivered' | 'failed' | 'pending';
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  latency: number;
  icon: LucideIconData;
}
