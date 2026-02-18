import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { DashboardStore } from '../../core/services';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-10 flex items-center h-16 px-4 lg:px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 gap-4">
      <!-- Mobile menu button -->
      <button
        class="lg:hidden p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-neutral-600 dark:text-neutral-300"
        (click)="store.toggleSidebar()"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Section title -->
      <h1 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100 hidden sm:block">{{ pageTitle() }}</h1>

      <!-- Search bar -->
      <div class="flex-1 max-w-md mx-auto lg:mx-0">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 focus:bg-white dark:focus:bg-neutral-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
          />
        </div>
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-3">
        <!-- Theme toggle -->
        <app-theme-toggle />

        <!-- Notifications -->
        <button
          class="relative p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors text-neutral-600 dark:text-neutral-300"
          (click)="store.markAllNotificationsRead()"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          @if (store.unreadCount() > 0) {
            <span class="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-danger-500 rounded-full">
              {{ store.unreadCount() > 9 ? '9+' : store.unreadCount() }}
            </span>
          }
        </button>

        <!-- User avatar -->
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold"
          >
            {{ store.userInitials() }}
          </div>
          @if (store.user(); as user) {
            <span class="hidden md:block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {{ user.name }}
            </span>
          }
        </div>
      </div>
    </header>
  `,
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly store = inject(DashboardStore);
  readonly pageTitle = input<string>('Dashboard');
}
