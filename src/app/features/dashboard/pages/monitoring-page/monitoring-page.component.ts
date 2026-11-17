import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, RefreshCw, TriangleAlert, X } from 'lucide-angular';
import { SuccessRingComponent } from '../../components/success-ring/success-ring.component';
import { TimeSeriesChartComponent } from '../../components/time-series-chart/time-series-chart.component';
import { MonitoringLiveService } from '../../services/monitoring-live.service';
import { AlertRule, AlertRuleRequest, AlertType, MessageItem, MonitoringRange } from '../../models/monitoring-live.model';
import {
  ALERT_TYPES, OVERALL_LABELS, RANGES, SERVICES, STATE_DOT, STATE_LABELS, channelLabel, duration, formatNumber, kindLabel, parseUtc, percent, ruleLabel,
} from '../../utils/monitoring-live';

const CONNECTION_LABELS = { connecting: 'Conectando…', live: 'En vivo', polling: 'Actualizando cada 15 s', offline: 'Sin conexión' } as const;

/** Lo que se escribe en el formulario de una regla nueva; los números quedan como texto hasta guardar. */
export interface RuleDraft { type: AlertType; threshold: string; windowMinutes: string; minVolume: string; service: string; emails: string }

const EMPTY_DRAFT: RuleDraft = { type: 'FAILURE_RATE', threshold: '20', windowMinutes: '15', minVolume: '10', service: '', emails: '' };

/** La vista de monitoreo: envíos por canal y tipo, fallos, códigos de verificación, salud de los servicios y mensajes, todo enlazado por los mismos filtros. */
@Component({
  selector: 'app-monitoring-page',
  standalone: true,
  imports: [LucideAngularModule, DatePipe, SuccessRingComponent, TimeSeriesChartComponent],
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

  readonly draft = signal<RuleDraft>({ ...EMPTY_DRAFT });
  readonly saving = signal(false);
  /** Las alertas que están sonando ahora. */
  readonly firing = computed(() => (this.live.alerts()?.alerts ?? []).filter((a) => a.status === 'FIRING'));
  /** Las que ya se resolvieron, de la más reciente a la más antigua. */
  readonly resolved = computed(() => (this.live.alerts()?.alerts ?? []).filter((a) => a.status === 'RESOLVED').slice(0, 5));
  readonly draftError = computed(() => draftProblem(this.draft()));

  constructor() {
    this.live.start(inject(DestroyRef));
  }

  setRange(range: MonitoringRange): void {
    this.live.setRange(range);
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
