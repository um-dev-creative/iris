import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { authGuard } from './core/guards';
import { provideAppConfig } from './core/config';
import { ROUTE_PATHS, routeUrl } from './core/routes';

async function navigate(url: string) {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter(routes), provideAppConfig({ apiBaseUrl: '/test/api/v1' }), provideHttpClient(), provideHttpClientTesting()] });
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

  it('LOGIN está reservada pero aún no tiene ruta registrada', () => {
    expect(routes.some((route) => route.path === ROUTE_PATHS.LOGIN)).toBe(false);
  });
});
