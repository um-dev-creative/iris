import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/config';
import { EVENT_SOURCE_FACTORY, MonitoringLiveService } from './monitoring-live.service';
import { FakeEventSource, answerAll, healthFixture, messagesFixture, paths, summaryFixture } from './monitoring-live.testing';

const ALL = ['failures', 'health', 'messages', 'outages', 'series', 'summary', 'verification-codes'];
const destroyRef = (): DestroyRef & { destroy: () => void } => {
  let callback = () => undefined as void;
  return { onDestroy: (fn: () => void) => { callback = fn; return () => undefined; }, destroy: () => callback() } as never;
};

describe('MonitoringLiveService', () => {
  let service: MonitoringLiveService;
  let http: HttpTestingController;

  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), MonitoringLiveService,
        { provide: API_BASE_URL, useValue: '/mrc/api/v1' },
        { provide: EVENT_SOURCE_FACTORY, useValue: (url: string) => new FakeEventSource(url) },
      ],
    });
    service = TestBed.inject(MonitoringLiveService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    service.stop();
    vi.useRealTimers();
  });

  const refresh = async () => {
    const done = service.refreshAll();
    const requests = answerAll(http);
    await done;
    return requests;
  };
  const started = async () => {
    service.start(destroyRef());
    answerAll(http);
    await vi.waitFor(() => expect(service.lastUpdate()).not.toBeNull());
  };

  it('al empezar pide las siete vistas y las deja en señales', async () => {
    service.start(destroyRef());
    expect(paths(answerAll(http))).toEqual(ALL);

    await vi.waitFor(() => expect(service.messages()).not.toBeNull());
    expect(service.summary()?.totals.sent).toBe(90);
    expect(service.series()?.points).toHaveLength(2);
    expect(service.failures()?.causes).toHaveLength(1);
    expect(service.codes()?.generated).toBe(20);
    expect(service.health()?.overall).toBe('DEGRADED');
    expect(service.outages()?.outages).toHaveLength(2);
    expect(service.stale()).toBe(false);
    expect(service.loading()).toBe(false);
  });

  it('empezar dos veces no duplica nada', () => {
    service.start(destroyRef());
    service.start(destroyRef());

    expect(answerAll(http)).toHaveLength(7);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('el periodo viaja en todas las consultas con rango', async () => {
    await started();
    service.setRange('7d');

    const requests = answerAll(http);
    expect(requests.filter((r) => r.request.params.get('range') === '7d').length).toBe(5);
    // la tabla de mensajes cubre el mismo periodo: desde hace 7 días
    const from = new Date(`${requests.find((r) => r.request.url.endsWith('/messages'))!.request.params.get('from')}Z`).getTime();
    expect(Date.now() - from).toBeGreaterThanOrEqual(7 * 86_400_000 - 5000);
    expect(Date.now() - from).toBeLessThan(7 * 86_400_000 + 5000);
    expect(requests.find((r) => r.request.url.endsWith('/health'))!.request.params.has('range')).toBe(false);
  });

  describe('filtros enlazados', () => {
    it('elegir un canal vuelve a pedir la serie y los mensajes con el canal; elegirlo otra vez lo quita', async () => {
      await started();

      service.toggleChannel('EMAIL');
      let requests = answerAll(http);
      expect(paths(requests)).toEqual(['messages?channel=EMAIL&page=0&size=20'.split('?')[0], 'series'].sort());
      expect(requests.find((r) => r.request.url.endsWith('/series'))!.request.params.get('channel')).toBe('EMAIL');
      expect(requests.find((r) => r.request.url.endsWith('/messages'))!.request.params.get('channel')).toBe('EMAIL');
      expect(service.channel()).toBe('EMAIL');
      expect(service.hasFilters()).toBe(true);

      service.toggleChannel('EMAIL');
      requests = answerAll(http);
      expect(requests.find((r) => r.request.url.endsWith('/series'))!.request.params.has('channel')).toBe(false);
      expect(service.channel()).toBeNull();
    });

    it('el tipo filtra la serie y los mensajes', async () => {
      await started();

      service.toggleKind('CAMPAIGN');
      const requests = answerAll(http);

      expect(requests.map((r) => r.request.params.get('kind'))).toEqual(['CAMPAIGN', 'CAMPAIGN']);
      service.toggleKind('CAMPAIGN');
      answerAll(http);
      expect(service.kind()).toBeNull();
    });

    it('el estado filtra solo los mensajes y vuelve a la primera página', async () => {
      await started();

      service.toggleStatus('FAILED');
      const requests = answerAll(http);

      expect(paths(requests)).toEqual(['messages']);
      expect(requests[0].request.params.get('status')).toBe('FAILED');
      expect(requests[0].request.params.get('page')).toBe('0');
      service.toggleStatus('FAILED');
      answerAll(http);
      expect(service.status()).toBeNull();
    });

    it('elegir una barra filtra los mensajes por su intervalo; elegirla otra vez lo quita', async () => {
      await started();
      const point = service.series()!.points[1];

      service.toggleBucket(point);
      const [request] = answerAll(http);
      expect(request.request.params.get('from')).toBe('2026-11-17T07:00:00');
      expect(request.request.params.get('to')).toBe('2026-11-17T08:00:00');

      service.toggleBucket(point);
      const [again] = answerAll(http);
      expect(again.request.params.has('to')).toBe(false);
      expect(again.request.params.get('from')).not.toBe('2026-11-17T07:00:00');
      expect(service.bucket()).toBeNull();
    });

    it('una causa de fallo lleva a los mensajes fallidos de su canal', async () => {
      await started();

      service.drillIntoFailure('EMAIL');
      const requests = answerAll(http);

      expect(service.channel()).toBe('EMAIL');
      expect(service.status()).toBe('FAILED');
      expect(requests.find((r) => r.request.url.endsWith('/messages'))!.request.params.get('status')).toBe('FAILED');
      expect(paths(requests)).toEqual(['messages', 'series']);
    });

    it('elegir un servicio filtra el historial de caídas sin pedir nada', async () => {
      await started();

      service.toggleService('SMTP');
      expect(service.visibleOutages().map((o) => o.service)).toEqual(['SMTP']);
      expect(http.match(() => true)).toHaveLength(0);
      service.toggleService('SMTP');
      expect(service.visibleOutages()).toHaveLength(2);
    });

    it('quitar los filtros los borra todos y vuelve a pedir', async () => {
      await started();
      service.toggleChannel('EMAIL');
      service.toggleKind('CAMPAIGN');
      service.toggleService('SMTP');
      answerAll(http);

      service.clearFilters();
      answerAll(http);

      expect(service.hasFilters()).toBe(false);
      expect([service.channel(), service.kind(), service.status(), service.bucket(), service.service()]).toEqual([null, null, null, null, null]);
    });

    it('cambiar el periodo quita el intervalo elegido y reabre el flujo con el periodo nuevo', async () => {
      await started();
      service.toggleBucket(service.series()!.points[0]);
      answerAll(http);

      service.setRange('1h');
      answerAll(http);

      expect(service.bucket()).toBeNull();
      expect(FakeEventSource.instances[0].closed).toBe(true);
      expect(FakeEventSource.instances.at(-1)!.url).toBe('/mrc/api/v1/monitoring/stream?range=1h');
      service.setRange('1h');
      expect(http.match(() => true)).toHaveLength(0);
    });
  });

  describe('páginas de mensajes', () => {
    it('calcula las páginas y no sale del rango', async () => {
      await started();
      expect(service.totalPages()).toBe(3);

      service.goToPage(9);
      const [request] = answerAll(http);
      expect(request.request.params.get('page')).toBe('2');

      service.goToPage(2);
      expect(http.match(() => true)).toHaveLength(0);
      service.goToPage(-4);
      expect(answerAll(http)[0].request.params.get('page')).toBe('0');
    });

    it('sin mensajes hay una página', () => {
      expect(service.totalPages()).toBe(1);
      service.messages.set({ ...messagesFixture(0), size: 0 });
      expect(service.totalPages()).toBe(1);
    });
  });

  describe('flujo de eventos', () => {
    it('conecta y marca «en vivo» al abrirse', async () => {
      await started();
      expect(service.connection()).toBe('connecting');
      expect(FakeEventSource.instances[0].url).toBe('/mrc/api/v1/monitoring/stream?range=24h');

      FakeEventSource.instances[0].open();

      expect(service.connection()).toBe('live');
    });

    it('los eventos summary y health reemplazan los datos', async () => {
      await started();
      const source = FakeEventSource.instances[0];

      source.emit('summary', { ...summaryFixture(), totals: { sent: 1, failed: 2, queued: 3, successRate: 0.3 } });
      source.emit('health', { ...healthFixture(), overall: 'OUTAGE' });

      expect(service.summary()?.totals.sent).toBe(1);
      expect(service.health()?.overall).toBe('OUTAGE');
      expect(service.connection()).toBe('live');
      expect(service.stale()).toBe(false);
    });

    it('un evento ilegible no cambia nada', async () => {
      await started();

      FakeEventSource.instances[0].emit('summary', 'no es json');

      expect(service.summary()?.totals.sent).toBe(90);
    });

    it('un error recuperable (el navegador reconecta) pasa a sondeo sin cerrar el flujo', async () => {
      await started();
      FakeEventSource.instances[0].open();

      FakeEventSource.instances[0].fail(0);

      expect(service.connection()).toBe('polling');
      expect(FakeEventSource.instances[0].closed).toBe(false);
    });

    it('un flujo rechazado se cierra, se consulta más a menudo y se reintenta al minuto', async () => {
      vi.useFakeTimers();
      service.start(destroyRef());
      answerAll(http);

      FakeEventSource.instances[0].fail(2);
      expect(service.connection()).toBe('polling');
      expect(FakeEventSource.instances[0].closed).toBe(true);

      // sin flujo, a los 15 s se consulta todo, también el resumen y la salud
      vi.advanceTimersByTime(15_000);
      expect(paths(http.match(() => true))).toEqual(ALL);

      vi.advanceTimersByTime(45_000);
      expect(FakeEventSource.instances).toHaveLength(2);
      expect(FakeEventSource.instances[1].closed).toBe(false);
      http.match(() => true);
    });

    it('si el flujo no se puede abrir, sigue con sondeo', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(), provideHttpClientTesting(), MonitoringLiveService, { provide: API_BASE_URL, useValue: '/mrc/api/v1' },
          { provide: EVENT_SOURCE_FACTORY, useValue: () => { throw new Error('sin EventSource'); } },
        ],
      });
      const broken = TestBed.inject(MonitoringLiveService);

      broken.start(destroyRef());

      expect(broken.connection()).toBe('polling');
      broken.stop();
      TestBed.inject(HttpTestingController).match(() => true);
    });

    it('si la reapertura del flujo llega con el servicio ya detenido, no hace nada', () => {
      vi.useFakeTimers();
      service.start(destroyRef());
      answerAll(http);
      FakeEventSource.instances[0].fail(2);

      service.stop();
      vi.advanceTimersByTime(120_000);

      expect(FakeEventSource.instances).toHaveLength(1);
    });
  });

  describe('sondeo', () => {
    it('con el flujo en vivo solo consulta lo que el flujo no trae', async () => {
      vi.useFakeTimers();
      service.start(destroyRef());
      answerAll(http);
      FakeEventSource.instances[0].open();

      vi.advanceTimersByTime(30_000);

      expect(paths(http.match(() => true))).toEqual(['failures', 'messages', 'outages', 'series', 'verification-codes']);
    });

    it('con una pestaña oculta no consulta', () => {
      vi.useFakeTimers();
      service.start(destroyRef());
      answerAll(http);
      FakeEventSource.instances[0].open();
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);

      vi.advanceTimersByTime(60_000);

      expect(http.match(() => true)).toHaveLength(0);
      vi.restoreAllMocks();
    });

    it('si la consulta del sondeo falla, marca los datos como desactualizados', async () => {
      vi.useFakeTimers();
      service.start(destroyRef());
      answerAll(http);
      FakeEventSource.instances[0].open();
      await vi.advanceTimersByTimeAsync(0);

      vi.advanceTimersByTime(30_000);
      answerAll(http, 500);
      await vi.advanceTimersByTimeAsync(0);

      expect(service.stale()).toBe(true);
      expect(service.connection()).toBe('live');
    });
  });

  describe('errores', () => {
    it('si una consulta falla marca los datos como desactualizados y sin conexión; al volver se recupera', async () => {
      await started();
      const failing = service.refreshAll();
      answerAll(http, 503);
      await failing;

      expect(service.stale()).toBe(true);
      expect(service.connection()).toBe('offline');
      expect(service.summary()?.totals.sent).toBe(90);

      await refresh();
      expect(service.stale()).toBe(false);
      expect(service.connection()).toBe('polling');
    });
  });

  it('al destruirse cierra el flujo y para los temporizadores', async () => {
    vi.useFakeTimers();
    const ref = destroyRef();
    service.start(ref);
    answerAll(http);

    ref.destroy();
    vi.advanceTimersByTime(120_000);

    expect(FakeEventSource.instances[0].closed).toBe(true);
    expect(http.match(() => true)).toHaveLength(0);
  });
});
