import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

type Listener = (event: { matches: boolean }) => void;

/** A controllable `prefers-color-scheme` so the tests do not depend on the machine. */
function stubSystem(dark: boolean) {
  const listeners: Listener[] = [];
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('dark') && dark,
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
  }));
  return { change: (matches: boolean) => listeners.forEach((fn) => fn({ matches })) };
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    stubSystem(false);
  });
  afterEach(() => vi.unstubAllGlobals());

  const create = () => TestBed.inject(ThemeService);
  const isDark = () => document.documentElement.classList.contains('dark');

  it('arranca siguiendo al sistema (claro)', () => {
    const service = create();

    expect(service.preference()).toBe('system');
    expect(service.currentTheme()).toBe('light');
    expect(isDark()).toBe(false);
  });

  it('en modo sistema usa el tema oscuro si el sistema lo pide', () => {
    stubSystem(true);
    const service = create();

    expect(service.currentTheme()).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('en modo sistema repinta cuando el sistema cambia', () => {
    const system = stubSystem(false);
    const service = create();

    system.change(true);
    expect(service.currentTheme()).toBe('dark');
    expect(isDark()).toBe(true);

    system.change(false);
    expect(service.currentTheme()).toBe('light');
    expect(isDark()).toBe(false);
  });

  it('con un tema fijo ignora los cambios del sistema', () => {
    const system = stubSystem(false);
    localStorage.setItem('app-theme', 'light');
    const service = create();

    system.change(true);

    expect(service.currentTheme()).toBe('light');
    expect(isDark()).toBe(false);
  });

  it('recupera el tema oscuro guardado y aplica la clase', () => {
    localStorage.setItem('app-theme', 'dark');

    expect(create().currentTheme()).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('ignora valores guardados desconocidos', () => {
    localStorage.setItem('app-theme', 'sepia');

    expect(create().preference()).toBe('system');
  });

  it('cyclePreference recorre claro, oscuro y sistema, y persiste', () => {
    localStorage.setItem('app-theme', 'light');
    const service = create();

    service.cyclePreference();
    expect(service.preference()).toBe('dark');
    expect(localStorage.getItem('app-theme')).toBe('dark');
    expect(isDark()).toBe(true);

    service.cyclePreference();
    expect(service.preference()).toBe('system');
    expect(localStorage.getItem('app-theme')).toBe('system');

    service.cyclePreference();
    expect(service.preference()).toBe('light');
  });

  it('toggleTheme alterna el tema en uso y sale del modo sistema', () => {
    stubSystem(true);
    const service = create();

    service.toggleTheme();
    expect(service.preference()).toBe('light');
    expect(isDark()).toBe(false);

    service.toggleTheme();
    expect(service.preference()).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('setTheme fija un tema concreto', () => {
    const service = create();

    service.setTheme('dark');

    expect(service.currentTheme()).toBe('dark');
  });

  it('no falla si localStorage lanza', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const service = create();

    service.setPreference('dark');

    expect(service.currentTheme()).toBe('dark');
    vi.restoreAllMocks();
  });

  it('no falla sin localStorage ni document (SSR)', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('document', undefined);

    const service = create();
    service.setTheme('dark');

    expect(service.currentTheme()).toBe('dark');
  });
});
