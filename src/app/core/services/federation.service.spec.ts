import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FederationService } from './federation.service';
import { API_BASE_URL } from '../config';
import { FEDERATION_MESSAGES, federationMessage } from '../models';

const FED = '/test/api/v1/auth/federation';

function setup(platform: 'browser' | 'server' = 'browser') {
  const assign = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '/test/api/v1' },
      { provide: PLATFORM_ID, useValue: platform },
      { provide: DOCUMENT, useValue: { location: { assign } } },
    ],
  });
  return { service: TestBed.inject(FederationService), http: TestBed.inject(HttpTestingController), assign };
}

describe('FederationService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('pide los proveedores y los expone', async () => {
    const { service, http } = setup();

    const done = service.loadProviders();
    http.expectOne(`${FED}/providers`).flush({ enabled: true, providers: [{ provider: 'google', displayName: 'Google' }] });
    await done;

    expect(service.providers()).toEqual([{ provider: 'google', displayName: 'Google' }]);
  });

  it('con la función apagada, o si el servicio falla, no hay proveedores', async () => {
    const { service, http } = setup();

    const off = service.loadProviders();
    http.expectOne(`${FED}/providers`).flush({ enabled: false, providers: [{ provider: 'google', displayName: 'Google' }] });
    await off;
    expect(service.providers()).toEqual([]);

    const broken = service.loadProviders();
    http.expectOne(`${FED}/providers`).flush({}, { status: 500, statusText: 'x' });
    await broken;
    expect(service.providers()).toEqual([]);

    const missing = service.loadProviders();
    http.expectOne(`${FED}/providers`).flush({ enabled: true });
    await missing;
    expect(service.providers()).toEqual([]);
  });

  it('en el servidor (SSR) no llama a nadie', async () => {
    const { service, http } = setup('server');
    await service.loadProviders();
    http.expectNone(`${FED}/providers`);
  });

  it('signIn navega al BFF con la ruta de vuelta codificada', () => {
    const { service, assign } = setup();
    service.signIn('google', '/dashboard/monitoring?x=1');
    expect(assign).toHaveBeenCalledWith(`${FED}/google/start?returnTo=${encodeURIComponent('/dashboard/monitoring?x=1')}`);
  });

  it('carga las cuentas enlazadas y marca la carga', async () => {
    const { service, http } = setup();

    const done = service.loadIdentities();
    expect(service.loading()).toBe(true);
    http.expectOne(`${FED}/identities`).flush({ identities: [{ id: 'i-1', provider: 'google' }] });
    await done;

    expect(service.loading()).toBe(false);
    expect(service.identities()).toEqual([{ id: 'i-1', provider: 'google' }]);
  });

  it('si no se pueden cargar, la lista queda vacía y el error llega a quien llamó', async () => {
    const { service, http } = setup();

    const done = service.loadIdentities();
    http.expectOne(`${FED}/identities`).flush({}, { status: 502, statusText: 'x' });

    await expect(done).rejects.toBeTruthy();
    expect(service.identities()).toEqual([]);
    expect(service.loading()).toBe(false);

    const empty = service.loadIdentities();
    http.expectOne(`${FED}/identities`).flush({});
    await empty;
    expect(service.identities()).toEqual([]);
  });

  it('link pide la URL al BFF y navega a ella', async () => {
    const { service, http, assign } = setup();

    const done = service.link('github', '/dashboard/account');
    const req = http.expectOne(`${FED}/github/link`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ returnTo: '/dashboard/account' });
    req.flush({ authorizationUrl: 'https://idp.example/auth' });
    await done;

    expect(assign).toHaveBeenCalledWith('https://idp.example/auth');
  });

  it('unlink borra el enlace y recarga la lista', async () => {
    const { service, http } = setup();

    const done = service.unlink('i-1');
    const del = http.expectOne(`${FED}/identities/i-1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await vi.waitFor(() => http.expectOne(`${FED}/identities`).flush({ identities: [] }));
    await done;

    expect(service.identities()).toEqual([]);
  });
});

describe('federationMessage', () => {
  it('traduce cada código conocido, usa el de «falló» para uno nuevo y nada sin código', () => {
    Object.keys(FEDERATION_MESSAGES).forEach((code) => expect(federationMessage(code)).toBe(FEDERATION_MESSAGES[code]));
    expect(federationMessage('algo_nuevo')).toBe(FEDERATION_MESSAGES['failed']);
    expect(federationMessage(undefined)).toBeNull();
    expect(federationMessage('')).toBeNull();
  });
});
