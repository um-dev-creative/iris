import { DestroyRef, ElementRef, Signal, WritableSignal, effect, signal } from '@angular/core';

export interface Point { x: number; y: number }

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Los tramos de una curva suave que pasa por cada punto sin pasarse nunca de ellos (interpolación monótona de Fritsch–Carlson):
 * una serie que no baja de 0 no dibuja una curva por debajo de 0, y un pico no se dibuja más alto de lo que fue. Así la curva
 * es suave y a la vez exacta en cada intervalo. Devuelve un comando `C` por tramo (uno menos que puntos).
 */
export function monotoneSegments(points: readonly Point[]): string[] {
  const n = points.length;
  if (n < 2) return [];
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i]);
  }
  const tangent: number[] = new Array(n);
  tangent[0] = slope[0];
  tangent[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }
  return points.slice(0, -1).map((p, i) => {
    const q = points[i + 1];
    const third = dx[i] / 3;
    return `C${r1(p.x + third)},${r1(p.y + tangent[i] * third)} ${r1(q.x - third)},${r1(q.y - tangent[i + 1] * third)} ${r1(q.x)},${r1(q.y)}`;
  });
}

/** La línea que pasa por los puntos (suave y exacta), o un punto solo si hay uno. */
export function linePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const start = `M${r1(points[0].x)},${r1(points[0].y)}`;
  return points.length === 1 ? `${start}h0.01` : `${start}${monotoneSegments(points).join('')}`;
}

/** El área bajo la línea hasta `baseline`. */
export function areaPath(points: readonly Point[], baseline: number): string {
  if (points.length < 2) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `M${r1(first.x)},${r1(baseline)}L${r1(first.x)},${r1(first.y)}${monotoneSegments(points).join('')}L${r1(last.x)},${r1(baseline)}Z`;
}

/**
 * Una columna con las esquinas de arriba redondeadas (`radius`) y la base recta, como pide una barra que crece desde la línea base.
 * Con `rounded` en falso es un rectángulo (un tramo intermedio de una pila).
 */
export function columnPath(x: number, y: number, width: number, height: number, radius: number, rounded = true): string {
  if (height <= 0 || width <= 0) return '';
  const r = rounded ? Math.min(radius, width / 2, height) : 0;
  const bottom = y + height;
  return `M${r1(x)},${r1(bottom)}V${r1(y + r)}${r ? `Q${r1(x)},${r1(y)} ${r1(x + r)},${r1(y)}` : ''}H${r1(x + width - r)}${r ? `Q${r1(x + width)},${r1(y)} ${r1(x + width)},${r1(y + r)}` : ''}V${r1(bottom)}Z`;
}

/**
 * El ancho del elemento en píxeles, que sigue a sus cambios de tamaño. Los gráficos se dibujan en píxeles reales (no se estiran con
 * `viewBox`), así que en una pantalla ancha ganan ancho pero no crecen de alto. Sin `ResizeObserver` (pruebas, SSR) queda `fallback`.
 */
export function observeWidth(host: Signal<ElementRef<HTMLElement> | undefined>, destroyRef: DestroyRef, fallback = 640): Signal<number> {
  const width: WritableSignal<number> = signal(fallback);
  let observer: ResizeObserver | null = null;
  effect(() => {
    const el = host()?.nativeElement;
    observer?.disconnect();
    if (!el || typeof ResizeObserver === 'undefined') return;
    observer = new ResizeObserver((entries) => {
      const measured = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (measured > 0 && measured !== width()) width.set(measured);
    });
    observer.observe(el);
  });
  destroyRef.onDestroy(() => observer?.disconnect());
  return width.asReadonly();
}
