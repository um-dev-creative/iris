import { Component, ChangeDetectionStrategy, input } from '@angular/core';

type BadgeColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClasses()" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
      <ng-content />
    </span>
  `,
  styleUrl: './badge.component.css',
})
export class AppBadgeComponent {
  readonly color = input<BadgeColor>('primary');

  badgeClasses(): string {
    const colorMap: Record<BadgeColor, string> = {
      primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
      secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300',
      success: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
      warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
      danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
      neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
    };
    return colorMap[this.color()];
  }
}
