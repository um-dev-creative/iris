import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { KpiCardComponent } from '../../components/kpi-card/kpi-card.component';
import { ChartPlaceholderComponent } from '../../components/chart-placeholder/chart-placeholder.component';
import { AppCardComponent, AppTableComponent, AppSkeletonComponent, AppBadgeComponent } from '../../../../shared/components';
import { DashboardDataService } from '../../services';
import { KpiCard, TableColumn, Post } from '../../../../core/models';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    KpiCardComponent,
    ChartPlaceholderComponent,
    AppCardComponent,
    AppTableComponent,
    AppSkeletonComponent,
    AppBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Page header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Overview</h2>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
        Resumen general del sistema con datos de JSONPlaceholder
      </p>
    </div>

    <!-- KPI Cards -->
    @if (dataService.loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (_ of [1,2,3,4]; track $index) {
          <div class="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <app-skeleton height="16px" width="60%" />
            <app-skeleton height="36px" width="40%" />
            <app-skeleton height="14px" width="50%" />
          </div>
        }
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (kpi of kpiCards(); track kpi.title) {
          <app-kpi-card [data]="kpi" />
        }
      </div>
    }

    <!-- Chart + Recent activity -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="lg:col-span-2">
        <app-chart-placeholder
          title="Actividad de posts"
          [dataPoints]="chartData()"
          [labels]="chartLabels"
        />
      </div>

      <app-card title="Usuarios recientes">
        @if (dataService.loading()) {
          <div class="space-y-3">
            @for (_ of [1,2,3,4,5]; track $index) {
              <div class="flex items-center gap-3">
                <app-skeleton width="40px" height="40px" variant="circle" />
                <div class="flex-1">
                  <app-skeleton height="14px" width="70%" />
                  <app-skeleton height="12px" width="50%" />
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="space-y-3">
            @for (user of dataService.users().slice(0, 5); track user.id) {
              <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <div class="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {{ user.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ user.name }}</p>
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">{{ user.email }}</p>
                </div>
                <app-badge color="success">Active</app-badge>
              </div>
            }
          </div>
        }
      </app-card>
    </div>

    <!-- Recent posts table -->
    <app-card title="Posts recientes" subtitle="Últimos posts del sistema" [noPadding]="true">
      @if (dataService.loading()) {
        <div class="p-6 space-y-3">
          @for (_ of [1,2,3,4,5]; track $index) {
            <app-skeleton height="40px" />
          }
        </div>
      } @else {
        <app-table
          [columns]="postColumns"
          [data]="recentPosts()"
          [pageSize]="5"
        />
      }
    </app-card>
  `,
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  readonly dataService = inject(DashboardDataService);

  readonly postColumns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'title', label: 'Título', sortable: true },
    { key: 'body', label: 'Contenido' },
  ];

  readonly chartLabels = ['Usr 1', 'Usr 2', 'Usr 3', 'Usr 4', 'Usr 5', 'Usr 6', 'Usr 7', 'Usr 8', 'Usr 9', 'Usr 10'];

  readonly kpiCards = computed<KpiCard[]>(() => [
    {
      title: 'Total Usuarios',
      value: this.dataService.totalUsers(),
      change: 12,
      changeLabel: 'vs mes anterior',
      icon: '👥',
      color: 'primary',
    },
    {
      title: 'Total Posts',
      value: this.dataService.totalPosts(),
      change: 8,
      changeLabel: 'vs mes anterior',
      icon: '📝',
      color: 'success',
    },
    {
      title: 'Tareas completas',
      value: this.dataService.completedTodos(),
      change: 24,
      changeLabel: 'completadas',
      icon: '✅',
      color: 'secondary',
    },
    {
      title: 'Tareas pendientes',
      value: this.dataService.pendingTodos(),
      change: -5,
      changeLabel: 'vs semana anterior',
      icon: '⏳',
      color: 'warning',
    },
  ]);

  readonly chartData = computed(() => {
    const users = this.dataService.users();
    const posts = this.dataService.posts();
    // Cantidad de posts por usuario (primeros 10)
    return users.slice(0, 10).map(
      (u) => posts.filter((p) => p.userId === u.id).length
    );
  });

  readonly recentPosts = computed(() =>
    this.dataService.posts().slice(0, 20) as unknown as Record<string, unknown>[]
  );

  ngOnInit(): void {
    if (this.dataService.posts().length === 0) {
      this.dataService.loadAll();
    }
  }
}
