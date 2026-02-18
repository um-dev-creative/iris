import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { TableColumn, PaginationState } from '../../../core/models';

@Component({
  selector: 'app-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            @for (col of columns(); track col.key) {
              <th
                class="px-4 py-3 font-semibold text-neutral-600 dark:text-neutral-300 uppercase text-xs tracking-wider"
                [class.cursor-pointer]="col.sortable"
                (click)="col.sortable && onSort(col.key)"
              >
                {{ col.label }}
                @if (col.sortable && sortKey() === col.key) {
                  <span class="ml-1">{{ sortDirection() === 'asc' ? '↑' : '↓' }}</span>
                }
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-700">
          @for (row of paginatedData(); track $index) {
            <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              @for (col of columns(); track col.key) {
                <td class="px-4 py-3 text-neutral-800 dark:text-neutral-200">
                  {{ getNestedValue(row, col.key) }}
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td
                [attr.colspan]="columns().length"
                class="px-4 py-8 text-center text-neutral-400 dark:text-neutral-500"
              >
                No hay datos disponibles
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    @if (totalPages() > 1) {
      <div
        class="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <span class="text-sm text-neutral-500 dark:text-neutral-400">
          Mostrando {{ startIndex() + 1 }}–{{ endIndex() }} de {{ data().length }}
        </span>
        <div class="flex gap-1">
          <button
            class="px-3 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            [disabled]="currentPage() === 1"
            (click)="goToPage(currentPage() - 1)"
          >
            Anterior
          </button>
          @for (page of visiblePages(); track page) {
            <button
              class="px-3 py-1 text-sm rounded-md border transition-colors"
              [class]="
                page === currentPage()
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              "
              (click)="goToPage(page)"
            >
              {{ page }}
            </button>
          }
          <button
            class="px-3 py-1 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            [disabled]="currentPage() === totalPages()"
            (click)="goToPage(currentPage() + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    }
  `,
  styleUrl: './table.component.css',
})
export class AppTableComponent<T extends Record<string, unknown>> {
  readonly columns = input<TableColumn[]>([]);
  readonly data = input<T[]>([]);
  readonly pageSize = input<number>(10);
  readonly pageChange = output<PaginationState>();

  readonly currentPage = signal(1);
  readonly sortKey = signal<string>('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.data().length / this.pageSize()))
  );

  readonly startIndex = computed(() => (this.currentPage() - 1) * this.pageSize());

  readonly endIndex = computed(() =>
    Math.min(this.startIndex() + this.pageSize(), this.data().length)
  );

  readonly sortedData = computed(() => {
    const items = [...this.data()];
    const key = this.sortKey();
    if (!key) return items;
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    return items.sort((a, b) => {
      const aVal = this.getNestedValue(a, key);
      const bVal = this.getNestedValue(b, key);
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  });

  readonly paginatedData = computed(() =>
    this.sortedData().slice(this.startIndex(), this.endIndex())
  );

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.pageChange.emit({
      page,
      pageSize: this.pageSize(),
      total: this.data().length,
    });
  }

  onSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  getNestedValue(obj: Record<string, unknown>, path: string): string {
    const value = path.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[part];
      }
      return '';
    }, obj);
    return String(value ?? '');
  }
}
