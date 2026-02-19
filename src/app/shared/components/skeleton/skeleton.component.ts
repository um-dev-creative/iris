import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';

type SkeletonSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="animate-pulse rounded-md bg-muted"
      [style.width]="width()"
      [style.height]="computedHeight()"
      [class]="variant() === 'circle' ? 'rounded-full' : 'rounded-md'"
    ></div>
  `,
  styleUrl: './skeleton.component.css',
})
export class AppSkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('');
  readonly size = input<SkeletonSize>('md');
  readonly variant = input<'rectangle' | 'circle'>('rectangle');

  readonly computedHeight = computed(() => {
    if (this.height()) return this.height();
    const sizeMap: Record<SkeletonSize, string> = {
      sm: '0.75rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2.5rem',
    };
    return sizeMap[this.size()];
  });
}
