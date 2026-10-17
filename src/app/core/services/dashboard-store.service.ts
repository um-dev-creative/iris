import { Injectable, inject, signal, computed } from '@angular/core';
import { Notification } from '../models';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly themeService = inject(ThemeService);
  private readonly auth = inject(AuthService);

  // --- Theme ---
  readonly theme = this.themeService.currentTheme;
  readonly toggleTheme = () => this.themeService.toggleTheme();

  // --- State signals ---
  private readonly _sidebarOpen = signal<boolean>(true);
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _loading = signal<boolean>(false);

  // --- Public readonly signals ---
  readonly sidebarOpen = this._sidebarOpen.asReadonly();
  /** Quién tiene la sesión; lo gestiona `AuthService`. */
  readonly user = this.auth.user;
  readonly notifications = this._notifications.asReadonly();
  readonly loading = this._loading.asReadonly();

  // --- Computed signals ---
  readonly unreadNotifications = computed(
    () => this._notifications().filter((n) => !n.read)
  );
  readonly unreadCount = computed(() => this.unreadNotifications().length);
  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    return u.name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  // --- Actions ---
  toggleSidebar(): void {
    this._sidebarOpen.update((open) => !open);
  }

  setSidebarOpen(open: boolean): void {
    this._sidebarOpen.set(open);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    this._notifications.update((list) => [newNotification, ...list]);
  }

  markNotificationRead(id: string): void {
    this._notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllNotificationsRead(): void {
    this._notifications.update((list) =>
      list.map((n) => ({ ...n, read: true }))
    );
  }

  removeNotification(id: string): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }

  clearNotifications(): void {
    this._notifications.set([]);
  }
}
