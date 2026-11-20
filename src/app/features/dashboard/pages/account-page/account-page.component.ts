import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FederationService } from '../../../../core/services';
import { federationMessage } from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { AppButtonComponent, AppCardComponent } from '../../../../shared/components';

/**
 * Mi cuenta: las cuentas externas (Google, Microsoft, Apple, GitHub, Meta) enlazadas al usuario. Se puede enlazar otro
 * proveedor y quitar un enlace; la contraseña sigue funcionando siempre, así que quitar un enlace nunca deja a nadie fuera.
 */
@Component({
  selector: 'app-account-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AppCardComponent, AppButtonComponent],
  template: `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-foreground">Mi cuenta</h2>
      <p class="text-sm text-muted-foreground mt-1">Cuentas externas con las que puedes entrar a Iris</p>
    </div>

    <div class="max-w-2xl space-y-4">
      @if (notice(); as text) {
        <div role="status" class="rounded-lg border border-border bg-muted px-3 py-2 text-sm" data-testid="notice">{{ text }}</div>
      }
      @if (problem(); as text) {
        <div role="alert" class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="problem">{{ text }}</div>
      }

      <app-card title="Cuentas enlazadas" subtitle="Tu contraseña sigue funcionando aunque quites un enlace">
        @if (federation.identities().length === 0) {
          <p class="text-sm text-muted-foreground" data-testid="empty">No tienes cuentas enlazadas.</p>
        } @else {
          <ul class="divide-y divide-border">
            @for (identity of federation.identities(); track identity.id) {
              <li class="flex items-center justify-between gap-3 py-3" [attr.data-identity]="identity.id">
                <div class="min-w-0">
                  <p class="text-sm font-medium capitalize">{{ identity.provider }}</p>
                  <p class="text-xs text-muted-foreground truncate">
                    {{ identity.email || identity.displayName || 'Sin datos del proveedor' }}
                    @if (identity.lastLoginAt) {
                      · último acceso {{ identity.lastLoginAt | date: 'short' }}
                    }
                  </p>
                </div>
                @if (confirming() === identity.id) {
                  <div class="flex gap-2">
                    <app-button variant="danger" size="sm" (click)="unlink(identity.id)">Confirmar</app-button>
                    <app-button variant="secondary" size="sm" (click)="confirming.set(null)">Cancelar</app-button>
                  </div>
                } @else {
                  <app-button variant="secondary" size="sm" (click)="confirming.set(identity.id)">Quitar</app-button>
                }
              </li>
            }
          </ul>
        }
      </app-card>

      @if (linkable().length > 0) {
        <app-card title="Enlazar otra cuenta" subtitle="Irás al proveedor y volverás aquí">
          <div class="flex flex-wrap gap-2">
            @for (provider of linkable(); track provider.provider) {
              <app-button variant="secondary" [attr.data-link]="provider.provider" (click)="link(provider.provider)">
                Enlazar {{ provider.displayName }}
              </app-button>
            }
          </div>
        </app-card>
      }
    </div>
  `,
})
export class AccountPageComponent implements OnInit {
  protected readonly federation = inject(FederationService);

  /** `?linked=<proveedor>` lo deja el BFF tras enlazar. */
  readonly linked = input<string>();
  /** `?linkError=<código>` lo deja el BFF cuando el enlace falló. */
  readonly linkError = input<string>();

  protected readonly confirming = signal<string | null>(null);
  private readonly failure = signal<string | null>(null);

  protected readonly notice = computed(() => (this.linked() ? `Se enlazó ${this.linked()}.` : null));
  protected readonly problem = computed(() => this.failure() ?? federationMessage(this.linkError()));

  /** Proveedores ofrecidos que aún no están enlazados. */
  protected readonly linkable = computed(() => {
    const taken = new Set(this.federation.identities().map((identity) => identity.provider));
    return this.federation.providers().filter((provider) => !taken.has(provider.provider));
  });

  async ngOnInit(): Promise<void> {
    void this.federation.loadProviders();
    try {
      await this.federation.loadIdentities();
    } catch {
      this.failure.set('No pudimos cargar tus cuentas enlazadas. Inténtalo de nuevo.');
    }
  }

  async link(provider: string): Promise<void> {
    this.failure.set(null);
    try {
      await this.federation.link(provider, routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.ACCOUNT));
    } catch {
      this.failure.set(federationMessage('unavailable'));
    }
  }

  async unlink(identityId: string): Promise<void> {
    this.failure.set(null);
    this.confirming.set(null);
    try {
      await this.federation.unlink(identityId);
    } catch {
      this.failure.set('No pudimos quitar el enlace. Inténtalo de nuevo.');
    }
  }
}
