import { Provider, computed, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { FederationService } from '../services/federation.service';
import { AuthStatus, FederationProvider, LinkedIdentity, User } from '../models';

/**
 * Sustituto de `AuthService` para las pruebas de componentes: la prueba decide quién tiene la sesión con
 * `setUser()`/`setStatus()` y espía `login`, `logout`, `restoreSession` y `clearSession`.
 */
export function fakeAuth(initial: User | null = null) {
  const user = signal<User | null>(initial);
  const status = signal<AuthStatus>(initial ? 'authenticated' : 'unknown');
  const service = {
    user: user.asReadonly(),
    status: status.asReadonly(),
    isAuthenticated: computed(() => status() === 'authenticated'),
    login: vi.fn().mockResolvedValue(undefined),
    register: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn().mockResolvedValue(undefined),
    resendVerification: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(undefined),
    clearSession: vi.fn(() => {
      user.set(null);
      status.set('anonymous');
    }),
  };
  return {
    service,
    provider: { provide: AuthService, useValue: service } as Provider,
    setUser: (value: User | null) => {
      user.set(value);
      status.set(value ? 'authenticated' : 'anonymous');
    },
    setStatus: (value: AuthStatus) => status.set(value),
  };
}

/**
 * Sustituto de `FederationService` para las pruebas de componentes: la prueba decide qué proveedores y cuentas hay
 * y espía `signIn`, `link` y `unlink`.
 */
export function fakeFederation(providers: FederationProvider[] = [], identities: LinkedIdentity[] = []) {
  const providerSignal = signal<FederationProvider[]>(providers);
  const identitySignal = signal<LinkedIdentity[]>(identities);
  const service = {
    providers: providerSignal.asReadonly(),
    identities: identitySignal.asReadonly(),
    loading: signal(false).asReadonly(),
    loadProviders: vi.fn().mockResolvedValue(undefined),
    loadIdentities: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn(),
    link: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
  return {
    service,
    provider: { provide: FederationService, useValue: service } as Provider,
    setProviders: (value: FederationProvider[]) => providerSignal.set(value),
    setIdentities: (value: LinkedIdentity[]) => identitySignal.set(value),
  };
}
