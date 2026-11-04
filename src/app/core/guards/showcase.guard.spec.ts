import { TestBed } from '@angular/core/testing';
import { Route, Router, UrlSegment } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideAppConfig } from '../config';
import { showcaseGuard } from './showcase.guard';

const run = (env: Parameters<typeof provideAppConfig>[0]) => {
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideAppConfig(env)] });
  return TestBed.runInInjectionContext(() => showcaseGuard({} as Route, [] as UrlSegment[], {} as never));
};

describe('showcaseGuard', () => {
  it('deja pasar fuera de producción', () => {
    expect(run({ production: false })).toBe(true);
  });

  it('en producción redirige al dashboard', () => {
    const result = run({ production: true });

    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe('/dashboard');
  });

  it('un entorno puede activarlo explícitamente', () => {
    expect(run({ production: true, features: { showcase: true } })).toBe(true);
  });
});
