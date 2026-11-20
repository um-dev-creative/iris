import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { areaPath, linePath, observeWidth } from '../../utils/chart-geometry';

const HEIGHT = 40;
const PAD = 5;

/**
 * Tendencia mínima de una tarjeta: línea de 2 px por cada intervalo del periodo, con un velo del 10 % y un punto en el último valor.
 * Se dibuja en píxeles reales (sin estirarse) y la escala va de 0 al mayor valor, para no exagerar cambios pequeños.
 * Es decorativa para el lector de pantalla: la cifra de la tarjeta y la tabla del gráfico llevan los valores.
 */
@Component({
  selector: 'app-trend-spark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <div #host class="w-full" [style.height.px]="height" aria-hidden="true">
      @if (points().length > 1) {
        <svg [attr.width]="width()" [attr.height]="height" class="block overflow-visible">
          <path [attr.d]="area()" [style.d]="css(area())" [attr.fill]="color()" class="spark-wash" />
          <path [attr.d]="line()" [style.d]="css(line())" [attr.stroke]="color()" class="spark-line" pathLength="1" data-testid="spark-line" />
          <circle [attr.cx]="last()!.x" [attr.cy]="last()!.y" r="3.5" [attr.fill]="color()" class="spark-dot" />
        </svg>
      }
    </div>
  `,
  styles: `
    .spark-wash { opacity: 0.1; transition: d 550ms cubic-bezier(0.16, 1, 0.3, 1); }
    .spark-line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1;
      transition: d 550ms cubic-bezier(0.16, 1, 0.3, 1); animation: spark-draw 900ms cubic-bezier(0.65, 0, 0.35, 1) both; }
    .spark-dot { stroke: var(--card); stroke-width: 2; transition: cx 550ms ease, cy 550ms ease; }
    @keyframes spark-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .spark-wash, .spark-line, .spark-dot { animation: none; transition: none; } }
  `,
})
export class TrendSparkComponent {
  readonly values = input<number[]>([]);
  readonly color = input('var(--viz-sent)');
  /** El valor más alto de la escala; sin él, el mayor de la serie. Una tasa usa 1. */
  readonly max = input<number | null>(null);

  readonly height = HEIGHT;
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  readonly width = observeWidth(this.host, inject(DestroyRef), 160);

  readonly points = computed(() => {
    const values = this.values();
    const top = this.max() ?? Math.max(0, ...values);
    const usable = HEIGHT - PAD * 2;
    const step = (this.width() - PAD * 2) / Math.max(1, values.length - 1);
    return values.map((v, i) => ({ x: PAD + i * step, y: PAD + usable - (top > 0 ? Math.min(1, Math.max(0, v / top)) : 0) * usable }));
  });
  readonly line = computed(() => linePath(this.points()));
  readonly area = computed(() => areaPath(this.points(), HEIGHT - PAD));
  readonly last = computed(() => this.points().at(-1) ?? null);

  css(path: string): string | null {
    return path ? `path("${path}")` : null;
  }
}
