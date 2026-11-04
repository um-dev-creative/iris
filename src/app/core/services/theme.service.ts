import { Injectable, signal, computed } from '@angular/core';

/** The theme that is painted. */
export type Theme = 'light' | 'dark';
/** What the person chose: a fixed theme, or follow the operating system. */
export type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'app-theme';
const DEFAULT_PREFERENCE: ThemePreference = 'system';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const ORDER: readonly ThemePreference[] = ['light', 'dark', 'system'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _preference = signal<ThemePreference>(this.resolveInitialPreference());
  private readonly _systemDark = signal<boolean>(this.systemPrefersDark());

  /** What the person chose: light, dark or system. */
  readonly preference = this._preference.asReadonly();

  /** The theme in use: the preference, or the one the operating system reports when it is `system`. */
  readonly currentTheme = computed<Theme>(() => {
    const preference = this._preference();
    if (preference === 'system') return this._systemDark() ? 'dark' : 'light';
    return preference;
  });

  constructor() {
    this.applyThemeClass(this.currentTheme());
    this.watchSystem();
  }

  /** Flip the theme in use between light and dark (it leaves `system`). */
  toggleTheme(): void {
    this.setPreference(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  /** Go to the next mode: light, dark, system. */
  cyclePreference(): void {
    const next = ORDER[(ORDER.indexOf(this._preference()) + 1) % ORDER.length];
    this.setPreference(next);
  }

  /** Choose light, dark or system. */
  setPreference(preference: ThemePreference): void {
    this._preference.set(preference);
    this.applyThemeClass(this.currentTheme());
    this.persist(preference);
  }

  /** Choose a fixed theme. */
  setTheme(theme: Theme): void {
    this.setPreference(theme);
  }

  // ── Private helpers ──────────────────────────────────────

  private resolveInitialPreference(): ThemePreference {
    if (typeof localStorage === 'undefined') return DEFAULT_PREFERENCE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : DEFAULT_PREFERENCE;
    } catch {
      return DEFAULT_PREFERENCE;
    }
  }

  private systemPrefersDark(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
  }

  /** Repaint when the operating system changes while the preference is `system`. */
  private watchSystem(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    window.matchMedia(DARK_QUERY).addEventListener?.('change', (event) => {
      this._systemDark.set(event.matches);
      if (this._preference() === 'system') this.applyThemeClass(this.currentTheme());
    });
  }

  private applyThemeClass(theme: Theme): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }

  private persist(preference: ThemePreference): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // storage blocked: the choice lasts until the page closes
    }
  }
}
