import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CircleCheck, CircleX, LucideAngularModule, RefreshCw, TriangleAlert, X } from 'lucide-angular';
import { AnimatedNumberComponent } from '../../components/animated-number/animated-number.component';
import { RatioBarComponent } from '../../components/ratio-bar/ratio-bar.component';
import { TimeSeriesChartComponent } from '../../components/time-series-chart/time-series-chart.component';
import { TrendSparkComponent } from '../../components/trend-spark/trend-spark.component';
import { MonitoringLiveService } from '../../services/monitoring-live.service';
import { AlertRule, AlertRuleRequest, AlertType, FailureCause, MessageItem, MonitoringRange, OutagePeriod, SummaryResponse, Totals } from '../../models/monitoring-live.model';
import {
  ALERT_TYPES, OVERALL_LABELS, RANGES, SERVICES, STATE_DOT, STATE_LABELS, channelLabel, duration, formatNumber, kindLabel, parseUtc, percent, ruleLabel,
} from '../../utils/monitoring-live';

/** Desde aquí la tasa de éxito es sana o, por debajo de `WATCH`, crítica. */
const HEALTHY = 0.95;
const WATCH = 0.8;

const SEARCH_DELAY_MS = 300;
/** Los periodos del historial: el de la página o uno propio; 90 días es todo lo que Mercury guarda. */
export const OUTAGE_PERIODS: { value: OutagePeriod; label: string }[] = [
  { value: 'page', label: 'El periodo de la página' },
  { value: '24h', label: 'Últimas 24 h' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'custom', label: 'Elegir fechas…' },
];
const RANGE_WORDS: Record<MonitoringRange, string> = { '1h': 'última hora', '24h': 'últimas 24 h', '7d': 'últimos 7 días', '30d': 'últimos 30 días' };

const CONNECTION_LABELS = { connecting: 'Conectando…', live: 'En vivo', polling: 'Actualizando cada 15 s', offline: 'Sin conexión' } as const;

/** Lo que se escribe en el formulario de una regla nueva; los números quedan como texto hasta guardar. */
export interface RuleDraft { type: AlertType; threshold: string; windowMinutes: string; minVolume: string; service: string; emails: string }

const EMPTY_DRAFT: RuleDraft = { type: 'FAILURE_RATE', threshold: '20', windowMinutes: '15', minVolume: '10', service: '', emails: '' };

