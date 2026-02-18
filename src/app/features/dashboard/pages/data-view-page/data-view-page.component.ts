import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppCardComponent, AppTableComponent, AppSkeletonComponent, AppBadgeComponent, AppButtonComponent } from '../../../../shared/components';
import { DashboardDataService } from '../../services';
import { TableColumn } from '../../../../core/models';

@Component({
  selector: 'app-data-view-page',
  standalone: true,
  imports: [
    FormsModule,
    AppCardComponent,
    AppTableComponent,
    AppSkeletonComponent,
    AppBadgeComponent,
    AppButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Page header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Data View</h2>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
        Explora y filtra datos de la API externa (JSONPlaceholder)
      </p>
    </div>

    <!-- Filters -->
    <app-card>
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div class="flex-1">
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Buscar por título</label>
          <input
            type="text"
            [ngModel]="searchTerm()"
            (ngModelChange)="searchTerm.set($event)"
            placeholder="Escribe para filtrar..."
            class="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Filtrar por usuario</label>
          <select
            [ngModel]="selectedUserId()"
            (ngModelChange)="selectedUserId.set($event)"
            class="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white dark:bg-neutral-800 dark:text-neutral-100 transition-colors"
          >
            <option [ngValue]="0">Todos los usuarios</option>
            @for (user of dataService.users(); track user.id) {
              <option [ngValue]="user.id">{{ user.name }}</option>
            }
          </select>
        </div>
        <div class="self-end">
          <app-button variant="ghost" (click)="clearFilters()">Limpiar filtros</app-button>
        </div>
      </div>
    </app-card>

    <!-- Results count -->
    <div class="flex items-center justify-between my-4">
      <p class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ filteredPosts().length }} resultado(s) encontrado(s)
      </p>
      <app-badge color="primary">
        Posts totales: {{ dataService.posts().length }}
      </app-badge>
    </div>

    <!-- Data table -->
    <app-card [noPadding]="true">
      @if (dataService.loading()) {
        <div class="p-6 space-y-3">
          @for (_ of [1,2,3,4,5,6,7,8]; track $index) {
            <app-skeleton height="40px" />
          }
        </div>
      } @else {
        <app-table
          [columns]="columns"
          [data]="filteredPosts()"
          [pageSize]="10"
        />
      }
    </app-card>
  `,
  styleUrl: './data-view-page.component.css',
})
export class DataViewPageComponent implements OnInit {
  readonly dataService = inject(DashboardDataService);

  readonly searchTerm = signal('');
  readonly selectedUserId = signal<number>(0);

  readonly columns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'userId', label: 'Usuario ID', sortable: true },
    { key: 'title', label: 'Título', sortable: true },
    { key: 'body', label: 'Contenido' },
  ];

  readonly filteredPosts = computed(() => {
    let posts = this.dataService.posts();
    const search = this.searchTerm().toLowerCase();
    const userId = this.selectedUserId();

    if (search) {
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.body.toLowerCase().includes(search)
      );
    }

    if (userId > 0) {
      posts = posts.filter((p) => p.userId === userId);
    }

    return posts as unknown as Record<string, unknown>[];
  });

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedUserId.set(0);
  }

  ngOnInit(): void {
    if (this.dataService.posts().length === 0) {
      this.dataService.loadAll();
    }
  }
}
