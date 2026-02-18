import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import {
  NotificationService,
  ToastMessage,
} from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto rounded-lg shadow-lg border p-4 flex items-start gap-3 animate-slide-in"
          [class]="toastClasses(toast)"
        >
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <svg class="w-5 h-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('error') {
                <svg class="w-5 h-5 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('warning') {
                <svg class="w-5 h-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              }
              @default {
                <svg class="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p class="text-sm mt-0.5 opacity-80">{{ toast.message }}</p>
          </div>

          <!-- Dismiss -->
          <button
            class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            (click)="notificationService.dismiss(toast.id)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `],
})
export class AppNotificationComponent {
  readonly notificationService = inject(NotificationService);

  toastClasses(toast: ToastMessage): string {
    const map: Record<string, string> = {
      success: 'bg-success-50 border-success-200 text-success-900 dark:bg-success-900/30 dark:border-success-700 dark:text-success-200',
      error: 'bg-danger-50 border-danger-200 text-danger-900 dark:bg-danger-900/30 dark:border-danger-700 dark:text-danger-200',
      warning: 'bg-warning-50 border-warning-200 text-warning-900 dark:bg-warning-900/30 dark:border-warning-700 dark:text-warning-200',
      info: 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-200',
    };
    return map[toast.type] ?? map['info'];
  }
}