/** La vista de monitoreo: envíos por canal y tipo, fallos, códigos de verificación, salud de los servicios y mensajes, todo enlazado por los mismos filtros. */
@Component({
  selector: 'app-monitoring-page',
  standalone: true,
  imports: [LucideAngularModule, DatePipe, TimeSeriesChartComponent, TrendSparkComponent, AnimatedNumberComponent, RatioBarComponent],
  providers: [MonitoringLiveService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './monitoring-page.component.html',
  styleUrl: './monitoring-page.component.css',
})
export class MonitoringPageComponent {
  readonly live = inject(MonitoringLiveService);

  readonly RefreshIcon = RefreshCw;
  readonly WarningIcon = TriangleAlert;
  readonly CloseIcon = X;
  readonly ranges = RANGES;
  readonly stateLabels = STATE_LABELS;
  readonly stateDot = STATE_DOT;
  readonly channelLabel = channelLabel;
  readonly kindLabel = kindLabel;
  readonly percent = percent;
  readonly formatNumber = formatNumber;
  readonly duration = duration;
  readonly alertTypes = ALERT_TYPES;
  readonly services = SERVICES;
  readonly ruleLabel = ruleLabel;
  /** Las fechas de Mercury no llevan zona: son UTC. */
  readonly utc = parseUtc;

  readonly connectionLabel = computed(() => CONNECTION_LABELS[this.live.connection()]);
  readonly overallLabel = computed(() => OVERALL_LABELS[this.live.health()?.overall ?? 'UNKNOWN']);
  readonly pages = computed(() => `Página ${(this.live.messages()?.page ?? 0) + 1} de ${this.live.totalPages()}`);
  readonly selectedBucket = computed(() => this.live.bucket()?.bucket ?? null);
  /** Enviados y fallidos de cada intervalo del periodo, para la tendencia de las tarjetas. */
  readonly sentTrend = computed(() => (this.live.series()?.points ?? []).map((p) => p.sent));
  readonly failedTrend = computed(() => (this.live.series()?.points ?? []).map((p) => p.failed));

  readonly outagePeriods = OUTAGE_PERIODS;
  /** Lo escrito en la búsqueda del historial; se pide a Mercury un momento después de la última tecla. */
  readonly outageSearch = signal('');
  readonly outagesLoading = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  /** Qué ventana muestra el historial, en palabras. */
  readonly outageWindowLabel = computed(() => {
    const f = this.live.outageFilter();
    if (f.period === 'page') return RANGE_WORDS[this.live.range()];
    if (f.period === 'custom') {
      const r = this.live.outages();
      return r?.from ? `del ${this.shortDate(r.from)} al ${r.to ? this.shortDate(r.to) : 'ahora'} (UTC)` : 'periodo propio';
    }
    return OUTAGE_PERIODS.find((p) => p.value === f.period)!.label.toLowerCase();
  });

  readonly draft = signal<RuleDraft>({ ...EMPTY_DRAFT });
  readonly saving = signal(false);
  /** Las alertas que están sonando ahora. */
  readonly firing = computed(() => (this.live.alerts()?.alerts ?? []).filter((a) => a.status === 'FIRING'));
  /** Las que ya se resolvieron, de la más reciente a la más antigua. */
  readonly resolved = computed(() => (this.live.alerts()?.alerts ?? []).filter((a) => a.status === 'RESOLVED').slice(0, 5));
  readonly draftError = computed(() => draftProblem(this.draft()));

  /** Las aplicaciones entre las que se puede elegir: todas (lo normal, el monitoreo es de Mercury) o una de las que la persona puede mirar. */
  readonly applicationOptions = computed(() => {
    const data = this.live.applications();
    return data && data.applications.length > 0 ? [{ id: '', name: 'Todas las aplicaciones' }, ...data.applications] : [];
  });
  readonly selectedApplication = computed(() => this.live.application() ?? '');
  /** Mercury no tiene sus tablas de monitoreo, o no pudo registrar envíos: las vistas están vacías aunque se envíe. */
  readonly storage = computed(() => this.live.health()?.storage ?? null);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.live.start(destroyRef);
    destroyRef.onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
  }

  /** El texto se busca en Mercury (en todas las páginas), 300 ms después de la última tecla. */
  onOutageSearch(value: string): void {
    this.outageSearch.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.live.setOutageFilter({ q: value }), SEARCH_DELAY_MS);
  }

  clearOutages(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.outageSearch.set('');
    this.live.clearOutageFilter();
  }

  /** Ahora en UTC, como valor de `<input type="datetime-local">`: no se puede pedir el futuro. */
  nowInput(): string {
    return new Date().toISOString().slice(0, 16);
  }

  private shortDate(value: string): string {
    const d = parseUtc(value);
    const two = (n: number) => String(n).padStart(2, '0');
    return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
  }

  /** La parte de los intentos (enviados + fallidos) que falló, o null sin intentos. */
  failureRate(totals: Totals): number | null {
    const attempts = totals.sent + totals.failed;
    return attempts > 0 ? totals.failed / attempts : null;
  }

  /** La parte de todos los intentos del periodo que hizo un canal, o null sin intentos. */
  volumeShare(summary: SummaryResponse, attempts: number): number | null {
    const total = summary.totals.sent + summary.totals.failed;
    return total > 0 ? attempts / total : null;
  }

  /** El ancho de la barra de una causa, en % de la más frecuente (que llena la pista). */
  causeShare(total: number, causes: FailureCause[]): number {
    const top = Math.max(1, ...causes.map((c) => c.total));
    return (Math.max(0, total) / top) * 100;
  }

  /** La tasa como número de 0 a 100 para el medidor; 0 sin datos. */
  ratePercent(rate: number | null): number {
    return rate === null ? 0 : Math.round(Math.min(1, Math.max(0, rate)) * 1000) / 10;
  }

  /** El estado de la tasa de éxito, con icono y texto (el color nunca va solo); null sin envíos. */
  health(rate: number | null): { label: string; css: string; color: string; icon: typeof CircleCheck } | null {
    if (rate === null) return null;
    if (rate >= HEALTHY) return { label: 'Saludable', css: 'is-good', color: 'var(--success)', icon: CircleCheck };
    if (rate >= WATCH) return { label: 'Atención', css: 'is-warn', color: 'var(--warning)', icon: TriangleAlert };
    return { label: 'Crítico', css: 'is-bad', color: 'var(--destructive)', icon: CircleX };
  }

  setRange(range: MonitoringRange): void {
    this.live.setRange(range);
  }

  chooseApplication(id: string): void {
    this.live.selectApplication(id || null);
  }

  canRetry(item: MessageItem): boolean {
    return item.status === 'FAILED' && item.channel === 'EMAIL' && !!item.messageId;
  }

  retry(item: MessageItem): void {
    void this.live.retry(item);
  }

  patchDraft(patch: Partial<RuleDraft>): void {
    this.draft.update((d) => ({ ...d, ...patch }));
  }

  async createRule(): Promise<void> {
    const request = toRequest(this.draft());
    if (this.draftError() || this.saving()) return;
    this.saving.set(true);
    const saved = await this.live.saveRule(request);
    this.saving.set(false);
    if (saved) this.draft.set({ ...EMPTY_DRAFT });
  }

  toggleRule(rule: AlertRule): void {
    void this.live.saveRule(
      {
        type: rule.type, threshold: rule.threshold, windowMinutes: rule.windowMinutes, minVolume: rule.minVolume,
        ...(rule.service ? { service: rule.service } : {}), notifyEmails: rule.notifyEmails, enabled: !rule.enabled,
      },
      rule.id,
    );
  }

  deleteRule(rule: AlertRule): void {
    void this.live.deleteRule(rule.id);
  }

  exportAs(format: 'csv' | 'json'): void {
    void this.live.exportMessages(format);
  }
}

