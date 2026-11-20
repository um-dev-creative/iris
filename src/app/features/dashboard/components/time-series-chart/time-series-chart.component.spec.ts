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

  it('la escala llega a un máximo redondo y una serie vacía no divide por cero', () => {
    const { fixture } = render(points(3));
    const chart = fixture.componentInstance;
    const tallest = chart.bars()[2];
    const usable = chart.baseline - chart.top;
    expect(chart.scale().max).toBe(6);
    expect(tallest.sentHeight + tallest.failedHeight).toBeCloseTo(usable, 5);

    const uneven = render([{ bucket: '2026-11-17T00:00:00', sent: 5, failed: 2 }]).fixture.componentInstance;
    expect(uneven.scale().max).toBe(8);
    expect(uneven.bars()[0].sentHeight + uneven.bars()[0].failedHeight).toBeCloseTo((7 / 8) * usable, 5);

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

  it('dibuja el eje de cantidades con sus marcas', () => {
    const { el } = render(points(3));

    expect(Array.from(el.querySelectorAll('[data-testid="y-tick"]')).map((t) => t.textContent)).toEqual(['0', '2', '4', '6']);
  });

  it('resume el periodo: total, enviados, fallidos y el pico', () => {
    const { el } = render(points(3));

    const totals = el.querySelector('[data-testid="series-totals"]')!.textContent!;
    expect(totals).toContain('Total:9');
    expect(totals).toContain('Enviados:6');
    expect(totals).toContain('Fallidos:3');
    expect(totals).toContain('Pico:6 · 02:00');
  });

  it('sin mensajes no hay pico', () => {
    const { fixture } = render([{ bucket: '2026-11-17T00:00:00', sent: 0, failed: 0 }]);

    expect(fixture.componentInstance.peak()).toBeNull();
  });

  it('al pasar el puntero o enfocar una barra muestra su detalle, y lo quita al salir', () => {
    const { fixture, el } = render(points(3));
    const bar = el.querySelectorAll('g[role="button"]')[2] as SVGGElement;

    bar.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    const tip = el.querySelector('[data-testid="tooltip"]')!.textContent!;
    expect(tip).toContain('17/11 02:00–03:00');
    expect(tip).toContain('4');
    expect(tip).toContain('33.3 %');

    el.querySelector('svg')!.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="tooltip"]')).toBeNull();

    bar.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="tooltip"]')).not.toBeNull();
    bar.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="tooltip"]')).toBeNull();
  });

  it('el detalle no se sale por los lados', () => {
    const { fixture } = render(points(10));
    const chart = fixture.componentInstance;

    chart.hovered.set(points(10)[0].bucket);
    expect(chart.hoveredBar()!.shift).toBe(0);
    chart.hovered.set(points(10)[5].bucket);
    expect(chart.hoveredBar()!.shift).toBe(-50);
    chart.hovered.set(points(10)[9].bucket);
    expect(chart.hoveredBar()!.shift).toBe(-100);
    chart.hovered.set('no-existe');
    expect(chart.hoveredBar()).toBeNull();
  });

  it('por días, el detalle dice el día', () => {
    const fixture = TestBed.createComponent(TimeSeriesChartComponent);
    fixture.componentRef.setInput('points', [{ bucket: '2026-11-17T00:00:00', sent: 1, failed: 0 }]);
    fixture.componentRef.setInput('unit', 'day');
    fixture.detectChanges();
    fixture.componentInstance.hovered.set('2026-11-17T00:00:00');

    expect(fixture.componentInstance.hoveredBar()!.window).toBe('17/11');
    expect(fixture.componentInstance.hoveredBar()!.bar.rate).toBe(0);
  });

  it('marca el intervalo en curso: rayado, en su texto y en la leyenda', () => {
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const bucket = now.toISOString().slice(0, 19);
    const { fixture, el } = render([{ bucket: '2026-11-17T00:00:00', sent: 1, failed: 0 }, { bucket, sent: 2, failed: 1 }]);

    const bars = fixture.componentInstance.bars();
    expect(bars[0].current).toBe(false);
    expect(bars[1].current).toBe(true);
    expect(bars[1].text).toContain('(en curso)');
    expect(el.querySelectorAll('[data-testid="sent-bar"]')[1].getAttribute('fill')).toContain('iris-current-bucket');
    expect(el.querySelector('[data-testid="current-legend"]')).not.toBeNull();
  });
});
