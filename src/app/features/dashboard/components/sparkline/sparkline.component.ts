import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      class="w-full h-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient [id]="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.3" />
          <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0.05" />
        </linearGradient>
      </defs>
      <path
        [attr.d]="areaPath()"
        [attr.fill]="'url(#' + gradientId + ')'"
      />
      <polyline
        [attr.points]="polylinePoints()"
        fill="none"
        [attr.stroke]="color()"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
})
export class SparklineComponent {
  private static counter = 0;

  readonly data = input.required<number[]>();
  readonly color = input<string>('var(--chart-1)');

  readonly width = 120;
  readonly height = 40;
  readonly gradientId = `sparkline-grad-${SparklineComponent.counter++}`;

  readonly polylinePoints = computed(() => {
    const pts = this.data();
    if (pts.length < 2) return '';
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const range = max - min || 1;
    const pad = 2;
    const h = this.height - pad * 2;
    const step = this.width / (pts.length - 1);
    return pts
      .map(
        (v, i) =>
          `${(i * step).toFixed(1)},${(pad + h - ((v - min) / range) * h).toFixed(1)}`
      )
      .join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.data();
    if (pts.length < 2) return '';
    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const range = max - min || 1;
    const pad = 2;
    const h = this.height - pad * 2;
    const step = this.width / (pts.length - 1);

    const coords = pts.map((v, i) => ({
      x: +(i * step).toFixed(1),
      y: +(pad + h - ((v - min) / range) * h).toFixed(1),
    }));

    let d = `M${coords[0].x},${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      d += `L${coords[i].x},${coords[i].y}`;
    }
    d += `L${coords[coords.length - 1].x},${this.height}L${coords[0].x},${this.height}Z`;
    return d;
  });
}
