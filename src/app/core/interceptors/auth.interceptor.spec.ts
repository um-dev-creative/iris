import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { httpErrorInterceptor } from './http-error.interceptor';
import { NotificationService } from '../services/notification.service';
import { fakeAuth } from '../testing/auth.testing';

const USER = { id: 'u-1', username: 'luis', name: 'Luis Mata' };
const API = '/mrc/api/v1/general/accounts';
const FAIL = { status: 401, statusText: 'Unauthorized' };

function setup({ signedIn = true } = {}) {
  vi.useFakeTimers();
  const auth = fakeAuth(signedIn ? USER : null);
  if (!signedIn) auth.setStatus('anonymous');
  TestBed.configureTestingModule({
    // el orden documentado: auth → error
    providers: [provideRouter([]), auth.provider, provideHttpClient(withInterceptors([authInterceptor, httpErrorInterceptor])), provideHttpClientTesting()],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  vi.spyOn(router, 'url', 'get').mockReturnValue('/dashboard/data');
  return {
    auth,
    navigate,
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    toasts: () => TestBed.inject(NotificationService).toasts(),
  };
}

describe('authInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  describe('llamadas al BFF', () => {
    it('viajan con cookies y la cabecera CSRF', () => {
      const { http, controller } = setup();

      http.get(API).subscribe();
      const req = controller.expectOne(API);

      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('x-iris-csrf')).toBe('1');
      req.flush({});
    });

    it('también las de Backbone y las de /auth', () => {
      const { http, controller } = setup();

      http.get('/bkd/api/v1/users').subscribe();
      http.post('/mrc/api/v1/auth/access-token', {}).subscribe();

      for (const req of controller.match(() => true)) {
        expect(req.request.withCredentials).toBe(true);
        expect(req.request.headers.get('x-iris-csrf')).toBe('1');
        req.flush({});
      }
    });

    it('las llamadas a otros orígenes no reciben cookies ni la cabecera', () => {
      const { http, controller } = setup();

      http.get('https://api.externa.test/v1/x').subscribe();
      http.get('/assets/data.json').subscribe();

      for (const req of controller.match(() => true)) {
        expect(req.request.withCredentials).toBe(false);
        expect(req.request.headers.has('x-iris-csrf')).toBe(false);
        req.flush({});
      }
    });
  });

  describe('sesión expirada (AC1)', () => {
    it('un 401 con sesión abierta avisa, limpia el estado y lleva al login con returnUrl', () => {
      const { http, controller, auth, navigate, toasts } = setup();
      let error: unknown;

      http.get(API).subscribe({ error: (e) => (error = e) });
      controller.expectOne(API).flush({}, FAIL);

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0]).toMatchObject({ type: 'warning', title: 'Tu sesión expiró' });
      expect(auth.service.clearSession).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login'], { queryParams: { returnUrl: '/dashboard/data' } });
      expect((error as { status: number }).status).toBe(401);
    });

    it('varios 401 simultáneos generan un solo aviso y una sola navegación', () => {
      const { http, controller, navigate, toasts } = setup();

      http.get(`${API}/1`).subscribe({ error: () => undefined });
      http.get(`${API}/2`).subscribe({ error: () => undefined });
      http.post(`${API}/3`, {}).subscribe({ error: () => undefined });
      controller.match(() => true).forEach((req) => req.flush({}, FAIL));

      expect(toasts()).toHaveLength(1);
      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it('un 401 sin sesión abierta no avisa ni navega', () => {
      const { http, controller, navigate, toasts } = setup({ signedIn: false });

      http.get(API).subscribe({ error: () => undefined });
      controller.expectOne(API).flush({}, FAIL);

      expect(toasts()).toHaveLength(0);
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('endpoints de /auth (AC2)', () => {
    it.each(['/mrc/api/v1/auth/access-token', '/mrc/api/v1/auth/me', '/mrc/api/v1/auth/logout'])(
      'el 401 de %s no dispara aviso ni redirección, ni siquiera con sesión abierta',
      (url) => {
        const { http, controller, navigate, toasts, auth } = setup();
        let status = 0;

        http.post(url, {}).subscribe({ error: (e) => (status = e.status) });
        controller.expectOne(url).flush({}, FAIL);

        expect(status).toBe(401);
        expect(toasts()).toHaveLength(0);
        expect(navigate).not.toHaveBeenCalled();
        expect(auth.service.clearSession).not.toHaveBeenCalled();
      },
    );
  });

  describe('convivencia con httpErrorInterceptor (AC3)', () => {
    it('un 500 se reintenta una vez tras 1 s y la segunda respuesta llega', () => {
      const { http, controller, toasts } = setup();
      let body: unknown;

      http.get(API).subscribe((b) => (body = b));
      controller.expectOne(API).flush('boom', { status: 500, statusText: 'Server Error' });
      vi.advanceTimersByTime(1000);
      const retry = controller.expectOne(API);
      expect(retry.request.withCredentials).toBe(true);
      retry.flush({ ok: true });

      expect(body).toEqual({ ok: true });
      expect(toasts()).toHaveLength(0);
    });

    it('un 500 persistente avisa una vez como error del servidor y no cierra la sesión', () => {
      const { http, controller, toasts, navigate, auth } = setup();

      http.get(API).subscribe({ error: () => undefined });
      controller.expectOne(API).flush('x', { status: 500, statusText: 'Server Error' });
      vi.advanceTimersByTime(1000);
      controller.expectOne(API).flush('x', { status: 500, statusText: 'Server Error' });

      expect(toasts()).toHaveLength(1);
      expect(toasts()[0].title).toBe('Error del servidor');
      expect(navigate).not.toHaveBeenCalled();
      expect(auth.service.clearSession).not.toHaveBeenCalled();
    });

    it('un 403 del BFF avisa "Acceso denegado" y no cierra la sesión', () => {
      const { http, controller, toasts, navigate } = setup();

      http.get(API).subscribe({ error: () => undefined });
      controller.expectOne(API).flush({}, { status: 403, statusText: 'Forbidden' });

      expect(toasts().map((t) => t.title)).toEqual(['Acceso denegado']);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('el 401 de una API externa conserva el aviso "No autorizado" de siempre', () => {
      const { http, controller, toasts, navigate } = setup();

      http.get('https://api.externa.test/v1/x').subscribe({ error: () => undefined });
      controller.expectOne('https://api.externa.test/v1/x').flush({}, FAIL);

      expect(toasts().map((t) => t.title)).toEqual(['No autorizado']);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('el 401 del BFF no genera además el aviso "No autorizado"', () => {
      const { http, controller, toasts } = setup();

      http.get(API).subscribe({ error: () => undefined });
      controller.expectOne(API).flush({}, FAIL);

      expect(toasts().map((t) => t.title)).not.toContain('No autorizado');
    });
  });
});
