import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AppCardComponent,
  AppButtonComponent,
} from '../../../../shared/components';
import { ApiService, NotificationService } from '../../../../core/services';
import { ApiConfig } from '../../../../core/models';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, AppCardComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Page header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Settings</h2>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
        Configura la conexión a APIs externas
      </p>
    </div>

    <!-- API Configuration -->
    <div class="max-w-2xl">
      <app-card title="Configuración de API" subtitle="Define la URL base, clave de API y tipo de autenticación">
        <form class="space-y-5" (ngSubmit)="saveConfig()">
          <!-- Base URL -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Base URL
            </label>
            <input
              type="url"
              [ngModel]="config().baseUrl"
              (ngModelChange)="updateField('baseUrl', $event)"
              name="baseUrl"
              placeholder="https://api.example.com"
              class="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors dark:bg-neutral-800 dark:text-neutral-100"
            />
            <p class="text-xs text-neutral-400 mt-1">
              URL base del servidor API (sin / al final)
            </p>
          </div>

          <!-- API Key -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              API Key / Token
            </label>
            <input
              type="password"
              [ngModel]="config().apiKey"
              (ngModelChange)="updateField('apiKey', $event)"
              name="apiKey"
              placeholder="Tu clave de API o token"
              class="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <!-- Auth Type -->
          <div>
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tipo de autenticación
            </label>
            <select
              [ngModel]="config().authType"
              (ngModelChange)="updateField('authType', $event)"
              name="authType"
              class="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none bg-white dark:bg-neutral-800 dark:text-neutral-100 transition-colors"
            >
              <option value="none">Sin autenticación</option>
              <option value="bearer">Bearer Token</option>
              <option value="apikey">API Key (X-API-Key header)</option>
            </select>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <app-button type="submit" variant="primary">
              Guardar configuración
            </app-button>
            <app-button variant="ghost" (click)="resetConfig()">
              Restaurar valores por defecto
            </app-button>
          </div>
        </form>
      </app-card>

      <!-- Connection test -->
      <div class="mt-6">
        <app-card title="Probar conexión" subtitle="Verifica que la API configurada responde correctamente">
          <div class="flex items-center gap-4">
            <app-button variant="secondary" (click)="testConnection()">
              {{ testing() ? 'Probando...' : 'Probar conexión' }}
            </app-button>
            @if (testResult()) {
              <span
                class="text-sm font-medium"
                [class]="testResult() === 'success' ? 'text-success-600' : 'text-danger-600'"
              >
                {{ testResult() === 'success' ? '✓ Conexión exitosa' : '✗ Error de conexión' }}
              </span>
            }
          </div>
        </app-card>
      </div>
    </div>
  `,
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly notificationService = inject(NotificationService);

  readonly config = signal<ApiConfig>({ baseUrl: '', apiKey: '', authType: 'none' });
  readonly testing = signal(false);
  readonly testResult = signal<'success' | 'error' | null>(null);

  ngOnInit(): void {
    this.config.set(this.apiService.getConfig());
  }

  updateField(field: keyof ApiConfig, value: string): void {
    this.config.update((c) => ({ ...c, [field]: value }));
  }

  saveConfig(): void {
    this.apiService.updateConfig(this.config());
    this.notificationService.success(
      'Configuración guardada',
      'La configuración de API ha sido actualizada correctamente.'
    );
  }

  resetConfig(): void {
    const defaults: ApiConfig = {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      apiKey: '',
      authType: 'none',
    };
    this.config.set(defaults);
    this.apiService.updateConfig(defaults);
    this.notificationService.info(
      'Configuración restaurada',
      'Se han restaurado los valores por defecto.'
    );
  }

  async testConnection(): Promise<void> {
    this.testing.set(true);
    this.testResult.set(null);

    try {
      // Guardamos temporalmente la config para testearla
      this.apiService.updateConfig(this.config());
      const response = await fetch(`${this.config().baseUrl}/posts/1`);
      if (response.ok) {
        this.testResult.set('success');
        this.notificationService.success('Conexión exitosa', 'La API está respondiendo correctamente.');
      } else {
        this.testResult.set('error');
        this.notificationService.error('Error de conexión', `La API respondió con estado ${response.status}.`);
      }
    } catch {
      this.testResult.set('error');
      this.notificationService.error('Error de conexión', 'No se pudo conectar a la API.');
    } finally {
      this.testing.set(false);
    }
  }
}
