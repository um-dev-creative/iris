import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DashboardStore } from '../../core/services';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col bg-neutral-900 dark:bg-neutral-950 text-white transition-all duration-300 ease-in-out"
      [class.w-64]="store.sidebarOpen()"
      [class.w-16]="!store.sidebarOpen()"
      [class.-translate-x-full]="isMobileHidden"
      [class.translate-x-0]="!isMobileHidden"
    >
      <!-- Logo -->
      <div class="flex items-center h-16 px-4 border-b border-neutral-800 dark:border-neutral-700 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
            IR
          </div>
          @if (store.sidebarOpen()) {
            <span class="text-lg font-bold tracking-tight whitespace-nowrap">Iris</span>
          }
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="bg-primary-600 text-white"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-300 hover:bg-neutral-700 dark:hover:bg-neutral-800 hover:text-white transition-colors duration-200 group"
            [class.justify-center]="!store.sidebarOpen()"
          >
            <span class="text-lg flex-shrink-0" [innerHTML]="item.icon"></span>
            @if (store.sidebarOpen()) {
              <span class="text-sm font-medium whitespace-nowrap">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Collapse toggle (desktop only) -->
      <div class="hidden lg:flex items-center justify-center p-4 border-t border-neutral-800 dark:border-neutral-700">
        <button
          class="p-2 rounded-lg hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-white"
          (click)="store.toggleSidebar()"
        >
          <svg
            class="w-5 h-5 transition-transform duration-300"
            [class.rotate-180]="!store.sidebarOpen()"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    @if (isMobileVisible) {
      <div
        class="fixed inset-0 bg-black/50 z-20 lg:hidden"
        (click)="store.setSidebarOpen(false)"
      ></div>
    }
  `,
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  readonly store = inject(DashboardStore);

  readonly navItems: NavItem[] = [
    {
      label: 'Overview',
      icon: '📊',
      route: '/dashboard',
    },
    {
      label: 'Data View',
      icon: '📋',
      route: '/dashboard/data',
    },
    {
      label: 'Settings',
      icon: '⚙️',
      route: '/dashboard/settings',
    },
  ];

  get isMobileHidden(): boolean {
    return !this.store.sidebarOpen() && typeof window !== 'undefined' && window.innerWidth < 1024;
  }

  get isMobileVisible(): boolean {
    return this.store.sidebarOpen() && typeof window !== 'undefined' && window.innerWidth < 1024;
  }
}
