import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { LoaderCircle, LucideAngularModule, MailCheck, TriangleAlert } from 'lucide-angular';
import { AuthService } from '../../../core/services';
import { ROUTE_PATHS, routeUrl } from '../../../core/routes';
import { AppButtonComponent } from '../../../shared/components';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

export const VERIFY_MESSAGES = {
  wrong: 'El código no es correcto.',
  expired: 'El código venció o ya no es válido. Pide uno nuevo.',
  tooMany: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
  unavailable: 'El servicio no está disponible. Inténtalo de nuevo en unos minutos.',
  resent: 'Si la cuenta está pendiente, enviamos un código nuevo.',
} as const;

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AppButtonComponent, ThemeToggleComponent],
  template: `
    <main class="iris-aurora relative min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div class="absolute top-4 right-4"><app-theme-toggle /></div>

      <section class="w-full max-w-sm iris-glass animate-pop text-card-foreground border border-border rounded-2xl shadow-lg p-6 sm:p-8">
        @if (verified()) {
          <div class="flex flex-col items-center gap-3 text-center">
            <lucide-icon [img]="MailCheck" [size]="36" strokeWidth="1.5" class="text-success" />
            <h1 class="text-xl font-semibold tracking-tight">Correo confirmado</h1>
            <p class="text-sm text-muted-foreground">Tu cuenta está activa. Ya puedes iniciar sesión.</p>
            <a [routerLink]="loginUrl" class="mt-2 font-medium text-primary hover:underline">Ir a iniciar sesión</a>
          </div>
        } @else {
          <header class="flex flex-col items-center gap-3 mb-6 text-center">
            <lucide-icon [img]="MailCheck" [size]="36" strokeWidth="1.5" class="text-primary" />
            <h1 class="text-xl font-semibold tracking-tight">Confirma tu correo</h1>
            <p class="text-sm text-muted-foreground">Escribe el código de 6 dígitos que te enviamos. Vence en 15 minutos.</p>
          </header>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
            @if (errorMessage(); as message) {
              <div role="alert" class="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                <lucide-icon [img]="TriangleAlert" [size]="16" strokeWidth="1.5" class="mt-0.5 flex-shrink-0" />
                <span>{{ message }}</span>
              </div>
            }
            @if (notice(); as message) {
              <p role="status" class="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{{ message }}</p>
            }

            @if (!alias()) {
              <div class="space-y-1.5">
                <label for="verify-alias" class="block text-sm font-medium">Usuario</label>
                <input id="verify-alias" type="text" formControlName="aliasInput" autocomplete="username" autocapitalize="none" spellcheck="false" [class]="inputClass" />
              </div>
            }

            <div class="space-y-1.5">
              <label for="verify-code" class="block text-sm font-medium">Código</label>
              <input id="verify-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" formControlName="code" [attr.aria-invalid]="invalidCode()" [class]="inputClass + ' text-center text-lg tracking-[0.5em] font-mono'" />
              @if (invalidCode()) { <p class="text-xs text-destructive-foreground">Son 6 dígitos.</p> }
            </div>

            <app-button type="submit" size="lg" [fullWidth]="true" [disabled]="submitting()">
              @if (submitting()) {
                <lucide-icon [img]="LoaderCircle" [size]="18" strokeWidth="1.5" class="animate-spin" />
                <span>Verificando…</span>
              } @else {
                <span>Verificar</span>
              }
            </app-button>
          </form>

          <p class="mt-6 text-center text-sm text-muted-foreground">
            ¿No te llegó?
            <button type="button" class="font-medium text-primary hover:underline disabled:opacity-50" [disabled]="resending()" (click)="resend()">Enviar otro código</button>
          </p>
        }
      </section>
    </main>
  `,
})
export class VerifyEmailPageComponent {
  private readonly auth = inject(AuthService);

  /** Usuario recién registrado; llega como `?alias=` (binding de parámetros del router). */
  readonly alias = input<string>();

  readonly form = inject(FormBuilder).nonNullable.group({
    aliasInput: [''],
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly verified = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly loginUrl = routeUrl(ROUTE_PATHS.LOGIN);
  readonly inputClass =
    'w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground transition-shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30';
  readonly LoaderCircle = LoaderCircle;
  readonly MailCheck = MailCheck;
  readonly TriangleAlert = TriangleAlert;

  invalidCode(): boolean {
    const control = this.form.controls.code;
    return control.invalid && (control.touched || control.dirty);
  }

  private currentAlias(): string {
    return (this.alias() ?? this.form.controls.aliasInput.value).trim();
  }

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.errorMessage.set(null);
    this.notice.set(null);
    if (this.form.invalid || !this.currentAlias()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      await this.auth.verifyEmail(this.currentAlias(), this.form.controls.code.value);
      this.verified.set(true);
    } catch (error) {
      this.errorMessage.set(this.messageFor(error));
      this.form.controls.code.reset('');
    } finally {
      this.submitting.set(false);
    }
  }

  async resend(): Promise<void> {
    if (!this.currentAlias()) return;
    this.errorMessage.set(null);
    this.resending.set(true);
    try {
      await this.auth.resendVerification(this.currentAlias());
      this.notice.set(VERIFY_MESSAGES.resent);
    } catch (error) {
      this.errorMessage.set(this.messageFor(error));
    } finally {
      this.resending.set(false);
    }
  }

  private messageFor(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return VERIFY_MESSAGES.unavailable;
    if (error.status === 429) return VERIFY_MESSAGES.tooMany;
    if (error.status !== 422) return VERIFY_MESSAGES.unavailable;
    const left = error.error?.attemptsRemaining;
    if (error.error?.expired) return VERIFY_MESSAGES.expired;
    return typeof left === 'number' ? `${VERIFY_MESSAGES.wrong} Te quedan ${left} intentos.` : VERIFY_MESSAGES.wrong;
  }
}
