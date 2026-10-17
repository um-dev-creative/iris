import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config';
import { User } from '../models';

const AUTH = '/test/api/v1/auth';
const USER: User = { id: 'u-1', username: 'luis', name: 'Luis Mata', firstname: 'Luis', lastname: 'Mata', expiresAt: '2026-10-18T00:00:00.000Z' };

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '/test/api/v1' },
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('arranca en unknown, sin usuario', () => {
    const { auth } = setup();

    expect(auth.status()).toBe('unknown');
    expect(auth.user()).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  describe('login (AC1)', () => {
    it('envía las credenciales y guarda el perfil', async () => {
      const { auth, http } = setup();

      const done = auth.login({ email: 'luis@iris.dev', password: 'pw' });
      const req = http.expectOne(`${AUTH}/access-token`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'luis@iris.dev', password: 'pw' });
      req.flush({ authenticated: true, user: USER });
      await done;

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.status()).toBe('authenticated');
      expect(auth.user()).toEqual(USER);
    });

    it('credenciales inválidas: se rechaza y el estado no cambia', async () => {
      const { auth, http } = setup();

      const done = auth.login({ email: 'x', password: 'y' });
      http.expectOne(`${AUTH}/access-token`).flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

      await expect(done).rejects.toMatchObject({ status: 401 });
      expect(auth.status()).toBe('unknown');
      expect(auth.user()).toBeNull();
    });

    it('una respuesta sin usuario deja la sesión anónima', async () => {
      const { auth, http } = setup();

      const done = auth.login({ email: 'x', password: 'y' });
      http.expectOne(`${AUTH}/access-token`).flush({ authenticated: true });
      await done;

      expect(auth.status()).toBe('anonymous');
      expect(auth.user()).toBeNull();
    });
  });

  describe('logout (AC2)', () => {
    async function signedIn() {
      const ctx = setup();
      const done = ctx.auth.login({ email: 'a', password: 'b' });
      ctx.http.expectOne(`${AUTH}/access-token`).flush({ authenticated: true, user: USER });
      await done;
      return ctx;
    }

    it('llama al BFF y pasa a anonymous', async () => {
      const { auth, http } = await signedIn();

      const done = auth.logout();
      const req = http.expectOne(`${AUTH}/logout`);
      expect(req.request.method).toBe('POST');
      req.flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(auth.status()).toBe('anonymous');
      expect(auth.user()).toBeNull();
    });

    it('pasa a anonymous aunque el BFF falle', async () => {
      const { auth, http } = await signedIn();

      const done = auth.logout();
      http.expectOne(`${AUTH}/logout`).flush({}, { status: 500, statusText: 'Server Error' });
      await expect(done).resolves.toBeUndefined();

      expect(auth.status()).toBe('anonymous');
      expect(auth.user()).toBeNull();
    });

    it('pasa a anonymous aunque no haya red', async () => {
      const { auth, http } = await signedIn();

      const done = auth.logout();
      http.expectOne(`${AUTH}/logout`).error(new ProgressEvent('error'));
      await done;

      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('restoreSession (AC3)', () => {
    it('con sesión válida restaura el usuario sin pasar por el login', async () => {
      const { auth, http } = setup();

      const done = auth.restoreSession();
      const req = http.expectOne(`${AUTH}/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ authenticated: true, user: USER });
      await done;

      expect(auth.status()).toBe('authenticated');
      expect(auth.user()).toEqual(USER);
    });

    it('sin sesión (401) queda anónimo', async () => {
      const { auth, http } = setup();

      const done = auth.restoreSession();
      http.expectOne(`${AUTH}/me`).flush({ authenticated: false }, { status: 401, statusText: 'Unauthorized' });
      await done;

      expect(auth.status()).toBe('anonymous');
    });

    it('con el BFF caído queda anónimo y no lanza', async () => {
      const { auth, http } = setup();

      const done = auth.restoreSession();
      http.expectOne(`${AUTH}/me`).error(new ProgressEvent('error'));

      await expect(done).resolves.toBeUndefined();
      expect(auth.status()).toBe('anonymous');
    });

    it('las llamadas simultáneas comparten una sola petición', async () => {
      const { auth, http } = setup();

      const first = auth.restoreSession();
      const second = auth.restoreSession();
      http.expectOne(`${AUTH}/me`).flush({ authenticated: true, user: USER });
      await Promise.all([first, second]);

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('una llamada posterior a la resolución vuelve a preguntar', async () => {
      const { auth, http } = setup();

      const first = auth.restoreSession();
      http.expectOne(`${AUTH}/me`).flush({ authenticated: true, user: USER });
      await first;
      const second = auth.restoreSession();
      http.expectOne(`${AUTH}/me`).flush({ authenticated: false }, { status: 401, statusText: 'Unauthorized' });
      await second;

      expect(auth.status()).toBe('anonymous');
    });
  });

  describe('en el servidor (AC4)', () => {
    it('el estado queda unknown y no se hace ninguna llamada', async () => {
      const { auth, http } = setup('server');

      await auth.restoreSession();

      http.expectNone(() => true);
      expect(auth.status()).toBe('unknown');
      expect(auth.user()).toBeNull();
    });
  });

  it('clearSession termina la sesión sin llamar al BFF', async () => {
    const { auth, http } = setup();
    const done = auth.restoreSession();
    http.expectOne(`${AUTH}/me`).flush({ authenticated: true, user: USER });
    await done;

    auth.clearSession();

    http.expectNone(() => true);
    expect(auth.status()).toBe('anonymous');
    expect(auth.user()).toBeNull();
  });
});
