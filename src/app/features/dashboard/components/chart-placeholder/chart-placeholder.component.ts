import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { AppCardComponent } from '../../../../shared/components';

@Component({
  selector: 'app-chart-placeholder',
  standalone: true,
  imports: [AppCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-card [title]="title()">
      <div class="h-64 flex flex-col">
        <!-- Simple SVG line chart placeholder -->
        <div class="flex-1 relative">
          <svg class="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            <!-- Grid lines -->
            <line x1="0" y1="50" x2="400" y2="50" class="stroke-border" stroke-width="1"/>
            <line x1="0" y1="100" x2="400" y2="100" class="stroke-border" stroke-width="1"/>
            <line x1="0" y1="150" x2="400" y2="150" class="stroke-border" stroke-width="1"/>

            <!-- Area fill -->
            <path
              [attr.d]="areaPath()"
              fill="url(#gradient)"
              opacity="0.3"
            />

            <!-- Line -->
            <path
              [attr.d]="linePath()"
              fill="none"
              stroke="var(--chart-1)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <!-- Dots -->
            @for (point of chartPoints(); track $index) {
              <circle
                [attr.cx]="point.x"
                [attr.cy]="point.y"
                r="4"
                fill="var(--chart-1)"
                class="stroke-card"
                stroke-width="2"
              />
            }

            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <!-- X-axis labels -->
        <div class="flex justify-between text-xs text-muted-foreground mt-2 px-2">
          @for (label of labels(); track $index) {
            <span>{{ label }}</span>
          }
        </div>
      </div>
    </app-card>
  `,
  styleUrl: './chart-placeholder.component.css',
})
export class ChartPlaceholderComponent {
  readonly title = input<string>('Actividad semanal');
  readonly dataPoints = input<number[]>([30, 60, 45, 80, 55, 90, 70]);
  readonly labels = input<string[]>(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);

  readonly chartPoints = computed(() => {
    const data = this.dataPoints();
    const max = Math.max(...data, 1);
    const width = 400;
    const height = 200;
    const padding = 20;

    return data.map((value, index) => ({
      x: padding + (index * (width - padding * 2)) / (data.length - 1),
      y: padding + ((max - value) / max) * (height - padding * 2),
    }));
  });

  linePath(): string {
    const points = this.chartPoints();
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`)
      .join(' ');
  }

  areaPath(): string {
    const points = this.chartPoints();
    if (points.length === 0) return '';
    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    return `${line} L${lastX},200 L${firstX},200 Z`;
  }
}
