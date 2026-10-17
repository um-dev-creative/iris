import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { LucideAngularModule, Bell, Search, UserCircle, Menu } from 'lucide-angular';
import { DashboardStore } from '../../core/services';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ThemeToggleComponent, UserMenuComponent, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-10 flex items-center h-16 px-4 lg:px-6 bg-card border-b border-border gap-4">
      <!-- Mobile menu button -->
      <button
        class="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
        (click)="store.toggleSidebar()"
        aria-label="Toggle menu"
      >
        <lucide-icon [img]="Menu" [size]="24" strokeWidth="1.5" />
      </button>

      <!-- Section title -->
      <h1 class="text-lg font-semibold text-foreground hidden sm:block">{{ pageTitle() }}</h1>

      <!-- Search bar -->
      <div class="flex-1 max-w-md mx-auto lg:mx-0">
        <div class="relative">
          <lucide-icon
            [img]="Search"
            [size]="16"
            strokeWidth="1.5"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:bg-card focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
          />
        </div>
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-3">
        <!-- Theme toggle -->
        <app-theme-toggle />

        <!-- Notifications -->
        <button
          class="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          (click)="store.markAllNotificationsRead()"
          aria-label="Notifications"
        >
          <lucide-icon [img]="Bell" [size]="20" strokeWidth="1.5" />
          @if (store.unreadCount() > 0) {
            <span class="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-destructive-foreground bg-destructive rounded-full">
              {{ store.unreadCount() > 9 ? '9+' : store.unreadCount() }}
            </span>
          }
        </button>

        <!-- User -->
        @if (store.user()) {
          <app-user-menu />
        } @else {
          <div
            class="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold"
          >
            {{ store.userInitials() }}
          </div>
        }
      </div>
    </header>
  `,
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly store = inject(DashboardStore);
  readonly pageTitle = input<string>('Dashboard');
  readonly Bell = Bell;
  readonly Search = Search;
  readonly UserCircle = UserCircle;
  readonly Menu = Menu;
}
