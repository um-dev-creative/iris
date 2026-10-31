import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { HomePageComponent } from './home-page.component';
import { MonitoringDataService } from '../../services/monitoring-data.service';
import { MonitoringKpi, MonitoringOverview } from '../../models/monitoring.model';
import { monitoringProviders, overviewFixture } from '../../services/monitoring.testing';

function render(overview: MonitoringOverview | null = overviewFixture()) {
  TestBed.configureTestingModule({ providers: monitoringProviders });
  const service = TestBed.inject(MonitoringDataService);
  if (overview) service.apply(overview);
  const fixture = TestBed.createComponent(HomePageComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, data: TestBed.inject(MonitoringDataService) };
}

describe('HomePageComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('pinta un KPI por cada indicador y una tarjeta por servicio', () => {
    const { el, data } = render();

    data.kpis().forEach((k) => expect(el.textContent).toContain(k.title));
    data.services().forEach((s) => expect(el.textContent).toContain(s.name));
  });

  it('muestra el estado global', () => {
    const { c, el } = render();

    expect(c.overallStatusLabel()).toBe('Degradación parcial');
    expect(c.overallStatusClasses()).toContain('bg-chart-3');
    expect(c.overallDotClass()).toBe('bg-chart-3');
    expect(el.textContent).toContain('Degradación parcial');
  });

  it.each([
    ['all-operational', 'Todo operativo', 'bg-success'],
    ['major-outage', 'Caída de servicio', 'bg-destructive'],
  ])('estado global %s', (status, label, dot) => {
    const overview = overviewFixture({ services: [{ name: 'Mercury', status: status === 'major-outage' ? 'down' : 'operational', latencyMs: 5 }] });
    const { c } = render(overview);

    expect(c.overallStatusLabel()).toBe(label);
    expect(c.overallDotClass()).toBe(dot);
  });

  it('el filtro por estado reduce los registros recientes', () => {
    const { fixture, c, el, data } = render();
    const all = c.filteredLogs().length;
    expect(all).toBe(data.logs().length);

    const failedButton = Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.trim() === 'Fallidas')!;
    failedButton.click();
    fixture.detectChanges();

    expect(c.logStatusFilter()).toBe('failed');
    expect(c.filteredLogs().every((l) => l.status === 'failed')).toBe(true);
    expect(c.filteredLogs().length).toBeLessThan(all);

    c.logStatusFilter.set('all');
    expect(c.filteredLogs()).toHaveLength(all);
  });

  it('los auxiliares de proveedor y estado tienen valor por defecto para desconocidos', () => {
    const { c } = render();

    expect(c.providerLabel('sms')).toBe('SMS');
    expect(c.providerLabel('whatsapp')).toBe('WhatsApp');
    expect(c.providerLabel('email')).toBe('Email');
    expect(c.providerLabel('fax')).toBe('fax');
    expect(c.providerClasses('sms')).toContain('chart-1');
    expect(c.providerClasses('fax')).toBe('');
    expect(c.providerIcon('sms')).toBeDefined();
    expect(c.providerIcon('fax')).toBe(c.providerIcon('email'));
    expect(c.statusLabel('failed')).toBe('Fallida');
    expect(c.statusLabel('otro')).toBe('otro');
    expect(c.statusClasses('delivered')).toContain('bg-success');
    expect(c.statusClasses('otro')).toBe('');
    expect(c.statusDotClass('pending')).toBe('bg-chart-1');
    expect(c.statusDotClass('otro')).toBe('');
  });

  it('el color de tendencia respeta las métricas invertidas', () => {
    const { c } = render();
    const kpi = (trend: number, invertTrend?: boolean) => ({ trend, invertTrend }) as MonitoringKpi;

    expect(c.trendColorClass(kpi(5))).toBe('text-success');
    expect(c.trendColorClass(kpi(-5))).toBe('text-destructive');
    expect(c.trendColorClass(kpi(-5, true))).toBe('text-success');
    expect(c.trendColorClass(kpi(5, true))).toBe('text-destructive');
    expect(c.trendColorClass({ trend: null } as MonitoringKpi)).toBe('text-success');
  });

  it('mientras carga no muestra cifras ni estado inventado', () => {
    const { c, el } = render(null);

    expect(c.overallStatusLabel()).toBe('Sin datos');
    expect(c.overallStatusClasses()).toContain('bg-muted');
    expect(c.overallDotClass()).toBe('bg-muted-foreground');
    expect(el.textContent).toContain('Cargando campañas');
    expect(el.textContent).not.toContain('Tasa de Entrega');
  });

  it('avisa si Mercury no entregó las campañas', () => {
    const { el } = render(overviewFixture({ campaignsAvailable: false, campaigns: [] }));

    expect(el.querySelector('output')?.textContent).toContain('Mercury no entregó las campañas');
    expect(el.textContent).toContain('No hay campañas para mostrar.');
  });

  it('avisa si no se pudieron actualizar los datos', async () => {
    const { fixture, el, data } = render();
    const http = TestBed.inject(HttpTestingController);

    const done = data.refresh();
    http.match(() => true).forEach((request) => request.flush({}, { status: 502, statusText: 'Bad Gateway' }));
    await done;
    fixture.detectChanges();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('No fue posible actualizar los datos');
  });

  it('el botón de actualizar dispara la recarga', () => {
    vi.useFakeTimers();
    const { el, data } = render();
    const refresh = vi.spyOn(data, 'refresh');

    (el.querySelector('button.w-9') as HTMLButtonElement).click();

    expect(refresh).toHaveBeenCalledOnce();
  });
});
