import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'app-theme';
const DEFAULT_THEME: Theme = 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _currentTheme = signal<Theme>(this.resolveInitialTheme());

  /** Public readonly signal with the current theme */
  readonly currentTheme = this._currentTheme.asReadonly();

  constructor() {
    // Apply the theme class on the DOM immediately
    this.applyThemeClass(this._currentTheme());
  }

  /** Toggle between light and dark */
  toggleTheme(): void {
    const next: Theme = this._currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  /** Set a specific theme */
  setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
    this.applyThemeClass(theme);
    this.persist(theme);
  }

  // ── Private helpers ──────────────────────────────────────

  private resolveInitialTheme(): Theme {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : DEFAULT_THEME;
  }

  private applyThemeClass(theme: Theme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  private persist(theme: Theme): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, theme);
  }
}
