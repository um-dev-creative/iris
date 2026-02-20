import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { LucideAngularModule, CircleCheck, TriangleAlert, CircleX, Info, X } from 'lucide-angular';
import {
  NotificationService,
  ToastMessage,
} from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto rounded-lg shadow-lg border p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300"
          [class]="toastClasses(toast)"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <lucide-icon [img]="CircleCheck" [size]="20" strokeWidth="1.5" class="text-success" />
              }
              @case ('error') {
                <lucide-icon [img]="CircleX" [size]="20" strokeWidth="1.5" class="text-destructive" />
              }
              @case ('warning') {
                <lucide-icon [img]="TriangleAlert" [size]="20" strokeWidth="1.5" class="text-warning-foreground dark:text-warning" />
              }
              @default {
                <lucide-icon [img]="Info" [size]="20" strokeWidth="1.5" class="text-primary" />
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-foreground">{{ toast.title }}</p>
            <p class="text-sm mt-0.5 text-muted-foreground">{{ toast.message }}</p>
          </div>

          <!-- Dismiss -->
          <button
            class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-opacity"
            (click)="notificationService.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <lucide-icon [img]="X" [size]="16" strokeWidth="1.5" />
          </button>
        </div>
      }
    </div>
  `,
})
export class AppNotificationComponent {
  readonly notificationService = inject(NotificationService);
  readonly CircleCheck = CircleCheck;
  readonly TriangleAlert = TriangleAlert;
  readonly CircleX = CircleX;
  readonly Info = Info;
  readonly X = X;

  toastClasses(toast: ToastMessage): string {
    const map: Record<string, string> = {
      success: 'bg-card border-success text-card-foreground',
      error: 'bg-card border-destructive text-card-foreground',
      warning: 'bg-card border-warning text-card-foreground',
      info: 'bg-card border-primary text-card-foreground',
    };
    return map[toast.type] ?? map['info'];
  }
}
