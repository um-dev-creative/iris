import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Check, Copy, KeyRound, LucideAngularModule, Plus, Power, RefreshCw, ShieldCheck, Trash2 } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { NotificationService } from '../../../../core/services';
import {
  LOGIN_CLIENT_ALIAS_PATTERN,
  LOGIN_CLIENT_DESCRIPTION_MAX,
  LOGIN_CLIENT_PASSWORD_PATTERN,
  LoginClient,
  LoginClientSecret,
} from '../../../../core/models';
import { LoginClientsService } from '../../services';

type PendingKind = 'rotate' | 'delete' | 'toggle';
type LoadError = 'forbidden' | 'failed';

interface RevealedSecret {
  alias: string;
  password: string;
  kind: 'created' | 'rotated';
}

/**
 * Administración de los servicios backend que pueden iniciar sesión en Mercury. Crear o rotar sin contraseña hace que Mercury
 * genere una: se muestra **una sola vez** y se borra de memoria al cerrarla o al salir de la página.
 */
@Component({
  selector: 'app-login-clients-page',
  standalone: true,
  imports: [FormsModule, DatePipe, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Clientes de login</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Servicios backend autorizados a pedir un token de Mercury (smartkin-backend, zerobound-rest…). El alias es el nombre del servicio, no
          el de una persona.
        </p>
      </div>
      <app-button (click)="openForm()" [disabled]="formOpen()">
        <lucide-icon [img]="Plus" [size]="16" strokeWidth="2" />
        Nuevo cliente
      </app-button>
    </div>

    @if (secret(); as revealed) {
      <div role="status" aria-live="polite" class="mb-6 rounded-xl border border-warning bg-warning/10 p-5" data-testid="secret-panel">
        <div class="flex items-center gap-2 font-semibold text-foreground">
          <lucide-icon [img]="ShieldCheck" [size]="18" strokeWidth="2" />
          {{ revealed.kind === 'created' ? 'Cliente creado' : 'Contraseña rotada' }}: {{ revealed.alias }}
        </div>
        <p class="text-sm text-muted-foreground mt-1">
          Esta contraseña se muestra <strong>solo ahora</strong>: Mercury guarda únicamente su hash. Cópiala y configúrala en el servicio
          (por ejemplo <code>MERCURY_LOGIN_PASSWORD</code> en el Vault de smartkin-backend).
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <code class="rounded-lg border border-border bg-background px-3 py-2 text-sm break-all select-all" data-testid="secret-value">{{ revealed.password }}</code>
          <app-button variant="secondary" size="sm" (click)="copySecret()">
            <lucide-icon [img]="copied() ? Check : Copy" [size]="14" strokeWidth="2" />
            {{ copied() ? 'Copiada' : 'Copiar' }}
          </app-button>
          <app-button variant="ghost" size="sm" (click)="dismissSecret()">Ya la guardé</app-button>
        </div>
      </div>
    }

    @if (formOpen()) {
      <app-card title="Nuevo cliente de login" subtitle="Sin contraseña, Mercury genera una segura y te la muestra una vez" class="block mb-6">
        <form class="space-y-4" (ngSubmit)="submitForm()" novalidate>
          <div>
            <label for="lc-alias" class="block text-sm font-medium text-foreground mb-1.5">Alias del servicio</label>
            <input id="lc-alias" name="alias" type="text" autocomplete="off" [ngModel]="alias()" (ngModelChange)="alias.set($event)"
              placeholder="smartkin-backend" class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
            <p class="text-xs text-muted-foreground mt-1">Letras, números, punto, guion y guion bajo (máx. 100).</p>
          </div>
          <div>
            <label for="lc-description" class="block text-sm font-medium text-foreground mb-1.5">Descripción (opcional)</label>
            <input id="lc-description" name="description" type="text" autocomplete="off" [ngModel]="description()" (ngModelChange)="description.set($event)"
              placeholder="SmartKin REST" class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label for="lc-password" class="block text-sm font-medium text-foreground mb-1.5">Contraseña (opcional)</label>
            <input id="lc-password" name="password" type="password" autocomplete="new-password" [ngModel]="password()" (ngModelChange)="password.set($event)"
              placeholder="Vacía = generar automáticamente" class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
            <p class="text-xs text-muted-foreground mt-1">De 12 a 72 caracteres ASCII imprimibles, sin espacios.</p>
          </div>
          @if (formError(); as message) {
            <p role="alert" class="text-sm text-destructive" data-testid="form-error">{{ message }}</p>
          }
          <div class="flex gap-2">
            <app-button type="submit" [disabled]="saving()">{{ saving() ? 'Creando…' : 'Crear cliente' }}</app-button>
            <app-button variant="ghost" (click)="closeForm()" [disabled]="saving()">Cancelar</app-button>
          </div>
        </form>
      </app-card>
    }

    @if (pending(); as action) {
      <div role="alertdialog" aria-live="assertive" class="mb-6 rounded-xl border border-border bg-card p-5" data-testid="confirm-panel">
        <p class="text-sm text-foreground">{{ confirmText(action.kind, action.client) }}</p>
        <div class="mt-3 flex gap-2">
          <app-button [variant]="action.kind === 'delete' ? 'danger' : 'primary'" size="sm" (click)="confirm()" [disabled]="busyId() !== null">
            {{ confirmLabel(action.kind) }}
          </app-button>
          <app-button variant="ghost" size="sm" (click)="cancelPending()" [disabled]="busyId() !== null">Cancelar</app-button>
        </div>
      </div>
    }

    <app-card [noPadding]="true">
      @if (service.loading() && clients().length === 0) {
        <p class="p-6 text-sm text-muted-foreground" data-testid="loading">Cargando clientes…</p>
      } @else if (loadError() === 'forbidden') {
        <div class="p-6" role="alert" data-testid="forbidden">
          <p class="font-medium text-foreground">No tienes permiso para administrar los clientes de login.</p>
          <p class="text-sm text-muted-foreground mt-1">Pide a quien administra Backbone el permiso <code>LOGIN_CLIENT_MANAGE</code> en la aplicación de Iris.</p>
        </div>
      } @else if (loadError() === 'failed') {
        <div class="p-6" role="alert" data-testid="load-failed">
          <p class="font-medium text-foreground">No se pudo cargar la lista.</p>
          <app-button variant="secondary" size="sm" class="mt-3" (click)="reload()">
            <lucide-icon [img]="RefreshCw" [size]="14" strokeWidth="2" /> Reintentar
          </app-button>
        </div>
      } @else if (clients().length === 0) {
        <div class="p-10 text-center text-muted-foreground" data-testid="empty">
          <lucide-icon [img]="KeyRound" [size]="28" strokeWidth="1.5" class="mx-auto mb-2 opacity-60" />
          Aún no hay clientes en la base de datos. Los que estén en la configuración de Mercury (<code>login-clients</code>) siguen funcionando.
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-muted border-b border-border">
              <tr>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Alias</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Descripción</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Estado</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Actualizado</th>
                <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @for (client of clients(); track client.id) {
                <tr class="hover:bg-muted/50 transition-colors" data-testid="client-row">
                  <td class="px-4 py-3 font-medium text-foreground">{{ client.alias }}</td>
                  <td class="px-4 py-3 text-muted-foreground">{{ client.description || '—' }}</td>
                  <td class="px-4 py-3"><app-badge [color]="client.active ? 'success' : 'neutral'">{{ client.active ? 'Activo' : 'Inactivo' }}</app-badge></td>
                  <td class="px-4 py-3 text-muted-foreground">{{ client.updatedAt ? (client.updatedAt | date: 'short') : '—' }}</td>
                  <td class="px-4 py-3">
                    <div class="flex justify-end gap-1">
                      <app-button variant="ghost" size="sm" (click)="ask('rotate', client)" [disabled]="busyId() !== null">
                        <lucide-icon [img]="RefreshCw" [size]="14" strokeWidth="2" /> Rotar contraseña
                      </app-button>
                      <app-button variant="ghost" size="sm" (click)="ask('toggle', client)" [disabled]="busyId() !== null">
                        <lucide-icon [img]="Power" [size]="14" strokeWidth="2" /> {{ client.active ? 'Desactivar' : 'Activar' }}
                      </app-button>
                      <app-button variant="ghost" size="sm" (click)="ask('delete', client)" [disabled]="busyId() !== null">
                        <lucide-icon [img]="Trash2" [size]="14" strokeWidth="2" /> Eliminar
                      </app-button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </app-card>
  `,
})
export class LoginClientsPageComponent implements OnInit, OnDestroy {
  protected readonly service = inject(LoginClientsService);
  private readonly notifications = inject(NotificationService);

  readonly Plus = Plus;
  readonly KeyRound = KeyRound;
  readonly RefreshCw = RefreshCw;
  readonly Power = Power;
  readonly Trash2 = Trash2;
  readonly Copy = Copy;
  readonly Check = Check;
  readonly ShieldCheck = ShieldCheck;

  readonly clients = this.service.clients;
  readonly loadError = signal<LoadError | null>(null);

  readonly formOpen = signal(false);
  readonly alias = signal('');
  readonly description = signal('');
  readonly password = signal('');
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly secret = signal<RevealedSecret | null>(null);
  readonly copied = signal(false);

  readonly pending = signal<{ kind: PendingKind; client: LoginClient } | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly hasClients = computed(() => this.clients().length > 0);

  ngOnInit(): void {
    void this.reload();
  }

  /** La contraseña revelada no sobrevive a la página. */
  ngOnDestroy(): void {
    this.secret.set(null);
  }

  async reload(): Promise<void> {
    this.loadError.set(null);
    try {
      await this.service.load();
    } catch (error) {
      this.loadError.set(isStatus(error, 403) ? 'forbidden' : 'failed');
    }
  }

  openForm(): void {
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.alias.set('');
    this.description.set('');
    this.password.set('');
    this.formError.set(null);
  }

  async submitForm(): Promise<void> {
    const alias = this.alias().trim();
    const description = this.description().trim();
    const password = this.password();
    const invalid = validate(alias, description, password);
    if (invalid) {
      this.formError.set(invalid);
      return;
    }
    this.formError.set(null);
    this.saving.set(true);
    try {
      const created = await this.service.create({
        alias,
        ...(description ? { description } : {}),
        ...(password ? { password } : {}),
      });
      this.closeForm();
      this.reveal(created, 'created');
      this.notifications.success('Cliente creado', `Se registró «${alias}».`);
    } catch (error) {
      this.formError.set(createErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  ask(kind: PendingKind, client: LoginClient): void {
    this.pending.set({ kind, client });
  }

  cancelPending(): void {
    this.pending.set(null);
  }

  confirmLabel(kind: PendingKind): string {
    return { rotate: 'Rotar contraseña', delete: 'Eliminar', toggle: 'Confirmar' }[kind];
  }

  confirmText(kind: PendingKind, client: LoginClient): string {
    switch (kind) {
      case 'rotate':
        return `¿Rotar la contraseña de «${client.alias}»? Mercury genera una nueva, deja de valer la anterior y el servicio debe recibir la nueva.`;
      case 'delete':
        return `¿Eliminar «${client.alias}»? Si su alias sigue en la configuración estática de Mercury podrá iniciar sesión por ahí; para apagarlo de verdad usa «Desactivar».`;
      default:
        return client.active
          ? `¿Desactivar «${client.alias}»? Dejará de poder iniciar sesión en Mercury.`
          : `¿Activar «${client.alias}»? Volverá a poder iniciar sesión en Mercury con su contraseña actual.`;
    }
  }

  async confirm(): Promise<void> {
    const action = this.pending();
    if (!action) return;
    this.busyId.set(action.client.id);
    try {
      await this.run(action.kind, action.client);
      this.pending.set(null);
    } catch (error) {
      this.notifications.error('No se pudo completar la acción', failureMessage(error));
    } finally {
      this.busyId.set(null);
    }
  }

  async copySecret(): Promise<void> {
    const revealed = this.secret();
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.password);
      this.copied.set(true);
    } catch {
      this.notifications.warning('No se pudo copiar', 'Selecciona la contraseña y cópiala a mano.');
    }
  }

  dismissSecret(): void {
    this.secret.set(null);
    this.copied.set(false);
  }

  private async run(kind: PendingKind, client: LoginClient): Promise<void> {
    if (kind === 'rotate') {
      this.reveal(await this.service.rotatePassword(client.id), 'rotated');
      this.notifications.success('Contraseña rotada', `«${client.alias}» tiene una contraseña nueva.`);
    } else if (kind === 'delete') {
      await this.service.remove(client.id);
      this.notifications.success('Cliente eliminado', `Se eliminó «${client.alias}».`);
    } else {
      const updated = await this.service.update(client.id, { active: !client.active });
      this.notifications.success(updated.active ? 'Cliente activado' : 'Cliente desactivado', `«${client.alias}».`);
    }
  }

  private reveal(result: LoginClientSecret, kind: RevealedSecret['kind']): void {
    this.copied.set(false);
    this.secret.set(result.password ? { alias: result.client.alias, password: result.password, kind } : null);
  }
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}

function validate(alias: string, description: string, password: string): string | null {
  if (!alias) return 'Escribe el alias del servicio.';
  if (!LOGIN_CLIENT_ALIAS_PATTERN.test(alias)) return 'El alias solo admite letras, números, punto, guion y guion bajo (máx. 100).';
  if (description.length > LOGIN_CLIENT_DESCRIPTION_MAX) return `La descripción admite hasta ${LOGIN_CLIENT_DESCRIPTION_MAX} caracteres.`;
  if (password && !LOGIN_CLIENT_PASSWORD_PATTERN.test(password)) {
    return 'La contraseña debe tener de 12 a 72 caracteres ASCII imprimibles, sin espacios (o déjala vacía para generarla).';
  }
  return null;
}

function createErrorMessage(error: unknown): string {
  if (isStatus(error, 409)) return 'Ya existe un cliente con ese alias.';
  if (isStatus(error, 403)) return 'No tienes permiso para administrar los clientes de login.';
  if (isStatus(error, 400)) return 'Mercury rechazó los datos: revisa el alias y la contraseña.';
  return 'No se pudo crear el cliente. Intenta de nuevo.';
}

function failureMessage(error: unknown): string {
  if (isStatus(error, 403)) return 'No tienes permiso para administrar los clientes de login.';
  if (isStatus(error, 404)) return 'El cliente ya no existe; se actualizará la lista.';
  return 'Intenta de nuevo en un momento.';
}
