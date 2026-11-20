/** Escala del eje de valores de un gráfico: un máximo «redondo» y sus marcas, para leer cantidades exactas sin adivinar. */
export interface Scale {
  /** El valor que toca la parte de arriba del área; nunca menos que el mayor dato. */
  max: number;
  /** Las marcas del eje, de 0 a `max`. */
  ticks: number[];
}

/**
 * Marcas en pasos de 1, 2 o 5 por una potencia de diez, hasta cubrir `value`. Solo enteros: se cuentan mensajes.
 * @example niceScale(7) // { max: 8, ticks: [0, 2, 4, 6, 8] }
 * @example niceScale(0) // { max: 1, ticks: [0, 1] }
 */
export function niceScale(value: number, count = 4): Scale {
  const top = Math.max(1, Math.ceil(Number.isFinite(value) ? value : 0));
  const rough = top / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power);
  const max = Math.ceil(top / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, ticks };
}

/** Número corto para un eje: 950, 1,2 k, 3,4 M. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)} M`;
  if (abs >= 1_000) return `${trim(value / 1_000)} k`;
  return String(value);
}

const trim = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

/** La parte de `value` en `total`, de 0 a 1; 0 si no hay total. */
export const share = (value: number, total: number): number => (total > 0 ? Math.min(1, Math.max(0, value / total)) : 0);

/** Si el sistema pide menos movimiento, o el entorno no puede animar (pruebas, SSR). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || typeof window.requestAnimationFrame !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
