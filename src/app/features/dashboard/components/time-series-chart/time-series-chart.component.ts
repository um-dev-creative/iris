import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { SeriesPoint } from '../../models/monitoring-live.model';
import { bucketLabel, bucketWindow, formatNumber, parseUtc, percent } from '../../utils/monitoring-live';
import { compactNumber, niceScale } from '../../utils/chart-scale';
import { Point, areaPath, columnPath, linePath, monotoneSegments, observeWidth } from '../../utils/chart-geometry';

/** Medidas en píxeles reales. El alto es fijo: el gráfico gana ancho en pantallas grandes, nunca alto. */
const LEFT = 44;
const RIGHT = 44;
const TOP = 14;
const MAIN_HEIGHT = 168;
const GAP = 30;
const RATE_HEIGHT = 52;
const AXIS = 22;
const BAR_MAX = 24;
const BAR_RADIUS = 4;
const STORAGE_KEY = 'iris.monitoring.chart-mode';

export type ChartMode = 'lines' | 'bars';

/** Un intervalo ya colocado en el gráfico. */
export interface Slot {
  point: SeriesPoint; index: number; x: number; band: number; label: string; total: number; rate: number | null; current: boolean;
  sentY: number; failedY: number; rateY: number;
  /** Columnas apiladas (enviados abajo, fallidos arriba, 2 px de aire entre ellas). */
  sentColumn: string; failedColumn: string;
}

/**
 * «Envíos en el tiempo»: enviados y fallidos por intervalo y, debajo y alineada, la tasa de fallos (dos gráficos con su propia escala,
 * nunca dos ejes en uno). Se dibuja como líneas suaves que pasan exactamente por cada valor, o como columnas apiladas.
 *
 * - **Cursor:** una línea vertical sigue al puntero y se ajusta al intervalo más cercano en los dos gráficos; la lectura muestra los
 *   tres valores. Con el teclado: flechas, Inicio/Fin, Enter para filtrar por el intervalo y Escape para soltar.
 * - **Elegir:** clic (o Enter) filtra la página por ese intervalo; el intervalo elegido queda marcado.
 * - **Intervalo en curso:** el último tramo va punteado (aún no está completo) y lo dice.
 * - **Movimiento:** las líneas se trazan al cambiar el periodo y se deforman con suavidad cuando llegan datos; nada se mueve con
 *   `prefers-reduced-motion`. Mientras se actualiza, el gráfico se queda y se atenúa (sin saltos).
 * - **Tabla:** los mismos datos como tabla, para leerlos sin el gráfico.
 */
