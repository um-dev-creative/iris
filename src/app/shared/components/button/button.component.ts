import { Component, ChangeDetectionStrategy, input } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClasses()"
      class="inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './button.component.css',
})
export class AppButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly fullWidth = input<boolean>(false);

  buttonClasses(): string {
    const base = this.fullWidth() ? 'w-full ' : '';

    const sizeMap: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const variantMap: Record<ButtonVariant, string> = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
      secondary:
        'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 focus:ring-neutral-400 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600',
      danger:
        'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
      ghost:
        'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-400 dark:text-neutral-300 dark:hover:bg-neutral-700',
    };

    return `${base}${sizeMap[this.size()]} ${variantMap[this.variant()]}`;
  }
}
