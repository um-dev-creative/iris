import { formatNumber, formatTimestamp, toSelectOption } from './mappers';

describe('formatTimestamp', () => {
  const ISO = '2026-10-17T11:50:00Z';

  it('formatea una cadena ISO, un Date y milisegundos igual', () => {
    const options = { locale: 'en-US', timeZone: 'UTC' };
    const expected = formatTimestamp(ISO, options);

    expect(expected).toContain('2026');
    expect(expected).toContain('11:50:00');
    expect(formatTimestamp(new Date(ISO), options)).toBe(expected);
    expect(formatTimestamp(Date.parse(ISO), options)).toBe(expected);
  });

  it('respeta la zona horaria', () => {
    expect(formatTimestamp(ISO, { locale: 'en-US', timeZone: 'Asia/Tokyo' })).toContain('8:50:00');
  });

  it('usa es-MX por defecto', () => {
    expect(formatTimestamp(ISO, { timeZone: 'UTC' })).toBe(new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC' }).format(new Date(ISO)));
  });

  it.each([[null], [undefined], [''], ['no es fecha'], [NaN], [new Date('x')]])('un valor no válido (%s) devuelve cadena vacía', (value) => {
    expect(formatTimestamp(value as never)).toBe('');
  });
});

describe('formatNumber', () => {
  it('aplica separadores del idioma', () => {
    expect(formatNumber(1234567.5, 'en-US')).toBe('1,234,567.5');
    expect(formatNumber(1234567.5, 'de-DE')).toBe('1.234.567,5');
  });

  it('acepta opciones de Intl', () => {
    expect(formatNumber(0.256, 'en-US', { style: 'percent' })).toBe('26%');
  });

  it('usa es-MX por defecto', () => {
    expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat('es-MX').format(1234.5));
  });

  it('cero se formatea; no numérico devuelve cadena vacía', () => {
    expect(formatNumber(0, 'en-US')).toBe('0');
    expect(formatNumber(NaN)).toBe('');
    expect(formatNumber(Infinity)).toBe('');
    expect(formatNumber(null)).toBe('');
    expect(formatNumber(undefined)).toBe('');
    expect(formatNumber('1' as never)).toBe('');
  });
});

describe('toSelectOption', () => {
  it('usa la etiqueta indicada', () => {
    expect(toSelectOption('sms', 'SMS')).toEqual({ value: 'sms', label: 'SMS' });
  });

  it('sin etiqueta usa el valor', () => {
    expect(toSelectOption('email')).toEqual({ value: 'email', label: 'email' });
  });
});
