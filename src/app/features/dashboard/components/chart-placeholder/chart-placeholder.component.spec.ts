import { TestBed } from '@angular/core/testing';
import { ChartPlaceholderComponent } from './chart-placeholder.component';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(ChartPlaceholderComponent);
  Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  return { c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

describe('ChartPlaceholderComponent', () => {
  it('por defecto: título, siete etiquetas y siete puntos', () => {
    const { c, el } = render();

    expect(el.textContent).toContain('Actividad semanal');
    expect(el.querySelectorAll('circle')).toHaveLength(7);
    expect(c.labels()).toHaveLength(7);
  });

  it('usa los datos y el título indicados', () => {
    const { c, el } = render({ title: 'Mi serie', dataPoints: [10, 20, 30], labels: ['a', 'b', 'c'] });

    expect(el.textContent).toContain('Mi serie');
    expect(el.querySelectorAll('circle')).toHaveLength(3);
    expect(c.linePath().startsWith('M')).toBe(true);
    expect(c.linePath().match(/L/g)).toHaveLength(2);
  });

  it('el valor máximo queda arriba (y = 20) y el cero abajo (y = 180)', () => {
    const { c } = render({ dataPoints: [0, 50, 100] });
    const [first, , last] = c.chartPoints();

    expect(last.y).toBe(20);
    expect(first.y).toBe(180);
  });

  it('sin datos no hay trazo ni área', () => {
    const { c } = render({ dataPoints: [] });

    expect(c.linePath()).toBe('');
    expect(c.areaPath()).toBe('');
  });

  it('el área vuelve a la base del gráfico', () => {
    const { c } = render({ dataPoints: [1, 2] });

    expect(c.areaPath()).toMatch(/L[\d.]+,200 L[\d.]+,200 Z$/);
  });
});
