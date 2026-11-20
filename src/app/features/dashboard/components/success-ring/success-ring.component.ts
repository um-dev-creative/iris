import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatNumber, percent } from '../../utils/monitoring-live';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Desde aquí la tasa se considera sana o, por debajo de `WARN`, mala. */
const GOOD = 0.95;
const WARN = 0.8;

/**
 * Anillo de la tasa de éxito. El arco crece con suavidad cuando cambia la tasa y toma color según su valor: verde desde el 95 %,
 * ámbar desde el 80 % y rojo por debajo (el valor y su texto siempre se muestran, el color no es la única señal).
 * Sin envíos no dibuja un arco: dice «Sin datos».
 */
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
            class="iris-ring-arc"
            cx="60" cy="60" [attr.r]="radius" fill="none" [attr.stroke]="color()" stroke-width="10" stroke-linecap="round"
            [attr.stroke-dasharray]="dash()" [style.stroke-dasharray]="dash()" transform="rotate(-90 60 60)" />
        }
        <text x="60" y="64" text-anchor="middle" class="fill-foreground" font-size="16" font-weight="700">{{ label() }}</text>
      </svg>
      <figcaption class="text-xs text-muted-foreground mt-1 text-center">
        Tasa de éxito
        @if (rate() !== null && attempts() > 0) { <span class="block" data-testid="ring-detail">{{ format(sent()) }} de {{ format(attempts()) }} entregados</span> }
      </figcaption>
    </figure>
  `,
})
export class SuccessRingComponent {
  readonly rate = input<number | null>(null);
  /** Enviados y fallidos del periodo, para decir de cuántos sale la tasa. */
  readonly sent = input(0);
  readonly failed = input(0);
  readonly radius = RADIUS;
  readonly format = formatNumber;
  readonly attempts = computed(() => this.sent() + this.failed());
  readonly label = computed(() => percent(this.rate()));
  readonly color = computed(() => {
    const rate = this.rate() ?? 0;
    return rate >= GOOD ? 'var(--success)' : rate >= WARN ? 'var(--warning)' : 'var(--destructive)';
  });
  readonly dash = computed(() => {
    const filled = Math.min(1, Math.max(0, this.rate() ?? 0)) * CIRCUMFERENCE;
    return `${filled.toFixed(2)} ${(CIRCUMFERENCE - filled).toFixed(2)}`;
  });
}
