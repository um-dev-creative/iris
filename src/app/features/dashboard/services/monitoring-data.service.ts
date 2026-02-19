import { Injectable, signal, computed } from '@angular/core';
import {
  Send,
  Target,
  Clock,
  AlertTriangle,
  Server,
  Database,
  Smartphone,
  MessageCircle,
  Mail,
  Layers,
} from 'lucide-angular';
import {
  MonitoringKpi,
  LogEntry,
  ServiceStatus,
} from '../models/monitoring.model';

@Injectable({ providedIn: 'root' })
export class MonitoringDataService {
  private readonly _loading = signal(false);
  private readonly _lastRefresh = signal(new Date());

  readonly loading = this._loading.asReadonly();
  readonly lastRefresh = this._lastRefresh.asReadonly();

  /* ── KPIs ── */
  readonly kpis = signal<MonitoringKpi[]>([
    {
      title: 'Mensajes Totales (24h)',
      value: '1,284,392',
      trend: 12.5,
      trendSuffix: '%',
      trendLabel: 'vs últimas 24h',
      icon: Send,
      sparklineData: [32, 35, 40, 38, 45, 50, 48, 55, 60, 58, 65, 70],
      sparklineColor: 'var(--chart-1)',
      iconBgClass: 'bg-chart-1/15',
      iconTextClass: 'text-chart-1',
    },
    {
      title: 'Tasa de Entrega',
      value: '98.7%',
      trend: 0.3,
      trendSuffix: '%',
      trendLabel: 'vs últimas 24h',
      icon: Target,
      sparklineData: [97, 98, 97.5, 98.2, 98.5, 98.8, 98.3, 98.7, 98.9, 98.7],
      sparklineColor: 'var(--chart-2)',
      iconBgClass: 'bg-chart-2/15',
      iconTextClass: 'text-chart-2',
    },
    {
      title: 'Latencia Promedio',
      value: '142 ms',
      trend: -8.2,
      trendSuffix: '%',
      trendLabel: 'vs últimas 24h',
      invertTrend: true,
      icon: Clock,
      sparklineData: [180, 175, 165, 170, 155, 148, 152, 145, 140, 142],
      sparklineColor: 'var(--chart-1)',
      iconBgClass: 'bg-chart-4/15',
      iconTextClass: 'text-chart-4',
    },
    {
      title: 'Errores Activos',
      value: '23',
      trend: 5,
      trendSuffix: '',
      trendLabel: 'nuevos errores',
      invertTrend: true,
      icon: AlertTriangle,
      sparklineData: [15, 12, 18, 14, 20, 17, 22, 19, 25, 23],
      sparklineColor: 'var(--destructive)',
      iconBgClass: 'bg-destructive/15',
      iconTextClass: 'text-destructive',
    },
  ]);

