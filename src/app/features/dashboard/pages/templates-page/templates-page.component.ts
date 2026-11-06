import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, LucideAngularModule, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { NotificationService } from '../../../../core/services';
import { ReferenceItem, TemplateSearchResult, TemplateSummary } from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { ReferenceDataService, TemplatesService } from '../../services';
import { loadFailure, LoadFailure } from '../../utils/campaign-errors';
import { toDate } from '../../utils/campaign-input';

const PAGE_SIZE = 10;
const base = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.TEMPLATES);

/** Lista de plantillas de Mercury con búsqueda, filtros y paginación en el servidor; crear, editar y desactivar. */
@Component({
  selector: 'app-templates-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (applicationId) {
      <a [routerLink]="applicationsUrl" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="back-to-applications">
        <lucide-icon [img]="ArrowLeft" [size]="14" strokeWidth="2" /> Aplicaciones
      </a>
    }
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Plantillas@if (applicationName(); as name) { <span class="text-muted-foreground font-normal"> · {{ name }}</span> }</h2>
        <p class="text-sm text-muted-foreground mt-1">Escribe y edita el contenido de los mensajes en HTML o Markdown, con vista previa.</p>
      </div>
      <div class="flex gap-2">
        <app-button variant="secondary" (click)="reload()" [disabled]="loading()">
          <lucide-icon [img]="RefreshCw" [size]="16" strokeWidth="2" /> Actualizar
        </app-button>
        <a [routerLink]="newUrl" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="new-template">
          <lucide-icon [img]="Plus" [size]="16" strokeWidth="2" /> Nueva plantilla
        </a>
      </div>
    </div>

    @if (pending(); as template) {
      <div role="alertdialog" aria-live="assertive" class="mb-6 rounded-xl border border-border bg-card p-5" data-testid="confirm-panel">
        <p class="text-sm text-foreground">
          ¿Desactivar la plantilla «{{ template.description }}»? Dejará de poder usarse en campañas nuevas; los mensajes y campañas anteriores no cambian.
        </p>
        <div class="mt-3 flex gap-2">
          <app-button variant="danger" size="sm" (click)="confirmDeactivate()" [disabled]="busy()">Desactivar</app-button>
          <app-button variant="ghost" size="sm" (click)="pending.set(null)" [disabled]="busy()">Cancelar</app-button>
        </div>
      </div>
    }

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <div>
        <label for="tp-search" class="block text-xs font-medium text-muted-foreground mb-1">Buscar</label>
        <input id="tp-search" type="text" [ngModel]="search()" (ngModelChange)="onSearch($event)" placeholder="Descripción o archivo"
          class="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
      </div>
      <div>
        <label for="tp-type" class="block text-xs font-medium text-muted-foreground mb-1">Tipo</label>
        <select id="tp-type" [ngModel]="typeId()" (ngModelChange)="onType($event)"
          class="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring">
          <option value="">Todos</option>
          @for (option of types(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
        </select>
      </div>
      <div>
        <label for="tp-severity" class="block text-xs font-medium text-muted-foreground mb-1">Severidad</label>
        <select id="tp-severity" [ngModel]="severityId()" (ngModelChange)="onSeverity($event)"
          class="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring">
          <option value="">Todas</option>
          @for (option of severities(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
        </select>
      </div>
    </div>

    <app-card [noPadding]="true">
      @if (loading() && items().length === 0) {
        <p class="p-6 text-sm text-muted-foreground" data-testid="loading">Cargando plantillas…</p>
      } @else if (loadError() === 'forbidden') {
        <div class="p-6" role="alert" data-testid="forbidden">
          <p class="font-medium text-foreground">No tienes permiso para administrar las plantillas.</p>
          <p class="text-sm text-muted-foreground mt-1">Pide a quien administra Backbone el permiso <code>TEMPLATE_MANAGE</code> en la aplicación de Iris.</p>
        </div>
      } @else if (loadError() === 'unavailable') {
        <div class="p-6" role="alert" data-testid="unavailable">
          <p class="font-medium text-foreground">La gestión de plantillas no está configurada.</p>
          <p class="text-sm text-muted-foreground mt-1">Falta <code>MONITORED_APPLICATION_ID</code> en el BFF.</p>
        </div>
      } @else if (loadError() === 'failed') {
        <div class="p-6" role="alert" data-testid="load-failed">
          <p class="font-medium text-foreground">No se pudo cargar la lista.</p>
          <app-button variant="secondary" size="sm" class="mt-3" (click)="reload()"><lucide-icon [img]="RefreshCw" [size]="14" strokeWidth="2" /> Reintentar</app-button>
        </div>
      } @else if (items().length === 0) {
        <div class="p-10 text-center text-muted-foreground" data-testid="empty">
          <lucide-icon [img]="FileText" [size]="28" strokeWidth="1.5" class="mx-auto mb-2 opacity-60" />
          {{ filtered() ? 'Ninguna plantilla coincide con los filtros.' : 'Aún no hay plantillas.' }}
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-muted border-b border-border">
              <tr>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Plantilla</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Archivo</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Tipo</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Severidad</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Actualizada</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (template of items(); track template.id) {
                <tr class="hover:bg-muted/50 transition-colors" data-testid="template-row">
                  <td class="px-4 py-3 font-medium text-foreground"><a [routerLink]="editUrl(template.id)" class="hover:underline">{{ template.description }}</a></td>
                  <td class="px-4 py-3 text-muted-foreground"><code>{{ template.location }}</code></td>
                  <td class="px-4 py-3"><app-badge color="neutral">{{ template.templateTypeName || '—' }}</app-badge></td>
                  <td class="px-4 py-3 text-muted-foreground">{{ template.severityTypeName || '—' }}</td>
                  <td class="px-4 py-3 text-muted-foreground">{{ updated(template) ? (updated(template) | date: 'short') : '—' }}</td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      <a [routerLink]="editUrl(template.id)" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-accent" [attr.aria-label]="'Editar ' + template.description">
                        <lucide-icon [img]="Pencil" [size]="14" strokeWidth="2" /> Editar
                      </a>
                      <app-button variant="ghost" size="sm" (click)="pending.set(template)" [disabled]="busy()">
                        <lucide-icon [img]="Trash2" [size]="14" strokeWidth="2" /> Desactivar
                      </app-button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span data-testid="range">{{ from() }}–{{ to() }} de {{ total() }}</span>
          <div class="flex items-center gap-1">
            <app-button variant="ghost" size="sm" (click)="goTo(page() - 1)" [disabled]="page() <= 0 || loading()"><lucide-icon [img]="ChevronLeft" [size]="14" strokeWidth="2" /> Anterior</app-button>
            <span>Página {{ page() + 1 }} de {{ pages() }}</span>
            <app-button variant="ghost" size="sm" (click)="goTo(page() + 1)" [disabled]="page() + 1 >= pages() || loading()">Siguiente <lucide-icon [img]="ChevronRight" [size]="14" strokeWidth="2" /></app-button>
          </div>
        </div>
      }
    </app-card>
  `,
})
export class TemplatesPageComponent implements OnInit {
  private readonly templates = inject(TemplatesService);
  private readonly references = inject(ReferenceDataService);
  private readonly notifications = inject(NotificationService);
  /** La aplicación cuyas plantillas se gestionan (de la URL); sin ella, la que el BFF tiene configurada. */
  readonly applicationId: string | null = inject(ActivatedRoute).snapshot.paramMap.get('applicationId') ?? null;
  readonly applicationName = signal<string | null>(null);

  readonly Plus = Plus;
  readonly RefreshCw = RefreshCw;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly FileText = FileText;
  readonly ArrowLeft = ArrowLeft;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  readonly applicationsUrl = base;
  private readonly appBase = this.applicationId ? `${base}/${this.applicationId}` : base;
  readonly newUrl = `${this.appBase}/${ROUTE_PATHS.NEW}`;
  readonly search = signal('');
  readonly typeId = signal('');
  readonly severityId = signal('');
  readonly page = signal(0);

  readonly result = signal<TemplateSearchResult | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal<LoadFailure | null>(null);
  readonly types = signal<ReferenceItem[]>([]);
  readonly severities = signal<ReferenceItem[]>([]);
  readonly pending = signal<TemplateSummary | null>(null);
  readonly busy = signal(false);

  readonly items = computed(() => this.result()?.items ?? []);
  readonly total = computed(() => this.result()?.totalElements ?? 0);
  readonly pages = computed(() => Math.max(1, this.result()?.totalPages ?? 1));
  readonly from = computed(() => (this.total() === 0 ? 0 : this.page() * PAGE_SIZE + 1));
  readonly to = computed(() => this.page() * PAGE_SIZE + this.items().length);
  readonly filtered = computed(() => this.search().trim() !== '' || this.typeId() !== '' || this.severityId() !== '');

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.references.templateTypes().then((list) => this.types.set(list), () => undefined);
    this.references.severityTypes().then((list) => this.severities.set(list), () => undefined);
    void this.reload();
    this.nameApplication();
  }

  readonly editUrl = (id: string) => `${this.appBase}/${id}`;
  readonly updated = (template: TemplateSummary) => toDate(template.updatedAt ?? template.createdAt);

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.restart(), 300);
  }

  onType(value: string): void {
    this.typeId.set(value);
    this.restart();
  }

  onSeverity(value: string): void {
    this.severityId.set(value);
    this.restart();
  }

  goTo(page: number): void {
    this.page.set(Math.max(0, page));
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.result.set(
        await this.templates.search({
          ...(this.applicationId ? { applicationId: this.applicationId } : {}),
          q: this.search().trim(),
          templateTypeId: this.typeId(),
          severityTypeId: this.severityId(),
          page: this.page(),
          size: PAGE_SIZE,
          sort: 'updatedAt,desc',
        }),
      );
    } catch (error) {
      this.loadError.set(loadFailure(error));
    } finally {
      this.loading.set(false);
    }
  }

  async confirmDeactivate(): Promise<void> {
    const template = this.pending();
    if (!template) return;
    this.busy.set(true);
    try {
      await this.templates.deactivate(template.id);
      this.notifications.success('Plantilla desactivada', template.description);
      this.pending.set(null);
      // the last row of a page leaves the page before it
      if (this.items().length === 1 && this.page() > 0) this.page.update((p) => p - 1);
      await this.reload();
    } catch (error) {
      const forbidden = error instanceof HttpErrorResponse && error.status === 403;
      this.notifications.error('No se pudo desactivar', forbidden ? 'No tienes permiso para administrar esta plantilla.' : 'Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Para el encabezado; si no se puede leer la lista, solo falta el nombre. */
  private nameApplication(): void {
    if (!this.applicationId) return;
    this.templates.applications().then(
      (list) => this.applicationName.set(list.find((application) => application.id === this.applicationId)?.name ?? null),
      () => undefined,
    );
  }

  private restart(): void {
    this.page.set(0);
    void this.reload();
  }
}
