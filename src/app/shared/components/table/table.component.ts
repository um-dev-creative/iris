import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { LucideAngularModule, ChevronsUpDown, ArrowUp, ArrowDown, SearchX, ChevronLeft, ChevronRight } from 'lucide-angular';
import { TableColumn, PaginationState } from '../../../core/models';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead class="bg-muted border-b border-border">
          <tr>
            @for (col of columns(); track col.key) {
              <th
                class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider"
                [class.cursor-pointer]="col.sortable"
                (click)="col.sortable && onSort(col.key)"
              >
                <span class="inline-flex items-center gap-1">
                  {{ col.label }}
                  @if (col.sortable) {
                    @if (sortKey() === col.key) {
                      <lucide-icon
                        [img]="sortDirection() === 'asc' ? ArrowUp : ArrowDown"
                        [size]="14"
                        strokeWidth="2" />
                    } @else {
                      <lucide-icon [img]="ChevronsUpDown" [size]="14" strokeWidth="1.5" class="opacity-40" />
                    }
                  }
                </span>
              </th>
            }
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          @for (row of paginatedData(); track $index) {
            <tr class="hover:bg-muted/50 transition-colors">
              @for (col of columns(); track col.key) {
                <td class="px-4 py-3 text-foreground">
                  {{ getNestedValue(row, col.key) }}
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td
                [attr.colspan]="columns().length"
                class="px-4 py-8 text-center text-muted-foreground"
              >
                <div class="flex flex-col items-center gap-2">
                  <lucide-icon [img]="SearchX" [size]="24" strokeWidth="1.5" />
                  <span>No hay datos disponibles</span>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Paginación -->
    @if (totalPages() > 1) {
      <div
        class="flex items-center justify-between px-4 py-3 border-t border-border bg-card"
      >
        <span class="text-sm text-muted-foreground">
          Mostrando {{ startIndex() + 1 }}–{{ endIndex() }} de {{ data().length }}
        </span>
        <div class="flex gap-1">
          <button
            class="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            [disabled]="currentPage() === 1"
            (click)="goToPage(currentPage() - 1)"
            aria-label="Previous page"
          >
            <lucide-icon [img]="ChevronLeft" [size]="14" strokeWidth="1.5" />
            Anterior
          </button>
          @for (page of visiblePages(); track page) {
            <button
              class="px-3 py-1 text-sm rounded-md border transition-colors"
              [class]="
                page === currentPage()
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              "
              (click)="goToPage(page)"
            >
              {{ page }}
            </button>
          }
          <button
            class="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            [disabled]="currentPage() === totalPages()"
            (click)="goToPage(currentPage() + 1)"
            aria-label="Next page"
          >
            Siguiente
            <lucide-icon [img]="ChevronRight" [size]="14" strokeWidth="1.5" />
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

  readonly ChevronsUpDown = ChevronsUpDown;
  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly SearchX = SearchX;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

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
