import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, APP_CONFIG, AppConfig, DEFAULT_APP_CONFIG } from './app-config.token';
import { buildAppConfig, provideAppConfig } from './provide-app-config';

describe('buildAppConfig', () => {
  it('sin nada definido devuelve los valores por defecto', () => {
    expect(buildAppConfig({})).toEqual(DEFAULT_APP_CONFIG);
  });

  it('el entorno pisa los valores por defecto', () => {
    const config = buildAppConfig({ production: true, apiBaseUrl: '/otra/api', pollingIntervalMs: 5000 });

    expect(config).toMatchObject({ production: true, apiBaseUrl: '/otra/api', pollingIntervalMs: 5000 });
  });

  it('mezcla features por clave: lo no definido conserva su valor por defecto', () => {
    const config = buildAppConfig({ features: { mockData: false } });

    expect(config.features).toEqual({ mockData: false, showcase: DEFAULT_APP_CONFIG.features.showcase });
  });

  it('no modifica los valores por defecto', () => {
    const before = structuredClone(DEFAULT_APP_CONFIG);

    buildAppConfig({ features: { showcase: false }, apiBaseUrl: '/x' });

    expect(DEFAULT_APP_CONFIG).toEqual(before);
  });
});

describe('provideAppConfig', () => {
  const configure = (providers: unknown[]) => TestBed.configureTestingModule({ providers: providers as never[] });

  it('registra APP_CONFIG con el entorno indicado', () => {
    configure([provideAppConfig({ apiBaseUrl: '/qa/api', features: { mockData: false } })]);

    const config: AppConfig = TestBed.inject(APP_CONFIG);
    expect(config.apiBaseUrl).toBe('/qa/api');
    expect(config.features.mockData).toBe(false);
  });

  it('API_BASE_URL sale de APP_CONFIG', () => {
    configure([provideAppConfig({ apiBaseUrl: '/qa/api' })]);

    expect(TestBed.inject(API_BASE_URL)).toBe('/qa/api');
  });

  it('sin argumentos usa el environment del build', () => {
    configure([provideAppConfig()]);

    expect(TestBed.inject(API_BASE_URL)).toBe(TestBed.inject(APP_CONFIG).apiBaseUrl);
    expect(typeof TestBed.inject(APP_CONFIG).production).toBe('boolean');
  });

  it('una prueba puede sobreescribir API_BASE_URL', () => {
    configure([provideAppConfig({ apiBaseUrl: '/qa/api' }), { provide: API_BASE_URL, useValue: '/mock' }]);

    expect(TestBed.inject(API_BASE_URL)).toBe('/mock');
    expect(TestBed.inject(APP_CONFIG).apiBaseUrl).toBe('/qa/api');
  });
});
