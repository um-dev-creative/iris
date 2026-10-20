import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { authGuard } from './core/guards';
import { provideAppConfig } from './core/config';
import { fakeAuth } from './core/testing/auth.testing';
import { guestGuard } from './core/guards';
import { ROUTE_PATHS, routeUrl } from './core/routes';

async function navigate(url: string, signedIn = true) {
  localStorage.clear();
  const auth = fakeAuth(signedIn ? { id: 'u-1', username: 'luis', name: 'Luis Mata' } : null);
  if (!signedIn) auth.setStatus('anonymous');
  TestBed.configureTestingModule({ providers: [provideRouter(routes), auth.provider, provideAppConfig({ apiBaseUrl: '/test/api/v1' }), provideHttpClient(), provideHttpClientTesting()] });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return { harness, url: () => TestBed.inject(Router).url };
}

describe('app.routes', () => {
  it('la ruta raíz redirige al dashboard', async () => {
    const { url } = await navigate('/');

    expect(url()).toBe(routeUrl(ROUTE_PATHS.DASHBOARD));
  });

  it('una ruta desconocida (comodín) redirige al dashboard', async () => {
    const { url } = await navigate('/no-existe/en-ningun-lado');

    expect(url()).toBe(routeUrl(ROUTE_PATHS.DASHBOARD));
  });

  it.each([
    [routeUrl(ROUTE_PATHS.DASHBOARD)],
    [routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.DATA)],
    [routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.SETTINGS)],
    [routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.SHOWCASE)],
  ])('%s carga su página en el layout del dashboard', async (path) => {
    const { harness, url } = await navigate(path);

    expect(url()).toBe(path);
    expect((harness.fixture.nativeElement as HTMLElement).querySelector('app-sidebar')).not.toBeNull();
  });

  it('la ruta padre del dashboard conserva authGuard', () => {
    const dashboard = routes.find((route) => route.path === ROUTE_PATHS.DASHBOARD);

    expect(dashboard?.canActivate).toContain(authGuard);
  });

  it('LOGIN es una ruta fuera del layout del dashboard, solo para visitantes', () => {
    const login = routes.find((route) => route.path === ROUTE_PATHS.LOGIN);

    expect(login?.loadComponent).toBeTypeOf('function');
    expect(login?.component).toBeUndefined();
    expect(login?.canActivate).toEqual([guestGuard]);
  });

  it('sin sesión, abrir una página del dashboard lleva a /login con returnUrl (AC1)', async () => {
    const { url } = await navigate('/dashboard/data', false);

    expect(url()).toBe('/login?returnUrl=%2Fdashboard%2Fdata');
  });

  it('con sesión, /login redirige a /dashboard (AC2)', async () => {
    const { url } = await navigate('/login');

    expect(url()).toBe('/dashboard');
  });

  it('sin sesión se ve el login y no el dashboard', async () => {
    const { harness } = await navigate('/login', false);

    const el = harness.fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-login-page')).not.toBeNull();
    expect(el.querySelector('app-sidebar')).toBeNull();
  });
});
