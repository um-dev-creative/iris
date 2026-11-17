import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { percent } from '../../utils/monitoring-live';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Anillo de la tasa de éxito. Sin envíos no dibuja un arco: dice «Sin datos». */
@Component({
  selector: 'app-success-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="m-0 flex flex-col items-center" [attr.aria-label]="'Tasa de éxito: ' + label()">
      <svg viewBox="0 0 120 120" class="w-32 h-32" role="img" [attr.aria-label]="'Tasa de éxito ' + label()">
        <circle cx="60" cy="60" [attr.r]="radius" fill="none" stroke="var(--border)" stroke-width="10" />
        @if (rate() !== null) {
          <circle
            cx="60" cy="60" [attr.r]="radius" fill="none" stroke="var(--chart-2)" stroke-width="10" stroke-linecap="round"
            [attr.stroke-dasharray]="dash()" transform="rotate(-90 60 60)" />
        }
        <text x="60" y="64" text-anchor="middle" class="fill-foreground" font-size="16" font-weight="700">{{ label() }}</text>
      </svg>
      <figcaption class="text-xs text-muted-foreground mt-1">Tasa de éxito</figcaption>
    </figure>
  `,
})
export class SuccessRingComponent {
  readonly rate = input<number | null>(null);
  readonly radius = RADIUS;
  readonly label = computed(() => percent(this.rate()));
  readonly dash = computed(() => {
    const filled = Math.min(1, Math.max(0, this.rate() ?? 0)) * CIRCUMFERENCE;
    return `${filled.toFixed(2)} ${(CIRCUMFERENCE - filled).toFixed(2)}`;
  });
}
