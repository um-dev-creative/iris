import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideAngularModule, RefreshCw, TriangleAlert, X } from 'lucide-angular';
import { SuccessRingComponent } from '../../components/success-ring/success-ring.component';
import { TimeSeriesChartComponent } from '../../components/time-series-chart/time-series-chart.component';
import { MonitoringLiveService } from '../../services/monitoring-live.service';
import { MonitoringRange } from '../../models/monitoring-live.model';
import {
  OVERALL_LABELS, RANGES, STATE_DOT, STATE_LABELS, channelLabel, duration, formatNumber, kindLabel, parseUtc, percent,
} from '../../utils/monitoring-live';

const CONNECTION_LABELS = { connecting: 'Conectando…', live: 'En vivo', polling: 'Actualizando cada 15 s', offline: 'Sin conexión' } as const;

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
  /** Las fechas de Mercury no llevan zona: son UTC. */
  readonly utc = parseUtc;

  readonly connectionLabel = computed(() => CONNECTION_LABELS[this.live.connection()]);
  readonly overallLabel = computed(() => OVERALL_LABELS[this.live.health()?.overall ?? 'UNKNOWN']);
  readonly pages = computed(() => `Página ${(this.live.messages()?.page ?? 0) + 1} de ${this.live.totalPages()}`);
  readonly selectedBucket = computed(() => this.live.bucket()?.bucket ?? null);

  constructor() {
    this.live.start(inject(DestroyRef));
  }

  setRange(range: MonitoringRange): void {
    this.live.setRange(range);
  }
}
