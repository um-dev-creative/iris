import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import {
  LucideAngularModule,
  LucideIconData,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Smartphone,
  MessageCircle,
  Mail,
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

  /* ── Lucide icons ── */
  readonly CalendarIcon = Calendar;
  readonly RefreshCwIcon = RefreshCw;
  readonly TrendingUpIcon = TrendingUp;
  readonly TrendingDownIcon = TrendingDown;

  /* ── Provider helpers ── */
  private readonly providerIcons: Record<string, LucideIconData> = {
    sms: Smartphone,
    whatsapp: MessageCircle,
    email: Mail,
  };

  providerIcon(provider: string): LucideIconData {
    return this.providerIcons[provider] ?? Mail;
  }

  providerLabel(provider: string): string {
    return (
      ({ sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' } as Record<string, string>)[provider] ?? provider
    );
  }

  providerClasses(provider: string): string {
    return (
      ({
        sms: 'bg-chart-1/10 text-chart-1 border border-chart-1/25',
        whatsapp: 'bg-chart-2/10 text-chart-2 border border-chart-2/25',
        email: 'bg-chart-4/10 text-chart-4 border border-chart-4/25',
      } as Record<string, string>)[provider] ?? ''
    );
  }

  /* ── Status helpers ── */
  statusLabel(status: string): string {
    return (
      ({ delivered: 'Delivered', failed: 'Failed', pending: 'Pending' } as Record<string, string>)[
        status
      ] ?? status
    );
  }

  statusClasses(status: string): string {
    return (
      ({
        delivered: 'bg-chart-2/15 text-chart-2 border border-chart-2/25',
        failed: 'bg-destructive/15 text-destructive border border-destructive/25',
        pending: 'bg-orange/15 text-orange border border-orange/25',
      } as Record<string, string>)[status] ?? ''
    );
  }

  statusDotClass(status: string): string {
    return (
      ({
        delivered: 'bg-chart-2',
        failed: 'bg-destructive',
        pending: 'bg-orange',
      } as Record<string, string>)[status] ?? ''
    );
  }

  /* ── Trend colour ── */
  trendColorClass(kpi: MonitoringKpi): string {
    const isGood = kpi.invertTrend ? kpi.trend < 0 : kpi.trend >= 0;
    return isGood ? 'text-chart-2' : 'text-destructive';
  }

  /* ── Overall service status ── */
  readonly overallStatusLabel = computed(() => {
    const map: Record<string, string> = {
      'all-operational': 'All Operational',
      'partial-degradation': 'Partial Degradation',
      'major-outage': 'Major Outage',
    };
    return map[this.monitoringService.overallStatus()] ?? '';
  });

  readonly overallStatusClasses = computed(() => {
    const map: Record<string, string> = {
      'all-operational': 'bg-chart-2/15 text-chart-2 border border-chart-2/25',
      'partial-degradation': 'bg-orange/15 text-orange border border-orange/25',
      'major-outage': 'bg-destructive/15 text-destructive border border-destructive/25',
    };
    return map[this.monitoringService.overallStatus()] ?? '';
  });

  readonly overallDotClass = computed(() => {
    const map: Record<string, string> = {
      'all-operational': 'bg-chart-2',
      'partial-degradation': 'bg-orange',
      'major-outage': 'bg-destructive',
    };
    return map[this.monitoringService.overallStatus()] ?? '';
  });

  onRefresh(): void {
    this.monitoringService.refresh();
  }
}
