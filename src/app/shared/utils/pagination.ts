/** Una página de resultados. `start` y `end` son índices del arreglo original (`end` exclusivo). */
export interface Page<T> {
  items: T[];
  /** Página devuelta, ya ajustada al rango válido (base 1). */
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  start: number;
  end: number;
}

/** Tamaño de página entero ≥ 1, o `0` si no es válido (≤ 0, fracción menor que 1 o no numérico). */
const wholeSize = (pageSize: number): number => (Math.trunc(pageSize) >= 1 ? Math.trunc(pageSize) : 0);

/**
 * Cantidad de páginas para `total` elementos. Siempre hay al menos una, aunque no haya elementos,
 * y un `pageSize` no válido (< 1 o no numérico) cuenta como una sola página.
 * @example pageCount(25, 10) // 3
 * @example pageCount(0, 10) // 1
 */
export function pageCount(total: number, pageSize: number): number {
  const size = wholeSize(pageSize);
  if (size === 0 || !(total > 0)) return 1;
  return Math.ceil(total / size);
}

/**
 * Ajusta `page` al rango `1..pageCount`; un valor no numérico o menor que 1 devuelve 1, `Infinity` la última y las fracciones se truncan.
 * @example clampPage(0, 3) // 1
 * @example clampPage(9, 3) // 3
 */
export function clampPage(page: number, pageCount: number): number {
  const last = Math.max(1, Math.trunc(pageCount) || 1);
  const wanted = Math.trunc(page);
  if (Number.isNaN(wanted) || wanted < 1) return 1;
  return Math.min(wanted, last);
}

/**
 * Corta `items` en la página `page` (base 1). La página se ajusta al rango válido, así que nunca se devuelve una
 * página fuera de rango.
 * @example paginate([1, 2, 3, 4, 5], 2, 2).items // [3, 4]
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const pages = pageCount(total, pageSize);
  const current = clampPage(page, pages);
  const size = wholeSize(pageSize) || total;
  const start = Math.min((current - 1) * size, total);
  const end = Math.min(start + size, total);
  return { items: items.slice(start, end), page: current, pageSize, total, pageCount: pages, start, end };
}