@Component({
  selector: 'app-time-series-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './time-series-chart.component.css',
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <ul class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" aria-label="Leyenda">
        <li class="flex items-center gap-2"><span class="key" style="background: var(--viz-sent)"></span><span class="text-muted-foreground">Enviados</span>
          <strong class="font-semibold text-foreground" data-testid="legend-sent">{{ format(readout()?.point?.sent ?? totals().sent) }}</strong></li>
        <li class="flex items-center gap-2"><span class="key" style="background: var(--viz-failed)"></span><span class="text-muted-foreground">Fallidos</span>
          <strong class="font-semibold text-foreground" data-testid="legend-failed">{{ format(readout()?.point?.failed ?? totals().failed) }}</strong></li>
        <li class="text-xs text-muted-foreground" data-testid="legend-scope">{{ readout() ? readout()!.window : 'Total del periodo' }}</li>
      </ul>
      <div class="flex items-center gap-2">
        <div class="seg" role="group" aria-label="Tipo de gráfico">
          <button type="button" [attr.aria-pressed]="mode() === 'lines'" (click)="setMode('lines')" data-testid="mode-lines">Líneas</button>
          <button type="button" [attr.aria-pressed]="mode() === 'bars'" (click)="setMode('bars')" data-testid="mode-bars">Columnas</button>
        </div>
        <button type="button" class="seg-single" [attr.aria-pressed]="table()" (click)="table.set(!table())" data-testid="table-toggle">{{ table() ? 'Ver gráfico' : 'Ver tabla' }}</button>
      </div>
    </div>

    @if (slots().length === 0) {
      <p class="text-sm text-muted-foreground py-10 text-center">Sin datos en este periodo.</p>
    } @else if (table()) {
      <div class="max-h-80 overflow-auto rounded-lg border border-border" data-testid="series-table">
        <table class="w-full text-sm">
          <caption class="sr-only">Envíos por intervalo (UTC)</caption>
          <thead class="sticky top-0 bg-muted text-muted-foreground"><tr><th class="px-3 py-2 text-left font-medium">Intervalo (UTC)</th><th class="px-3 py-2 text-right font-medium">Enviados</th><th class="px-3 py-2 text-right font-medium">Fallidos</th><th class="px-3 py-2 text-right font-medium">Tasa de fallos</th></tr></thead>
          <tbody>
            @for (s of slots(); track s.point.bucket) {
              <tr class="border-t border-border" [class.bg-muted]="s.point.bucket === selected()">
                <td class="px-3 py-1.5">{{ windowOf(s) }}@if (s.current) { <span class="text-muted-foreground"> · en curso</span> }</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ format(s.point.sent) }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ format(s.point.failed) }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ rate(s.rate) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div #host class="relative w-full select-none transition-opacity duration-300" [class.opacity-60]="loading()">
        <div class="plot outline-none rounded-lg" tabindex="0" role="group" data-testid="trend-plot"
             [attr.aria-label]="'Envíos por intervalo, ' + slots().length + ' intervalos. Flechas para recorrerlos, Enter para filtrar los mensajes de uno.'"
             (keydown)="onKey($event)" (blur)="hover.set(null)">
          <svg [attr.width]="width()" [attr.height]="height" [attr.viewBox]="'0 0 ' + width() + ' ' + height" class="block overflow-visible" aria-hidden="true">
            <!-- intervalo elegido -->
            @if (selectedSlot(); as s) {
              <rect [attr.x]="s.x - s.band / 2" [attr.y]="top" [attr.width]="s.band" [attr.height]="rateBottom - top" rx="4" class="fill-muted" />
            }
            <!-- rejilla y eje de cantidades -->
            @for (g of grid(); track g.value) {
              <line [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="g.y" [attr.y2]="g.y" stroke="var(--border)" stroke-width="1" />
              <text [attr.x]="left - 8" [attr.y]="g.y + 3.5" text-anchor="end" class="tick" data-testid="y-tick">{{ g.label }}</text>
            }
            <!-- marcas -->
            @for (k of [drawKey()]; track k) {
              @if (mode() === 'lines') {
                <path class="wash" [attr.d]="sentArea()" [style.d]="css(sentArea())" fill="var(--viz-sent)" />
                <path class="wash" [attr.d]="failedArea()" [style.d]="css(failedArea())" fill="var(--viz-failed)" />
                <path class="line draw" [attr.d]="sentLine().done" [style.d]="css(sentLine().done)" stroke="var(--viz-sent)" pathLength="1" data-testid="sent-line" />
                <path class="line draw" [attr.d]="failedLine().done" [style.d]="css(failedLine().done)" stroke="var(--viz-failed)" pathLength="1" data-testid="failed-line" />
                @if (sentLine().current) {
                  <path class="line current" [attr.d]="sentLine().current" stroke="var(--viz-sent)" data-testid="current-segment" />
                  <path class="line current" [attr.d]="failedLine().current" stroke="var(--viz-failed)" />
                }
                @for (label of endLabels(); track label.key) {
                  <text [attr.x]="label.x" [attr.y]="label.y + 3.5" class="end-label" data-testid="end-label">{{ label.text }}</text>
                }
              } @else {
                @for (s of slots(); track s.point.bucket) {
                  <path class="column" [class.current]="s.current" [attr.d]="s.sentColumn" [style.d]="css(s.sentColumn)" fill="var(--viz-sent)" data-testid="sent-column" />
                  <path class="column" [class.current]="s.current" [attr.d]="s.failedColumn" [style.d]="css(s.failedColumn)" fill="var(--viz-failed)" />
                }
              }
              <!-- tasa de fallos -->
              <path class="wash" [attr.d]="rateArea()" [style.d]="css(rateArea())" fill="var(--viz-failed)" />
              <path class="line draw" [attr.d]="rateLine()" [style.d]="css(rateLine())" stroke="var(--viz-failed)" pathLength="1" data-testid="rate-line" />
            }
            <line [attr.x1]="left" [attr.x2]="width() - right" [attr.y1]="rateBottom" [attr.y2]="rateBottom" stroke="var(--border)" stroke-width="1" />
            <text [attr.x]="left" [attr.y]="rateTop - 10" class="sub-title">Tasa de fallos</text>
            <text [attr.x]="left - 8" [attr.y]="rateTop + 3.5" text-anchor="end" class="tick" data-testid="rate-tick">{{ rateScale().max }} %</text>
            <text [attr.x]="left - 8" [attr.y]="rateBottom + 3.5" text-anchor="end" class="tick">0 %</text>
            @if (currentSlot(); as c) {
              <text [attr.x]="c.x" [attr.y]="top - 4" text-anchor="middle" class="tick" data-testid="current-label">en curso</text>
            }
            <!-- eje de tiempo -->
            @for (t of xTicks(); track t.x) {
              <text [attr.x]="t.x" [attr.y]="height - 6" text-anchor="middle" class="tick">{{ t.label }}</text>
            }
            <!-- cursor -->
            @if (hovered(); as h) {
              <line class="crosshair" [attr.x1]="h.x" [attr.x2]="h.x" [attr.y1]="top" [attr.y2]="rateBottom" />
              @if (mode() === 'lines') {
                <circle class="dot" [attr.cx]="h.x" [attr.cy]="h.sentY" r="4" fill="var(--viz-sent)" />
                <circle class="dot" [attr.cx]="h.x" [attr.cy]="h.failedY" r="4" fill="var(--viz-failed)" />
              }
              <circle class="dot" [attr.cx]="h.x" [attr.cy]="h.rateY" r="4" fill="var(--viz-failed)" />
            }
            <!-- zona que recibe el puntero: todo el ancho de cada intervalo -->
            <rect [attr.x]="left" [attr.y]="top" [attr.width]="plotWidth()" [attr.height]="rateBottom - top" fill="transparent" class="cursor-crosshair"
                  data-testid="hit-area" (pointermove)="onPointer($event)" (pointerdown)="onPointer($event)" (pointerleave)="hover.set(null)" (click)="chooseHovered()" />
          </svg>

          @if (hovered(); as h) {
            <div class="tip" role="presentation" [style.left.px]="tipLeft(h)" data-testid="tooltip">
              <p class="text-xs text-muted-foreground mb-1">{{ windowOf(h) }}@if (h.current) { · en curso }</p>
              <p class="row"><span class="line-key" style="background: var(--viz-sent)"></span><strong>{{ format(h.point.sent) }}</strong><span>Enviados</span></p>
              <p class="row"><span class="line-key" style="background: var(--viz-failed)"></span><strong>{{ format(h.point.failed) }}</strong><span>Fallidos</span></p>
              <p class="row"><span class="line-key" style="background: var(--viz-failed); opacity: .5"></span><strong>{{ rate(h.rate) }}</strong><span>Tasa de fallos</span></p>
              <p class="mt-1 text-[11px] text-muted-foreground">{{ h.point.bucket === selected() ? 'Clic para quitar el filtro' : 'Clic para ver sus mensajes' }}</p>
            </div>
          }
        </div>
        <p class="sr-only" aria-live="polite" data-testid="readout">{{ announcement() }}</p>
      </div>
      <p class="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span data-testid="series-totals">Total {{ format(totals().sent + totals().failed) }} · pico {{ peak() ? format(peak()!.total) + (unit() === 'day' ? ' el ' : ' a las ') + peak()!.label : '—' }}</span>
        <span>{{ unit() === 'day' ? 'Fechas en UTC' : 'Horas en UTC' }}</span>
      </p>
    }
  `,
})
export class TimeSeriesChartComponent {
  readonly points = input<SeriesPoint[]>([]);
  readonly unit = input('hour');
  /** El `bucket` del intervalo elegido, o null. */
  readonly selected = input<string | null>(null);
  /** Mientras se actualiza, el gráfico se queda y se atenúa. */
  readonly loading = input(false);
  readonly bucketSelected = output<SeriesPoint>();

  /** Índice del intervalo bajo el cursor (puntero o teclado), o null. */
  readonly hover = signal<number | null>(null);
  readonly mode = signal<ChartMode>(readMode());
  readonly table = signal(false);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  readonly width = observeWidth(this.host, inject(DestroyRef));

  readonly left = LEFT;
  readonly right = RIGHT;
  readonly top = TOP;
  readonly mainBottom = TOP + MAIN_HEIGHT;
  readonly rateTop = TOP + MAIN_HEIGHT + GAP;
  readonly rateBottom = TOP + MAIN_HEIGHT + GAP + RATE_HEIGHT;
  readonly height = TOP + MAIN_HEIGHT + GAP + RATE_HEIGHT + AXIS;
  readonly format = formatNumber;
  readonly rate = percent;

  readonly plotWidth = computed(() => Math.max(40, this.width() - LEFT - RIGHT));

  /** En líneas cada serie va sola; en columnas se apilan, así que la escala cubre la suma. */
  readonly scale = computed(() => {
    const pts = this.points();
    const top = this.mode() === 'bars' ? Math.max(0, ...pts.map((p) => p.sent + p.failed)) : Math.max(0, ...pts.map((p) => Math.max(p.sent, p.failed)));
    return niceScale(top);
  });

  /** La tasa de fallos más alta del periodo, redondeada, en %; nunca más de 100. */
  readonly rateScale = computed(() => {
    const worst = Math.max(0, ...this.points().map((p) => (p.sent + p.failed > 0 ? (p.failed / (p.sent + p.failed)) * 100 : 0)));
    const scale = niceScale(worst, 2);
    return scale.max > 100 ? { max: 100, ticks: [0, 50, 100] } : scale;
  });

  readonly grid = computed(() => {
    const { max, ticks } = this.scale();
    return ticks.map((value) => ({ value, y: this.mainBottom - (value / max) * MAIN_HEIGHT, label: compactNumber(value) }));
  });

  readonly slots = computed<Slot[]>(() => {
    const pts = this.points();
    if (pts.length === 0) return [];
    const unit = this.unit();
    const band = this.plotWidth() / pts.length;
    const max = this.scale().max;
    const rateMax = this.rateScale().max;
    const now = Date.now();
    const thickness = Math.max(2, Math.min(BAR_MAX, band * 0.62));
    const y = (v: number) => this.mainBottom - (v / max) * MAIN_HEIGHT;
    return pts.map((point, index) => {
      const total = point.sent + point.failed;
      const rate = total > 0 ? point.failed / total : null;
      const x = LEFT + band * (index + 0.5);
      const sentHeight = (point.sent / max) * MAIN_HEIGHT;
      const failedHeight = (point.failed / max) * MAIN_HEIGHT;
      const gap = sentHeight > 0 && failedHeight > 0 ? 2 : 0;
      const barX = x - thickness / 2;
      return {
        point, index, x, band, total, rate,
        label: bucketLabel(point.bucket, unit),
        current: index === pts.length - 1 && parseUtc(bucketWindow(point, unit).to).getTime() > now,
        sentY: y(point.sent),
        failedY: y(point.failed),
        rateY: this.rateBottom - (((rate ?? 0) * 100) / rateMax) * RATE_HEIGHT,
        sentColumn: columnPath(barX, this.mainBottom - sentHeight, thickness, sentHeight, BAR_RADIUS, failedHeight === 0),
        failedColumn: columnPath(barX, this.mainBottom - sentHeight - gap - failedHeight, thickness, failedHeight, BAR_RADIUS),
      };
    });
  });

  /** Cambia al cambiar el periodo o el tipo de gráfico: las líneas se vuelven a trazar; con datos nuevos del mismo periodo, se deforman. */
  readonly drawKey = computed(() => `${this.mode()}|${this.unit()}|${this.points().length}|${this.points()[0]?.bucket ?? ''}`);

  readonly sentLine = computed(() => this.split(this.slots().map((s) => ({ x: s.x, y: s.sentY }))));
  readonly failedLine = computed(() => this.split(this.slots().map((s) => ({ x: s.x, y: s.failedY }))));
  readonly sentArea = computed(() => areaPath(this.slots().map((s) => ({ x: s.x, y: s.sentY })), this.mainBottom));
  readonly failedArea = computed(() => areaPath(this.slots().map((s) => ({ x: s.x, y: s.failedY })), this.mainBottom));
  readonly rateLine = computed(() => linePath(this.slots().map((s) => ({ x: s.x, y: s.rateY }))));
  readonly rateArea = computed(() => areaPath(this.slots().map((s) => ({ x: s.x, y: s.rateY })), this.rateBottom));

  /** Valor al final de cada línea, solo si no se pisan (si no, la leyenda los dice). */
  readonly endLabels = computed(() => {
    const last = this.slots().at(-1);
    if (!last) return [];
    const x = last.x + 8;
    const labels = [
      { key: 'sent', x, y: last.sentY, text: compactNumber(last.point.sent) },
      { key: 'failed', x, y: last.failedY, text: compactNumber(last.point.failed) },
    ];
    return Math.abs(last.sentY - last.failedY) >= 14 ? labels : [];
  });

  readonly xTicks = computed(() => {
    const slots = this.slots();
    const fit = Math.max(2, Math.floor(this.plotWidth() / 64));
    const step = Math.max(1, Math.ceil(slots.length / fit));
    return slots.filter((_, i) => i % step === 0).map((s) => ({ x: s.x, label: s.label }));
  });

  readonly hovered = computed(() => {
    const i = this.hover();
    return i === null ? null : (this.slots()[i] ?? null);
  });
  readonly selectedSlot = computed(() => this.slots().find((s) => s.point.bucket === this.selected()) ?? null);
  readonly currentSlot = computed(() => this.slots().find((s) => s.current) ?? null);

  /** Lo que muestra la leyenda: el intervalo señalado o, sin cursor, el total del periodo. */
  readonly readout = computed(() => {
    const h = this.hovered();
    return h ? { point: h.point, window: this.windowOf(h) } : null;
  });

  readonly announcement = computed(() => {
    const h = this.hovered();
    return h ? `${this.windowOf(h)}${h.current ? ', en curso' : ''}: ${formatNumber(h.point.sent)} enviados, ${formatNumber(h.point.failed)} fallidos, tasa de fallos ${percent(h.rate)}` : '';
  });

  readonly totals = computed(() => this.points().reduce((sum, p) => ({ sent: sum.sent + p.sent, failed: sum.failed + p.failed }), { sent: 0, failed: 0 }));
  readonly peak = computed(() => {
    const top = this.slots().reduce<Slot | null>((best, s) => (s.total > (best?.total ?? 0) ? s : best), null);
    return top ? { total: top.total, label: top.label } : null;
  });

  setMode(mode: ChartMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // without storage the choice just lasts while the page is open
    }
  }

  onPointer(event: PointerEvent): void {
    const target = event.currentTarget as Element | null;
    const rect = target?.getBoundingClientRect();
    const local = rect && rect.width > 0 ? ((event.clientX - rect.left) / rect.width) * this.plotWidth() : event.clientX - LEFT;
    this.hoverAt(Math.floor(local / (this.plotWidth() / Math.max(1, this.slots().length))));
  }

  hoverAt(index: number): void {
    const count = this.slots().length;
    if (count === 0) return;
    this.hover.set(Math.min(count - 1, Math.max(0, index)));
  }

  chooseHovered(): void {
    const h = this.hovered();
    if (h) this.bucketSelected.emit(h.point);
  }

  onKey(event: KeyboardEvent): void {
    const count = this.slots().length;
    if (count === 0) return;
    const current = this.hover() ?? this.selectedSlot()?.index ?? count - 1;
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1 };
    if (event.key in moves) {
      event.preventDefault();
      this.hoverAt(this.hover() === null && (event.key === 'ArrowRight' || event.key === 'ArrowLeft') ? current : moves[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (this.hover() === null) this.hoverAt(current);
      this.chooseHovered();
    } else if (event.key === 'Escape') {
      this.hover.set(null);
    }
  }

  /** «17/11 06:00–07:00» por horas o minutos; «17/11» por días. */
  windowOf(slot: Slot): string {
    const unit = this.unit();
    const { from, to } = bucketWindow(slot.point, unit);
    return unit === 'day' ? bucketLabel(from, 'day') : `${bucketLabel(from, 'day')} ${bucketLabel(from, unit)}–${bucketLabel(to, unit)}`;
  }

  /** La lectura se pega al cursor sin salirse del gráfico. */
  tipLeft(slot: Slot): number {
    const tipWidth = 200;
    const right = slot.x + 14;
    return right + tipWidth > this.width() ? Math.max(0, slot.x - 14 - tipWidth) : right;
  }

  /** `d` como propiedad CSS: así un cambio de datos se anima (donde el navegador lo admite). */
  css(path: string): string | null {
    return path ? `path("${path}")` : null;
  }

  /** La línea completa hasta el último intervalo terminado, y el último tramo aparte si está en curso (se dibuja punteado). */
  private split(points: Point[]): { done: string; current: string | null } {
    if (!this.slots().at(-1)?.current || points.length < 2) return { done: linePath(points), current: null };
    const segments = monotoneSegments(points);
    const start = points[0];
    const beforeLast = points[points.length - 2];
    return {
      done: `M${start.x},${start.y}${segments.slice(0, -1).join('')}`,
      current: `M${beforeLast.x},${beforeLast.y}${segments.at(-1)}`,
    };
  }
}

function readMode(): ChartMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'bars' ? 'bars' : 'lines';
  } catch {
    return 'lines';
  }
}
