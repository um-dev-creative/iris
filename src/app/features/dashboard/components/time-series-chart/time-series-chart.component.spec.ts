import { TestBed } from '@angular/core/testing';
import { TimeSeriesChartComponent } from './time-series-chart.component';
import { SeriesPoint } from '../../models/monitoring-live.model';

const points = (n: number): SeriesPoint[] => Array.from({ length: n }, (_, i) => ({ bucket: `2026-11-17T${String(i).padStart(2, '0')}:00:00`, sent: i * 2, failed: i }));

function render(data: SeriesPoint[], options: { selected?: string | null; unit?: string; mode?: 'lines' | 'bars' } = {}) {
  const fixture = TestBed.createComponent(TimeSeriesChartComponent);
  fixture.componentRef.setInput('points', data);
  fixture.componentRef.setInput('selected', options.selected ?? null);
  if (options.unit) fixture.componentRef.setInput('unit', options.unit);
  if (options.mode) fixture.componentInstance.mode.set(options.mode);
  fixture.detectChanges();
  return { fixture, chart: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

describe('TimeSeriesChartComponent', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('iris.monitoring.chart-mode');
    } catch {
      // no storage in this environment
    }
  });
  afterEach(() => vi.restoreAllMocks());

  it('sin puntos dice que no hay datos', () => {
    const { el } = render([]);

    expect(el.textContent).toContain('Sin datos');
    expect(el.querySelector('svg')).toBeNull();
  });

  it('se dibuja en píxeles reales con un alto fijo: no crece con el ancho', () => {
    const { el, chart } = render(points(3));
    const svg = el.querySelector('svg')!;

    expect(svg.getAttribute('width')).toBe(String(chart.width()));
    expect(svg.getAttribute('height')).toBe(String(chart.height));
    expect(chart.height).toBeLessThan(300);
  });

  it('por defecto dibuja líneas: enviados, fallidos y la tasa de fallos aparte', () => {
    const { el } = render(points(3));

    expect(el.querySelector('[data-testid="sent-line"]')?.getAttribute('d')).toMatch(/^M/);
    expect(el.querySelector('[data-testid="failed-line"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="rate-line"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="sent-column"]')).toBeNull();
  });

  it('las líneas pasan exactamente por cada valor', () => {
    const { chart } = render(points(3));
    const slots = chart.slots();

    expect(chart.scale().max).toBe(4);
    expect(slots[2].sentY).toBeCloseTo(chart.top, 5);
    expect(slots[0].sentY).toBeCloseTo(chart.mainBottom, 5);
    expect(chart.sentLine().done).toContain(`${Math.round(slots[2].x * 10) / 10},${Math.round(slots[2].sentY * 10) / 10}`);
  });

  it('en columnas la escala cubre la pila y cada columna tiene su forma', () => {
    const { el, chart } = render(points(3), { mode: 'bars' });

    expect(chart.scale().max).toBe(6);
    expect(el.querySelectorAll('[data-testid="sent-column"]')).toHaveLength(3);
    expect(chart.slots()[0].sentColumn).toBe('');
    expect(chart.slots()[2].sentColumn).toMatch(/^M/);
  });

  it('cambiar el tipo de gráfico lo recuerda', () => {
    const { el, fixture, chart } = render(points(3));

    (el.querySelector('[data-testid="mode-bars"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(chart.mode()).toBe('bars');
    expect(el.querySelector('[data-testid="mode-bars"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('iris.monitoring.chart-mode')).toBe('bars');
    expect(TestBed.createComponent(TimeSeriesChartComponent).componentInstance.mode()).toBe('bars');

    chart.setMode('lines');
    expect(localStorage.getItem('iris.monitoring.chart-mode')).toBe('lines');
  });

  it('sin almacenamiento el tipo de gráfico vale mientras la página está abierta', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { chart } = render(points(2));

    expect(chart.mode()).toBe('lines');
    chart.setMode('bars');
    expect(chart.mode()).toBe('bars');
  });

  it('dibuja el eje de cantidades con marcas redondas', () => {
    const { el } = render(points(3));

    expect(Array.from(el.querySelectorAll('[data-testid="y-tick"]')).map((t) => t.textContent)).toEqual(['0', '1', '2', '3', '4']);
  });

  it('la tasa de fallos tiene su propia escala, hasta 100 % como mucho', () => {
    expect(render(points(3)).chart.rateScale().max).toBe(40);
    expect(render([{ bucket: '2026-11-17T00:00:00', sent: 0, failed: 5 }]).chart.rateScale().max).toBe(100);
    expect(render([{ bucket: '2026-11-17T00:00:00', sent: 0, failed: 0 }]).chart.rateScale().max).toBe(1);
  });

  it('el cursor muestra los tres valores del intervalo y la leyenda los sigue', () => {
    const { fixture, chart, el } = render(points(3));

    chart.hoverAt(2);
    fixture.detectChanges();
    const tip = el.querySelector('[data-testid="tooltip"]')!.textContent!;
    expect(tip).toContain('17/11 02:00–03:00');
    expect(tip).toContain('4');
    expect(tip).toContain('33.3 %');
    expect(el.querySelector('[data-testid="legend-sent"]')?.textContent).toBe('4');
    expect(el.querySelector('[data-testid="legend-scope"]')?.textContent).toContain('02:00–03:00');
    expect(el.querySelector('[data-testid="readout"]')?.textContent).toContain('4 enviados, 2 fallidos');

    chart.hover.set(null);
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="tooltip"]')).toBeNull();
    expect(el.querySelector('[data-testid="legend-sent"]')?.textContent).toBe('6');
    expect(el.querySelector('[data-testid="legend-scope"]')?.textContent).toContain('Total del periodo');
  });

  it('el puntero elige el intervalo más cercano y el clic lo filtra', () => {
    const { fixture, chart, el } = render(points(4));
    const chosen: SeriesPoint[] = [];
    chart.bucketSelected.subscribe((p) => chosen.push(p));
    const hit = el.querySelector('[data-testid="hit-area"]')!;
    const band = chart.plotWidth() / 4;

    hit.dispatchEvent(new MouseEvent('pointermove', { clientX: chart.left + band * 2.4 }));
    fixture.detectChanges();
    expect(chart.hover()).toBe(2);
    hit.dispatchEvent(new MouseEvent('click'));
    expect(chosen.map((p) => p.bucket)).toEqual(['2026-11-17T02:00:00']);

    hit.dispatchEvent(new MouseEvent('pointerleave'));
    expect(chart.hover()).toBeNull();
    hit.dispatchEvent(new MouseEvent('click'));
    expect(chosen).toHaveLength(1);
  });

  it('con un tamaño real, el puntero se convierte a la escala del gráfico', () => {
    const { chart, el } = render(points(4));
    const hit = el.querySelector('[data-testid="hit-area"]')!;
    vi.spyOn(hit, 'getBoundingClientRect').mockReturnValue({ left: 100, width: chart.plotWidth() / 2 } as DOMRect);

    hit.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100 + chart.plotWidth() / 2 - 1 }));

    expect(chart.hover()).toBe(3);
  });

  it('con el teclado: flechas, Inicio y Fin recorren; Enter filtra; Escape suelta', () => {
    const { chart, el } = render(points(4));
    const chosen: SeriesPoint[] = [];
    chart.bucketSelected.subscribe((p) => chosen.push(p));
    const plot = el.querySelector('[data-testid="trend-plot"]')!;

    key(plot, 'ArrowLeft');
    expect(chart.hover()).toBe(3);
    key(plot, 'ArrowLeft');
    expect(chart.hover()).toBe(2);
    key(plot, 'Home');
    expect(chart.hover()).toBe(0);
    key(plot, 'ArrowRight');
    expect(chart.hover()).toBe(1);
    key(plot, 'End');
    expect(chart.hover()).toBe(3);
    key(plot, 'ArrowRight');
    expect(chart.hover()).toBe(3);
    key(plot, 'Enter');
    expect(chosen.map((p) => p.bucket)).toEqual(['2026-11-17T03:00:00']);
    key(plot, 'Escape');
    expect(chart.hover()).toBeNull();
    key(plot, ' ');
    expect(chosen).toHaveLength(2);
    key(plot, 'a');
    plot.dispatchEvent(new FocusEvent('blur'));
    expect(chart.hover()).toBeNull();
  });

  it('el teclado empieza por el intervalo elegido', () => {
    const { chart, el } = render(points(4), { selected: '2026-11-17T01:00:00' });

    key(el.querySelector('[data-testid="trend-plot"]')!, 'ArrowRight');

    expect(chart.hover()).toBe(1);
    expect(chart.selectedSlot()?.index).toBe(1);
  });

  it('la lectura no se sale por la derecha', () => {
    const { chart } = render(points(10));

    expect(chart.tipLeft(chart.slots()[0])).toBeGreaterThan(chart.slots()[0].x);
    expect(chart.tipLeft(chart.slots()[9])).toBeLessThan(chart.slots()[9].x);
  });

  it('el valor al final de cada línea solo se pone si no se pisan', () => {
    expect(render(points(3)).chart.endLabels()).toHaveLength(2);
    expect(render([{ bucket: '2026-11-17T00:00:00', sent: 1, failed: 1 }, { bucket: '2026-11-17T01:00:00', sent: 5, failed: 5 }]).chart.endLabels()).toEqual([]);
  });

  it('resume el periodo: total y pico, por horas o por días', () => {
    expect(render(points(3)).el.querySelector('[data-testid="series-totals"]')?.textContent).toContain('Total 9 · pico 6 a las 02:00');
    const daily = render([{ bucket: '2026-11-17T00:00:00', sent: 3, failed: 0 }], { unit: 'day' });
    expect(daily.el.querySelector('[data-testid="series-totals"]')?.textContent).toContain('pico 3 el 17/11');
    expect(daily.el.textContent).toContain('Fechas en UTC');
    expect(daily.chart.windowOf(daily.chart.slots()[0])).toBe('17/11');
    expect(render([{ bucket: '2026-11-17T00:00:00', sent: 0, failed: 0 }]).chart.peak()).toBeNull();
  });

  it('marca el intervalo en curso: tramo punteado y etiqueta', () => {
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString().slice(0, 19);
    const { el, chart } = render([{ bucket: at(2), sent: 1, failed: 0 }, { bucket: at(1), sent: 4, failed: 1 }, { bucket: at(0), sent: 2, failed: 1 }]);

    expect(chart.slots()[2].current).toBe(true);
    expect(chart.sentLine().current).toMatch(/^M/);
    expect(el.querySelector('[data-testid="current-segment"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="current-label"]')?.textContent).toContain('en curso');
    expect(chart.announcement()).toBe('');
    chart.hoverAt(2);
    expect(chart.announcement()).toContain('en curso');
  });

  it('el intervalo elegido queda marcado y en la tabla', () => {
    const { el, fixture, chart } = render(points(3), { selected: '2026-11-17T01:00:00' });
    expect(chart.selectedSlot()?.point.bucket).toBe('2026-11-17T01:00:00');

    (el.querySelector('[data-testid="table-toggle"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const rows = el.querySelectorAll('[data-testid="series-table"] tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[1].classList.contains('bg-muted')).toBe(true);
    expect(rows[2].textContent).toContain('33.3 %');
    expect(el.querySelector('svg')).toBeNull();
  });

  it('mientras se actualiza se queda y se atenúa', () => {
    const { el, fixture } = render(points(3));
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    expect(el.querySelector('.opacity-60')).not.toBeNull();
  });

  it('un solo intervalo se dibuja como un punto, sin área', () => {
    const { chart } = render([{ bucket: '2026-11-17T00:00:00', sent: 2, failed: 0 }]);

    expect(chart.sentLine().done).toContain('h0.01');
    expect(chart.sentArea()).toBe('');
    expect(chart.css('')).toBeNull();
    expect(chart.css('M0,0')).toBe('path("M0,0")');
  });

  it('sin intervalos el teclado y el cursor no hacen nada', () => {
    const { chart } = render([]);

    chart.hoverAt(2);
    chart.onKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(chart.hover()).toBeNull();
  });
});
