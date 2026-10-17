import { ChangeDetectionStrategy, Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Eye, EyeOff, LoaderCircle, LucideAngularModule, TriangleAlert } from 'lucide-angular';
import { AuthService } from '../../../core/services';
import { ROUTE_PATHS, routeUrl } from '../../../core/routes';
import { AppButtonComponent } from '../../../shared/components';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

/** Mensajes para la persona; ninguno revela si el usuario existe. */
export const LOGIN_MESSAGES = {
  invalid: 'Usuario o contraseña incorrectos',
  tooMany: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
  unavailable: 'El servicio no está disponible. Inténtalo de nuevo en unos minutos.',
} as const;

/**
 * `returnUrl` solo se acepta si es una ruta interna (empieza con una sola `/`): así el login no se puede usar
 * para redirigir a otro sitio.
 */
export function safeReturnUrl(value: string | null | undefined): string {
  const fallback = routeUrl(ROUTE_PATHS.DASHBOARD);
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LucideAngularModule, AppButtonComponent, ThemeToggleComponent],
  template: `
    <main class="relative min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div class="absolute top-4 right-4"><app-theme-toggle /></div>

      <section class="w-full max-w-sm bg-card text-card-foreground border border-border rounded-xl shadow-sm p-6 sm:p-8">
        <header class="flex flex-col items-center gap-3 mb-6 text-center">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground" aria-hidden="true">IR</div>
          <h1 class="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p class="text-sm text-muted-foreground">Accede al panel de monitoreo de Iris</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          @if (errorMessage(); as message) {
            <div role="alert" class="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <lucide-icon [img]="TriangleAlert" [size]="16" strokeWidth="1.5" class="mt-0.5 flex-shrink-0" />
              <span>{{ message }}</span>
            </div>
          }

          <div class="space-y-1.5">
            <label for="login-email" class="block text-sm font-medium">Usuario o correo</label>
            <input
              #emailInput
              id="login-email"
              type="text"
              formControlName="email"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              [attr.aria-invalid]="invalid('email')"
              [attr.aria-describedby]="invalid('email') ? 'login-email-error' : null"
              class="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors aria-[invalid=true]:border-destructive"
            />
            @if (invalid('email')) {
              <p id="login-email-error" class="text-xs text-destructive-foreground">Ingresa tu usuario o correo.</p>
            }
          </div>

          <div class="space-y-1.5">
            <label for="login-password" class="block text-sm font-medium">Contraseña</label>
            <div class="relative">
              <input
                #passwordInput
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                [attr.aria-invalid]="invalid('password')"
                [attr.aria-describedby]="invalid('password') ? 'login-password-error' : null"
                class="w-full pl-3 pr-10 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors aria-[invalid=true]:border-destructive"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded-r-lg"
                [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                [attr.aria-pressed]="showPassword()"
                (click)="showPassword.set(!showPassword())"
              >
                <lucide-icon [img]="showPassword() ? EyeOff : Eye" [size]="18" strokeWidth="1.5" />
              </button>
            </div>
            @if (invalid('password')) {
              <p id="login-password-error" class="text-xs text-destructive-foreground">Ingresa tu contraseña.</p>
            }
          </div>

          <app-button type="submit" size="lg" [fullWidth]="true" [disabled]="submitting()">
            @if (submitting()) {
              <lucide-icon [img]="LoaderCircle" [size]="18" strokeWidth="1.5" class="animate-spin" />
              <span>Ingresando…</span>
            } @else {
              <span>Ingresar</span>
            }
          </app-button>
        </form>
      </section>
    </main>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Ruta a la que volver tras iniciar sesión; llega como `?returnUrl=` (binding de parámetros del router). */
  readonly returnUrl = input<string>();

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.pattern(/\S/)]],
    password: ['', Validators.required],
  });
  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly LoaderCircle = LoaderCircle;
  readonly TriangleAlert = TriangleAlert;

  /** `true` si el campo ya se tocó (o se intentó enviar) y no es válido; alimenta `aria-invalid` y el mensaje. */
  invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.errorMessage.set(this.messageFor(error));
      this.form.controls.password.reset('');
      this.passwordInput()?.nativeElement.focus();
    } finally {
      this.submitting.set(false);
    }
  }

  private focusFirstInvalid(): void {
    const target = this.form.controls.email.invalid ? this.emailInput() : this.passwordInput();
    target?.nativeElement.focus();
  }

  private messageFor(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 401) return LOGIN_MESSAGES.invalid;
    if (status === 429) return LOGIN_MESSAGES.tooMany;
    return LOGIN_MESSAGES.unavailable;
  }
}
