import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppWindow, ChevronRight, LucideAngularModule, RefreshCw } from 'lucide-angular';
import { AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { ApplicationSummary } from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { TemplatesService } from '../../services';
import { loadFailure, LoadFailure } from '../../utils/campaign-errors';

const base = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.TEMPLATES);

/**
 * Primer paso para gestionar plantillas: elegir la aplicación. Cada aplicación tiene sus propias plantillas (su carpeta en
 * Mercury); desde aquí se llega a su lista y de ahí al editor.
 */
@Component({
  selector: 'app-template-applications-page',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Plantillas</h2>
        <p class="text-sm text-muted-foreground mt-1">Elige la aplicación cuyas plantillas quieres gestionar.</p>
      </div>
      <app-button variant="secondary" (click)="reload()" [disabled]="loading()">
        <lucide-icon [img]="RefreshCw" [size]="16" strokeWidth="2" /> Actualizar
      </app-button>
    </div>

    @if (loading() && applications().length === 0) {
      <p class="text-sm text-muted-foreground" data-testid="loading">Cargando aplicaciones…</p>
    } @else if (loadError(); as why) {
      <div role="alert" data-testid="load-failed">
        <p class="font-medium text-foreground">{{ why === 'forbidden' ? 'No tienes permiso para ver las aplicaciones.' : 'No se pudieron cargar las aplicaciones.' }}</p>
        <app-button variant="secondary" size="sm" class="mt-3" (click)="reload()"><lucide-icon [img]="RefreshCw" [size]="14" strokeWidth="2" /> Reintentar</app-button>
      </div>
    } @else if (applications().length === 0) {
      <p class="text-sm text-muted-foreground" data-testid="empty">No hay aplicaciones registradas.</p>
    } @else {
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="applications">
        @for (application of applications(); track application.id) {
          <li>
            <a [routerLink]="url(application)" class="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="application">
              <app-card>
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3">
                    <lucide-icon [img]="AppWindow" [size]="20" strokeWidth="1.75" class="mt-0.5 text-muted-foreground" />
                    <div>
                      <p class="font-semibold text-foreground">{{ application.name }}</p>
                      @if (application.codeName) { <p class="text-xs text-muted-foreground"><code>{{ application.codeName }}</code></p> }
                      @if (application.description) { <p class="mt-1 text-sm text-muted-foreground">{{ application.description }}</p> }
                    </div>
                  </div>
                  <lucide-icon [img]="ChevronRight" [size]="16" strokeWidth="2" class="mt-1 text-muted-foreground" />
                </div>
              </app-card>
            </a>
          </li>
        }
      </ul>
    }
  `,
})
export class TemplateApplicationsPageComponent implements OnInit {
  private readonly templates = inject(TemplatesService);

  readonly RefreshCw = RefreshCw;
  readonly AppWindow = AppWindow;
  readonly ChevronRight = ChevronRight;

  private readonly all = signal<ApplicationSummary[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<LoadFailure | null>(null);
  /** Las activas, por nombre. */
  readonly applications = computed(() =>
    this.all()
      .filter((application) => application.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  ngOnInit(): void {
    void this.reload();
  }

  readonly url = (application: ApplicationSummary) => `${base}/${application.id}`;

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.all.set(await this.templates.applications());
    } catch (error) {
      this.loadError.set(loadFailure(error));
    } finally {
      this.loading.set(false);
    }
  }
}
