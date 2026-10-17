import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { guestGuard } from './guest.guard';
import { fakeAuth } from '../testing/auth.testing';

const USER = { id: 'u-1', username: 'luis', name: 'Luis Mata' };

function run({ platform = 'browser', user = null as typeof USER | null, status = 'unknown' as 'unknown' | 'anonymous', restoresTo = null as typeof USER | null } = {}) {
  const auth = fakeAuth(user);
  if (!user) auth.setStatus(status);
  auth.service.restoreSession.mockImplementation(async () => auth.setUser(restoresTo));
  TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider, { provide: PLATFORM_ID, useValue: platform }] });
  const result = TestBed.runInInjectionContext(() => guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  return { auth, result: Promise.resolve(result), router: TestBed.inject(Router) };
}

describe('guestGuard', () => {
  it('con sesión redirige a /dashboard (AC2)', async () => {
    const { result, router } = run({ user: USER });

    const tree = (await result) as UrlTree;
    expect(router.serializeUrl(tree)).toBe('/dashboard');
  });

  it('sin sesión permite ver el login', async () => {
    const { result } = run({ status: 'anonymous' });

    expect(await result).toBe(true);
  });

  it('con estado desconocido consulta la sesión: si existe redirige, si no deja pasar', async () => {
    const withSession = run({ restoresTo: USER });
    expect(await withSession.result).toBeInstanceOf(UrlTree);
    expect(withSession.auth.service.restoreSession).toHaveBeenCalledTimes(1);

    TestBed.resetTestingModule();
    const without = run({ restoresTo: null });
    expect(await without.result).toBe(true);
  });

  it('en SSR deja renderizar y no consulta la sesión', async () => {
    const { auth, result } = run({ platform: 'server' });

    expect(await result).toBe(true);
    expect(auth.service.restoreSession).not.toHaveBeenCalled();
  });
});
