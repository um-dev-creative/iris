import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, PanelLeftClose, PanelLeftOpen, LayoutDashboard, Table2, Settings, Palette, LucideIconData } from 'lucide-angular';
import { DashboardStore } from '../../core/services';

interface NavItem {
  label: string;
  icon: LucideIconData;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out"
      [class.w-64]="store.sidebarOpen()"
      [class.w-16]="!store.sidebarOpen()"
      [class.-translate-x-full]="isMobileHidden"
      [class.translate-x-0]="!isMobileHidden"
    >
      <!-- Logo -->
      <div class="flex items-center h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center font-bold text-sm text-sidebar-primary-foreground">
            IR
          </div>
          @if (store.sidebarOpen()) {
            <span class="text-lg font-bold tracking-tight whitespace-nowrap animate-fade-in">Iris</span>
          }
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="bg-sidebar-primary text-sidebar-primary-foreground"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors duration-200 group"
            [class.justify-center]="!store.sidebarOpen()"
          >
            <lucide-icon [img]="item.icon" [size]="20" strokeWidth="1.5" class="flex-shrink-0" />
            @if (store.sidebarOpen()) {
              <span class="text-sm font-medium whitespace-nowrap animate-fade-in">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Collapse toggle (desktop only) -->
      <div class="hidden lg:flex items-center justify-center p-4 border-t border-sidebar-border">
        <button
          class="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/50 hover:text-sidebar-foreground"
          (click)="store.toggleSidebar()"
          aria-label="Toggle sidebar"
        >
          <lucide-icon
            [img]="store.sidebarOpen() ? PanelLeftClose : PanelLeftOpen"
            [size]="20"
            strokeWidth="1.5"
            class="transition-transform duration-300" />
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
  readonly PanelLeftClose = PanelLeftClose;
  readonly PanelLeftOpen = PanelLeftOpen;

  readonly navItems: NavItem[] = [
    {
      label: 'Overview',
      icon: LayoutDashboard,
      route: '/dashboard',
    },
    {
      label: 'Data View',
      icon: Table2,
      route: '/dashboard/data',
    },
    {
      label: 'Settings',
      icon: Settings,
      route: '/dashboard/settings',
    },
    {
      label: 'Showcase',
      icon: Palette,
      route: '/dashboard/showcase',
    },
  ];

  get isMobileHidden(): boolean {
    return !this.store.sidebarOpen() && typeof window !== 'undefined' && window.innerWidth < 1024;
  }

  get isMobileVisible(): boolean {
    return this.store.sidebarOpen() && typeof window !== 'undefined' && window.innerWidth < 1024;
  }
}
