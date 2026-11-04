import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { LucideAngularModule, Sun, Moon, Monitor } from 'lucide-angular';
import { ThemeService, ThemePreference } from '../../../core/services';

const LABELS: Record<ThemePreference, string> = {
  light: 'Tema claro',
  dark: 'Tema oscuro',
  system: 'Tema del sistema',
};

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      (click)="onToggle()"
      [class]="buttonClass"
      [attr.aria-label]="label()"
      [attr.title]="label()">
      @switch (preference()) {
        @case ('light') {
          <lucide-icon [img]="Sun" [size]="18" strokeWidth="1.5" [class]="iconClass" />
        }
        @case ('dark') {
          <lucide-icon [img]="Moon" [size]="18" strokeWidth="1.5" [class]="iconClass" />
        }
        @default {
          <lucide-icon [img]="Monitor" [size]="18" strokeWidth="1.5" [class]="iconClass" />
        }
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly Monitor = Monitor;
  readonly preference = this.themeService.preference;
  isDark = computed(() => this.themeService.currentTheme() === 'dark');
  label = computed(() => `${LABELS[this.preference()]}. Pulsa para cambiar`);
  isAnimating = signal(false);

  buttonClass = `
    inline-flex items-center justify-center
    w-9 h-9 rounded-lg
    bg-muted hover:bg-accent
    text-muted-foreground hover:text-accent-foreground
    border border-border
    transition-colors duration-200
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  `;

  get iconClass() {
    return this.isAnimating() ? 'animate-spin' : 'transition-transform duration-300';
  }

  /** Light, dark, system, and back to light. */
  onToggle() {
    this.isAnimating.set(true);
    this.themeService.cyclePreference();
    setTimeout(() => this.isAnimating.set(false), 400);
  }
}
