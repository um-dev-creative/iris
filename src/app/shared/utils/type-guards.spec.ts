import { isDefined, isNonNull, isRecord, isString } from './type-guards';

describe('type-guards', () => {
  it('isDefined: solo undefined queda fuera', () => {
    expect([0, '', false, null, undefined].filter(isDefined)).toEqual([0, '', false, null]);
  });

  it('isNonNull: null y undefined quedan fuera, los valores falsos no', () => {
    expect([0, '', false, null, undefined].filter(isNonNull)).toEqual([0, '', false]);
  });

  it('isString: cadenas primitivas, incluida la vacía', () => {
    expect(isString('a')).toBe(true);
    expect(isString('')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(new String('a'))).toBe(false);
  });

  it('isRecord: objetos simples, no null, arreglos ni funciones', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord(() => 1)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });
});
