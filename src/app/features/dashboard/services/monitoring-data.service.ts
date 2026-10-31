import { DestroyRef, Injectable, NgZone, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AlertTriangle, Clock, Database, LucideIconData, Send, Server, Target } from 'lucide-angular';
import { API_BASE_URL } from '../../../core/config';
import { LogEntry, MonitoringKpi, MonitoringOverview, OverviewCampaign, ServiceStatus } from '../models/monitoring.model';

const POLL_INTERVAL_MS = 30_000;
const HISTORY_SIZE = 12;
const SERVICE_ICONS: Record<string, LucideIconData> = { Mercury: Send, Backbone: Database };

/** Clases completas y no armadas por partes: Tailwind solo genera las que encuentra escritas en el código. */
const TONES = {
  primary: { color: 'var(--chart-1)', background: 'bg-chart-1/15', text: 'text-chart-1' },
  good: { color: 'var(--chart-2)', background: 'bg-chart-2/15', text: 'text-chart-2' },
  bad: { color: 'var(--chart-5)', background: 'bg-chart-5/15', text: 'text-chart-5' },
  waiting: { color: 'var(--chart-4)', background: 'bg-chart-4/15', text: 'text-chart-4' },
};
type Tone = (typeof TONES)[keyof typeof TONES];

type Readings = Record<'total' | 'deliveryRate' | 'failed' | 'pending', number[]>;

/** Una campaña ya entregada, con fallos sin ninguna entrega, o todavía en curso. */
export function campaignStatus(campaign: OverviewCampaign): LogEntry['status'] {
  if (campaign.pending > 0 || campaign.delivered + campaign.failed === 0) return 'pending';
  return campaign.delivered === 0 ? 'failed' : 'delivered';
}

const formatNumber = (value: number) => value.toLocaleString('es-MX');

/**
 * Datos reales del dashboard: los pide al BFF y los mantiene al día mientras la pestaña está visible. Sin datos no
 * muestra cifras: `kpis` queda vacío y `error` o `available` explican el motivo.
 */
@Injectable({ providedIn: 'root' })
export class MonitoringDataService {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly url = `${inject(API_BASE_URL)}/monitoring/overview`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _loading = signal(false);
  private readonly _error = signal(false);
  private readonly _lastRefresh = signal<Date | null>(null);
  private readonly overview = signal<MonitoringOverview | null>(null);
  private readonly readings = signal<Readings>({ total: [], deliveryRate: [], failed: [], pending: [] });
  private pollers = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastRefresh = this._lastRefresh.asReadonly();
  /** `true` si Mercury entregó las campañas; `false` si responde pero no se pudieron leer. */
  readonly available = computed(() => this.overview()?.campaignsAvailable ?? false);
  readonly loaded = computed(() => this.overview() !== null);

  readonly kpis = computed<MonitoringKpi[]>(() => {
    const overview = this.overview();
    if (!overview?.campaignsAvailable) return [];
    const { total, deliveryRate, failed, pending } = overview.totals;
    const history = this.readings();
    return [
      this.kpi('Mensajes Totales', formatNumber(total), history.total, Send, TONES.primary),
      this.kpi('Tasa de Entrega', deliveryRate === null ? 'Sin datos' : `${(deliveryRate * 100).toFixed(1)}%`, history.deliveryRate, Target, TONES.good),
      { ...this.kpi('Fallidos', formatNumber(failed), history.failed, AlertTriangle, TONES.bad), invertTrend: true },
      { ...this.kpi('Pendientes', formatNumber(pending), history.pending, Clock, TONES.waiting), invertTrend: true },
    ];
  });

  readonly allLogs = computed<LogEntry[]>(() =>
    (this.overview()?.campaigns ?? []).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      provider: campaign.channel,
      status: campaignStatus(campaign),
      timestamp: campaign.createdAt ?? '',
      total: campaign.total,
      delivered: campaign.delivered,
      failed: campaign.failed,
    })),
  );

  /** Las diez campañas más recientes, para el inicio. */
  readonly logs = computed(() => this.allLogs().slice(0, 10));

  readonly services = computed<ServiceStatus[]>(() =>
    (this.overview()?.services ?? []).map((service) => ({
      name: service.name,
      status: service.status,
      latency: service.latencyMs,
      icon: SERVICE_ICONS[service.name] ?? Server,
    })),
  );

  readonly overallStatus = computed(() => {
    const services = this.services();
    if (services.length === 0) return 'unknown';
    if (services.some((s) => s.status === 'down')) return 'major-outage';
    if (services.some((s) => s.status === 'degraded')) return 'partial-degradation';
    return 'all-operational';
  });

  /**
   * Mantiene los datos al día mientras dure `destroyRef`. Las páginas comparten un solo temporizador, y una pestaña
   * oculta no consulta nada.
   */
  poll(destroyRef: DestroyRef): void {
    if (!this.isBrowser) return;
    this.pollers += 1;
    if (this.timer === null) {
      void this.refresh();
      // fuera de la zona: un temporizador permanente dentro de ella impediría que la aplicación quede estable
      this.zone.runOutsideAngular(() => {
        this.timer = setInterval(() => {
          if (!document.hidden) this.zone.run(() => void this.refresh());
        }, POLL_INTERVAL_MS);
      });
    }
    destroyRef.onDestroy(() => {
      this.pollers -= 1;
      if (this.pollers === 0 && this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    });
  }

  async refresh(): Promise<void> {
    this._loading.set(true);
    try {
      this.apply(await firstValueFrom(this.http.get<MonitoringOverview>(this.url)));
      this._error.set(false);
    } catch {
      this._error.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  /** Incorpora una lectura y suma sus valores a la historia de las tendencias. */
  apply(overview: MonitoringOverview): void {
    this.overview.set(overview);
    this._lastRefresh.set(new Date());
    if (!overview.campaignsAvailable) return;
    const { total, deliveryRate, failed, pending } = overview.totals;
    const add = (values: number[], value: number) => [...values, value].slice(-HISTORY_SIZE);
    this.readings.update((history) => ({
      total: add(history.total, total),
      deliveryRate: add(history.deliveryRate, deliveryRate === null ? 0 : deliveryRate * 100),
      failed: add(history.failed, failed),
      pending: add(history.pending, pending),
    }));
  }

  private kpi(title: string, value: string, history: number[], icon: LucideIconData, tone: Tone): MonitoringKpi {
    const previous = history.at(-2);
    const current = history.at(-1);
    return {
      title,
      value,
      // la tendencia es la diferencia con la lectura anterior: sin anterior no hay tendencia que mostrar
      trend: previous === undefined || current === undefined ? null : Math.round((current - previous) * 10) / 10,
      trendSuffix: '',
      trendLabel: 'vs. lectura anterior',
      icon,
      sparklineData: history,
      sparklineColor: tone.color,
      iconBgClass: tone.background,
      iconTextClass: tone.text,
    };
  }
}
