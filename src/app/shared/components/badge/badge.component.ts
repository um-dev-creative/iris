import { Component, ChangeDetectionStrategy, input } from '@angular/core';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

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
  readonly color = input<BadgeVariant | 'primary' | 'success' | 'warning' | 'danger' | 'neutral'>('default');

  badgeClasses(): string {
    const colorMap: Record<string, string> = {
      default: 'bg-primary text-primary-foreground',
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      danger: 'bg-destructive text-destructive-foreground',
      outline: 'border border-border text-foreground',
      success: 'bg-chart-2 text-primary-foreground',
      warning: 'bg-chart-5 text-primary-foreground',
      neutral: 'bg-muted text-muted-foreground',
    };
    return colorMap[this.color()] ?? colorMap['default'];
  }
}
