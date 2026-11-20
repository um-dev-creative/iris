import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { formatNumber } from '../../utils/monitoring-live';
import { prefersReducedMotion } from '../../utils/chart-scale';

const DURATION_MS = 650;
const FLASH_MS = 1200;

/**
 * Un número que cambia contando hasta el valor nuevo y destella en verde si sube o en rojo si baja (con `tone="inverse"`, al
 * revés: más fallos es malo). Sin movimiento (preferencia del sistema o entorno sin animación) muestra el valor final al instante.
 * El texto accesible siempre es el valor exacto, no los pasos intermedios.
 */
@Component({
  selector: 'app-animated-number',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.iris-flash-good]': "flashClass() === 'iris-flash-good'", '[class.iris-flash-bad]': "flashClass() === 'iris-flash-bad'" },
  template: `<span class="sr-only">{{ label() }}</span><span aria-hidden="true">{{ text() }}</span>`,
  styles: `:host { display: inline-block; border-radius: 0.375rem; transition: background-color 600ms ease, color 600ms ease; font-variant-numeric: tabular-nums; }`,
})
export class AnimatedNumberComponent {
  readonly value = input.required<number>();
  /** `inverse` cuando subir es malo (fallos, mensajes en cola). */
  readonly tone = input<'normal' | 'inverse'>('normal');

  readonly text = signal('');
  readonly label = signal('');
  readonly flashClass = signal('');

  private shown: number | null = null;
  private frame = 0;
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
    effect(() => {
      const target = this.value();
      untracked(() => this.moveTo(target));
    });
  }

  private moveTo(target: number): void {
    const from = this.shown;
    this.label.set(formatNumber(target));
    this.stop();
    if (from === null || from === target || prefersReducedMotion()) {
      this.show(target);
      return;
    }
    this.flash(target > from === (this.tone() === 'normal') ? 'iris-flash-good' : 'iris-flash-bad');
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      this.show(t >= 1 ? target : Math.round(from + (target - from) * eased));
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private show(value: number): void {
    this.shown = value;
    this.text.set(formatNumber(value));
  }

  private flash(css: string): void {
    this.flashClass.set(css);
    this.flashTimer = setTimeout(() => this.flashClass.set(''), FLASH_MS);
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashClass.set('');
    }
    this.flashTimer = null;
  }
}
