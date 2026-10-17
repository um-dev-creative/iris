import { TestBed } from '@angular/core/testing';
import { MonitoringDataService } from './monitoring-data.service';

describe('MonitoringDataService', () => {
  let service: MonitoringDataService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = TestBed.inject(MonitoringDataService);
  });
  afterEach(() => vi.useRealTimers());

  it('expone cuatro KPIs y seis servicios', () => {
    expect(service.kpis()).toHaveLength(4);
    expect(service.services()).toHaveLength(6);
  });

  it('los logs recientes son los diez primeros del conjunto completo', () => {
    expect(service.allLogs().length).toBeGreaterThan(10);
    expect(service.logs()).toEqual(service.allLogs().slice(0, 10));
  });

  it('el estado global sigue al peor servicio', () => {
    expect(service.overallStatus()).toBe('partial-degradation');

    service.services.update((list) => list.map((s) => ({ ...s, status: 'operational' as const })));
    expect(service.overallStatus()).toBe('all-operational');

    service.services.update((list) => [{ ...list[0], status: 'down' as const }, ...list.slice(1)]);
    expect(service.overallStatus()).toBe('major-outage');
  });

  it('refresh marca carga durante 800 ms y actualiza la hora', async () => {
    const before = service.lastRefresh();
    vi.setSystemTime(before.getTime() + 5000);

    const done = service.refresh();
    expect(service.loading()).toBe(true);

    await vi.advanceTimersByTimeAsync(800);
    await done;

    expect(service.loading()).toBe(false);
    expect(service.lastRefresh().getTime()).toBeGreaterThan(before.getTime());
  });
});
