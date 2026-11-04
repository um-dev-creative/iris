import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChevronLeft, ChevronRight, Eye, LucideAngularModule, Megaphone, Pause, Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { paginate } from '../../../../shared/utils';
import { NotificationService } from '../../../../core/services';
import { Campaign, CampaignProgress } from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { CampaignsService } from '../../services';
import { actionErrorMessage, loadFailure, LoadFailure } from '../../utils/campaign-errors';
import { isEnabled, percent, statusTone, toDate } from '../../utils/campaign-input';

type PendingKind = 'pause' | 'delete';

const PAGE_SIZE = 10;
const base = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.CAMPAIGNS);

/** Lista y gestión de campañas: filtrar, ver el avance, pausar o reanudar y eliminar (con confirmación). */
@Component({
  selector: 'app-campaigns-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Campañas</h2>
        <p class="text-sm text-muted-foreground mt-1">Crea, programa, pausa y sigue el avance de tus campañas de mensajería.</p>
      </div>
      <div class="flex gap-2">
        <app-button variant="secondary" (click)="reload()" [disabled]="service.loading()">
          <lucide-icon [img]="RefreshCw" [size]="16" strokeWidth="2" /> Actualizar
        </app-button>
        <a [routerLink]="newUrl" class="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="new-campaign">
          <lucide-icon [img]="Plus" [size]="16" strokeWidth="2" /> Nueva campaña
        </a>
      </div>
    </div>

    @if (pending(); as action) {
      <div role="alertdialog" aria-live="assertive" class="mb-6 rounded-xl border border-border bg-card p-5" data-testid="confirm-panel">
        <p class="text-sm text-foreground">{{ confirmText(action.kind, action.campaign) }}</p>
        <div class="mt-3 flex gap-2">
          <app-button [variant]="action.kind === 'delete' ? 'danger' : 'primary'" size="sm" (click)="confirm()" [disabled]="busyId() !== null">
            {{ action.kind === 'delete' ? 'Eliminar' : 'Pausar' }}
          </app-button>
          <app-button variant="ghost" size="sm" (click)="cancelPending()" [disabled]="busyId() !== null">Cancelar</app-button>
        </div>
      </div>
    }

    <div class="mb-4 grid gap-3 sm:grid-cols-3">
      <div>
        <label for="cp-search" class="block text-xs font-medium text-muted-foreground mb-1">Buscar por nombre</label>
        <input id="cp-search" type="text" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1)" placeholder="Nombre de la campaña"
          class="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
      </div>
      <div>
        <label for="cp-status" class="block text-xs font-medium text-muted-foreground mb-1">Estado</label>
        <select id="cp-status" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)"
          class="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring">
          <option value="">Todos</option>
          @for (option of statuses(); track option) {
            <option [value]="option">{{ option }}</option>
          }
          <option value="__paused">Pausadas</option>
        </select>
      </div>
      <div>
        <label for="cp-channel" class="block text-xs font-medium text-muted-foreground mb-1">Canal</label>
        <select id="cp-channel" [ngModel]="channel()" (ngModelChange)="channel.set($event); page.set(1)"
          class="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring">
          <option value="">Todos</option>
          @for (option of channels(); track option) {
            <option [value]="option">{{ option }}</option>
          }
        </select>
      </div>
    </div>

    <app-card [noPadding]="true">
      @if (service.loading() && all().length === 0) {
        <p class="p-6 text-sm text-muted-foreground" data-testid="loading">Cargando campañas…</p>
      } @else if (loadError() === 'forbidden') {
        <div class="p-6" role="alert" data-testid="forbidden">
          <p class="font-medium text-foreground">No tienes permiso para ver las campañas.</p>
          <p class="text-sm text-muted-foreground mt-1">La aplicación de Iris necesita el scope <code>mercury:message:read</code> en Backbone.</p>
        </div>
      } @else if (loadError() === 'unavailable') {
        <div class="p-6" role="alert" data-testid="unavailable">
          <p class="font-medium text-foreground">La gestión de campañas no está configurada.</p>
          <p class="text-sm text-muted-foreground mt-1">Falta <code>MONITORED_APPLICATION_ID</code> en el BFF.</p>
        </div>
      } @else if (loadError() === 'failed') {
        <div class="p-6" role="alert" data-testid="load-failed">
          <p class="font-medium text-foreground">No se pudo cargar la lista.</p>
          <app-button variant="secondary" size="sm" class="mt-3" (click)="reload()">
            <lucide-icon [img]="RefreshCw" [size]="14" strokeWidth="2" /> Reintentar
          </app-button>
        </div>
      } @else if (all().length === 0) {
        <div class="p-10 text-center text-muted-foreground" data-testid="empty">
          <lucide-icon [img]="Megaphone" [size]="28" strokeWidth="1.5" class="mx-auto mb-2 opacity-60" />
          Aún no has creado campañas.
        </div>
      } @else if (filtered().length === 0) {
        <p class="p-10 text-center text-muted-foreground" data-testid="no-match">Ninguna campaña coincide con los filtros.</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-muted border-b border-border">
              <tr>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Campaña</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Canal</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Estado</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Avance</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Creada</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (campaign of view().items; track campaign.id) {
                <tr class="hover:bg-muted/50 transition-colors" data-testid="campaign-row">
                  <td class="px-4 py-3 font-medium text-foreground">
                    <a [routerLink]="detailUrl(campaign.id)" class="hover:underline">{{ campaign.name }}</a>
                    <div class="text-xs text-muted-foreground font-normal">{{ campaign.totalRecipients ?? 0 }} destinatarios</div>
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">{{ campaign.channelType }}</td>
                  <td class="px-4 py-3">
                    <app-badge [color]="enabled(campaign) ? tone(campaign.status) : 'neutral'">{{ enabled(campaign) ? campaign.status : 'PAUSADA' }}</app-badge>
                  </td>
                  <td class="px-4 py-3 min-w-40">
                    @if (progress()[campaign.id]; as p) {
                      <div class="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" [attr.aria-valuenow]="done(p)" aria-valuemin="0" aria-valuemax="100">
                        <div class="h-full bg-success" [style.width.%]="done(p)"></div>
                      </div>
                      <div class="text-xs text-muted-foreground mt-1">{{ p.delivered }} entregados · {{ p.failed }} fallidos</div>
                    } @else {
                      <span class="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-muted-foreground">{{ created(campaign) ? (created(campaign) | date: 'short') : '—' }}</td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      <a [routerLink]="detailUrl(campaign.id)" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-accent" [attr.aria-label]="'Ver ' + campaign.name">
                        <lucide-icon [img]="Eye" [size]="14" strokeWidth="2" /> Ver
                      </a>
                      <a [routerLink]="editUrl(campaign.id)" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-accent" [attr.aria-label]="'Editar ' + campaign.name">
                        <lucide-icon [img]="Pencil" [size]="14" strokeWidth="2" /> Editar
                      </a>
                      @if (enabled(campaign)) {
                        <app-button variant="ghost" size="sm" (click)="ask('pause', campaign)" [disabled]="busyId() !== null">
                          <lucide-icon [img]="Pause" [size]="14" strokeWidth="2" /> Pausar
                        </app-button>
                      } @else {
                        <app-button variant="ghost" size="sm" (click)="resume(campaign)" [disabled]="busyId() !== null">
                          <lucide-icon [img]="Play" [size]="14" strokeWidth="2" /> Reanudar
                        </app-button>
                      }
                      <app-button variant="ghost" size="sm" (click)="ask('delete', campaign)" [disabled]="busyId() !== null">
                        <lucide-icon [img]="Trash2" [size]="14" strokeWidth="2" /> Eliminar
                      </app-button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span data-testid="range">{{ view().start + 1 }}–{{ view().end }} de {{ view().total }}</span>
          <div class="flex items-center gap-1">
            <app-button variant="ghost" size="sm" (click)="page.set(view().page - 1)" [disabled]="view().page <= 1">
              <lucide-icon [img]="ChevronLeft" [size]="14" strokeWidth="2" /> Anterior
            </app-button>
            <span>Página {{ view().page }} de {{ view().pageCount }}</span>
            <app-button variant="ghost" size="sm" (click)="page.set(view().page + 1)" [disabled]="view().page >= view().pageCount">
              Siguiente <lucide-icon [img]="ChevronRight" [size]="14" strokeWidth="2" />
            </app-button>
          </div>
        </div>
      }
    </app-card>
  `,
})
export class CampaignsPageComponent implements OnInit {
  protected readonly service = inject(CampaignsService);
  private readonly notifications = inject(NotificationService);

  readonly Plus = Plus;
  readonly RefreshCw = RefreshCw;
  readonly Eye = Eye;
  readonly Pencil = Pencil;
  readonly Pause = Pause;
  readonly Play = Play;
  readonly Trash2 = Trash2;
  readonly Megaphone = Megaphone;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  readonly newUrl = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.CAMPAIGNS, ROUTE_PATHS.NEW);
  readonly all = this.service.campaigns;
  readonly loadError = signal<LoadFailure | null>(null);

  readonly search = signal('');
  readonly status = signal('');
  readonly channel = signal('');
  readonly page = signal(1);

  readonly pending = signal<{ kind: PendingKind; campaign: Campaign } | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly progress = signal<Record<string, CampaignProgress>>({});

  readonly statuses = computed(() => [...new Set(this.all().map((c) => c.status))].sort((a, b) => a.localeCompare(b)));
  readonly channels = computed(() => [...new Set(this.all().map((c) => c.channelType))].sort((a, b) => a.localeCompare(b)));

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.status();
    const channel = this.channel();
    return this.all().filter(
      (c) =>
        (term === '' || c.name.toLowerCase().includes(term)) &&
        (status === '' || (status === '__paused' ? !isEnabled(c) : c.status === status)) &&
        (channel === '' || c.channelType === channel),
    );
  });
  readonly view = computed(() => paginate(this.filtered(), this.page(), PAGE_SIZE));

  constructor() {
    // the progress of the rows in view, asked once each; a failure leaves the bar out instead of inventing a figure
    effect(() => {
      const ids = this.view().items.map((c) => c.id);
      untracked(() => void this.loadProgress(ids));
    });
  }

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loadError.set(null);
    this.progress.set({});
    try {
      await this.service.load();
    } catch (error) {
      this.loadError.set(loadFailure(error));
    }
  }

  readonly enabled = isEnabled;
  readonly tone = statusTone;
  readonly created = (campaign: Campaign) => toDate(campaign.createdAt);
  readonly done = (p: CampaignProgress) => percent(p.delivered + p.failed, p.totalRecipients);
  readonly detailUrl = (id: string) => `${base}/${id}`;
  readonly editUrl = (id: string) => `${base}/${id}/${ROUTE_PATHS.EDIT}`;

  ask(kind: PendingKind, campaign: Campaign): void {
    this.pending.set({ kind, campaign });
  }

  cancelPending(): void {
    this.pending.set(null);
  }

  confirmText(kind: PendingKind, campaign: Campaign): string {
    return kind === 'delete'
      ? `¿Eliminar la campaña «${campaign.name}»? No se puede deshacer.`
      : `¿Pausar la campaña «${campaign.name}»? No se enviarán más mensajes hasta reanudarla; lo ya enviado no se detiene.`;
  }

  async confirm(): Promise<void> {
    const action = this.pending();
    if (!action) return;
    if (action.kind === 'delete') await this.run(action.campaign, 'eliminar', () => this.service.remove(action.campaign.id), 'Campaña eliminada');
    else await this.run(action.campaign, 'pausar', () => this.service.setEnabled(action.campaign.id, false), 'Campaña pausada');
    this.pending.set(null);
  }

  resume(campaign: Campaign): Promise<void> {
    return this.run(campaign, 'reanudar', () => this.service.setEnabled(campaign.id, true), 'Campaña reanudada');
  }

  private async run(campaign: Campaign, action: 'eliminar' | 'pausar' | 'reanudar', work: () => Promise<void>, done: string): Promise<void> {
    this.busyId.set(campaign.id);
    try {
      await work();
      this.notifications.success(done, campaign.name);
    } catch (error) {
      this.notifications.error('No se pudo completar', actionErrorMessage(error, action));
    } finally {
      this.busyId.set(null);
    }
  }

  private async loadProgress(ids: string[]): Promise<void> {
    const known = this.progress();
    const missing = ids.filter((id) => !(id in known));
    const results = await Promise.all(missing.map((id) => this.service.progress(id).then((p) => [id, p] as const, () => null)));
    const found = results.filter((r): r is readonly [string, CampaignProgress] => r !== null);
    if (found.length > 0) this.progress.update((current) => ({ ...current, ...Object.fromEntries(found) }));
  }
}
