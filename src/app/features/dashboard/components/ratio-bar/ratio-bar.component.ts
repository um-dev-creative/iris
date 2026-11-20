import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { formatNumber } from '../../utils/monitoring-live';
import { share } from '../../utils/chart-scale';
import { observeWidth } from '../../utils/chart-geometry';

/** Un tramo de la barra: su nombre, su valor y su color (una variable CSS, por ejemplo `var(--viz-sent)`). */
export interface RatioSegment { label: string; value: number; color: string }

/** Lo que mide, en píxeles, la etiqueta de un tramo alto («100 %») con su aire a los lados. */
const LABEL_PX = 46;

/**
 * Barra segmentada: un todo partido en sus partes, cada una con su ancho exacto (de `total`, o de la suma sin él) y 2 px de aire
 * entre ellas. Un tramo en cero no dibuja nada.
 * - `thin` (8 px, extremos redondos, sin texto): para filas que ya dicen las cifras al lado.
 * - `tall` (28 px, bloques con esquinas de 4 px): cada bloque lleva su porcentaje dentro, en blanco, solo si cabe.
 * Al pasar el puntero (o en el texto accesible) cada parte dice su nombre, su cantidad y su porcentaje.
 */
@Component({
  selector: 'app-ratio-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <div #host class="flex w-full gap-[2px]" [class.rounded-full]="variant() === 'thin'" [class.overflow-hidden]="variant() === 'thin'"
         [style.height.px]="variant() === 'tall' ? 28 : height()" role="img" [attr.aria-label]="description()">
      @for (s of parts(); track s.label) {
        <span class="iris-ratio-part relative flex h-full items-center overflow-visible" [class.rounded]="variant() === 'tall'"
              [style.width.%]="s.percent" [style.background]="s.color" [attr.title]="s.title" data-testid="ratio-part">
          @if (s.showLabel) { <span class="px-2 text-xs font-semibold text-white whitespace-nowrap" data-testid="ratio-label">{{ s.short }}</span> }
        </span>
      }
      @if (gapPercent() > 0) { <span class="h-full rounded-full bg-muted" [style.width.%]="gapPercent()"></span> }
    </div>
  `,
})
export class RatioBarComponent {
  readonly segments = input<RatioSegment[]>([]);
  /** El 100 % de la barra; sin él, la suma de los tramos. Lo que no llega al total queda como pista gris. */
  readonly total = input<number | null>(null);
  readonly variant = input<'thin' | 'tall'>('thin');
  readonly height = input(8);

  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private readonly width = observeWidth(this.host, inject(DestroyRef), 0);

  private readonly whole = computed(() => this.total() ?? this.segments().reduce((sum, s) => sum + Math.max(0, s.value), 0));

  readonly parts = computed(() => {
    const whole = this.whole();
    const tall = this.variant() === 'tall';
    return this.segments()
      .filter((s) => s.value > 0)
      .map((s) => {
        const percent = share(s.value, whole) * 100;
        const short = `${Math.round(percent)} %`;
        return { ...s, percent, short, showLabel: tall && (percent / 100) * this.width() >= LABEL_PX, title: `${s.label}: ${formatNumber(s.value)} (${percent.toFixed(1)} %)` };
      });
  });

  readonly gapPercent = computed(() => {
    const used = this.parts().reduce((sum, p) => sum + p.percent, 0);
    return this.total() !== null && this.parts().length > 0 ? Math.max(0, 100 - used) : 0;
  });

  readonly description = computed(() => (this.whole() > 0 ? this.parts().map((p) => p.title).join(', ') || 'Sin datos' : 'Sin datos'));
}
