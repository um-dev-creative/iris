import { TestBed } from '@angular/core/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { ThemeService } from '../../../core/services';

describe('ThemeToggleComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('alterna el tema, anima el icono 400 ms y vuelve a la transición normal', () => {
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
    const theme = TestBed.inject(ThemeService);
    expect(fixture.componentInstance.isDark()).toBe(false);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(theme.currentTheme()).toBe('dark');
    expect(fixture.componentInstance.isDark()).toBe(true);
    expect(fixture.componentInstance.iconClass).toBe('animate-spin');

    vi.advanceTimersByTime(400);
    expect(fixture.componentInstance.isAnimating()).toBe(false);
    expect(fixture.componentInstance.iconClass).toBe('transition-transform duration-300');
  });

  it('expone una etiqueta accesible', () => {
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe('Toggle theme');
  });
});
