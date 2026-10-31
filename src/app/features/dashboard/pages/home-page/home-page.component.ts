import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  computed,
  signal,
} from '@angular/core';
import {
  LucideAngularModule,
  LucideIconData,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Smartphone,
  MessageCircle,
  Mail,
  Filter,
  Bell,
  Send,
  TriangleAlert,
} from 'lucide-angular';
import { SparklineComponent } from '../../components/sparkline/sparkline.component';
import { ServiceStatusCardComponent } from '../../components/service-status-card/service-status-card.component';
import { MonitoringDataService } from '../../services/monitoring-data.service';
import { MonitoringKpi } from '../../models/monitoring.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    SparklineComponent,
    ServiceStatusCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  readonly monitoringService = inject(MonitoringDataService);

  constructor() {
    this.monitoringService.poll(inject(DestroyRef));
  }

  /* ── Lucide icons ── */
  readonly RefreshCwIcon = RefreshCw;
  readonly TrendingUpIcon = TrendingUp;
  readonly TrendingDownIcon = TrendingDown;
  readonly FilterIcon = Filter;
  readonly TriangleAlertIcon = TriangleAlert;

  /* ── Log status filter ── */
  readonly logStatusFilter = signal<'all' | 'delivered' | 'failed' | 'pending'>('all');
  readonly logStatusOptions: { value: 'all' | 'delivered' | 'failed' | 'pending'; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'delivered', label: 'Entregadas' },
    { value: 'failed', label: 'Fallidas' },
    { value: 'pending', label: 'En curso' },
  ];
  readonly filteredLogs = computed(() => {
    const filter = this.logStatusFilter();
    const logs = this.monitoringService.logs();
    return filter === 'all' ? logs : logs.filter(l => l.status === filter);
  });

  /* ── Provider helpers ── */
  private readonly providerIcons: Record<string, LucideIconData> = {
    sms: Smartphone,
    whatsapp: MessageCircle,
    email: Mail,
    telegram: Send,
    push: Bell,
  };

  providerIcon(provider: string): LucideIconData {
    return this.providerIcons[provider] ?? Mail;
  }

  providerLabel(provider: string): string {
    return (
      ({ sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email', telegram: 'Telegram', push: 'Push' } as Record<string, string>)[provider] ?? provider
    );
  }

  providerClasses(provider: string): string {
    return (
      ({
        sms: 'bg-chart-1/10 text-chart-1 border border-chart-1/25',
        whatsapp: 'bg-chart-2/10 text-chart-2 border border-chart-2/25',
        email: 'bg-chart-4/10 text-chart-4 border border-chart-4/25',
        telegram: 'bg-chart-3/10 text-chart-3 border border-chart-3/25',
        push: 'bg-chart-5/10 text-chart-5 border border-chart-5/25',
      } as Record<string, string>)[provider] ?? ''
    );
  }

  /* ── Status helpers ── */
  statusLabel(status: string): string {
    return (
      ({ delivered: 'Entregada', failed: 'Fallida', pending: 'En curso' } as Record<string, string>)[
        status
      ] ?? status
    );
  }

  statusClasses(status: string): string {
    return (
      ({
        delivered: 'bg-success/15 text-success border border-success/25',
        failed: 'bg-destructive/15 text-destructive border border-destructive/25',
        pending: 'bg-chart-1/15 text-chart-1 border border-chart-1/25',
      } as Record<string, string>)[status] ?? ''
    );
  }

  statusDotClass(status: string): string {
    return (
      ({
        delivered: 'bg-success',
        failed: 'bg-destructive',
        pending: 'bg-chart-1',
      } as Record<string, string>)[status] ?? ''
    );
  }

  /* ── Trend colour ── */
  trendColorClass(kpi: MonitoringKpi): string {
    const trend = kpi.trend ?? 0;
    const isGood = kpi.invertTrend ? trend <= 0 : trend >= 0;
    return isGood ? 'text-success' : 'text-destructive';
  }

  /* ── Overall service status ── */
  readonly overallStatusLabel = computed(() => {
    const map: Record<string, string> = {
      'all-operational': 'Todo operativo',
      'partial-degradation': 'Degradación parcial',
      'major-outage': 'Caída de servicio',
    };
    return map[this.monitoringService.overallStatus()] ?? 'Sin datos';
  });

  readonly overallStatusClasses = computed(() => {
    const map: Record<string, string> = {
      'all-operational': 'bg-success/15 text-success border border-success/25',
      'partial-degradation': 'bg-chart-3/15 text-chart-3 border border-chart-3/25',
      'major-outage': 'bg-destructive/15 text-destructive border border-destructive/25',
    };
    return map[this.monitoringService.overallStatus()] ?? 'bg-muted text-muted-foreground border border-border';
  });

  readonly overallDotClass = computed(() => {
    const map: Record<string, string> = {
      'all-operational': 'bg-success',
      'partial-degradation': 'bg-chart-3',
      'major-outage': 'bg-destructive',
    };
    return map[this.monitoringService.overallStatus()] ?? 'bg-muted-foreground';
  });

  onRefresh(): void {
    this.monitoringService.refresh();
  }
}
