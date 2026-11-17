import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SeriesPoint } from '../../models/monitoring-live.model';
import { bucketLabel, formatNumber } from '../../utils/monitoring-live';

const WIDTH = 640;
const HEIGHT = 200;
const TOP = 8;
const BOTTOM = 24;
const GAP = 2;

export interface Bar { point: SeriesPoint; x: number; width: number; sentY: number; sentHeight: number; failedY: number; failedHeight: number; label: string; text: string }

/**
 * Barras apiladas de enviados y fallidos por intervalo. Cada barra es un botón: al elegirla la página filtra los mensajes de ese
 * intervalo. Sin puntos dice que no hay datos en vez de dibujar un eje vacío.
 */
@Component({
  selector: 'app-time-series-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (bars().length === 0) {
      <p class="text-sm text-muted-foreground py-8 text-center">Sin datos en este periodo.</p>
    } @else {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full h-auto" role="group" aria-label="Envíos por intervalo">
        <line [attr.x1]="0" [attr.x2]="width" [attr.y1]="baseline" [attr.y2]="baseline" stroke="var(--border)" />
        @for (bar of bars(); track bar.point.bucket) {
          <g role="button" tabindex="0" [attr.aria-label]="bar.text" [attr.aria-pressed]="bar.point.bucket === selected()" class="cursor-pointer outline-none focus-visible:opacity-100"
             [attr.opacity]="selected() && bar.point.bucket !== selected() ? 0.35 : 1"
             (click)="choose(bar.point)" (keydown.enter)="choose(bar.point)" (keydown.space)="choose(bar.point); $event.preventDefault()">
            <title>{{ bar.text }}</title>
            <rect [attr.x]="bar.x" [attr.y]="top" [attr.width]="bar.width" [attr.height]="baseline - top" fill="transparent" />
            <rect [attr.x]="bar.x" [attr.y]="bar.sentY" [attr.width]="bar.width" [attr.height]="bar.sentHeight" fill="var(--chart-2)" />
            <rect [attr.x]="bar.x" [attr.y]="bar.failedY" [attr.width]="bar.width" [attr.height]="bar.failedHeight" fill="var(--chart-5)" />
          </g>
        }
        @for (tick of ticks(); track tick.x) {
          <text [attr.x]="tick.x" [attr.y]="height - 6" text-anchor="middle" font-size="10" class="fill-muted-foreground">{{ tick.label }}</text>
        }
      </svg>
      <div class="flex gap-4 text-xs text-muted-foreground mt-2">
        <span class="inline-flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background: var(--chart-2)"></span>Enviados</span>
        <span class="inline-flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background: var(--chart-5)"></span>Fallidos</span>
      </div>
    }
  `,
})
export class TimeSeriesChartComponent {
  readonly points = input<SeriesPoint[]>([]);
  readonly unit = input('hour');
  /** El `bucket` de la barra elegida, o null. */
  readonly selected = input<string | null>(null);
  readonly bucketSelected = output<SeriesPoint>();

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly top = TOP;
  readonly baseline = HEIGHT - BOTTOM;

  readonly bars = computed<Bar[]>(() => {
    const points = this.points();
    if (points.length === 0) return [];
    const max = Math.max(1, ...points.map((p) => p.sent + p.failed));
    const slot = WIDTH / points.length;
    const usable = this.baseline - TOP;
    return points.map((point, i) => {
      const sentHeight = (point.sent / max) * usable;
      const failedHeight = (point.failed / max) * usable;
      return {
        point,
        x: i * slot + GAP / 2,
        width: Math.max(1, slot - GAP),
        sentY: this.baseline - sentHeight,
        sentHeight,
        failedY: this.baseline - sentHeight - failedHeight,
        failedHeight,
        label: bucketLabel(point.bucket, this.unit()),
        text: `${bucketLabel(point.bucket, this.unit())}: ${formatNumber(point.sent)} enviados, ${formatNumber(point.failed)} fallidos`,
      };
    });
  });

  /** A lo más seis etiquetas en el eje, repartidas. */
  readonly ticks = computed(() => {
    const bars = this.bars();
    const step = Math.max(1, Math.ceil(bars.length / 6));
    return bars.filter((_, i) => i % step === 0).map((bar) => ({ x: bar.x + bar.width / 2, label: bar.label }));
  });

  choose(point: SeriesPoint): void {
    this.bucketSelected.emit(point);
  }
}
