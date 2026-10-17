import { TestBed } from '@angular/core/testing';
import { DashboardStore } from './dashboard-store.service';
import { ThemeService } from './theme.service';
import { User } from '../models';

const user: User = { id: 1, name: 'Luis Mata Uzcategui', username: 'lmata', email: 'l@m.test' };

describe('DashboardStore', () => {
  let store: DashboardStore;

  beforeEach(() => {
    localStorage.clear();
    store = TestBed.inject(DashboardStore);
  });

  it('estado inicial', () => {
    expect(store.sidebarOpen()).toBe(true);
    expect(store.user()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.notifications()).toEqual([]);
    expect(store.userInitials()).toBe('?');
  });

  it('alterna y fija la barra lateral', () => {
    store.toggleSidebar();
    expect(store.sidebarOpen()).toBe(false);
    store.setSidebarOpen(true);
    expect(store.sidebarOpen()).toBe(true);
  });

  it('guarda el usuario y calcula las iniciales (máximo dos)', () => {
    store.setUser(user);

    expect(store.user()).toEqual(user);
    expect(store.userInitials()).toBe('LM');

    store.setUser(null);
    expect(store.userInitials()).toBe('?');
  });

  it('controla el estado de carga', () => {
    store.setLoading(true);
    expect(store.loading()).toBe(true);
  });

  it('gestiona las notificaciones: alta, lectura, borrado y limpieza', () => {
    store.addNotification({ type: 'info', message: 'uno' });
    store.addNotification({ type: 'error', message: 'dos', title: 'T' });
    // la más reciente va primero
    expect(store.notifications().map((n) => n.message)).toEqual(['dos', 'uno']);
    expect(store.unreadCount()).toBe(2);

    const [dos, uno] = store.notifications();
    store.markNotificationRead(dos.id);
    expect(store.unreadCount()).toBe(1);
    expect(store.unreadNotifications()[0].id).toBe(uno.id);

    store.markAllNotificationsRead();
    expect(store.unreadCount()).toBe(0);

    store.removeNotification(uno.id);
    expect(store.notifications()).toHaveLength(1);

    store.clearNotifications();
    expect(store.notifications()).toEqual([]);
  });

  it('delega el tema en ThemeService', () => {
    const theme = TestBed.inject(ThemeService);

    store.toggleTheme();

    expect(store.theme()).toBe('dark');
    expect(theme.currentTheme()).toBe('dark');
  });
});
