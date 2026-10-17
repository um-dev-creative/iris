/** `true` si el valor no es `undefined` (`null` sí pasa). Útil como predicado de `filter`. */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/** `true` si el valor no es `null` ni `undefined`. Útil como predicado de `filter`. */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** `true` si el valor es una cadena primitiva. */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** `true` si el valor es un objeto simple (no `null`, ni arreglo, ni función). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
