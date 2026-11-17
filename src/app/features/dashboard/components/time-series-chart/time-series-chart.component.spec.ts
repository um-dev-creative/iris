import { TestBed } from '@angular/core/testing';
import { TimeSeriesChartComponent } from './time-series-chart.component';
import { SeriesPoint } from '../../models/monitoring-live.model';

const points = (n: number): SeriesPoint[] => Array.from({ length: n }, (_, i) => ({ bucket: `2026-11-17T${String(i).padStart(2, '0')}:00:00`, sent: i * 2, failed: i }));

function render(data: SeriesPoint[], selected: string | null = null) {
  const fixture = TestBed.createComponent(TimeSeriesChartComponent);
  fixture.componentRef.setInput('points', data);
  fixture.componentRef.setInput('selected', selected);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('TimeSeriesChartComponent', () => {
  it('sin puntos dice que no hay datos', () => {
    const { el } = render([]);

    expect(el.textContent).toContain('Sin datos');
    expect(el.querySelector('svg')).toBeNull();
  });

  it('dibuja una barra por intervalo, con su texto accesible', () => {
    const { el } = render(points(3));

    const bars = el.querySelectorAll('g[role="button"]');
    expect(bars).toHaveLength(3);
    expect(bars[2].getAttribute('aria-label')).toBe('02:00: 4 enviados, 2 fallidos');
  });

  it('la barra más alta llena el área y una serie vacía no divide por cero', () => {
    const { fixture } = render(points(3));
    const tallest = fixture.componentInstance.bars()[2];
    expect(tallest.sentHeight + tallest.failedHeight).toBeCloseTo(fixture.componentInstance.baseline - fixture.componentInstance.top, 5);

    const flat = render([{ bucket: '2026-11-17T00:00:00', sent: 0, failed: 0 }]).fixture.componentInstance.bars()[0];
    expect(flat.sentHeight).toBe(0);
    expect(Number.isNaN(flat.failedY)).toBe(false);
  });

  it('muestra a lo más seis etiquetas', () => {
    expect(render(points(24)).fixture.componentInstance.ticks().length).toBeLessThanOrEqual(6);
    expect(render(points(2)).fixture.componentInstance.ticks()).toHaveLength(2);
  });

  it('elegir una barra (clic, Enter o espacio) emite su punto', () => {
    const { fixture, el } = render(points(3));
    const chosen: SeriesPoint[] = [];
    fixture.componentInstance.bucketSelected.subscribe((p) => chosen.push(p));
    const bar = el.querySelectorAll('g[role="button"]')[1] as SVGGElement;

    bar.dispatchEvent(new Event('click'));
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(chosen.map((p) => p.bucket)).toEqual(Array(3).fill('2026-11-17T01:00:00'));
  });

  it('con una barra elegida, las demás se atenúan', () => {
    const { el } = render(points(3), '2026-11-17T01:00:00');

    const opacity = Array.from(el.querySelectorAll('g[role="button"]')).map((g) => g.getAttribute('opacity'));
    expect(opacity).toEqual(['0.35', '1', '0.35']);
  });
});
