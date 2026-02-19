import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LucideIconData,
  Search,
  FilterX,
  X,
  SearchX,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  MessageCircle,
  Mail,
} from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent } from '../../../../shared/components';
import { MonitoringDataService } from '../../services/monitoring-data.service';
import { LogEntry } from '../../models/monitoring.model';

@Component({
  selector: 'app-data-view-page',
  standalone: true,
  imports: [
    FormsModule,
    LucideAngularModule,
    AppBadgeComponent,
    AppButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-view-page.component.html',
  styleUrl: './data-view-page.component.css',
})
export class DataViewPageComponent {
  readonly monitoringService = inject(MonitoringDataService);

  /* ── Icons ── */
  readonly SearchIcon = Search;
  readonly FilterXIcon = FilterX;
  readonly XIcon = X;
  readonly SearchXIcon = SearchX;
  readonly ArrowUpIcon = ArrowUp;
  readonly ArrowDownIcon = ArrowDown;
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;

  /* ── Filter state ── */
  readonly searchTerm = signal('');
  readonly selectedProvider = signal<string>('all');
  readonly selectedStatus = signal<string>('all');
  readonly sortKey = signal<string>('id');
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly columns = [
    { key: 'id', label: 'ID' },
    { key: 'recipient', label: 'Destinatario' },
    { key: 'provider', label: 'Proveedor' },
    { key: 'status', label: 'Estado' },
    { key: 'timestamp', label: 'Timestamp' },
  ];

  constructor() {
    // Reset to page 1 when filters change
    effect(() => {
      this.searchTerm();
      this.selectedProvider();
      this.selectedStatus();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });
  }

  /* ── Computed data ── */
  readonly filteredLogs = computed(() => {
    let logs = this.monitoringService.allLogs();
    const search = this.searchTerm().toLowerCase();
    const provider = this.selectedProvider();
    const status = this.selectedStatus();
    const key = this.sortKey();
    const dir = this.sortDir();

    if (search) {
      logs = logs.filter(
        (l) =>
          l.id.toLowerCase().includes(search) ||
          l.recipient.includes(search)
      );
    }
    if (provider !== 'all') {
      logs = logs.filter((l) => l.provider === provider);
    }
    if (status !== 'all') {
      logs = logs.filter((l) => l.status === status);
    }

    // Sort
    logs = [...logs].sort((a, b) => {
      const aVal = a[key as keyof LogEntry] ?? '';
      const bVal = b[key as keyof LogEntry] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return dir === 'asc' ? cmp : -cmp;
    });

    return logs;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredLogs().length / this.pageSize))
  );

  readonly pageStart = computed(() => (this.currentPage() - 1) * this.pageSize);
  readonly pageEnd = computed(() =>
    Math.min(this.pageStart() + this.pageSize, this.filteredLogs().length)
  );

  readonly paginatedLogs = computed(() =>
    this.filteredLogs().slice(this.pageStart(), this.pageEnd())
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchTerm() !== '' ||
      this.selectedProvider() !== 'all' ||
      this.selectedStatus() !== 'all'
  );

  /* ── Stat counts ── */
  readonly deliveredCount = computed(
    () => this.monitoringService.allLogs().filter((l) => l.status === 'delivered').length
  );
  readonly failedCount = computed(
    () => this.monitoringService.allLogs().filter((l) => l.status === 'failed').length
  );
  readonly pendingCount = computed(
    () => this.monitoringService.allLogs().filter((l) => l.status === 'pending').length
  );

  /* ── Provider helpers ── */
  private readonly providerIcons: Record<string, LucideIconData> = {
    sms: Smartphone,
    whatsapp: MessageCircle,
    email: Mail,
  };

  providerIcon(provider: string): LucideIconData {
    return this.providerIcons[provider] ?? Mail;
  }

  providerLabel(provider: string): string {
    return ({ sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email' } as Record<string, string>)[provider] ?? provider;
  }

  providerClasses(provider: string): string {
    return ({
      sms: 'bg-chart-1/10 text-chart-1 border border-chart-1/25',
      whatsapp: 'bg-chart-2/10 text-chart-2 border border-chart-2/25',
      email: 'bg-chart-4/10 text-chart-4 border border-chart-4/25',
    } as Record<string, string>)[provider] ?? '';
  }

  /* ── Status helpers ── */
  statusLabel(status: string): string {
    return ({ delivered: 'Delivered', failed: 'Failed', pending: 'Pending' } as Record<string, string>)[status] ?? status;
  }

  statusClasses(status: string): string {
    return ({
      delivered: 'bg-chart-2/15 text-chart-2 border border-chart-2/25',
      failed: 'bg-destructive/15 text-destructive border border-destructive/25',
      pending: 'bg-orange/15 text-orange border border-orange/25',
    } as Record<string, string>)[status] ?? '';
  }

  statusDotClass(status: string): string {
    return ({
      delivered: 'bg-chart-2',
      failed: 'bg-destructive',
      pending: 'bg-orange',
    } as Record<string, string>)[status] ?? '';
  }

  /* ── Actions ── */
  toggleSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedProvider.set('all');
    this.selectedStatus.set('all');
  }
}
