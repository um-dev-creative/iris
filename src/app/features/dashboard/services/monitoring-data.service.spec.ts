import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MonitoringDataService, campaignStatus } from './monitoring-data.service';
import { campaignsFixture, monitoringProviders, overviewFixture } from './monitoring.testing';

const URL = '/mrc/api/v1/monitoring/overview';

describe('MonitoringDataService', () => {
  let service: MonitoringDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: monitoringProviders });
    service = TestBed.inject(MonitoringDataService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => vi.useRealTimers());

  it('sin datos no muestra ninguna cifra', () => {
    expect(service.loaded()).toBe(false);
    expect(service.kpis()).toEqual([]);
    expect(service.allLogs()).toEqual([]);
    expect(service.overallStatus()).toBe('unknown');
  });

  it('calcula los KPIs desde los datos reales', () => {
    service.apply(overviewFixture());

    const values = service.kpis().map((k) => [k.title, k.value]);
    expect(values).toContainEqual(['Mensajes Totales', '100']);
    expect(values).toContainEqual(['Tasa de Entrega', '88.9%']);
    expect(values).toContainEqual(['Fallidos', '10']);
    expect(values).toContainEqual(['Pendientes', '10']);
  });

  it('sin campañas terminadas no inventa una tasa de entrega', () => {
    const fixture = overviewFixture();
    service.apply({ ...fixture, totals: { ...fixture.totals, deliveryRate: null } });

    expect(service.kpis()[1].value).toBe('Sin datos');
  });

  it('la tendencia solo existe a partir de la segunda lectura', () => {
    const fixture = overviewFixture();
    service.apply(fixture);
    expect(service.kpis()[0].trend).toBeNull();

    service.apply({ ...fixture, totals: { ...fixture.totals, total: 130 } });

    expect(service.kpis()[0].trend).toBe(30);
    expect(service.kpis()[0].sparklineData).toEqual([100, 130]);
  });

  it('si Mercury no entregó campañas no muestra KPIs y lo indica', () => {
    service.apply(overviewFixture({ campaignsAvailable: false, campaigns: [] }));

    expect(service.loaded()).toBe(true);
    expect(service.available()).toBe(false);
    expect(service.kpis()).toEqual([]);
  });

  it('los recientes son las diez primeras campañas', () => {
    service.apply(overviewFixture());

    expect(service.logs()).toEqual(service.allLogs().slice(0, 10));
  });

  it.each([
    [[{ name: 'Mercury', status: 'operational', latencyMs: 1 }], 'all-operational'],
    [[{ name: 'Mercury', status: 'degraded', latencyMs: 1 }], 'partial-degradation'],
    [[{ name: 'Otro', status: 'down', latencyMs: 1 }], 'major-outage'],
  ] as const)('el estado global sigue al peor servicio', (services, expected) => {
    service.apply(overviewFixture({ services: [...services] }));

    expect(service.overallStatus()).toBe(expected);
    expect(service.services()[0].icon).toBeDefined();
  });

  it('refresh pide los datos al BFF y marca la carga', async () => {
    const done = service.refresh();
    expect(service.loading()).toBe(true);

    http.expectOne(URL).flush(overviewFixture());
    await done;

    expect(service.loading()).toBe(false);
    expect(service.error()).toBe(false);
    expect(service.lastRefresh()).not.toBeNull();
    expect(service.kpis()).toHaveLength(4);
  });

  it('si el BFF falla lo indica y conserva la última lectura', async () => {
    service.apply(overviewFixture());

    const done = service.refresh();
    http.expectOne(URL).flush({}, { status: 502, statusText: 'Bad Gateway' });
    await done;

    expect(service.error()).toBe(true);
    expect(service.kpis()).toHaveLength(4);
  });

  describe('poll', () => {
    const destroyable = () => {
      const callbacks: (() => void)[] = [];
      return { ref: { onDestroy: (cb: () => void) => callbacks.push(cb) } as unknown as DestroyRef, destroy: () => callbacks.forEach((cb) => cb()) };
    };

    it('consulta cada 30 segundos, comparte el temporizador y para con la última página', async () => {
      vi.useFakeTimers();
      const refresh = vi.spyOn(service, 'refresh').mockResolvedValue();
      const first = destroyable();
      const second = destroyable();

      service.poll(first.ref);
      service.poll(second.ref);
      expect(refresh).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(30_000);
      expect(refresh).toHaveBeenCalledTimes(2);

      first.destroy();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(refresh).toHaveBeenCalledTimes(3);

      second.destroy();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(refresh).toHaveBeenCalledTimes(3);
    });

    it('una pestaña oculta no consulta', async () => {
      vi.useFakeTimers();
      const refresh = vi.spyOn(service, 'refresh').mockResolvedValue();
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      const page = destroyable();

      service.poll(page.ref);
      await vi.advanceTimersByTimeAsync(30_000);

      expect(refresh).toHaveBeenCalledOnce();
      hidden.mockRestore();
      page.destroy();
    });
  });
});

describe('campaignStatus', () => {
  const [delivered, failed, pending] = campaignsFixture(3);

  it('distingue entregada, fallida y en curso', () => {
    expect(campaignStatus(delivered)).toBe('delivered');
    expect(campaignStatus(failed)).toBe('failed');
    expect(campaignStatus(pending)).toBe('pending');
  });

  it('una campaña sin resultados sigue en curso', () => {
    expect(campaignStatus({ ...delivered, delivered: 0, failed: 0 })).toBe('pending');
  });
});