const EMAIL = /^[^\s@,;]{1,64}@[^\s@,;]{1,255}$/;

/** Lo que está mal en el formulario, o `null` si se puede guardar. Mercury vuelve a validar todo. */
export function draftProblem(d: RuleDraft): string | null {
  const window = Number(d.windowMinutes);
  if (!Number.isInteger(window) || window < 1 || window > 1440) return 'La ventana debe ser de 1 a 1440 minutos.';
  if (d.type !== 'SERVICE_DOWN') {
    const threshold = Number(d.threshold);
    if (d.threshold.trim() === '' || !Number.isFinite(threshold) || threshold <= 0) return 'El umbral debe ser mayor que 0.';
    if (d.type === 'FAILURE_RATE' && threshold > 100) return 'El umbral de la tasa de fallos es un porcentaje, hasta 100.';
  }
  if (d.type === 'FAILURE_RATE') {
    const volume = Number(d.minVolume);
    if (d.minVolume.trim() === '' || !Number.isInteger(volume) || volume < 0) return 'El mínimo de mensajes debe ser 0 o más.';
  }
  const emails = splitEmails(d.emails);
  if (emails.length > 5) return 'Como máximo 5 correos.';
  if (emails.some((e) => !EMAIL.test(e))) return 'Hay un correo que no es válido.';
  return null;
}

const splitEmails = (text: string) => text.split(',').map((e) => e.trim()).filter((e) => e.length > 0);

/** El cuerpo que recibe Mercury; solo lleva lo que aplica al tipo. */
export function toRequest(d: RuleDraft): AlertRuleRequest {
  const emails = splitEmails(d.emails);
  return {
    type: d.type,
    windowMinutes: Number(d.windowMinutes),
    ...(d.type === 'SERVICE_DOWN' ? {} : { threshold: Number(d.threshold) }),
    ...(d.type === 'FAILURE_RATE' ? { minVolume: Number(d.minVolume) } : {}),
    ...(d.type === 'SERVICE_DOWN' && d.service ? { service: d.service } : {}),
    notifyEmails: emails,
    enabled: true,
  };
}
