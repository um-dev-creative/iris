import { TestBed } from '@angular/core/testing';
import { SparklineComponent } from './sparkline.component';

function render(data: number[], color?: string) {
  const fixture = TestBed.createComponent(SparklineComponent);
  fixture.componentRef.setInput('data', data);
  if (color) fixture.componentRef.setInput('color', color);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('SparklineComponent', () => {
  it('con menos de dos puntos no dibuja nada', () => {
    expect(render([]).c.polylinePoints()).toBe('');
    const one = render([5]);
    expect(one.c.polylinePoints()).toBe('');
    expect(one.c.areaPath()).toBe('');
  });

  it('escala los puntos al lienzo: el mínimo abajo, el máximo arriba', () => {
    const { c } = render([0, 10]);

    // 120 x 40 con 2 px de margen vertical
    expect(c.polylinePoints()).toBe('0.0,38.0 120.0,2.0');
  });

  it('una serie plana no divide por cero', () => {
    const { c } = render([7, 7, 7]);

    expect(c.polylinePoints().split(' ')).toHaveLength(3);
    expect(c.polylinePoints()).not.toContain('NaN');
  });

  it('el área se cierra contra la base', () => {
    const { c } = render([1, 2, 3]);

    expect(c.areaPath().startsWith('M0,')).toBe(true);
    expect(c.areaPath().endsWith('Z')).toBe(true);
    expect(c.areaPath()).toContain('L120,40L0,40Z');
  });

  it('aplica el color indicado y cada instancia tiene su propio degradado', () => {
    const a = render([1, 2], '#ff0000');
    const b = render([1, 2]);

    expect(a.el.querySelector('polyline')!.getAttribute('stroke')).toBe('#ff0000');
    expect(b.el.querySelector('polyline')!.getAttribute('stroke')).toBe('var(--chart-1)');
    expect(a.c.gradientId).not.toBe(b.c.gradientId);
  });
});
