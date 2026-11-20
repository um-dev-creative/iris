import { compactNumber, niceScale, prefersReducedMotion, share } from './chart-scale';

describe('niceScale', () => {
  it('redondea el máximo hacia arriba en pasos de 1, 2 o 5', () => {
    expect(niceScale(7)).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(6)).toEqual({ max: 6, ticks: [0, 2, 4, 6] });
    expect(niceScale(1234).max).toBe(1500);
    expect(niceScale(1234).ticks).toEqual([0, 500, 1000, 1500]);
  });

  it('nunca queda por debajo del dato ni divide por cero', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(Number.NaN)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(3.2).max).toBeGreaterThanOrEqual(3.2);
    expect(niceScale(5, 0).max).toBe(5);
  });
});

describe('compactNumber', () => {
  it('abrevia miles y millones', () => {
    expect(compactNumber(950)).toBe('950');
    expect(compactNumber(1000)).toBe('1 k');
    expect(compactNumber(1500)).toBe('1,5 k');
    expect(compactNumber(3_400_000)).toBe('3,4 M');
  });
});

describe('share', () => {
  it('es la parte del total, entre 0 y 1', () => {
    expect(share(1, 4)).toBe(0.25);
    expect(share(5, 0)).toBe(0);
    expect(share(9, 3)).toBe(1);
    expect(share(-1, 3)).toBe(0);
  });
});

describe('prefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sin matchMedia (pruebas, SSR) no anima', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('sigue la preferencia del sistema', () => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') && false }));
    expect(prefersReducedMotion()).toBe(false);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
  });
});
