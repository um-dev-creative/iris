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
  TrendingDown,
  Users,
  ShoppingCart,
  Activity,
  Heart,
  Star,
  Palette,
  Type,
  Square,
  Circle,
  MessageSquare,
  CircleCheckBig,
  Clock,
} from 'lucide-angular';
import {
  AppCardComponent,
  AppButtonComponent,
  AppBadgeComponent,
  AppSkeletonComponent,
  ThemeToggleComponent,
} from '../../../../shared/components';
import { NotificationService } from '../../../../core/services';
import {
  SparklineComponent,
} from '../../components';

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
    SparklineComponent,
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

  readonly chartSwatches = [
    { label: 'chart-1', bgClass: 'bg-chart-1' },
    { label: 'chart-2', bgClass: 'bg-chart-2' },
    { label: 'chart-3', bgClass: 'bg-chart-3' },
    { label: 'chart-4', bgClass: 'bg-chart-4' },
    { label: 'chart-5', bgClass: 'bg-chart-5' },
  ];

  // ── Animations ──
  readonly animations = [
    { name: 'Fade In', class: 'animate-in fade-in duration-700' },
    { name: 'Slide In Right', class: 'animate-in slide-in-from-right duration-700' },
    { name: 'Slide In Bottom', class: 'animate-in slide-in-from-bottom duration-700' },
    { name: 'Zoom In', class: 'animate-in zoom-in duration-700' },
    { name: 'Spin', class: 'animate-spin' },
    { name: 'Pulse', class: 'animate-pulse' },
    { name: 'Bounce', class: 'animate-bounce' },
    { name: 'Fade Out', class: 'animate-out fade-out duration-700' },
  ];

  // ── KPI card showcase data ──
  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
  readonly showcaseKpis = [
    {
      title: 'Mensajes Totales (24h)',
      value: '1,284,392',
      trend: 12.5,
      trendLabel: '%',
      positive: true,
      icon: MessageSquare,
      sparkData: [30, 35, 28, 42, 38, 50, 45, 55, 48, 60, 52, 58],
      sparkColor: 'var(--chart-1)',
      iconBg: 'bg-chart-1/15',
      iconText: 'text-chart-1',
    },
    {
      title: 'Tasa de Entrega',
      value: '98.7%',
      trend: 0.3,
      trendLabel: '%',
      positive: true,
      icon: CircleCheckBig,
      sparkData: [95, 96, 97, 96, 98, 97, 98, 99, 98, 99, 98, 99],
      sparkColor: 'var(--success)',
      iconBg: 'bg-success/15',
      iconText: 'text-success',
    },
    {
      title: 'Latencia Promedio',
      value: '142 ms',
      trend: -8.2,
      trendLabel: '%',
      positive: false,
      icon: Clock,
      sparkData: [160, 155, 150, 148, 145, 142, 148, 140, 145, 138, 142, 140],
      sparkColor: 'var(--chart-3)',
      iconBg: 'bg-chart-3/15',
      iconText: 'text-chart-3',
    },
    {
      title: 'Errores Activos',
      value: '23',
      trend: 5,
      trendLabel: '',
      positive: false,
      icon: TriangleAlert,
      sparkData: [12, 15, 18, 14, 20, 22, 19, 25, 21, 28, 24, 23],
      sparkColor: 'var(--destructive)',
      iconBg: 'bg-destructive/15',
      iconText: 'text-destructive',
    },
  ];

  // ── Chart sample data ──
  readonly barChartData = [65, 45, 80, 35, 70, 55, 90];
  readonly barChartLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
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
