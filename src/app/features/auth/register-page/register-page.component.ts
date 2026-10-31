import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Eye, EyeOff, LoaderCircle, LucideAngularModule, TriangleAlert } from 'lucide-angular';
import { AuthService } from '../../../core/services';
import { ROUTE_PATHS, routeUrl } from '../../../core/routes';
import { AppButtonComponent } from '../../../shared/components';
import { ThemeToggleComponent } from '../../../shared/components/theme-toggle/theme-toggle.component';

export const REGISTER_MESSAGES = {
  aliasTaken: 'Ese usuario ya está en uso. Prueba con otro.',
  invalid: 'Revisa los datos del formulario.',
  tooMany: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.',
  unavailable: 'El registro no está disponible. Inténtalo de nuevo en unos minutos.',
} as const;

const STRENGTH_LABELS = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
const STRENGTH_COLORS = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'];

/** Puntaje de 0 a 4: longitud, mayúsculas y minúsculas, dígitos y símbolos. */
export function passwordScore(password: string): number {
  if (password.length < 8) return 0;
  return [/[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password), password.length >= 12]
    .filter(Boolean).length;
}

function pastDate(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  return value && new Date(value) >= new Date() ? { future: true } : null;
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
}

type FieldName = 'firstName' | 'lastName' | 'alias' | 'email' | 'gender' | 'birthdate' | 'password' | 'confirmPassword';

