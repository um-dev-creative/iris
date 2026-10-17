import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChevronDown, LoaderCircle, LogOut, LucideAngularModule } from 'lucide-angular';
import { AuthService, DashboardStore } from '../../core/services';
import { ROUTE_PATHS, routeUrl } from '../../core/routes';

/** Menú de la persona con sesión: nombre, correo o usuario, iniciales o avatar y "Cerrar sesión" con confirmación. */
@Component({
  selector: 'app-user-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:click)': 'closeOnOutsideClick($event)',
  },
  template: `
    <div class="relative">
      <button
        type="button"
        id="user-menu-button"
        class="flex items-center gap-2 rounded-lg p-1 hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="menu"
        aria-controls="user-menu"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
      >
        @if (avatarUrl(); as url) {
          <img [src]="url" alt="" class="w-8 h-8 rounded-full object-cover" />
        } @else {
          <span class="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
            {{ store.userInitials() }}
          </span>
        }
        <span class="hidden md:block text-sm font-medium text-foreground">{{ name() }}</span>
        <lucide-icon [img]="ChevronDown" [size]="16" strokeWidth="1.5" class="hidden md:block text-muted-foreground" />
      </button>

      @if (open()) {
        <div
          id="user-menu"
          role="menu"
          aria-labelledby="user-menu-button"
          class="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-card text-card-foreground shadow-lg z-20"
        >
          <div class="px-4 py-3 border-b border-border">
            <p class="text-sm font-medium truncate">{{ name() }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ secondary() }}</p>
          </div>

          @if (!confirming()) {
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-accent transition-colors rounded-b-lg"
              (click)="confirming.set(true)"
            >
              <lucide-icon [img]="LogOut" [size]="16" strokeWidth="1.5" />
              Cerrar sesión
            </button>
          } @else {
            <div class="p-3 space-y-3" role="group" aria-label="Confirmar cierre de sesión">
              <p class="text-sm">¿Cerrar la sesión?</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  role="menuitem"
                  class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                  [disabled]="closing()"
                  (click)="confirm()"
                >
                  @if (closing()) {
                    <lucide-icon [img]="LoaderCircle" [size]="14" strokeWidth="1.5" class="animate-spin" />
                  }
                  Sí, cerrar sesión
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
                  [disabled]="closing()"
                  (click)="confirming.set(false)"
                >
                  Cancelar
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class UserMenuComponent {
  readonly store = inject(DashboardStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = signal(false);
  readonly confirming = signal(false);
  readonly closing = signal(false);

  readonly name = computed(() => this.auth.user()?.name ?? '');
  readonly avatarUrl = computed(() => this.auth.user()?.avatarUrl);
  /** El correo si el token lo trae; si no, el usuario. */
  readonly secondary = computed(() => {
    const user = this.auth.user();
    return user?.email ?? (user ? `@${user.username}` : '');
  });

  readonly ChevronDown = ChevronDown;
  readonly LogOut = LogOut;
  readonly LoaderCircle = LoaderCircle;

  toggle(): void {
    if (this.open()) this.close();
    else this.open.set(true);
  }

  close(): void {
    if (this.closing()) return;
    this.open.set(false);
    this.confirming.set(false);
  }

  closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  /** Cierra la sesión y vuelve al login reemplazando la entrada del historial: "atrás" no regresa al dashboard. */
  async confirm(): Promise<void> {
    this.closing.set(true);
    try {
      await this.auth.logout();
      await this.router.navigate([routeUrl(ROUTE_PATHS.LOGIN)], { replaceUrl: true });
    } finally {
      this.closing.set(false);
      this.open.set(false);
      this.confirming.set(false);
    }
  }
}
