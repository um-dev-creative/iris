import { bucketLabel, bucketWindow, channelLabel, duration, formatNumber, kindLabel, parseUtc, percent } from './monitoring-live';

describe('monitoring-live utils', () => {
  it('percent no inventa una tasa sin envíos', () => {
    expect(percent(null)).toBe('Sin datos');
    expect(percent(undefined)).toBe('Sin datos');
    expect(percent(0.5)).toBe('50.0 %');
    expect(percent(0)).toBe('0.0 %');
  });

  it('etiquetas conocidas y desconocidas', () => {
    expect(channelLabel('EMAIL')).toBe('Correo');
    expect(channelLabel('FAX')).toBe('FAX');
    expect(kindLabel('VERIFICATION_CODE')).toBe('Código de verificación');
    expect(kindLabel('X')).toBe('X');
    expect(formatNumber(1234)).toContain('1');
  });

  it.each([
    [5, '5 s'], [-3, '0 s'], [59.6, '60 s'], [60, '1 min'], [3599, '59 min'], [3600, '1 h'], [7500, '2 h 5 min'],
    [86_400, '1 d'], [90_000, '1 d 1 h'],
  ])('duration(%d) = %s', (seconds, text) => expect(duration(seconds)).toBe(text));

  it('las fechas sin zona son UTC; las que traen zona se respetan', () => {
    expect(parseUtc('2026-11-17T08:00:00').toISOString()).toBe('2026-11-17T08:00:00.000Z');
    expect(parseUtc('2026-11-17T08:00:00Z').toISOString()).toBe('2026-11-17T08:00:00.000Z');
    expect(parseUtc('2026-11-17T09:00:00+01:00').toISOString()).toBe('2026-11-17T08:00:00.000Z');
  });

  it.each([['minute', '08:01:00'], ['hour', '09:00:00'], ['day', '08:00:00'], ['otro', '09:00:00']])('bucketWindow cubre un intervalo de %s', (unit, to) => {
    const window = bucketWindow({ bucket: '2026-11-17T08:00:00', sent: 0, failed: 0 }, unit);

    expect(window.from).toBe('2026-11-17T08:00:00');
    expect(window.to.slice(11)).toBe(to === '08:00:00' ? '08:00:00' : to);
    if (unit === 'day') expect(window.to.slice(0, 10)).toBe('2026-11-18');
  });

  it('bucketLabel: hora para minuto y hora, día/mes para día', () => {
    expect(bucketLabel('2026-11-17T08:05:00', 'minute')).toBe('08:05');
    expect(bucketLabel('2026-11-17T08:00:00', 'day')).toBe('17/11');
  });
});
