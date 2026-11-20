import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { SeriesPoint } from '../../models/monitoring-live.model';
import { bucketLabel, bucketWindow, formatNumber, parseUtc, percent } from '../../utils/monitoring-live';
import { compactNumber, niceScale } from '../../utils/chart-scale';

const WIDTH = 640;
const HEIGHT = 220;
const TOP = 10;
const BOTTOM = 24;
const LEFT = 40;
const RIGHT = 6;
const GAP = 2;

export interface Bar {
  point: SeriesPoint; x: number; width: number; sentY: number; sentHeight: number; failedY: number; failedHeight: number;
  label: string; text: string; total: number; rate: number | null; current: boolean;
}

/**
 * Barras apiladas de enviados y fallidos por intervalo, con eje de cantidades y líneas guía para leer valores exactos. Al pasar el
 * puntero (o enfocar con el teclado) una barra muestra su detalle: intervalo, enviados, fallidos y tasa de fallos. Cada barra es un
 * botón: al elegirla la página filtra los mensajes de ese intervalo. El intervalo en curso se distingue porque aún no está completo.
 * Las barras crecen al aparecer y cambian de altura con suavidad cuando llegan datos nuevos.
 */
@Component({
  selector: 'app-time-series-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (bars().length === 0) {
      <p class="text-sm text-muted-foreground py-8 text-center">Sin datos en este periodo.</p>
    } @else {
      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-2" data-testid="series-totals">
        <div class="flex gap-1"><dt>Total:</dt><dd class="font-semibold text-foreground">{{ format(totals().sent + totals().failed) }}</dd></div>
        <div class="flex gap-1"><dt>Enviados:</dt><dd class="font-semibold text-foreground">{{ format(totals().sent) }}</dd></div>
        <div class="flex gap-1"><dt>Fallidos:</dt><dd class="font-semibold text-foreground">{{ format(totals().failed) }}</dd></div>
        @if (peak(); as p) { <div class="flex gap-1"><dt>Pico:</dt><dd class="font-semibold text-foreground">{{ format(p.total) }} · {{ p.label }}</dd></div> }
      </dl>
      <div class="relative">
        <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full h-auto overflow-visible" role="group" aria-label="Envíos por intervalo" (mouseleave)="hovered.set(null)">
          <defs>
            <pattern id="iris-current-bucket" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--chart-2)" opacity="0.55" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--card)" stroke-width="2" opacity="0.6" />
            </pattern>
          </defs>
          @for (g of grid(); track g.value) {
            <line [attr.x1]="left" [attr.x2]="width - right" [attr.y1]="g.y" [attr.y2]="g.y" stroke="var(--border)" [attr.stroke-dasharray]="g.value === 0 ? null : '3 4'" />
            <text [attr.x]="left - 6" [attr.y]="g.y + 3" text-anchor="end" font-size="10" class="fill-muted-foreground" data-testid="y-tick">{{ g.label }}</text>
          }
          @for (bar of bars(); track bar.point.bucket) {
            <g role="button" tabindex="0" [attr.aria-label]="bar.text" [attr.aria-pressed]="bar.point.bucket === selected()" class="iris-bar-group cursor-pointer outline-none"
               [attr.opacity]="selected() && bar.point.bucket !== selected() ? 0.35 : 1"
               (click)="choose(bar.point)" (keydown.enter)="choose(bar.point)" (keydown.space)="choose(bar.point); $event.preventDefault()"
               (mouseenter)="hovered.set(bar.point.bucket)" (focus)="hovered.set(bar.point.bucket)" (blur)="hovered.set(null)">
              <title>{{ bar.text }}</title>
              <rect [attr.x]="bar.x" [attr.y]="top" [attr.width]="bar.width" [attr.height]="baseline - top" [attr.fill]="hovered() === bar.point.bucket ? 'var(--muted)' : 'transparent'" rx="2" />
              <rect class="iris-bar" [attr.x]="bar.x" [attr.width]="bar.width" [attr.y]="bar.sentY" [attr.height]="bar.sentHeight" [style.y.px]="bar.sentY" [style.height.px]="bar.sentHeight"
                    [attr.fill]="bar.current ? 'url(#iris-current-bucket)' : 'var(--chart-2)'" data-testid="sent-bar" />
              <rect class="iris-bar" [attr.x]="bar.x" [attr.width]="bar.width" [attr.y]="bar.failedY" [attr.height]="bar.failedHeight" [style.y.px]="bar.failedY" [style.height.px]="bar.failedHeight"
                    fill="var(--chart-5)" />
            </g>
          }
          @for (tick of ticks(); track tick.x) {
            <text [attr.x]="tick.x" [attr.y]="height - 6" text-anchor="middle" font-size="10" class="fill-muted-foreground">{{ tick.label }}</text>
          }
        </svg>
        @if (hoveredBar(); as h) {
          <div class="pointer-events-none absolute top-0 z-10 min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
               [style.left.%]="h.left" [style.transform]="'translateX(' + h.shift + '%)'" role="status" data-testid="tooltip">
            <p class="font-semibold">{{ h.window }}@if (h.bar.current) { <span class="font-normal text-muted-foreground"> · en curso</span> }</p>
            <p class="mt-1 flex justify-between gap-4"><span class="inline-flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-sm" style="background: var(--chart-2)"></span>Enviados</span><span class="font-medium tabular-nums">{{ format(h.bar.point.sent) }}</span></p>
            <p class="flex justify-between gap-4"><span class="inline-flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-sm" style="background: var(--chart-5)"></span>Fallidos</span><span class="font-medium tabular-nums">{{ format(h.bar.point.failed) }}</span></p>
            <p class="flex justify-between gap-4 border-t border-border mt-1 pt-1"><span>Tasa de fallos</span><span class="font-medium tabular-nums">{{ rate(h.bar.rate) }}</span></p>
          </div>
        }
      </div>
      <div class="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
        <span class="inline-flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background: var(--chart-2)"></span>Enviados</span>
        <span class="inline-flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-sm" style="background: var(--chart-5)"></span>Fallidos</span>
        @if (hasCurrent()) {
          <span class="inline-flex items-center gap-1" data-testid="current-legend"><span class="inline-block w-3 h-3 rounded-sm iris-hatch"></span>Intervalo en curso (incompleto)</span>
        }
        <span class="ml-auto">Horas en UTC</span>
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
  /** El `bucket` bajo el puntero o con el foco, o null. */
  readonly hovered = signal<string | null>(null);

  readonly width = WIDTH;
  readonly height = HEIGHT;
  readonly top = TOP;
  readonly left = LEFT;
  readonly right = RIGHT;
  readonly baseline = HEIGHT - BOTTOM;
  readonly format = formatNumber;
  readonly rate = percent;

  /** El eje de cantidades: un máximo redondo por encima del mayor intervalo. */
  readonly scale = computed(() => niceScale(Math.max(0, ...this.points().map((p) => p.sent + p.failed))));

  readonly grid = computed(() => {
    const { max, ticks } = this.scale();
    const usable = this.baseline - TOP;
    return ticks.map((value) => ({ value, y: this.baseline - (value / max) * usable, label: compactNumber(value) }));
  });

  readonly bars = computed<Bar[]>(() => {
    const points = this.points();
    if (points.length === 0) return [];
    const max = this.scale().max;
    const slot = (WIDTH - LEFT - RIGHT) / points.length;
    const usable = this.baseline - TOP;
    const unit = this.unit();
    const now = Date.now();
    return points.map((point, i) => {
      const sentHeight = (point.sent / max) * usable;
      const failedHeight = (point.failed / max) * usable;
      const total = point.sent + point.failed;
      const current = i === points.length - 1 && parseUtc(bucketWindow(point, unit).to).getTime() > now;
      const label = bucketLabel(point.bucket, unit);
      return {
        point,
        x: LEFT + i * slot + GAP / 2,
        width: Math.max(1, slot - GAP),
        sentY: this.baseline - sentHeight,
        sentHeight,
        failedY: this.baseline - sentHeight - failedHeight,
        failedHeight,
        label,
        total,
        rate: total > 0 ? point.failed / total : null,
        current,
        text: `${label}: ${formatNumber(point.sent)} enviados, ${formatNumber(point.failed)} fallidos${current ? ' (en curso)' : ''}`,
      };
    });
  });

  /** A lo más seis etiquetas en el eje, repartidas. */
  readonly ticks = computed(() => {
    const bars = this.bars();
    const step = Math.max(1, Math.ceil(bars.length / 6));
    return bars.filter((_, i) => i % step === 0).map((bar) => ({ x: bar.x + bar.width / 2, label: bar.label }));
  });

  readonly totals = computed(() => this.points().reduce((sum, p) => ({ sent: sum.sent + p.sent, failed: sum.failed + p.failed }), { sent: 0, failed: 0 }));

  /** El intervalo con más mensajes, o null si no hubo ninguno. */
  readonly peak = computed(() => {
    const top = this.bars().reduce<Bar | null>((best, bar) => (bar.total > (best?.total ?? 0) ? bar : best), null);
    return top ? { total: top.total, label: top.label } : null;
  });

  readonly hasCurrent = computed(() => this.bars().some((b) => b.current));

  /** El detalle de la barra señalada y dónde ponerlo (en % del ancho, sin salirse por los lados). */
  readonly hoveredBar = computed(() => {
    const bucket = this.hovered();
    const bar = this.bars().find((b) => b.point.bucket === bucket);
    if (!bar) return null;
    const center = ((bar.x + bar.width / 2) / WIDTH) * 100;
    const unit = this.unit();
    const { from, to } = bucketWindow(bar.point, unit);
    const window = unit === 'day' ? bucketLabel(from, 'day') : `${bucketLabel(from, 'day')} ${bucketLabel(from, unit)}–${bucketLabel(to, unit)}`;
    return { bar, left: center, shift: center < 20 ? 0 : center > 80 ? -100 : -50, window };
  });

  choose(point: SeriesPoint): void {
    this.bucketSelected.emit(point);
  }
}
