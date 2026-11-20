import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatNumber } from '../../utils/monitoring-live';
import { share } from '../../utils/chart-scale';

/** Un tramo de la barra: su valor y su color (una variable CSS, por ejemplo `var(--chart-2)`). */
export interface RatioSegment { label: string; value: number; color: string }

/**
 * Barra horizontal apilada: cada tramo ocupa su parte exacta de `total` (o de la suma, sin `total`). Los anchos cambian con una
 * transición suave cuando llegan datos nuevos. El texto accesible lista cada tramo con su cantidad y su porcentaje.
 */
@Component({
  selector: 'app-ratio-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <div class="iris-ratio flex w-full overflow-hidden rounded-full bg-muted" [style.height.px]="height()" role="img" [attr.aria-label]="description()">
      @for (s of parts(); track s.label) {
        <span class="iris-ratio-part block h-full" [style.width.%]="s.percent" [style.background]="s.color" [attr.title]="s.title" data-testid="ratio-part"></span>
      }
    </div>
  `,
})
export class RatioBarComponent {
  readonly segments = input<RatioSegment[]>([]);
  /** El 100 % de la barra; sin él, la suma de los tramos. Un total mayor deja hueco (por ejemplo, una causa frente a la mayor). */
  readonly total = input<number | null>(null);
  readonly height = input(6);

  private readonly whole = computed(() => this.total() ?? this.segments().reduce((sum, s) => sum + Math.max(0, s.value), 0));

  readonly parts = computed(() => {
    const whole = this.whole();
    return this.segments().map((s) => {
      const percent = share(s.value, whole) * 100;
      return { ...s, percent, title: `${s.label}: ${formatNumber(s.value)} (${percent.toFixed(1)} %)` };
    });
  });

  readonly description = computed(() => (this.whole() > 0 ? this.parts().map((p) => p.title).join(', ') : 'Sin datos'));
}
