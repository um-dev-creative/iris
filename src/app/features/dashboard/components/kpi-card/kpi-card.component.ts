import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { LucideAngularModule, TrendingUp, TrendingDown } from 'lucide-angular';
import { KpiCard } from '../../../../core/models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-muted-foreground">{{ data().title }}</p>
          <p class="text-3xl font-bold mt-2 text-card-foreground">
            {{ data().value }}
          </p>
        </div>
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center bg-muted text-muted-foreground"
        >
          <lucide-icon [img]="data().icon" [size]="24" strokeWidth="1.5" />
        </div>
      </div>
      @if (data().change !== undefined) {
        <div class="flex items-center gap-1 mt-3">
          <lucide-icon
            [img]="data().change! >= 0 ? TrendingUp : TrendingDown"
            [size]="14"
            strokeWidth="2"
            [class]="data().change! >= 0 ? 'text-chart-2' : 'text-destructive'" />
          <span
            class="text-sm font-medium"
            [class]="data().change! >= 0 ? 'text-chart-2' : 'text-destructive'"
          >
            {{ data().change! >= 0 ? data().change : -data().change! }}%
          </span>
          @if (data().changeLabel) {
            <span class="text-xs text-muted-foreground">{{ data().changeLabel }}</span>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './kpi-card.component.css',
})
export class KpiCardComponent {
  readonly data = input.required<KpiCard>();
  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
}