@Component({
  selector: 'app-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AppButtonComponent, ThemeToggleComponent],
  template: `
    <main class="iris-aurora relative min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div class="absolute top-4 right-4"><app-theme-toggle /></div>

      <section class="w-full max-w-lg iris-glass animate-pop text-card-foreground border border-border rounded-2xl shadow-lg p-6 sm:p-8">
        <header class="flex flex-col items-center gap-3 mb-6 text-center">
          <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground">I</div>
          <h1 class="text-xl font-semibold tracking-tight">Crear una cuenta</h1>
          <p class="text-sm text-muted-foreground">Te enviaremos un código para confirmar tu correo</p>
        </header>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          @if (errorMessage(); as message) {
            <div role="alert" class="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <lucide-icon [img]="TriangleAlert" [size]="16" strokeWidth="1.5" class="mt-0.5 flex-shrink-0" />
              <span>{{ message }}</span>
            </div>
          }

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label for="register-firstName" class="block text-sm font-medium">Nombre</label>
              <input id="register-firstName" type="text" formControlName="firstName" autocomplete="given-name" [attr.aria-invalid]="invalid('firstName')" [class]="inputClass" />
              @if (invalid('firstName')) { <p class="text-xs text-destructive-foreground">Ingresa tu nombre.</p> }
            </div>
            <div class="space-y-1.5">
              <label for="register-lastName" class="block text-sm font-medium">Apellido</label>
              <input id="register-lastName" type="text" formControlName="lastName" autocomplete="family-name" [attr.aria-invalid]="invalid('lastName')" [class]="inputClass" />
              @if (invalid('lastName')) { <p class="text-xs text-destructive-foreground">Ingresa tu apellido.</p> }
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="register-alias" class="block text-sm font-medium">Usuario</label>
            <input id="register-alias" type="text" formControlName="alias" autocomplete="username" autocapitalize="none" spellcheck="false" [attr.aria-invalid]="invalid('alias')" [class]="inputClass" />
            @if (invalid('alias')) { <p class="text-xs text-destructive-foreground">De 3 a 64 letras, números, puntos, guiones o guiones bajos.</p> }
          </div>

          <div class="space-y-1.5">
            <label for="register-email" class="block text-sm font-medium">Correo</label>
            <input id="register-email" type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="invalid('email')" [class]="inputClass" />
            @if (invalid('email')) { <p class="text-xs text-destructive-foreground">Ingresa un correo válido.</p> }
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label for="register-gender" class="block text-sm font-medium">Género</label>
              <select id="register-gender" formControlName="gender" [attr.aria-invalid]="invalid('gender')" [class]="inputClass">
                <option value="">Selecciona</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="O">Otro</option>
              </select>
              @if (invalid('gender')) { <p class="text-xs text-destructive-foreground">Selecciona una opción.</p> }
            </div>
            <div class="space-y-1.5">
              <label for="register-birthdate" class="block text-sm font-medium">Fecha de nacimiento</label>
              <input id="register-birthdate" type="date" formControlName="birthdate" autocomplete="bday" [attr.aria-invalid]="invalid('birthdate')" [class]="inputClass" />
              @if (invalid('birthdate')) { <p class="text-xs text-destructive-foreground">Ingresa una fecha pasada.</p> }
            </div>
          </div>

          <div class="space-y-1.5">
            <label for="register-password" class="block text-sm font-medium">Contraseña</label>
            <div class="relative">
              <input id="register-password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="invalid('password')" [class]="inputClass + ' pr-10'" />
              <button type="button" class="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground transition-colors" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showPassword()" (click)="showPassword.set(!showPassword())">
                <lucide-icon [img]="showPassword() ? EyeOff : Eye" [size]="18" strokeWidth="1.5" />
              </button>
            </div>
            @if (password()) {
              <div class="flex items-center gap-2" aria-live="polite">
                <div class="flex flex-1 gap-1">
                  @for (bar of bars; track bar) {
                    <span class="h-1 flex-1 rounded-full transition-colors duration-300" [class]="bar <= score() ? strengthColor() : 'bg-muted'"></span>
                  }
                </div>
                <span class="text-xs text-muted-foreground">{{ strengthLabel() }}</span>
              </div>
            }
            @if (invalid('password')) { <p class="text-xs text-destructive-foreground">Usa entre 8 y 128 caracteres.</p> }
          </div>

          <div class="space-y-1.5">
            <label for="register-confirm" class="block text-sm font-medium">Repite la contraseña</label>
            <input id="register-confirm" [type]="showPassword() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" [attr.aria-invalid]="mismatch()" [class]="inputClass" />
            @if (mismatch()) { <p class="text-xs text-destructive-foreground">Las contraseñas no coinciden.</p> }
          </div>

          <fieldset class="space-y-2">
            <legend class="text-sm font-medium">Preferencias</legend>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" formControlName="notificationEmail" class="accent-primary" /> Recibir avisos por correo</label>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" formControlName="notificationSms" class="accent-primary" /> Recibir avisos por SMS</label>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" formControlName="privacyDataOutActive" class="accent-primary" /> Permitir compartir mis datos fuera de la aplicación</label>
          </fieldset>

          <app-button type="submit" size="lg" [fullWidth]="true" [disabled]="submitting()">
            @if (submitting()) {
              <lucide-icon [img]="LoaderCircle" [size]="18" strokeWidth="1.5" class="animate-spin" />
              <span>Creando cuenta…</span>
            } @else {
              <span>Crear cuenta</span>
            }
          </app-button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?
          <a [routerLink]="loginUrl" class="font-medium text-primary hover:underline">Iniciar sesión</a>
        </p>
      </section>
    </main>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
      alias: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9._-]{3,64}$/)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      gender: ['', Validators.required],
      birthdate: ['', [Validators.required, pastDate]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', Validators.required],
      notificationEmail: [true],
      notificationSms: [false],
      privacyDataOutActive: [false],
    },
    { validators: passwordsMatch },
  );

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly score = computed(() => passwordScore(this.password()));
  readonly strengthLabel = computed(() => STRENGTH_LABELS[this.score()]);
  readonly strengthColor = computed(() => STRENGTH_COLORS[this.score()]);

  readonly bars = [1, 2, 3, 4];
  readonly loginUrl = routeUrl(ROUTE_PATHS.LOGIN);
  readonly inputClass =
    'w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground transition-shadow focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30';
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly LoaderCircle = LoaderCircle;
  readonly TriangleAlert = TriangleAlert;

  invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  mismatch(): boolean {
    const confirm = this.form.controls.confirmPassword;
    return this.form.hasError('mismatch') && (confirm.touched || confirm.dirty);
  }

  async submit(): Promise<void> {
    if (this.submitting()) return;
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting.set(true);
    try {
      await this.auth.register({
        alias: value.alias,
        email: value.email,
        password: value.password,
        person: { firstName: value.firstName, lastName: value.lastName, gender: value.gender, birthdate: value.birthdate },
        notificationEmail: value.notificationEmail,
        notificationSms: value.notificationSms,
        privacyDataOutActive: value.privacyDataOutActive,
        language: 'es',
      });
      await this.router.navigate([routeUrl(ROUTE_PATHS.VERIFY_EMAIL)], { queryParams: { alias: value.alias } });
    } catch (error) {
      this.errorMessage.set(this.messageFor(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private messageFor(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 409) return REGISTER_MESSAGES.aliasTaken;
    if (status === 400) return REGISTER_MESSAGES.invalid;
    if (status === 429) return REGISTER_MESSAGES.tooMany;
    return REGISTER_MESSAGES.unavailable;
  }
}
