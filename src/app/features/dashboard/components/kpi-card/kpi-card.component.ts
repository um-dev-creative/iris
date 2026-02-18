import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { KpiCard } from '../../../../core/models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-6 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">{{ data().title }}</p>
          <p class="text-3xl font-bold mt-2" [class]="valueColor()">
            {{ data().value }}
          </p>
        </div>
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          [class]="iconBg()"
        >
          {{ data().icon }}
        </div>
      </div>
      @if (data().change !== undefined) {
        <div class="flex items-center gap-1 mt-3">
          <span
            class="text-sm font-medium"
            [class]="data().change! >= 0 ? 'text-success-600' : 'text-danger-600'"
          >
            {{ data().change! >= 0 ? '↑' : '↓' }}
            {{ data().change! >= 0 ? data().change : -data().change! }}%
          </span>
          @if (data().changeLabel) {
            <span class="text-xs text-neutral-400">{{ data().changeLabel }}</span>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './kpi-card.component.css',
})
export class KpiCardComponent {
  readonly data = input.required<KpiCard>();

  valueColor(): string {
    const map: Record<string, string> = {
      primary: 'text-primary-700',
      secondary: 'text-secondary-700',
      success: 'text-success-700',
      warning: 'text-warning-700',
      danger: 'text-danger-700',
    };
    return map[this.data().color] ?? 'text-neutral-900 dark:text-neutral-100';
  }

  iconBg(): string {
    const map: Record<string, string> = {
      primary: 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400',
      secondary: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400',
      success: 'bg-success-100 text-success-600 dark:bg-success-900 dark:text-success-400',
      warning: 'bg-warning-100 text-warning-600 dark:bg-warning-900 dark:text-warning-400',
      danger: 'bg-danger-100 text-danger-600 dark:bg-danger-900 dark:text-danger-400',
    };
    return map[this.data().color] ?? 'bg-neutral-100 dark:bg-neutral-700';
  }
}
