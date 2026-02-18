import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded-lg"
      [style.width]="width()"
      [style.height]="height()"
      [class]="variant() === 'circle' ? 'rounded-full' : 'rounded-lg'"
    ></div>
  `,
  styleUrl: './skeleton.component.css',
})
export class AppSkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('20px');
  readonly variant = input<'rectangle' | 'circle'>('rectangle');
}
