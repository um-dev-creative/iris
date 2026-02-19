import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import {
  LucideAngularModule,
  Sun,
  Moon,
  Bell,
  Search,
  UserCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Table2,
  Settings,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  SearchX,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  TriangleAlert,
  CircleX,
  Info,
  X,
  TrendingUp,
  Users,
  ShoppingCart,
  Activity,
  Heart,
  Star,
  Palette,
  Type,
  Square,
  Circle,
} from 'lucide-angular';
import {
  AppCardComponent,
  AppButtonComponent,
  AppBadgeComponent,
  AppSkeletonComponent,
  ThemeToggleComponent,
} from '../../../../shared/components';
import { NotificationService } from '../../../../core/services';

@Component({
  selector: 'app-showcase-page',
  standalone: true,
  imports: [
    LucideAngularModule,
    AppCardComponent,
    AppButtonComponent,
    AppBadgeComponent,
    AppSkeletonComponent,
    ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './showcase-page.component.html',
  styleUrl: './showcase-page.component.css',
})
export class ShowcasePageComponent {
  private notificationService = inject(NotificationService);
  activeAnimation = signal<string>('');

  // ── Icon references ──
  readonly iconList = [
    { name: 'Sun', ref: Sun },
    { name: 'Moon', ref: Moon },
    { name: 'Bell', ref: Bell },
    { name: 'Search', ref: Search },
    { name: 'UserCircle', ref: UserCircle },
    { name: 'Menu', ref: Menu },
    { name: 'PanelLeftClose', ref: PanelLeftClose },
    { name: 'PanelLeftOpen', ref: PanelLeftOpen },
    { name: 'LayoutDashboard', ref: LayoutDashboard },
    { name: 'Table2', ref: Table2 },
    { name: 'Settings', ref: Settings },
    { name: 'ChevronsUpDown', ref: ChevronsUpDown },
    { name: 'ArrowUp', ref: ArrowUp },
    { name: 'ArrowDown', ref: ArrowDown },
    { name: 'SearchX', ref: SearchX },
    { name: 'ChevronLeft', ref: ChevronLeft },
    { name: 'ChevronRight', ref: ChevronRight },
    { name: 'CircleCheck', ref: CircleCheck },
    { name: 'TriangleAlert', ref: TriangleAlert },
    { name: 'CircleX', ref: CircleX },
    { name: 'Info', ref: Info },
    { name: 'X', ref: X },
    { name: 'TrendingUp', ref: TrendingUp },
    { name: 'Users', ref: Users },
    { name: 'ShoppingCart', ref: ShoppingCart },
    { name: 'Activity', ref: Activity },
    { name: 'Heart', ref: Heart },
    { name: 'Star', ref: Star },
  ];

  // ── Color swatches ──
  readonly coreSwatches = [
    { label: 'Background', token: 'bg-background', bgClass: 'bg-background' },
    { label: 'Foreground', token: 'bg-foreground', bgClass: 'bg-foreground' },
    { label: 'Card', token: 'bg-card', bgClass: 'bg-card' },
    { label: 'Primary', token: 'bg-primary', bgClass: 'bg-primary' },
    { label: 'Secondary', token: 'bg-secondary', bgClass: 'bg-secondary' },
    { label: 'Muted', token: 'bg-muted', bgClass: 'bg-muted' },
    { label: 'Accent', token: 'bg-accent', bgClass: 'bg-accent' },
    { label: 'Destructive', token: 'bg-destructive', bgClass: 'bg-destructive' },
    { label: 'Border', token: 'bg-border', bgClass: 'bg-border' },
    { label: 'Input', token: 'bg-input', bgClass: 'bg-input' },
    { label: 'Ring', token: 'bg-ring', bgClass: 'bg-ring' },
    { label: 'Popover', token: 'bg-popover', bgClass: 'bg-popover' },
  ];

  readonly sidebarSwatches = [
    { label: 'Sidebar', token: 'bg-sidebar', bgClass: 'bg-sidebar' },
    { label: 'Sidebar Primary', token: 'bg-sidebar-primary', bgClass: 'bg-sidebar-primary' },
    { label: 'Sidebar Accent', token: 'bg-sidebar-accent', bgClass: 'bg-sidebar-accent' },
    { label: 'Sidebar Border', token: 'bg-sidebar-border', bgClass: 'bg-sidebar-border' },
  ];

  // ── Animations ──
  readonly animations = [
    { name: 'Fade In', class: 'animate-fade-in' },
    { name: 'Slide In Right', class: 'animate-slide-in-from-right' },
    { name: 'Slide In Bottom', class: 'animate-slide-in-from-bottom' },
    { name: 'Zoom In', class: 'animate-zoom-in' },
    { name: 'Spin', class: 'animate-spin' },
    { name: 'Pulse', class: 'animate-pulse' },
    { name: 'Bounce', class: 'animate-bounce' },
    { name: 'Fade Out', class: 'animate-fade-out' },
  ];

  // ── Radius tokens ──
  readonly radiusTokens = [
    { name: 'sm', class: 'rounded-sm' },
    { name: 'md', class: 'rounded-md' },
    { name: 'lg', class: 'rounded-lg' },
    { name: 'xl', class: 'rounded-xl' },
    { name: 'full', class: 'rounded-full' },
  ];

  replayAnimation(name: string): void {
    this.activeAnimation.set('');
    requestAnimationFrame(() => {
      this.activeAnimation.set(name);
    });
  }

  showToast(type: 'success' | 'info' | 'warning' | 'error'): void {
    const messages: Record<string, { title: string; msg: string }> = {
      success: { title: 'Success', msg: 'Operation completed successfully.' },
      info: { title: 'Info', msg: 'Here is some useful information.' },
      warning: { title: 'Warning', msg: 'Please review before continuing.' },
      error: { title: 'Error', msg: 'Something went wrong. Please try again.' },
    };
    const { title, msg } = messages[type];
    this.notificationService[type](title, msg);
  }
}
