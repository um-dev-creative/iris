import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NavbarComponent } from './navbar/navbar.component';
import { AppNotificationComponent } from '../shared/components';
import { DashboardStore } from '../core/services';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent, AppNotificationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <!-- Sidebar -->
      <app-sidebar />

      <!-- Main content area -->
      <div
        class="flex flex-col flex-1 overflow-hidden transition-all duration-300"
        [class.lg:ml-64]="store.sidebarOpen()"
        [class.lg:ml-16]="!store.sidebarOpen()"
      >
        <!-- Top navbar -->
        <app-navbar />

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto p-4 lg:p-6">
          <!-- Loading bar -->
          @if (store.loading()) {
            <div class="fixed top-0 left-0 right-0 z-50 h-1 bg-primary-100">
              <div class="h-full bg-primary-600 animate-pulse w-2/3 rounded-r"></div>
            </div>
          }
          <router-outlet />
        </main>
      </div>

      <!-- Notifications toast container -->
      <app-notification />
    </div>
  `,
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  readonly store = inject(DashboardStore);
}