  /* ── Full log dataset ── */
  readonly allLogs = signal<LogEntry[]>([
    { id: 'MSG-28401', recipient: '+34 612 345 678', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:23:01' },
    { id: 'MSG-28402', recipient: '+34 623 456 789', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:22:58' },
    { id: 'MSG-28403', recipient: '+34 634 567 890', provider: 'email',    status: 'failed',    timestamp: '2024-01-15 14:22:55' },
    { id: 'MSG-28404', recipient: '+34 645 678 901', provider: 'sms',      status: 'pending',   timestamp: '2024-01-15 14:22:52' },
    { id: 'MSG-28405', recipient: '+34 656 789 012', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:22:49' },
    { id: 'MSG-28406', recipient: '+34 667 890 123', provider: 'email',    status: 'delivered', timestamp: '2024-01-15 14:22:46' },
    { id: 'MSG-28407', recipient: '+34 678 901 234', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:22:43' },
    { id: 'MSG-28408', recipient: '+34 689 012 345', provider: 'whatsapp', status: 'failed',    timestamp: '2024-01-15 14:22:40' },
    { id: 'MSG-28409', recipient: '+34 690 123 456', provider: 'email',    status: 'delivered', timestamp: '2024-01-15 14:22:37' },
    { id: 'MSG-28410', recipient: '+34 601 234 567', provider: 'sms',      status: 'pending',   timestamp: '2024-01-15 14:22:34' },
    { id: 'MSG-28411', recipient: '+34 611 222 333', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:22:30' },
    { id: 'MSG-28412', recipient: '+34 622 333 444', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:22:27' },
    { id: 'MSG-28413', recipient: '+34 633 444 555', provider: 'email',    status: 'failed',    timestamp: '2024-01-15 14:22:24' },
    { id: 'MSG-28414', recipient: '+34 644 555 666', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:22:20' },
    { id: 'MSG-28415', recipient: '+34 655 666 777', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:22:17' },
    { id: 'MSG-28416', recipient: '+34 666 777 888', provider: 'email',    status: 'pending',   timestamp: '2024-01-15 14:22:14' },
    { id: 'MSG-28417', recipient: '+34 677 888 999', provider: 'sms',      status: 'failed',    timestamp: '2024-01-15 14:22:10' },
    { id: 'MSG-28418', recipient: '+34 688 999 000', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:22:07' },
    { id: 'MSG-28419', recipient: '+34 699 000 111', provider: 'email',    status: 'delivered', timestamp: '2024-01-15 14:22:04' },
    { id: 'MSG-28420', recipient: '+34 600 111 222', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:22:00' },
    { id: 'MSG-28421', recipient: '+34 610 333 444', provider: 'whatsapp', status: 'pending',   timestamp: '2024-01-15 14:21:57' },
    { id: 'MSG-28422', recipient: '+34 620 444 555', provider: 'email',    status: 'delivered', timestamp: '2024-01-15 14:21:54' },
    { id: 'MSG-28423', recipient: '+34 630 555 666', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:21:50' },
    { id: 'MSG-28424', recipient: '+34 640 666 777', provider: 'whatsapp', status: 'failed',    timestamp: '2024-01-15 14:21:47' },
    { id: 'MSG-28425', recipient: '+34 650 777 888', provider: 'email',    status: 'delivered', timestamp: '2024-01-15 14:21:44' },
    { id: 'MSG-28426', recipient: '+34 660 888 999', provider: 'sms',      status: 'delivered', timestamp: '2024-01-15 14:21:40' },
    { id: 'MSG-28427', recipient: '+34 670 999 000', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:21:37' },
    { id: 'MSG-28428', recipient: '+34 680 000 111', provider: 'email',    status: 'pending',   timestamp: '2024-01-15 14:21:34' },
    { id: 'MSG-28429', recipient: '+34 690 111 222', provider: 'sms',      status: 'failed',    timestamp: '2024-01-15 14:21:30' },
    { id: 'MSG-28430', recipient: '+34 601 222 333', provider: 'whatsapp', status: 'delivered', timestamp: '2024-01-15 14:21:27' },
  ]);

  /* ── Recent logs (first 10 for home page) ── */
  readonly logs = computed(() => this.allLogs().slice(0, 10));

  /* ── Service status ── */
  readonly services = signal<ServiceStatus[]>([
    { name: 'API Gateway', status: 'operational', uptime: 99.99, latency: 45, icon: Server },
    { name: 'Database Cluster', status: 'operational', uptime: 99.95, latency: 12, icon: Database },
    { name: 'SMS Broker', status: 'degraded', uptime: 98.50, latency: 250, icon: Smartphone },
    { name: 'WhatsApp Gateway', status: 'operational', uptime: 99.90, latency: 89, icon: MessageCircle },
    { name: 'Email Provider', status: 'operational', uptime: 99.85, latency: 156, icon: Mail },
    { name: 'Queue Worker', status: 'operational', uptime: 99.99, latency: 8, icon: Layers },
  ]);

  readonly overallStatus = computed(() => {
    const svc = this.services();
    if (svc.some((s) => s.status === 'down')) return 'major-outage';
    if (svc.some((s) => s.status === 'degraded')) return 'partial-degradation';
    return 'all-operational';
  });

  /* ── Actions ── */
  async refresh(): Promise<void> {
    this._loading.set(true);
    await new Promise((r) => setTimeout(r, 800));
    this._lastRefresh.set(new Date());
    this._loading.set(false);
  }
}
