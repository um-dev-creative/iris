import { Provider, computed, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AuthStatus, User } from '../models';

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
