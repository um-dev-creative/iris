/** Opción de un `<select>`. */
export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

const DEFAULT_LOCALE = 'es-MX';

/**
 * Fecha y hora legibles para el operador. Devuelve `''` si el valor no es una fecha válida.
 * @param value `Date`, cadena ISO o milisegundos desde la época
 * @param options `locale` (por defecto `es-MX`) y `timeZone` (por defecto la del navegador)
 * @example formatTimestamp('2026-10-17T11:50:00Z', { timeZone: 'UTC' }) // '17 oct 2026, 11:50:00 a.m.'
 */
export function formatTimestamp(
  value: Date | string | number | null | undefined,
  options: { locale?: string; timeZone?: string } = {},
): string {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(options.locale ?? DEFAULT_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: options.timeZone,
  }).format(date);
}

/**
 * Número con separadores del idioma. Devuelve `''` si no es un número finito.
 * @example formatNumber(1234567.5, 'en-US') // '1,234,567.5'
 */
export function formatNumber(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Opción de `<select>`; sin etiqueta usa el propio valor.
 * @example toSelectOption('sms', 'SMS') // { value: 'sms', label: 'SMS' }
 */
export function toSelectOption<T extends string>(value: T, label: string = value): SelectOption<T> {
  return { value, label };
}
