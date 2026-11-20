import { Component, ElementRef, viewChild, DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { areaPath, columnPath, linePath, monotoneSegments, observeWidth } from './chart-geometry';

/** Los extremos de cada tramo `C` (el punto al que llega). */
const ends = (segments: string[]) => segments.map((s) => s.split(' ').at(-1));
/** Las coordenadas `y` de los puntos de control. */
const controlYs = (segments: string[]) => segments.flatMap((s) => s.slice(1).split(' ').slice(0, 2).map((p) => Number(p.split(',')[1])));

describe('monotoneSegments', () => {
  it('pasa por cada punto', () => {
    const segments = monotoneSegments([{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 5 }]);

    expect(ends(segments)).toEqual(['10,0', '20,5']);
  });

  it('nunca se pasa de los valores: en una meseta y en un pico no hay rebote', () => {
    const flat = monotoneSegments([{ x: 0, y: 50 }, { x: 10, y: 50 }, { x: 20, y: 0 }, { x: 30, y: 0 }]);
    expect(Math.max(...controlYs(flat))).toBeLessThanOrEqual(50);
    expect(Math.min(...controlYs(flat))).toBeGreaterThanOrEqual(0);

    const spike = monotoneSegments([{ x: 0, y: 100 }, { x: 10, y: 0 }, { x: 20, y: 100 }, { x: 30, y: 99 }]);
    expect(Math.min(...controlYs(spike))).toBeGreaterThanOrEqual(0);
  });

  it('limita las tangentes en subidas bruscas', () => {
    const steep = monotoneSegments([{ x: 0, y: 0 }, { x: 10, y: 1 }, { x: 20, y: 100 }, { x: 30, y: 101 }]);
    expect(Math.max(...controlYs(steep))).toBeLessThanOrEqual(101);
  });

  it('menos de dos puntos no tiene tramos; puntos repetidos no dividen por cero', () => {
    expect(monotoneSegments([{ x: 0, y: 0 }])).toEqual([]);
    expect(monotoneSegments([{ x: 5, y: 1 }, { x: 5, y: 3 }]).join('')).not.toContain('NaN');
  });
});

describe('caminos', () => {
  it('línea, área y punto suelto', () => {
    expect(linePath([])).toBe('');
    expect(linePath([{ x: 1, y: 2 }])).toBe('M1,2h0.01');
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toMatch(/^M0,0C/);
    expect(areaPath([{ x: 0, y: 5 }], 10)).toBe('');
    expect(areaPath([{ x: 0, y: 5 }, { x: 10, y: 0 }], 10)).toMatch(/^M0,10L0,5C.*L10,10Z$/);
  });

  it('columna con la punta redondeada y la base recta; un tramo intermedio es recto', () => {
    expect(columnPath(0, 10, 20, 30, 4)).toBe('M0,40V14Q0,10 4,10H16Q20,10 20,14V40Z');
    expect(columnPath(0, 10, 20, 30, 4, false)).toBe('M0,40V10H20V40Z');
    expect(columnPath(0, 10, 20, 2, 4)).toContain('V12Q0,10 2,10');
    expect(columnPath(0, 0, 20, 0, 4)).toBe('');
    expect(columnPath(0, 0, 0, 10, 4)).toBe('');
  });
});

@Component({ standalone: true, template: `<div #box style="width: 300px"></div>` })
class Host {
  readonly box = viewChild<ElementRef<HTMLElement>>('box');
  readonly width = observeWidth(this.box, inject(DestroyRef), 123);
}

describe('observeWidth', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sin ResizeObserver se queda con el valor de respaldo', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    expect(fixture.componentInstance.width()).toBe(123);
  });

  it('sigue el ancho medido y deja de observar al destruirse', () => {
    let callback: ResizeObserverCallback = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) { callback = cb; }
      observe = vi.fn();
      disconnect = disconnect;
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    callback([{ contentRect: { width: 512.7 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(fixture.componentInstance.width()).toBe(512);
    callback([{ contentRect: { width: 0 } } as ResizeObserverEntry], {} as ResizeObserver);
    expect(fixture.componentInstance.width()).toBe(512);
    callback([], {} as ResizeObserver);
    expect(fixture.componentInstance.width()).toBe(512);

    fixture.destroy();
    expect(disconnect).toHaveBeenCalled();
  });
});
