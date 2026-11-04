import { ChangeDetectionStrategy, Component, DestroyRef, NgZone, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowLeft, LucideAngularModule, Pause, Pencil, Play, RefreshCw, Trash2 } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { NotificationService } from '../../../../core/services';
import { Campaign, CampaignProgress } from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { CampaignsService } from '../../services';
import { actionErrorMessage, loadFailure, LoadFailure } from '../../utils/campaign-errors';
import { isEnabled, percent, statusTone, toDate } from '../../utils/campaign-input';

const listUrl = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.CAMPAIGNS);
const REFRESH_MS = 15_000;

/** Detalle de una campaña con su avance de envío, que se refresca solo mientras la pestaña está visible. */
@Component({
  selector: 'app-campaign-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="listUrl" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <lucide-icon [img]="ArrowLeft" [size]="14" strokeWidth="2" /> Campañas
    </a>

    @if (failure(); as why) {
      <p role="alert" class="text-sm text-foreground" data-testid="load-failed">
        {{ why === 'forbidden' ? 'No tienes permiso para ver esta campaña.' : why === 'unavailable' ? 'La gestión de campañas no está configurada.' : 'No se pudo cargar la campaña.' }}
      </p>
    } @else if (campaign(); as c) {
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-foreground">{{ c.name }}</h2>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <app-badge [color]="enabled() ? tone(c.status) : 'neutral'">{{ enabled() ? c.status : 'PAUSADA' }}</app-badge>
            <span>Canal: {{ c.channelType }}</span>
            <span>· {{ c.totalRecipients ?? 0 }} destinatarios</span>
            @if (scheduled(); as when) { <span>· Programada: {{ when | date: 'medium' }}</span> }
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <app-button variant="secondary" size="sm" (click)="refresh()"><lucide-icon [img]="RefreshCw" [size]="14" strokeWidth="2" /> Actualizar</app-button>
          <a [routerLink]="editUrl()" class="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/80">
            <lucide-icon [img]="Pencil" [size]="14" strokeWidth="2" /> Editar
          </a>
          @if (enabled()) {
            <app-button variant="secondary" size="sm" (click)="toggle(false)" [disabled]="busy()"><lucide-icon [img]="Pause" [size]="14" strokeWidth="2" /> Pausar</app-button>
          } @else {
            <app-button variant="secondary" size="sm" (click)="toggle(true)" [disabled]="busy()"><lucide-icon [img]="Play" [size]="14" strokeWidth="2" /> Reanudar</app-button>
          }
          <app-button variant="danger" size="sm" (click)="confirmDelete.set(true)" [disabled]="busy()"><lucide-icon [img]="Trash2" [size]="14" strokeWidth="2" /> Eliminar</app-button>
        </div>
      </div>

      @if (confirmDelete()) {
        <div role="alertdialog" aria-live="assertive" class="mt-4 rounded-xl border border-border bg-card p-5" data-testid="confirm-panel">
          <p class="text-sm text-foreground">¿Eliminar la campaña «{{ c.name }}»? No se puede deshacer.</p>
          <div class="mt-3 flex gap-2">
            <app-button variant="danger" size="sm" (click)="remove()" [disabled]="busy()">Eliminar</app-button>
            <app-button variant="ghost" size="sm" (click)="confirmDelete.set(false)" [disabled]="busy()">Cancelar</app-button>
          </div>
        </div>
      }

      <app-card title="Avance de envío" [subtitle]="updatedLabel()" class="block mt-6">
        @if (progress(); as p) {
          <div class="h-3 rounded-full bg-muted overflow-hidden" role="progressbar" [attr.aria-valuenow]="done()" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full bg-success" [style.width.%]="done()"></div>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">{{ done() }} % completado</p>
          <dl class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5" data-testid="progress">
            @for (item of figures(p); track item.label) {
              <div>
                <dt class="text-xs text-muted-foreground">{{ item.label }}</dt>
                <dd class="text-xl font-semibold text-foreground">{{ item.value }}</dd>
              </div>
            }
          </dl>
        } @else {
          <p class="text-sm text-muted-foreground" data-testid="no-progress">Aún no hay datos de avance para esta campaña.</p>
        }
      </app-card>
    } @else {
      <p class="text-sm text-muted-foreground" data-testid="loading">Cargando campaña…</p>
    }
  `,
})
export class CampaignDetailPageComponent implements OnInit {
  private readonly service = inject(CampaignsService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  readonly ArrowLeft = ArrowLeft;
  readonly Pencil = Pencil;
  readonly Pause = Pause;
  readonly Play = Play;
  readonly Trash2 = Trash2;
  readonly RefreshCw = RefreshCw;
  readonly listUrl = listUrl;
  readonly tone = statusTone;
  readonly editUrl = () => `${listUrl}/${this.id}/${ROUTE_PATHS.EDIT}`;

  readonly campaign = signal<Campaign | null>(null);
  readonly progress = signal<CampaignProgress | null>(null);
  readonly failure = signal<LoadFailure | null>(null);
  readonly busy = signal(false);
  readonly confirmDelete = signal(false);

  readonly enabled = computed(() => {
    const campaign = this.campaign();
    return campaign === null || isEnabled(campaign);
  });
  readonly scheduled = computed(() => toDate(this.campaign()?.scheduledAt));
  readonly done = computed(() => {
    const p = this.progress();
    return p ? percent(p.delivered + p.failed, p.totalRecipients) : 0;
  });
  readonly updatedLabel = computed(() => {
    const at = toDate(this.progress()?.lastUpdated);
    return at ? `Actualizado ${at.toLocaleString('es-MX')}` : '';
  });

  figures(p: CampaignProgress): { label: string; value: number }[] {
    return [
      { label: 'Destinatarios', value: p.totalRecipients },
      { label: 'Enviados', value: p.totalSent },
      { label: 'Entregados', value: p.delivered },
      { label: 'Fallidos', value: p.failed },
      { label: 'Pendientes', value: p.pending },
    ];
  }

  async ngOnInit(): Promise<void> {
    try {
      this.campaign.set(await this.service.get(this.id));
    } catch (error) {
      this.failure.set(loadFailure(error));
      return;
    }
    await this.loadProgress();
    // live figures while the tab is in view, like the dashboard
    // outside Angular's zone so the timer never keeps the application from being stable; the update comes back in
    const timer = this.zone.runOutsideAngular(() =>
      setInterval(() => {
        if (typeof document === 'undefined' || document.visibilityState === 'visible') this.zone.run(() => void this.loadProgress());
      }, REFRESH_MS),
    );
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  async refresh(): Promise<void> {
    try {
      this.campaign.set(await this.service.get(this.id));
    } catch {
      this.notifications.error('No se pudo actualizar', 'Inténtalo de nuevo.');
    }
    await this.loadProgress();
  }

  async toggle(enabled: boolean): Promise<void> {
    await this.act(enabled ? 'reanudar' : 'pausar', async () => {
      await this.service.setEnabled(this.id, enabled);
      this.campaign.update((c) => (c ? { ...c, enabled } : c));
    }, enabled ? 'Campaña reanudada' : 'Campaña pausada');
  }

  async remove(): Promise<void> {
    await this.act('eliminar', async () => {
      await this.service.remove(this.id);
      await this.router.navigateByUrl(listUrl);
    }, 'Campaña eliminada');
  }

  private async act(action: 'eliminar' | 'pausar' | 'reanudar', work: () => Promise<void>, done: string): Promise<void> {
    this.busy.set(true);
    try {
      await work();
      this.notifications.success(done, this.campaign()?.name ?? '');
    } catch (error) {
      this.notifications.error('No se pudo completar', actionErrorMessage(error, action));
    } finally {
      this.busy.set(false);
      this.confirmDelete.set(false);
    }
  }

  private async loadProgress(): Promise<void> {
    try {
      this.progress.set(await this.service.progress(this.id));
    } catch {
      // without progress the card says so instead of showing invented figures
    }
  }
}
