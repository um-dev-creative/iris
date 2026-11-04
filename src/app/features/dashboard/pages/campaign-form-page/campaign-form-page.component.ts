import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowLeft, LucideAngularModule, Upload } from 'lucide-angular';
import { AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { AuthService, NotificationService } from '../../../../core/services';
import {
  CAMPAIGN_NAME_MAX,
  Campaign,
  CampaignDraftStatus,
  CampaignRecipient,
  ChannelType,
  UsableTemplate,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { CampaignsService, ReferenceDataService } from '../../services';
import { actionErrorMessage, loadFailure } from '../../utils/campaign-errors';
import {
  MAX_RECIPIENTS,
  UUID_PATTERN,
  fromInputDateTime,
  paramsToText,
  parseParams,
  parseRecipients,
  toInputDateTime,
} from '../../utils/campaign-input';

/** Mercury acepta cambios solo mientras la campaña no ha empezado. */
const EDITABLE_STATUSES = ['DRAFT', 'SCHEDULED'];
const listUrl = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.CAMPAIGNS);

/**
 * Crear (`campaigns/new`) o editar (`campaigns/:id/edit`) una campaña. Mercury no devuelve los destinatarios de una campaña:
 * al editar, dejar el campo vacío los conserva y escribir una lista los reemplaza.
 */
@Component({
  selector: 'app-campaign-form-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="listUrl" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <lucide-icon [img]="ArrowLeft" [size]="14" strokeWidth="2" /> Campañas
    </a>
    <h2 class="text-2xl font-bold text-foreground">{{ editing() ? 'Editar campaña' : 'Nueva campaña' }}</h2>

    @if (loadFailed()) {
      <p role="alert" class="mt-6 text-sm text-foreground" data-testid="load-failed">
        {{ loadFailed() === 'forbidden' ? 'No tienes permiso para ver esta campaña.' : 'No se pudo cargar la campaña.' }}
      </p>
    } @else if (!editable()) {
      <p role="alert" class="mt-6 text-sm text-foreground" data-testid="locked">
        Esta campaña está en estado «{{ original()?.status }}» y ya no se puede editar: solo las campañas en borrador o programadas.
      </p>
    } @else {
      <app-card class="block mt-6">
        <form class="space-y-5" (ngSubmit)="submit()" novalidate>
          <div>
            <label for="cf-name" class="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
            <input id="cf-name" name="name" type="text" autocomplete="off" [maxlength]="nameMax" [ngModel]="name()" (ngModelChange)="name.set($event)"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="cf-channel" class="block text-sm font-medium text-foreground mb-1.5">Canal</label>
              @if (channels().length > 0) {
                <select id="cf-channel" name="channel" [ngModel]="channel()" (ngModelChange)="channel.set($event)" [disabled]="editing()"
                  class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60">
                  <option value="" disabled>Elige un canal</option>
                  @for (option of channels(); track option.code) {
                    <option [value]="option.code">{{ option.name }} ({{ option.code }})</option>
                  }
                </select>
              } @else {
                <input id="cf-channel" name="channel" type="text" [ngModel]="channel()" (ngModelChange)="channel.set($event)" [disabled]="editing()" placeholder="email"
                  class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60" />
              }
              @if (editing()) {
                <p class="text-xs text-muted-foreground mt-1">El canal no se puede cambiar una vez creada la campaña.</p>
              }
            </div>
            <div>
              @if (templates().length > 0) {
                <label for="cf-template" class="block text-sm font-medium text-foreground mb-1.5">Plantilla</label>
                <select id="cf-template" name="template" [ngModel]="templateId()" (ngModelChange)="templateId.set($event)"
                  class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring">
                  <option value="" disabled>Elige una plantilla</option>
                  @for (option of templates(); track option.id) {
                    <option [value]="option.id">{{ option.description }}{{ option.templateTypeName ? ' · ' + option.templateTypeName : '' }}</option>
                  }
                </select>
              } @else {
                <label for="cf-template" class="block text-sm font-medium text-foreground mb-1.5">Plantilla (id)</label>
                <input id="cf-template" name="template" type="text" autocomplete="off" [ngModel]="templateId()" (ngModelChange)="templateId.set($event)"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  class="w-full px-4 py-2.5 border border-input rounded-lg text-sm font-mono bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                <p class="text-xs text-muted-foreground mt-1">Id de la plantilla definida (<code>template_defined</code>) que usará la campaña.</p>
              }
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="cf-recipients" class="block text-sm font-medium text-foreground">
                Destinatarios{{ editing() ? ' (opcional: vacío conserva los actuales)' : '' }}
              </label>
              <label class="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary hover:underline">
                <lucide-icon [img]="Upload" [size]="14" strokeWidth="2" /> Importar CSV
                <input type="file" accept=".csv,.txt,text/csv,text/plain" class="sr-only" (change)="importFile($event)" data-testid="csv-input" />
              </label>
            </div>
            <textarea id="cf-recipients" name="recipients" rows="6" [ngModel]="recipientsText()" (ngModelChange)="recipientsText.set($event)"
              placeholder="correo@ejemplo.com,Nombre&#10;otro@ejemplo.com"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm font-mono bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"></textarea>
            <p class="text-xs text-muted-foreground mt-1" data-testid="recipients-summary">
              {{ parsedRecipients().recipients.length }} destinatarios
              @if (parsedRecipients().duplicates > 0) { · {{ parsedRecipients().duplicates }} repetidos descartados }
              @if (parsedRecipients().invalidLines.length > 0) { · líneas sin identificador: {{ parsedRecipients().invalidLines.join(', ') }} }
              · Una persona por línea: <code>identificador,nombre</code>
            </p>
          </div>

          <div>
            <label for="cf-params" class="block text-sm font-medium text-foreground mb-1.5">Parámetros de la plantilla (opcional)</label>
            <textarea id="cf-params" name="params" rows="3" [ngModel]="paramsText()" (ngModelChange)="paramsText.set($event)" placeholder="firstName=Ana"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm font-mono bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"></textarea>
            <p class="text-xs text-muted-foreground mt-1">Una línea <code>clave=valor</code> por parámetro.</p>
          </div>

          <fieldset class="grid gap-5 sm:grid-cols-2">
            <legend class="sr-only">Envío</legend>
            <div>
              <label for="cf-status" class="block text-sm font-medium text-foreground mb-1.5">Guardar como</label>
              <select id="cf-status" name="status" [ngModel]="status()" (ngModelChange)="status.set($event)"
                class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring">
                <option value="DRAFT">Borrador</option>
                <option value="SCHEDULED">Programada</option>
              </select>
            </div>
            <div>
              <label for="cf-when" class="block text-sm font-medium text-foreground mb-1.5">Fecha y hora de envío</label>
              <input id="cf-when" name="scheduledAt" type="datetime-local" [ngModel]="scheduledAt()" (ngModelChange)="scheduledAt.set($event)"
                class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
              <p class="text-xs text-muted-foreground mt-1">Obligatoria si la campaña se programa.</p>
            </div>
          </fieldset>

          @if (formError(); as message) {
            <p role="alert" class="text-sm text-destructive" data-testid="form-error">{{ message }}</p>
          }
          <div class="flex gap-2">
            <app-button type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : editing() ? 'Guardar cambios' : 'Crear campaña' }}</app-button>
            <a [routerLink]="listUrl" class="inline-flex items-center rounded-lg px-4 py-2 text-sm hover:bg-accent">Cancelar</a>
          </div>
        </form>
      </app-card>
    }
  `,
})
export class CampaignFormPageComponent implements OnInit {
  private readonly service = inject(CampaignsService);
  private readonly references = inject(ReferenceDataService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly id: string | null = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? null;

  readonly ArrowLeft = ArrowLeft;
  readonly Upload = Upload;
  readonly listUrl = listUrl;
  readonly nameMax = CAMPAIGN_NAME_MAX;

  readonly editing = signal(this.id !== null);
  readonly original = signal<Campaign | null>(null);
  readonly loadFailed = signal<'forbidden' | 'unavailable' | 'failed' | null>(null);
  readonly channels = signal<ChannelType[]>([]);
  readonly templates = signal<UsableTemplate[]>([]);

  readonly name = signal('');
  readonly channel = signal('');
  readonly templateId = signal('');
  readonly recipientsText = signal('');
  readonly paramsText = signal('');
  readonly status = signal<CampaignDraftStatus>('DRAFT');
  readonly scheduledAt = signal('');
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly parsedRecipients = computed(() => parseRecipients(this.recipientsText()));
  readonly editable = computed(() => {
    const original = this.original();
    return original === null || EDITABLE_STATUSES.includes(original.status.toUpperCase());
  });

  async ngOnInit(): Promise<void> {
    // the channels fill the selector; without them the field stays a text box
    this.service.channelTypes().then((list) => this.channels.set(list.filter((c) => c.enabled !== false)), () => undefined);
    // the same for the templates: without permission to list them the field stays an id box
    this.references.usableTemplates().then((list) => this.templates.set(list), () => undefined);
    if (this.id === null) return;
    try {
      const campaign = await this.service.get(this.id);
      this.original.set(campaign);
      this.name.set(campaign.name);
      this.channel.set(campaign.channelType);
      this.templateId.set(campaign.templateId ?? '');
      this.scheduledAt.set(toInputDateTime(campaign.scheduledAt));
      this.status.set(campaign.status.toUpperCase() === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT');
      const template = campaign.metadata?.['template'] as { params?: Record<string, unknown> } | undefined;
      this.paramsText.set(paramsToText(template?.params));
    } catch (error) {
      this.loadFailed.set(loadFailure(error));
    }
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.recipientsText.set(await file.text());
    input.value = '';
  }

  async submit(): Promise<void> {
    const problem = this.validate();
    this.formError.set(problem);
    if (problem) return;

    const recipients = this.parsedRecipients().recipients;
    const params = parseParams(this.paramsText()).params;
    const scheduledAt = fromInputDateTime(this.scheduledAt());
    this.saving.set(true);
    try {
      if (this.id === null) {
        await this.service.create(this.createRequest(recipients, params, scheduledAt));
        this.notifications.success('Campaña creada', this.name().trim());
      } else {
        await this.service.update(this.id, this.updateRequest(recipients, params, scheduledAt));
        this.notifications.success('Campaña actualizada', this.name().trim());
      }
      await this.router.navigateByUrl(listUrl);
    } catch (error) {
      this.formError.set(actionErrorMessage(error, this.id === null ? 'crear' : 'editar'));
    } finally {
      this.saving.set(false);
    }
  }

  /** The first thing wrong with the form, or null. Mercury checks again; this only saves a round trip. */
  validate(): string | null {
    const name = this.name().trim();
    if (name === '') return 'Escribe un nombre.';
    if (name.length > CAMPAIGN_NAME_MAX) return `El nombre admite hasta ${CAMPAIGN_NAME_MAX} caracteres.`;
    if (this.channel().trim() === '') return 'Elige un canal.';
    if (!UUID_PATTERN.test(this.templateId().trim())) return this.templates().length > 0 ? 'Elige una plantilla.' : 'La plantilla debe ser un id válido (UUID).';
    const recipients = this.parsedRecipients();
    if (recipients.invalidLines.length > 0) return `Hay líneas de destinatarios sin identificador: ${recipients.invalidLines.join(', ')}.`;
    if (recipients.recipients.length === 0 && !this.editing()) return 'Agrega al menos un destinatario.';
    if (recipients.recipients.length > MAX_RECIPIENTS) return `Se admiten hasta ${MAX_RECIPIENTS} destinatarios por campaña.`;
    if (parseParams(this.paramsText()).invalidLines.length > 0) return 'Los parámetros deben tener la forma clave=valor, con una clave válida.';
    if (this.status() === 'SCHEDULED') {
      const when = this.scheduledAt();
      if (!when) return 'Indica la fecha y hora de envío de la campaña programada.';
      if (new Date(when).getTime() <= Date.now()) return 'La fecha de envío debe estar en el futuro.';
    }
    return null;
  }

  private createRequest(recipients: CampaignRecipient[], params: Record<string, string>, scheduledAt?: string): CreateCampaignRequest {
    return {
      name: this.name().trim(),
      channelTypeCode: this.channel().trim(),
      templateId: this.templateId().trim(),
      userId: this.auth.user()?.id ?? '',
      recipients,
      ...(Object.keys(params).length > 0 ? { templateParams: params } : {}),
      ...(scheduledAt ? { scheduledAt } : {}),
      status: this.status(),
    };
  }

  private updateRequest(recipients: CampaignRecipient[], params: Record<string, string>, scheduledAt?: string): UpdateCampaignRequest {
    return {
      name: this.name().trim(),
      templateId: this.templateId().trim(),
      ...(recipients.length > 0 ? { recipients } : {}),
      templateParams: params,
      ...(scheduledAt ? { scheduledAt } : {}),
      status: this.status(),
    };
  }
}
