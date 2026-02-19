import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ServiceStatus } from '../../models/monitoring.model';

@Component({
  selector: 'app-service-status-card',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div
            [class]="
              'w-10 h-10 rounded-lg flex items-center justify-center ' +
              iconClasses()
            "
          >
            <lucide-icon
              [img]="service().icon"
              [size]="20"
              strokeWidth="1.5"
            />
          </div>
          <h4 class="text-sm font-semibold text-card-foreground">
            {{ service().name }}
          </h4>
        </div>
        <span
          [class]="
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ' +
            statusBadgeClasses()
          "
        >
          <span
            [class]="'w-1.5 h-1.5 rounded-full ' + dotClass()"
          ></span>
          {{ statusLabel() }}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="text-center p-2 bg-muted/50 rounded-lg">
          <p class="text-xs text-muted-foreground">Uptime</p>
          <p class="text-sm font-semibold text-card-foreground">
            {{ service().uptime }}%
          </p>
        </div>
        <div class="text-center p-2 bg-muted/50 rounded-lg">
          <p class="text-xs text-muted-foreground">Latency</p>
          <p class="text-sm font-semibold text-card-foreground">
            {{ service().latency }}ms
          </p>
        </div>
      </div>
    </div>
  `,
})
export class ServiceStatusCardComponent {
  readonly service = input.required<ServiceStatus>();

  readonly statusLabel = computed(() => {
    const map: Record<string, string> = {
      operational: 'Operational',
      degraded: 'Degraded',
      down: 'Down',
    };
    return map[this.service().status];
  });

  readonly statusBadgeClasses = computed(() => {
    const map: Record<string, string> = {
      operational: 'bg-chart-2/15 text-chart-2 border border-chart-2/25',
      degraded: 'bg-chart-5/15 text-chart-5 border border-chart-5/25',
      down: 'bg-destructive/15 text-destructive border border-destructive/25',
    };
    return map[this.service().status];
  });

  readonly dotClass = computed(() => {
    const map: Record<string, string> = {
      operational: 'bg-chart-2',
      degraded: 'bg-chart-5',
      down: 'bg-destructive',
    };
    return map[this.service().status];
  });

  readonly iconClasses = computed(() => {
    const map: Record<string, string> = {
      operational: 'bg-chart-2/10 text-chart-2',
      degraded: 'bg-chart-5/10 text-chart-5',
      down: 'bg-destructive/10 text-destructive',
    };
    return map[this.service().status];
  });
}
