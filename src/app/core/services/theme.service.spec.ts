import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });
  afterEach(() => vi.unstubAllGlobals());

  const create = () => TestBed.inject(ThemeService);

  it('arranca en light por defecto', () => {
    expect(create().currentTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('recupera el tema oscuro guardado y aplica la clase', () => {
    localStorage.setItem('app-theme', 'dark');

    expect(create().currentTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('ignora valores guardados desconocidos', () => {
    localStorage.setItem('app-theme', 'sepia');

    expect(create().currentTheme()).toBe('light');
  });

  it('toggleTheme alterna, persiste y actualiza la clase', () => {
    const service = create();

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(localStorage.getItem('app-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme fija un tema concreto', () => {
    const service = create();

    service.setTheme('dark');

    expect(service.currentTheme()).toBe('dark');
  });

  it('no falla sin localStorage ni document (SSR)', () => {
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('document', undefined);

    const service = create();
    service.setTheme('dark');

    expect(service.currentTheme()).toBe('dark');
  });
});
