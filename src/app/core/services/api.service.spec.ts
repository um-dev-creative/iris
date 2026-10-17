import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'api_config';

function setup(platform: 'browser' | 'server'): { service: ApiService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  return { service: TestBed.inject(ApiService), http: TestBed.inject(HttpTestingController) };
}

describe('ApiService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.inject(HttpTestingController).verify();
  });

  describe('en el navegador', () => {
    it('usa la configuración del entorno cuando no hay nada guardado', () => {
      const { service } = setup('browser');

      expect(service.getConfig()).toEqual({ baseUrl: environment.apiBaseUrl, apiKey: environment.apiKey, authType: 'none' });
    });

    it('carga la configuración guardada', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl: 'https://api.test', authType: 'bearer', apiKey: 'k' }));

      const { service } = setup('browser');

      expect(service.getConfig()).toEqual({ baseUrl: 'https://api.test', authType: 'bearer', apiKey: 'k' });
    });

    it('ignora un JSON roto y conserva la configuración por defecto', () => {
      localStorage.setItem(STORAGE_KEY, '{no-es-json');

      const { service } = setup('browser');

      expect(service.getConfig().baseUrl).toBe(environment.apiBaseUrl);
    });

    it('persiste los cambios y sobrevive a una "recarga"', () => {
      setup('browser').service.updateConfig({ baseUrl: 'https://otra.test' });
      TestBed.resetTestingModule();

      expect(setup('browser').service.getConfig().baseUrl).toBe('https://otra.test');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).baseUrl).toBe('https://otra.test');
    });

    it('getConfig devuelve una copia', () => {
      const { service } = setup('browser');

      service.getConfig().baseUrl = 'mutado';

      expect(service.getConfig().baseUrl).toBe(environment.apiBaseUrl);
    });
  });

  describe('en el servidor (SSR)', () => {
    it('no toca localStorage al crearse ni al actualizar la configuración', () => {
      vi.stubGlobal('localStorage', undefined); // en Node real, `localStorage` no existe

      const { service } = setup('server');
      service.updateConfig({ baseUrl: 'https://ssr.test' });

      expect(service.getConfig().baseUrl).toBe('https://ssr.test');
    });

    it('usa la configuración por defecto aunque haya algo guardado', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseUrl: 'https://guardada.test' }));

      const { service } = setup('server');

      expect(service.getConfig().baseUrl).toBe(environment.apiBaseUrl);
    });
  });

  describe('peticiones', () => {
    it('GET arma la URL, los parámetros y el Content-Type', () => {
      const { service, http } = setup('browser');

      service.get('/items', { page: 2, q: 'x y' }).subscribe();

      const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/items`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('q')).toBe('x y');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      req.flush([]);
    });

    it('GET sin parámetros no agrega query', () => {
      const { service, http } = setup('browser');

      service.get('/items').subscribe();

      expect(http.expectOne(`${environment.apiBaseUrl}/items`).request.params.keys()).toEqual([]);
    });

    it('POST, PUT y DELETE usan el método y el cuerpo correctos', () => {
      const { service, http } = setup('browser');

      service.post('/a', { n: 1 }).subscribe();
      service.put('/a/1', { n: 2 }).subscribe();
      service.delete('/a/1').subscribe();

      const post = http.expectOne((r) => r.method === 'POST');
      expect(post.request.body).toEqual({ n: 1 });
      const put = http.expectOne((r) => r.method === 'PUT');
      expect(put.request.body).toEqual({ n: 2 });
      const del = http.expectOne((r) => r.method === 'DELETE');
      expect(del.request.url).toBe(`${environment.apiBaseUrl}/a/1`);
      [post, put, del].forEach((r) => r.flush({}));
    });

    it.each([
      ['bearer', 'Authorization', 'Bearer secreto'],
      ['apikey', 'X-API-Key', 'secreto'],
    ] as const)('authType %s envía %s', (authType, header, value) => {
      const { service, http } = setup('browser');
      service.updateConfig({ authType, apiKey: 'secreto' });

      service.get('/x').subscribe();

      const req = http.expectOne(`${environment.apiBaseUrl}/x`);
      expect(req.request.headers.get(header)).toBe(value);
      req.flush({});
    });

    it('sin apiKey o con authType none no envía credenciales', () => {
      const { service, http } = setup('browser');
      service.updateConfig({ authType: 'bearer', apiKey: '' });

      service.get('/x').subscribe();

      const req = http.expectOne(`${environment.apiBaseUrl}/x`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(req.request.headers.has('X-API-Key')).toBe(false);
      req.flush({});
    });
  });
});
