import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { fakeAuth } from '../testing/auth.testing';

const USER = { id: 'u-1', username: 'luis', name: 'Luis Mata' };
const stateAt = (url: string) => ({ url }) as RouterStateSnapshot;

function run(url: string, { platform = 'browser', user = null as typeof USER | null, restoresTo = null as typeof USER | null } = {}) {
  const auth = fakeAuth(user);
  if (!user) auth.setStatus('unknown');
  // restoreSession resuelve el estado: con usuario → authenticated, sin él → anonymous
  auth.service.restoreSession.mockImplementation(async () => auth.setUser(restoresTo));
  TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider, { provide: PLATFORM_ID, useValue: platform }] });
  const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, stateAt(url)));
  return { auth, result: Promise.resolve(result), router: TestBed.inject(Router) };
}

describe('authGuard', () => {
  it('con sesión permite el acceso sin volver a consultar', async () => {
    const { auth, result } = run('/dashboard', { user: USER });

    expect(await result).toBe(true);
    expect(auth.service.restoreSession).not.toHaveBeenCalled();
  });

  it('sin sesión redirige a /login con la ruta pedida en returnUrl (AC1)', async () => {
    const { result, router } = run('/dashboard/data');

    const tree = (await result) as UrlTree;
    expect(tree).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(tree)).toBe('/login?returnUrl=%2Fdashboard%2Fdata');
  });

  it('conserva la query de la ruta pedida dentro de returnUrl', async () => {
    const { result, router } = run('/dashboard/data?page=2');

    expect(router.serializeUrl((await result) as UrlTree)).toBe('/login?returnUrl=%2Fdashboard%2Fdata%3Fpage%3D2');
  });

  it('con estado desconocido espera a restoreSession antes de decidir (AC3: sin parpadeo)', async () => {
    const { auth, result } = run('/dashboard', { restoresTo: USER });

    expect(await result).toBe(true);
    expect(auth.service.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('si restoreSession no encuentra sesión, redirige al login', async () => {
    const { auth, result } = run('/dashboard', { restoresTo: null });

    expect(await result).toBeInstanceOf(UrlTree);
    expect(auth.service.restoreSession).toHaveBeenCalledTimes(1);
  });

  it('con estado anonymous ya conocido redirige sin volver a consultar', async () => {
    const auth = fakeAuth();
    auth.setStatus('anonymous');
    TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider] });

    const result = await TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, stateAt('/dashboard')));

    expect(result).toBeInstanceOf(UrlTree);
    expect(auth.service.restoreSession).not.toHaveBeenCalled();
  });

  it('en SSR deja renderizar y no consulta la sesión', async () => {
    const { auth, result } = run('/dashboard', { platform: 'server' });

    expect(await result).toBe(true);
    expect(auth.service.restoreSession).not.toHaveBeenCalled();
  });
});
