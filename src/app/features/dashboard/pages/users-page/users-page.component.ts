import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { LucideAngularModule, Plus, RefreshCw, Trash2, Users } from 'lucide-angular';
import { AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { AdminApplication, AdminRole, AdminUser, UserAccess } from '../../../../core/models';
import { UserAccessService } from '../../services';
import { loadFailure, LoadFailure } from '../../utils/campaign-errors';

const input = 'w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring';

/** Por qué falló una acción de administración, en palabras de la persona. */
export function adminFailure(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  switch (status) {
    case 400:
    case 422:
      return 'Backbone rechazó los datos. Revisa el rol (debe ser de esa aplicación) y que la contraseña cumpla la política.';
    case 403:
      return 'No tienes permiso para administrar usuarios, o el rol da más permisos de los que tú tienes.';
    case 404:
      return 'No se encontró el usuario, la aplicación o el rol. Actualiza la lista.';
    case 409:
      return 'Ya existe ese usuario o correo, o es la aplicación principal del usuario y no se puede quitar.';
    default:
      return 'No se pudo completar la acción. Inténtalo de nuevo.';
  }
}

/**
 * Quién puede usar qué aplicación. Se elige la aplicación, se ven sus usuarios y, de cada uno, a qué aplicaciones entra y con qué
 * rol; desde aquí se da o se quita ese acceso y se crean usuarios. Un administrador de plantillas de una o varias aplicaciones es
 * una persona con un rol que tiene `TEMPLATE_MANAGE` en cada una; un administrador de la plataforma, la que tiene `PLATFORM_ADMIN` en Iris.
 */
@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, AppCardComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Usuarios y accesos</h2>
        <p class="text-sm text-muted-foreground mt-1">Elige una aplicación para ver sus usuarios, darles acceso a otras aplicaciones o crear usuarios nuevos.</p>
      </div>
      <app-button variant="secondary" (click)="reload()" [disabled]="loading()">
        <lucide-icon [img]="RefreshCw" [size]="16" strokeWidth="2" /> Actualizar
      </app-button>
    </div>

    @if (loadError(); as why) {
      <div role="alert" data-testid="load-failed" class="mb-6">
        <p class="font-medium text-foreground">{{ why === 'forbidden' ? 'No tienes permiso para administrar usuarios.' : 'No se pudieron cargar los datos.' }}</p>
        <app-button variant="secondary" size="sm" class="mt-3" (click)="reload()">Reintentar</app-button>
      </div>
    } @else {
      <div class="mb-6 max-w-md">
        <label for="u-app" class="block text-sm font-medium text-foreground mb-1.5">Aplicación</label>
        <select id="u-app" data-testid="application" [ngModel]="applicationId()" (ngModelChange)="selectApplication($event)" class="${input}">
          <option value="">Elige una aplicación…</option>
          @for (application of applications(); track application.id) {
            <option [value]="application.id">{{ application.name }}</option>
          }
        </select>
      </div>

      @if (message(); as text) {
        <p role="alert" class="mb-4 text-sm text-destructive" data-testid="message">{{ text }}</p>
      }

      @if (applicationId()) {
        <div class="mb-3 flex justify-end">
          <app-button (click)="toggleForm()" data-testid="new-user"><lucide-icon [img]="Plus" [size]="16" strokeWidth="2" /> Nuevo usuario</app-button>
        </div>

        @if (formOpen()) {
          <app-card title="Nuevo usuario" subtitle="Se crea en la aplicación elegida, con el rol que indiques" class="block mb-6">
            <form class="grid gap-3 sm:grid-cols-2" (ngSubmit)="create()" novalidate data-testid="user-form">
              @for (field of fields; track field.key) {
                <div>
                  <label [for]="'nu-' + field.key" class="block text-sm font-medium text-foreground mb-1">{{ field.label }}</label>
                  <input [id]="'nu-' + field.key" [name]="field.key" [type]="field.type" autocomplete="off" [ngModel]="draft()[field.key]"
                    (ngModelChange)="setDraft(field.key, $event)" class="${input}" />
                </div>
              }
              <div>
                <label for="nu-gender" class="block text-sm font-medium text-foreground mb-1">Género</label>
                <select id="nu-gender" name="gender" [ngModel]="draft()['gender']" (ngModelChange)="setDraft('gender', $event)" class="${input}">
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <label for="nu-role" class="block text-sm font-medium text-foreground mb-1">Rol en esta aplicación</label>
                <select id="nu-role" name="roleId" data-testid="new-role" [ngModel]="draft()['roleId']" (ngModelChange)="setDraft('roleId', $event)" class="${input}">
                  <option value="">Elige un rol…</option>
                  @for (role of roles(); track role.id) { <option [value]="role.id">{{ role.name }}</option> }
                </select>
              </div>
              <div class="sm:col-span-2 flex gap-2">
                <app-button type="submit" [disabled]="saving()">{{ saving() ? 'Creando…' : 'Crear usuario' }}</app-button>
                <app-button variant="ghost" (click)="toggleForm()" [disabled]="saving()">Cancelar</app-button>
              </div>
            </form>
          </app-card>
        }

        <app-card [noPadding]="true">
          @if (users().length === 0) {
            <p class="p-6 text-sm text-muted-foreground" data-testid="no-users">
              <lucide-icon [img]="Users" [size]="18" strokeWidth="1.75" class="inline mr-1" /> Esta aplicación no tiene usuarios.
            </p>
          } @else {
            <table class="w-full text-sm text-left" data-testid="users">
              <thead class="bg-muted border-b border-border">
                <tr>
                  <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs">Alias</th>
                  <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs">Nombre</th>
                  <th class="px-4 py-3 font-semibold text-muted-foreground uppercase text-xs">Correo</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr class="border-b border-border" data-testid="user">
                    <td class="px-4 py-3 text-foreground">{{ user.alias }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ user.displayName }}</td>
                    <td class="px-4 py-3 text-muted-foreground">{{ user.email }}</td>
                    <td class="px-4 py-3 text-right">
                      <app-button variant="secondary" size="sm" (click)="open(user)" data-testid="open-access">Accesos</app-button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </app-card>

        @if (selected(); as user) {
          <app-card [title]="'Accesos de ' + user.alias" subtitle="Cada aplicación tiene un solo rol por persona" class="block mt-6">
            <ul class="mb-4 divide-y divide-border" data-testid="accesses">
              @for (item of accesses(); track item.applicationId) {
                <li class="flex items-center justify-between gap-3 py-2" data-testid="access">
                  <span class="text-sm text-foreground">{{ item.applicationName }} <span class="text-muted-foreground">— {{ item.roleName }}</span></span>
                  <app-button variant="danger" size="sm" (click)="revoke(item)" data-testid="revoke"><lucide-icon [img]="Trash2" [size]="14" strokeWidth="2" /> Quitar</app-button>
                </li>
              } @empty {
                <li class="py-2 text-sm text-muted-foreground" data-testid="no-access">Sin accesos.</li>
              }
            </ul>
            <div class="grid gap-3 sm:grid-cols-3" data-testid="grant-form">
              <select aria-label="Aplicación a la que dar acceso" data-testid="grant-application" [ngModel]="grantApplicationId()" (ngModelChange)="selectGrantApplication($event)" class="${input}">
                <option value="">Aplicación…</option>
                @for (application of applications(); track application.id) { <option [value]="application.id">{{ application.name }}</option> }
              </select>
              <select aria-label="Rol" data-testid="grant-role" [ngModel]="grantRoleId()" (ngModelChange)="grantRoleId.set($event)" class="${input}">
                <option value="">Rol…</option>
                @for (role of grantRoles(); track role.id) { <option [value]="role.id">{{ role.name }}</option> }
              </select>
              <app-button (click)="grant()" [disabled]="!grantApplicationId() || !grantRoleId() || saving()" data-testid="grant">Dar acceso</app-button>
            </div>
          </app-card>
        }
      }
    }
  `,
})
export class UsersPageComponent implements OnInit {
  private readonly service = inject(UserAccessService);

  readonly RefreshCw = RefreshCw;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Users = Users;

  readonly fields: { key: string; label: string; type: string }[] = [
    { key: 'alias', label: 'Alias', type: 'text' },
    { key: 'displayName', label: 'Nombre para mostrar', type: 'text' },
    { key: 'email', label: 'Correo', type: 'email' },
    { key: 'password', label: 'Contraseña', type: 'password' },
    { key: 'name', label: 'Nombre', type: 'text' },
    { key: 'lastName', label: 'Apellido', type: 'text' },
    { key: 'birthdate', label: 'Fecha de nacimiento', type: 'date' },
  ];

  private readonly all = signal<AdminApplication[]>([]);
  readonly applications = computed(() =>
    this.all()
      .filter((application) => application.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  readonly applicationId = signal('');
  readonly users = signal<AdminUser[]>([]);
  readonly roles = signal<AdminRole[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<LoadFailure | null>(null);
  readonly message = signal<string | null>(null);
  readonly saving = signal(false);

  readonly formOpen = signal(false);
  readonly draft = signal<Record<string, string>>({});

  readonly selected = signal<AdminUser | null>(null);
  readonly accesses = signal<UserAccess[]>([]);
  readonly grantApplicationId = signal('');
  readonly grantRoleId = signal('');
  readonly grantRoles = signal<AdminRole[]>([]);

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.all.set(await this.service.applications());
      if (this.applicationId()) await this.loadApplication(this.applicationId());
    } catch (error) {
      this.loadError.set(loadFailure(error));
    } finally {
      this.loading.set(false);
    }
  }

  async selectApplication(id: string): Promise<void> {
    this.applicationId.set(id);
    this.selected.set(null);
    this.formOpen.set(false);
    this.message.set(null);
    this.users.set([]);
    this.roles.set([]);
    if (id) await this.guard(() => this.loadApplication(id));
  }

  toggleForm(): void {
    this.formOpen.update((open) => !open);
    this.draft.set({ gender: 'F' });
    this.message.set(null);
  }

  setDraft(key: string, value: string): void {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }

  async create(): Promise<void> {
    const d = this.draft();
    const required = ['alias', 'displayName', 'email', 'password', 'name', 'lastName', 'birthdate', 'roleId'];
    if (required.some((key) => !d[key]?.trim())) {
      this.message.set('Completa todos los campos y elige un rol.');
      return;
    }
    this.saving.set(true);
    this.message.set(null);
    try {
      await this.service.create({
        alias: d['alias'].trim(),
        displayName: d['displayName'].trim(),
        email: d['email'].trim(),
        password: d['password'],
        applicationId: this.applicationId(),
        roleId: d['roleId'],
        person: { name: d['name'].trim(), lastName: d['lastName'].trim(), gender: d['gender'] || 'F', birthdate: d['birthdate'] },
      });
      this.formOpen.set(false);
      this.draft.set({});
      this.users.set(await this.service.users(this.applicationId()));
    } catch (error) {
      this.message.set(adminFailure(error));
    } finally {
      this.saving.set(false);
    }
  }

  async open(user: AdminUser): Promise<void> {
    this.selected.set(user);
    this.grantApplicationId.set('');
    this.grantRoleId.set('');
    this.grantRoles.set([]);
    this.message.set(null);
    await this.guard(async () => this.accesses.set(await this.service.access(user.id)));
  }

  async selectGrantApplication(id: string): Promise<void> {
    this.grantApplicationId.set(id);
    this.grantRoleId.set('');
    this.grantRoles.set([]);
    if (id) await this.guard(async () => this.grantRoles.set(await this.service.roles(id)));
  }

  async grant(): Promise<void> {
    const user = this.selected();
    if (!user || !this.grantApplicationId() || !this.grantRoleId()) return;
    await this.mutate(async () => {
      await this.service.grant(user.id, this.grantApplicationId(), this.grantRoleId());
      this.accesses.set(await this.service.access(user.id));
      this.grantApplicationId.set('');
      this.grantRoleId.set('');
      this.grantRoles.set([]);
    });
  }

  async revoke(item: UserAccess): Promise<void> {
    const user = this.selected();
    if (!user) return;
    await this.mutate(async () => {
      await this.service.revoke(user.id, item.applicationId);
      this.accesses.set(await this.service.access(user.id));
    });
  }

  private async loadApplication(id: string): Promise<void> {
    const [users, roles] = await Promise.all([this.service.users(id), this.service.roles(id)]);
    this.users.set(users);
    this.roles.set(roles);
  }

  private async mutate(action: () => Promise<void>): Promise<void> {
    this.saving.set(true);
    this.message.set(null);
    try {
      await action();
    } catch (error) {
      this.message.set(adminFailure(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async guard(action: () => Promise<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      this.message.set(adminFailure(error));
    }
  }
}
