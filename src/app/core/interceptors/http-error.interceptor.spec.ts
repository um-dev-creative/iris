import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { httpErrorInterceptor } from './http-error.interceptor';
import { NotificationService } from '../services/notification.service';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpErrorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });
  afterEach(() => {
    controller.verify();
    vi.useRealTimers();
  });

  const failWith = (status: number, statusText = ''): { error: unknown } => {
    const result: { error: unknown } = { error: null };
    http.get('/x').subscribe({ error: (e) => (result.error = e) });
    controller.expectOne('/x').flush('boom', { status, statusText });
    return result;
  };

  it('deja pasar las respuestas correctas sin avisar', () => {
    let body: unknown;
    http.get('/x').subscribe((b) => (body = b));
    controller.expectOne('/x').flush({ ok: true });

    expect(body).toEqual({ ok: true });
    expect(notifications.toasts()).toHaveLength(0);
  });

  it.each([
    [401, 'No autorizado'],
    [403, 'Acceso denegado'],
    [404, 'No encontrado'],
    [0, 'Sin conexión'],
    [400, 'Error'],
  ])('un %i se avisa como "%s" y no se reintenta', (status, title) => {
    const result = failWith(status);

    expect(notifications.toasts()).toHaveLength(1);
    expect(notifications.toasts()[0]).toMatchObject({ type: 'error', title });
    expect((result.error as { status: number }).status).toBe(status);
  });

  it('un 500 se reintenta una vez tras 1 s y luego se avisa', () => {
    const result: { error: unknown } = { error: null };
    http.get('/x').subscribe({ error: (e) => (result.error = e) });

    controller.expectOne('/x').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(notifications.toasts()).toHaveLength(0);

    vi.advanceTimersByTime(1000);
    controller.expectOne('/x').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(notifications.toasts()).toHaveLength(1);
    expect(notifications.toasts()[0].title).toBe('Error del servidor');
    expect((result.error as { status: number }).status).toBe(500);
  });

  it('un 503 usa el texto del estado en el mensaje', () => {
    http.get('/x').subscribe({ error: () => undefined });
    controller.expectOne('/x').flush('x', { status: 503, statusText: 'Unavailable' });
    vi.advanceTimersByTime(1000);
    controller.expectOne('/x').flush('x', { status: 503, statusText: 'Unavailable' });

    expect(notifications.toasts()[0].message).toBe('Error 503: Unavailable');
  });

  it('si el reintento sale bien no hay aviso', () => {
    let body: unknown;
    http.get('/x').subscribe((b) => (body = b));
    controller.expectOne('/x').flush('x', { status: 500, statusText: 'e' });
    vi.advanceTimersByTime(1000);
    controller.expectOne('/x').flush({ ok: 1 });

    expect(body).toEqual({ ok: 1 });
    expect(notifications.toasts()).toHaveLength(0);
  });
});
