import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _toasts = signal<ToastMessage[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(title: string, message: string, duration = 4000): void {
    this.addToast({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration = 6000): void {
    this.addToast({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration = 5000): void {
    this.addToast({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration = 4000): void {
    this.addToast({ type: 'info', title, message, duration });
  }

  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private addToast(toast: Omit<ToastMessage, 'id'>): void {
    const id = crypto.randomUUID();
    const newToast: ToastMessage = { ...toast, id };
    this._toasts.update((list) => [...list, newToast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }
  }
}
