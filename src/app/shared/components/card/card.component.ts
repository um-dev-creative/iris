import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      [class.p-0]="noPadding()"
    >
      @if (title()) {
        <div class="px-6 py-4 border-b border-border">
          <h3 class="text-lg font-semibold text-card-foreground">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="text-sm text-muted-foreground mt-0.5">{{ subtitle() }}</p>
          }
        </div>
      }
      <ng-content select="[card-header]" />
      <div [class]="noPadding() ? '' : 'p-6'">
        <ng-content />
      </div>
      <ng-content select="[card-footer]" />
    </div>
  `,
  styleUrl: './card.component.css',
})
export class AppCardComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly noPadding = input<boolean>(false);
}
