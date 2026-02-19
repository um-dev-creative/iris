import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { LucideAngularModule, Sun, Moon } from 'lucide-angular';
import { ThemeService } from '../../../core/services';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <button
      (click)="onToggle()"
      [class]="buttonClass"
      aria-label="Toggle theme">
      @if (isDark()) {
        <lucide-icon
          [img]="Sun"
          [size]="18"
          strokeWidth="1.5"
          [class]="iconClass" />
      } @else {
        <lucide-icon
          [img]="Moon"
          [size]="18"
          strokeWidth="1.5"
          [class]="iconClass" />
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  readonly Sun = Sun;
  readonly Moon = Moon;
  isDark = computed(() => this.themeService.currentTheme() === 'dark');
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

  onToggle() {
    this.isAnimating.set(true);
    this.themeService.toggleTheme();
    setTimeout(() => this.isAnimating.set(false), 400);
  }
}
