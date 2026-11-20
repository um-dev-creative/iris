import { ChangeDetectionStrategy, Component, ElementRef, HostListener, NgZone, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertTriangle, ArrowLeft, Eye, History, LucideAngularModule, Lock, Monitor, RotateCcw, Save, Smartphone } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { HasUnsavedChanges } from '../../../../core/guards';
import { NotificationService } from '../../../../core/services';
import {
  ReferenceItem,
  TEMPLATE_CONTENT_MAX_BYTES,
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_SUBJECT_MAX,
  TemplateContent,
  TemplatePreviewResult,
  TemplateProblem,
  TemplateProblemsBody,
  TemplateSummary,
  TemplateVersion,
} from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { ReferenceDataService, TemplatesService } from '../../services';
import { loadFailure, LoadFailure } from '../../utils/campaign-errors';
import { parseParams, toDate } from '../../utils/campaign-input';
import { DiffLine, changeCount, diffLines } from '../../utils/text-diff';
import {
  EditorFormat,
  TEMPLATE_FILE_NAME,
  describeProblem,
  emptySamples,
  fileNameFor,
  formatOfFile,
  lineRange,
  previewDocument,
  renderSubject,
  withDetectedParams,
  withFormat,
} from '../../utils/template-input';
import { serviceMessage } from '../../../../core/utils/service-message';

const templatesUrl = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.TEMPLATES);
const PREVIEW_DELAY_MS = 350;
/** Alto de la vista previa antes de medir su contenido, y sus límites. */
const FRAME_MIN_PX = 240;
const FRAME_MAX_PX = 1400;
/** Ancho de un teléfono común: así se ve el correo en móvil. */
export const MOBILE_WIDTH_PX = 375;
const STARTER: Record<EditorFormat, string> = {
  MD: '# Hola ${name}\n\nEscribe aquí el mensaje. Usa **negritas**, listas y [enlaces](https://example.com).\n',
  HTML: '<h1>Hola ${name}</h1>\n<p>Escribe aquí el mensaje.</p>\n',
};

/**
 * Crear (`templates/:applicationId/new`) o editar (`templates/:applicationId/:id`) una plantilla: metadatos, contenido en HTML o Markdown con vista previa, y
 * guardado con bloqueo optimista (Mercury responde 412 si alguien guardó antes). Las plantillas del sistema se abren de solo lectura.
 */
@Component({
  selector: 'app-template-editor-page',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="Ubicación" data-testid="breadcrumb">
      <a [routerLink]="listUrl" class="inline-flex items-center gap-1.5 hover:text-foreground">
        <lucide-icon [img]="ArrowLeft" [size]="14" strokeWidth="2" /> {{ applicationId ? 'Aplicaciones' : 'Plantillas' }}
      </a>
      @if (applicationId) {
        <span aria-hidden="true">/</span>
        <a [routerLink]="applicationUrl" class="hover:text-foreground" data-testid="back-to-application">{{ applicationName() ?? 'Plantillas' }}</a>
      }
    </nav>

    @if (loadError(); as why) {
      <p role="alert" class="text-sm text-foreground" data-testid="load-failed">
        {{ why === 'forbidden' ? 'No tienes permiso para ver esta plantilla.' : why === 'unavailable' ? 'La gestión de plantillas no está configurada.' : 'No se pudo cargar la plantilla.' }}
      </p>
    } @else if (!ready()) {
      <p class="text-sm text-muted-foreground" data-testid="loading">Cargando plantilla…</p>
    } @else {
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-foreground">{{ creating() ? 'Nueva plantilla' : 'Editar plantilla' }}</h2>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            @if (system()) { <app-badge color="warning"><lucide-icon [img]="Lock" [size]="12" strokeWidth="2" class="mr-1" /> Plantilla del sistema</app-badge> }
            @if (dirty()) { <app-badge color="primary" data-testid="dirty">Cambios sin guardar</app-badge> }
            @if (!creating() && !exists()) { <app-badge color="warning">Sin contenido guardado</app-badge> }
          </div>
        </div>
        <div class="flex gap-2">
          <app-button (click)="save()" [disabled]="saving() || !dirty() || (system() && !confirmSystem())" data-testid="save">
            <lucide-icon [img]="Save" [size]="16" strokeWidth="2" /> {{ saving() ? 'Guardando…' : 'Guardar' }}
          </app-button>
        </div>
      </div>

      @if (system()) {
        <div role="status" class="mb-4 rounded-lg border border-warning bg-warning/10 p-3 text-sm text-foreground" data-testid="system">
          Esta es una plantilla del sistema: otros servicios dependen de su nombre y de sus parámetros, y un cambio equivocado puede romper sus envíos.
          Se conserva el original para poder restaurarlo desde el historial.
          <label class="mt-2 flex items-center gap-2">
            <input type="checkbox" [ngModel]="confirmSystem()" (ngModelChange)="confirmSystem.set($event)" name="confirm-system" data-testid="confirm-system" />
            Entiendo que otros servicios dependen de esta plantilla y quiero poder cambiarla
          </label>
        </div>
      }

      @if (conflict()) {
        <div role="alert" class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-foreground" data-testid="conflict">
          Alguien guardó esta plantilla mientras la editabas. Recarga para ver su versión; tus cambios se perderán si no los copias antes.
          <app-button variant="secondary" size="sm" class="ml-2" (click)="reload()">Recargar</app-button>
        </div>
      }

      <app-card class="block mb-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="te-description" class="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
            <input id="te-description" type="text" autocomplete="off" [maxlength]="descriptionMax" [ngModel]="description()" (ngModelChange)="onDescription($event)" [disabled]="locked()"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60" />
          </div>
          <div class="sm:col-span-2">
            <label for="te-subject" class="block text-sm font-medium text-foreground mb-1.5">Asunto del correo</label>
            <input id="te-subject" type="text" autocomplete="off" [maxlength]="subjectMax" [ngModel]="subject()" (ngModelChange)="subject.set($event)" [disabled]="locked()"
              placeholder="Opcional. Puedes usar datos del mensaje, por ejemplo: Tu código es \${vc}"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60" />
            <p class="mt-1 text-xs text-muted-foreground">Es el asunto de los correos que usan esta plantilla (cada idioma es una plantilla). Los datos van entre llaves con signo de pesos; si falta uno, el envío se rechaza.</p>
          </div>
          <div>
            <label for="te-type" class="block text-sm font-medium text-foreground mb-1.5">Tipo</label>
            <select id="te-type" [ngModel]="typeId()" (ngModelChange)="typeId.set($event)" [disabled]="locked()"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60">
              <option value="" disabled>Elige un tipo</option>
              @for (option of types(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
            </select>
          </div>
          <div>
            <label for="te-severity" class="block text-sm font-medium text-foreground mb-1.5">Severidad</label>
            <select id="te-severity" [ngModel]="severityId()" (ngModelChange)="severityId.set($event)" [disabled]="locked()"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60">
              <option value="" disabled>Elige una severidad</option>
              @for (option of severities(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
            </select>
          </div>
          @if (creating()) {
            <fieldset>
              <legend class="block text-sm font-medium text-foreground mb-1.5">Formato</legend>
              <div class="flex gap-4 text-sm text-foreground">
                <label class="inline-flex items-center gap-2"><input type="radio" name="format" value="MD" [checked]="format() === 'MD'" (change)="onFormat('MD')" /> Markdown</label>
                <label class="inline-flex items-center gap-2"><input type="radio" name="format" value="HTML" [checked]="format() === 'HTML'" (change)="onFormat('HTML')" /> HTML</label>
              </div>
            </fieldset>
            <div>
              <label for="te-file" class="block text-sm font-medium text-foreground mb-1.5">Archivo</label>
              <input id="te-file" type="text" autocomplete="off" [ngModel]="fileName()" (ngModelChange)="onFileName($event)"
                class="w-full px-4 py-2.5 border border-input rounded-lg text-sm font-mono bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
              <p class="text-xs text-muted-foreground mt-1">Se propone a partir de la descripción. Letras, números, guion y guion bajo; termina en <code>.{{ format() === 'MD' ? 'md' : 'html' }}</code>.</p>
            </div>
          } @else {
            <div class="sm:col-span-2 text-sm text-muted-foreground">Archivo: <code>{{ fileName() }}</code> · {{ format() === 'MD' ? 'Markdown' : 'HTML' }}</div>
          }
        </div>
      </app-card>

      <div class="grid gap-4 lg:grid-cols-2">
        <app-card title="Contenido" [subtitle]="format() === 'MD' ? 'Markdown con \${parámetros}' : 'HTML con \${parámetros}'" class="block">
          <textarea #editor id="te-content" aria-label="Contenido de la plantilla" rows="22" spellcheck="false" [ngModel]="content()" (ngModelChange)="content.set($event)" [readOnly]="locked()"
            class="w-full px-3 py-2 border border-input rounded-lg text-sm font-mono leading-relaxed bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"></textarea>
          <p class="text-xs text-muted-foreground mt-1">{{ bytes() }} de {{ maxBytes }} bytes</p>

          @if (problems().length > 0) {
            <ul class="mt-3 space-y-1" role="alert" data-testid="problems">
              @for (problem of problems(); track $index) {
                <li class="flex items-start gap-2 text-sm text-destructive">
                  <lucide-icon [img]="AlertTriangle" [size]="14" strokeWidth="2" class="mt-0.5 shrink-0" />
                  <span>{{ describe(problem) }}</span>
                  @if (problem.line > 0) {
                    <button type="button" class="ml-auto shrink-0 text-xs text-primary hover:underline" (click)="goToLine(problem.line)">Ir a la línea</button>
                  }
                </li>
              }
            </ul>
          }
        </app-card>

        <div class="space-y-4">
          <app-card title="Vista previa" subtitle="El correo tal como lo envía Mercury, con los parámetros de ejemplo" class="block">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="inline-flex overflow-hidden rounded-lg border border-border text-xs" role="group" aria-label="Ancho de la vista previa">
                <button type="button" class="inline-flex items-center gap-1 px-2.5 py-1.5" [class.bg-primary]="device() === 'desktop'" [class.text-primary-foreground]="device() === 'desktop'"
                  [attr.aria-pressed]="device() === 'desktop'" (click)="device.set('desktop')" data-testid="device-desktop">
                  <lucide-icon [img]="Monitor" [size]="14" strokeWidth="2" /> Escritorio
                </button>
                <button type="button" class="inline-flex items-center gap-1 px-2.5 py-1.5" [class.bg-primary]="device() === 'mobile'" [class.text-primary-foreground]="device() === 'mobile'"
                  [attr.aria-pressed]="device() === 'mobile'" (click)="device.set('mobile')" data-testid="device-mobile">
                  <lucide-icon [img]="Smartphone" [size]="14" strokeWidth="2" /> Móvil
                </button>
              </div>
              <span class="text-xs" role="status" data-testid="preview-state"
                [class.text-muted-foreground]="previewState() !== 'stale'" [class.text-warning]="previewState() === 'stale'">
                @switch (previewState()) {
                  @case ('updating') { <span data-testid="previewing">Actualizando…</span> }
                  @case ('stale') { Hay errores: se muestra la última versión válida }
                  @case ('ready') { Al día }
                  @default { Esperando contenido }
                }
              </span>
            </div>

            <div class="mb-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" data-testid="envelope">
              <p class="flex gap-2"><span class="w-14 shrink-0 text-muted-foreground">Asunto</span>
                @if (subjectPreview(); as sp) {
                  <span class="font-medium text-foreground break-words" data-testid="preview-subject">{{ sp.text }}</span>
                } @else {
                  <span class="italic text-muted-foreground" data-testid="preview-subject">Sin asunto en la plantilla: quien envía debe ponerlo</span>
                }
              </p>
              @if (subjectPreview()?.missing?.length) {
                <p class="mt-1 text-xs text-warning" data-testid="subject-missing">El asunto usa {{ subjectPreview()!.missing.join(', ') }} sin valor de ejemplo; si un envío no lo trae, Mercury lo rechaza.</p>
              }
              @if (subjectPreview()?.approximate) {
                <p class="mt-1 text-xs text-muted-foreground" data-testid="subject-approximate">Parte del asunto usa expresiones de FreeMarker: aquí se muestran tal cual y Mercury las resolverá al enviar.</p>
              }
            </div>

            @if (missingSamples().length > 0) {
              <p class="mb-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground" data-testid="missing-samples">
                Sin valor de ejemplo: <code>{{ missingSamples().join(', ') }}</code>. La vista previa los deja vacíos; en un envío real deben llegar o Mercury rechaza el mensaje.
              </p>
            }

            <div class="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-2">
              @if (previewing()) { <div class="iris-progress absolute inset-x-0 top-0" aria-hidden="true"></div> }
              <iframe #previewFrame title="Vista previa de la plantilla" sandbox="allow-same-origin" (load)="fitFrame()"
                class="mx-auto block rounded-md bg-white shadow-sm transition-[width,opacity] duration-300"
                [class.opacity-60]="previewState() === 'stale'"
                [style.width]="device() === 'mobile' ? mobileWidth + 'px' : '100%'" [style.max-width.%]="100" [style.height.px]="frameHeight()" data-testid="preview"></iframe>
            </div>
            <p class="mt-2 text-xs text-muted-foreground">Sin estilos añadidos: cada cliente de correo aplica su tipo de letra por defecto a lo que la plantilla no defina.</p>
          </app-card>
          <app-card title="Parámetros de ejemplo" subtitle="Una línea clave=valor por parámetro; solo para la vista previa" class="block">
            <textarea aria-label="Parámetros de ejemplo" rows="5" spellcheck="false" [ngModel]="paramsText()" (ngModelChange)="paramsText.set($event)"
              class="w-full px-3 py-2 border border-input rounded-lg text-sm font-mono bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"></textarea>
            @if (detected().length > 0) {
              <p class="text-xs text-muted-foreground mt-1" data-testid="detected">La plantilla usa: <code>{{ detected().join(', ') }}</code></p>
            }
          </app-card>
        </div>
      </div>

      @if (!creating() && exists()) {
        <app-card title="Historial" subtitle="Cada guardado queda como una versión; restaurar guarda la versión antigua como una nueva" class="block mt-4">
          <app-button variant="secondary" size="sm" (click)="toggleHistory()" data-testid="history-toggle">
            <lucide-icon [img]="History" [size]="14" strokeWidth="2" /> {{ historyOpen() ? 'Ocultar historial' : 'Ver historial' }}
          </app-button>

          @if (historyOpen()) {
            @if (historyError()) {
              <p role="alert" class="mt-3 text-sm text-destructive" data-testid="history-error">No se pudo cargar el historial.</p>
            } @else if (historyLoading()) {
              <p class="mt-3 text-sm text-muted-foreground">Cargando historial…</p>
            } @else if (versions().length === 0) {
              <p class="mt-3 text-sm text-muted-foreground" data-testid="history-empty">Aún no hay versiones guardadas.</p>
            } @else {
              <ul class="mt-3 divide-y divide-border text-sm" data-testid="versions">
                @for (version of versions(); track version.version) {
                  <li class="flex flex-wrap items-center gap-2 py-2" data-testid="version-row">
                    <span class="font-medium text-foreground">Versión {{ version.version }}</span>
                    <app-badge [color]="version.reason === 'BASELINE' ? 'warning' : 'neutral'">{{ reasonLabel(version.reason) }}</app-badge>
                    <span class="text-muted-foreground">{{ when(version) ? (when(version) | date: 'short') : '' }} · {{ version.sizeBytes }} bytes</span>
                    <span class="ml-auto flex gap-1">
                      <app-button variant="ghost" size="sm" (click)="compare(version)" [disabled]="restoring()">Comparar</app-button>
                      <app-button variant="ghost" size="sm" (click)="askRestore(version)" [disabled]="restoring() || locked()">
                        <lucide-icon [img]="RotateCcw" [size]="14" strokeWidth="2" /> Restaurar
                      </app-button>
                    </span>
                  </li>
                }
              </ul>
            }

            @if (pendingRestore(); as target) {
              <div role="alertdialog" class="mt-3 rounded-lg border border-border bg-card p-3 text-sm text-foreground" data-testid="restore-confirm">
                ¿Restaurar la versión {{ target.version }}? El contenido actual se guarda en el historial y se reemplaza por esa versión.
                @if (dirty()) { <strong class="block mt-1">Tienes cambios sin guardar: se perderán.</strong> }
                <div class="mt-2 flex gap-2">
                  <app-button size="sm" (click)="confirmRestore()" [disabled]="restoring()">{{ restoring() ? 'Restaurando…' : 'Restaurar' }}</app-button>
                  <app-button variant="ghost" size="sm" (click)="pendingRestore.set(null)" [disabled]="restoring()">Cancelar</app-button>
                </div>
              </div>
            }

            @if (comparison(); as view) {
              <div class="mt-3" data-testid="comparison">
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-foreground">Versión {{ view.version }} → lo que tienes ahora ({{ view.changes }} {{ view.changes === 1 ? 'línea distinta' : 'líneas distintas' }})</span>
                  <app-button variant="ghost" size="sm" (click)="comparison.set(null)">Cerrar</app-button>
                </div>
                <pre class="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-background p-2 text-xs leading-relaxed"><code>@for (line of view.lines; track $index) {<span [class]="lineClass(line)" data-testid="diff-line">{{ marker(line) }} {{ line.text }}
</span>}</code></pre>
              </div>
            }
          }
        </app-card>
      }
    }
  `,
})
export class TemplateEditorPageComponent implements OnInit, HasUnsavedChanges {
  private readonly templates = inject(TemplatesService);
  private readonly references = inject(ReferenceDataService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('previewFrame');
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute).snapshot.paramMap;
  private readonly id: string | null = this.route.get('id') ?? null;
  /** La aplicación de la URL; sin ella (rutas antiguas), la que el BFF tiene configurada. */
  readonly applicationId: string | null = this.route.get('applicationId') ?? null;
  readonly applicationName = signal<string | null>(null);
  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');

  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly Lock = Lock;
  readonly History = History;
  readonly RotateCcw = RotateCcw;
  readonly Eye = Eye;
  readonly AlertTriangle = AlertTriangle;
  readonly Monitor = Monitor;
  readonly Smartphone = Smartphone;
  readonly mobileWidth = MOBILE_WIDTH_PX;
  /** Al salir del editor: la lista de aplicaciones si hay una aplicación en la URL, y desde ahí sus plantillas. */
  readonly listUrl = templatesUrl;
  readonly applicationUrl = this.applicationId ? `${templatesUrl}/${this.applicationId}` : templatesUrl;
  readonly descriptionMax = TEMPLATE_DESCRIPTION_MAX;
  readonly subjectMax = TEMPLATE_SUBJECT_MAX;
  readonly maxBytes = TEMPLATE_CONTENT_MAX_BYTES;

  readonly creating = signal(this.id === null);
  readonly ready = signal(false);
  readonly loadError = signal<LoadFailure | null>(null);
  readonly types = signal<ReferenceItem[]>([]);
  readonly severities = signal<ReferenceItem[]>([]);

  readonly description = signal('');
  readonly subject = signal('');
  readonly typeId = signal('');
  readonly severityId = signal('');
  readonly format = signal<EditorFormat>('MD');
  readonly fileName = signal('');
  readonly content = signal('');
  readonly paramsText = signal('');
  readonly detected = signal<string[]>([]);

  readonly exists = signal(false);
  readonly system = signal(false);
  readonly confirmSystem = signal(false);
  /** A system template stays locked until the person confirms they know what depends on it. */
  readonly locked = computed(() => this.system() && !this.confirmSystem());
  readonly saving = signal(false);
  readonly conflict = signal(false);
  readonly problems = signal<TemplateProblem[]>([]);
  readonly previewing = signal(false);
  /**
   * The document shown in the preview iframe; it is written to the frame as `srcdoc`. The sandbox allows no scripts, forms or
   * pop-ups (and the document's own CSP blocks scripts too); `allow-same-origin` is only there so the page can read the height
   * of the rendered e-mail and show it whole, without an inner scroll bar.
   */
  readonly previewDoc = signal('');
  /** The last preview had problems: the frame keeps the last valid one, dimmed, until the template renders again. */
  readonly previewStale = signal(false);
  readonly device = signal<'desktop' | 'mobile'>('desktop');
  readonly frameHeight = signal(FRAME_MIN_PX);
  readonly previewState = computed(() =>
    this.previewing() ? 'updating' : this.previewStale() ? 'stale' : this.previewDoc() !== '' ? 'ready' : 'empty',
  );
  /** The subject with the sample values, as the recipient would read it; null when the template defines none. */
  readonly subjectPreview = computed(() => (this.subject().trim() === '' ? null : renderSubject(this.subject(), parseParams(this.paramsText()).params)));
  /** Parameters the template uses that have no sample value. */
  readonly missingSamples = computed(() => emptySamples(this.detected(), parseParams(this.paramsText()).params));

  readonly historyOpen = signal(false);
  readonly historyLoading = signal(false);
  readonly historyError = signal(false);
  readonly versions = signal<TemplateVersion[]>([]);
  readonly comparison = signal<{ version: number; lines: DiffLine[]; changes: number } | null>(null);
  readonly pendingRestore = signal<TemplateVersion | null>(null);
  readonly restoring = signal(false);

  private etag: string | null = null;
  private fileNameTouched = false;
  /** Each preview gets a number; an answer that arrives after a newer request was sent is dropped, so the frame never goes back. */
  private previewSeq = 0;
  private saved = signal({ description: '', subject: '', typeId: '', severityId: '', content: '' });

  readonly bytes = computed(() => new TextEncoder().encode(this.content()).length);
  readonly dirty = computed(() => {
    const saved = this.saved();
    return (
      this.content() !== saved.content ||
      this.description() !== saved.description ||
      this.subject() !== saved.subject ||
      this.typeId() !== saved.typeId ||
      this.severityId() !== saved.severityId
    );
  });

  constructor() {
    // the preview goes straight into the sandboxed frame: Angular's sanitizer would strip the styles an e-mail needs
    effect(() => {
      const frame = this.frame()?.nativeElement;
      if (frame) frame.srcdoc = this.previewDoc();
    });

    // the preview follows what is typed, a moment after the last key; one already rendered for the same text shows at once
    effect((onCleanup) => {
      const name = this.previewName();
      const content = this.content();
      const params = this.paramsText();
      if (!this.ready()) return;
      const cached = this.templates.peekPreview(name, content, parseParams(params).params, this.applicationId ?? undefined);
      if (cached) {
        untracked(() => {
          this.previewSeq++;
          this.previewing.set(false);
          this.applyPreview(cached);
        });
        return;
      }
      // outside Angular's zone so a pending preview never keeps the application from being stable
      const timer = this.zone.runOutsideAngular(() => setTimeout(() => this.zone.run(() => void this.runPreview(name, content, params)), PREVIEW_DELAY_MS));
      onCleanup(() => clearTimeout(timer));
    });

    // the sample values belong to the template: reopening it (or opening it right after creating it) keeps them
    effect(() => {
      const text = this.paramsText();
      if (this.id !== null && this.ready()) this.templates.rememberSamples(this.id, text);
    });
  }

  async ngOnInit(): Promise<void> {
    this.references.templateTypes().then((list) => this.types.set(list), () => undefined);
    this.references.severityTypes().then((list) => this.severities.set(list), () => undefined);
    this.nameApplication();
    if (this.id === null) {
      this.content.set(STARTER[this.format()]);
      this.saved.set({ description: '', subject: '', typeId: '', severityId: '', content: '' });
      this.ready.set(true);
      return;
    }
    const snapshot = this.templates.peek(this.id);
    if (snapshot) {
      // what was just saved or read is drawn at once; the server confirms it in the background
      this.hydrate(snapshot.summary, snapshot.content, snapshot.samples);
      void this.revalidate(this.id);
      return;
    }
    await this.load(this.id);
  }

  /** Para la ruta de migas; si no se puede leer la lista, solo falta el nombre. */
  private nameApplication(): void {
    if (!this.applicationId) return;
    this.templates.applications().then(
      (list) => this.applicationName.set(list.find((application) => application.id === this.applicationId)?.name ?? null),
      () => undefined,
    );
  }

  /** Vuelve a leer la plantilla del servidor, descartando lo escrito. */
  async reload(): Promise<void> {
    if (this.id === null) return;
    this.conflict.set(false);
    this.problems.set([]);
    this.comparison.set(null);
    this.pendingRestore.set(null);
    await this.load(this.id);
    if (this.historyOpen()) await this.loadHistory();
  }

  /** Ajusta el alto del marco al del correo, para verlo completo como en el buzón. */
  fitFrame(): void {
    const doc = this.frame()?.nativeElement.contentDocument;
    const height = doc?.documentElement?.scrollHeight ?? 0;
    if (height > 0) this.frameHeight.set(Math.min(FRAME_MAX_PX, Math.max(FRAME_MIN_PX, height + 2)));
  }

  hasUnsavedChanges(): boolean {
    return this.dirty() && !this.saving();
  }

  @HostListener('window:beforeunload', ['$event'])
  protected warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  readonly describe = describeProblem;

  onDescription(value: string): void {
    this.description.set(value);
    if (this.creating() && !this.fileNameTouched) this.fileName.set(fileNameFor(value, this.format()));
  }

  onFileName(value: string): void {
    this.fileNameTouched = true;
    this.fileName.set(value.trim());
  }

  onFormat(format: EditorFormat): void {
    const starter = this.content() === STARTER[this.format()];
    this.format.set(format);
    this.fileName.set(this.fileNameTouched ? withFormat(this.fileName(), format) : fileNameFor(this.description(), format));
    // an untouched starter text follows the format; anything the person wrote stays
    if (starter) this.content.set(STARTER[format]);
  }

  readonly when = (version: TemplateVersion) => toDate(version.createdAt);

  reasonLabel(reason: TemplateVersion['reason']): string {
    return { SAVE: 'Guardado', RESTORE: 'Restauración', BASELINE: 'Original' }[reason] ?? reason;
  }

  marker(line: DiffLine): string {
    return { same: ' ', add: '+', del: '-' }[line.kind];
  }

  lineClass(line: DiffLine): string {
    return { same: 'block text-muted-foreground', add: 'block bg-success/15 text-foreground', del: 'block bg-destructive/15 text-foreground' }[line.kind];
  }

  async toggleHistory(): Promise<void> {
    this.historyOpen.update((open) => !open);
    if (this.historyOpen()) await this.loadHistory();
  }

  /** Shows what changed between a saved version and the text in the editor. */
  async compare(version: TemplateVersion): Promise<void> {
    try {
      const full = await this.templates.version(this.id as string, version.version);
      const lines = diffLines(full.content ?? '', this.content());
      this.comparison.set({ version: version.version, lines, changes: changeCount(lines) });
    } catch (error) {
      this.notifications.error('No se pudo leer la versión', this.failure(error));
    }
  }

  askRestore(version: TemplateVersion): void {
    this.pendingRestore.set(version);
  }

  async confirmRestore(): Promise<void> {
    const target = this.pendingRestore();
    if (!target || this.etag === null) return;
    this.restoring.set(true);
    try {
      const restored = await this.templates.restore(this.id as string, target.version, this.etag, this.system() && this.confirmSystem());
      this.applyContent(restored);
      this.content.set(restored.content);
      this.saved.update((s) => ({ ...s, content: restored.content }));
      this.problems.set([]);
      this.comparison.set(null);
      this.pendingRestore.set(null);
      this.conflict.set(false);
      this.notifications.success('Versión restaurada', `Versión ${target.version}`);
      await this.loadHistory();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 412) this.conflict.set(true);
      this.problemsFrom(error);
      this.notifications.error('No se pudo restaurar', this.failure(error));
    } finally {
      this.restoring.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    this.historyLoading.set(true);
    this.historyError.set(false);
    try {
      this.versions.set(await this.templates.versions(this.id as string));
    } catch {
      this.historyError.set(true);
    } finally {
      this.historyLoading.set(false);
    }
  }

  goToLine(line: number): void {
    const area = this.editor()?.nativeElement;
    if (!area) return;
    const { start, end } = lineRange(this.content(), line);
    area.focus();
    area.setSelectionRange(start, end);
  }

  async save(): Promise<void> {
    if (this.locked() || this.saving()) return;
    const invalid = this.validate();
    if (invalid) {
      this.notifications.error('Revisa la plantilla', invalid);
      return;
    }
    this.saving.set(true);
    this.problems.set([]);
    try {
      if (this.creating()) await this.create();
      else await this.update();
    } finally {
      this.saving.set(false);
    }
  }

  /** The first thing wrong with the form, or null. Mercury checks again. */
  validate(): string | null {
    if (this.description().trim() === '') return 'Escribe una descripción.';
    if (this.typeId() === '') return 'Elige un tipo de plantilla.';
    if (this.severityId() === '') return 'Elige una severidad.';
    if (this.creating() && !TEMPLATE_FILE_NAME.test(this.fileName())) {
      return 'El nombre del archivo solo admite letras, números, guion y guion bajo, y termina en .md o .html.';
    }
    if (this.bytes() > TEMPLATE_CONTENT_MAX_BYTES) return `El contenido supera ${TEMPLATE_CONTENT_MAX_BYTES} bytes.`;
    return null;
  }

  private async create(): Promise<void> {
    let created: TemplateSummary;
    try {
      created = await this.templates.create({
        description: this.description().trim(),
        location: this.fileName(),
        fileFormat: this.format(),
        templateTypeId: this.typeId(),
        severityTypeId: this.severityId(),
        ...(this.subject().trim() === '' ? {} : { subject: this.subject().trim() }),
      }, this.applicationId ?? undefined);
    } catch (error) {
      this.notifications.error('No se pudo crear la plantilla', this.failure(error));
      return;
    }
    this.templates.rememberSamples(created.id, this.paramsText());
    try {
      await this.templates.saveContent(created.id, this.content(), null);
      this.notifications.success('Plantilla creada', created.description);
    } catch (error) {
      // the template exists without its text: take the person to it so they can finish
      this.problemsFrom(error);
      this.notifications.warning('Plantilla creada sin contenido', `${this.failure(error)} Ábrela para guardar el contenido.`);
    }
    this.saved.set({ ...this.saved(), content: this.content(), description: this.description(), subject: this.subject(), typeId: this.typeId(), severityId: this.severityId() });
    await this.router.navigateByUrl(`${this.applicationUrl}/${created.id}`, { replaceUrl: true });
  }

  private async update(): Promise<void> {
    const id = this.id as string;
    const before = this.saved();
    const fields = { description: this.description(), subject: this.subject(), typeId: this.typeId(), severityId: this.severityId() };
    const content = this.content();
    const metadataChanged = fields.description !== before.description || fields.subject !== before.subject || fields.typeId !== before.typeId || fields.severityId !== before.severityId;
    // the data and the text are independent in Mercury: both requests go out together instead of one after the other
    const [metadata, text] = await Promise.allSettled([
      metadataChanged
        ? this.templates.update(id, {
            description: fields.description.trim(),
            templateTypeId: fields.typeId,
            severityTypeId: fields.severityId,
            // vacío lo quita en Mercury; solo se envía si cambió, para no tocar el de una plantilla que no se editó aquí
            ...(fields.subject !== before.subject ? { subject: fields.subject.trim() } : {}),
          })
        : Promise.resolve(null),
      content !== before.content
        ? this.templates.saveContent(id, content, this.exists() ? this.etag : null, this.system() && this.confirmSystem())
        : Promise.resolve(null),
    ]);
    if (metadata.status === 'fulfilled' && metadataChanged) this.saved.update((s) => ({ ...s, ...fields }));
    if (text.status === 'fulfilled' && text.value) {
      this.applyContent(text.value);
      this.saved.update((s) => ({ ...s, content: text.value!.content }));
    }
    const failed = [metadata, text].find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (!failed) {
      this.conflict.set(false);
      this.notifications.success('Plantilla guardada', fields.description.trim());
      return;
    }
    const error: unknown = failed.reason;
    if (error instanceof HttpErrorResponse && error.status === 412) this.conflict.set(true);
    this.problemsFrom(error);
    this.notifications.error('No se pudo guardar', this.failure(error));
  }

  private async load(id: string): Promise<void> {
    try {
      const [summary, content] = await Promise.all([this.templates.get(id), this.templates.content(id)]);
      this.hydrate(summary, content, this.templates.peek(id)?.samples ?? null);
    } catch (error) {
      this.loadError.set(loadFailure(error));
    }
  }

  /** Fills the form with a template and its text; the sample values the person wrote before are kept. */
  private hydrate(summary: TemplateSummary, content: TemplateContent, samples: string | null): void {
    this.description.set(summary.description);
    this.subject.set(summary.subject ?? '');
    this.typeId.set(summary.templateTypeId);
    this.severityId.set(summary.severityTypeId);
    this.fileName.set(content.name);
    this.format.set(formatOfFile(content.name));
    this.applyContent(content);
    this.content.set(content.content);
    this.saved.set({ description: summary.description, subject: summary.subject ?? '', typeId: summary.templateTypeId, severityId: summary.severityTypeId, content: content.content });
    this.paramsText.set(withDetectedParams(samples ?? '', content.parameters));
    this.ready.set(true);
  }

  /** Asks the server for the template drawn from memory; if nothing was typed meanwhile, its answer replaces what is shown. */
  private async revalidate(id: string): Promise<void> {
    try {
      const [summary, content] = await Promise.all([this.templates.get(id), this.templates.content(id)]);
      if (!this.dirty()) this.hydrate(summary, content, this.paramsText());
      else if (content.exists && content.etag !== this.etag) this.conflict.set(true);
    } catch {
      // what is shown stays; saving still checks the etag, so nothing is overwritten by mistake
    }
  }

  private applyContent(content: TemplateContent): void {
    this.etag = content.exists ? content.etag : null;
    this.exists.set(content.exists);
    this.system.set(content.system);
    this.detected.set(content.parameters);
  }

  private previewName(): string {
    const name = this.fileName();
    return TEMPLATE_FILE_NAME.test(name) ? name : `vista-previa.${this.format() === 'MD' ? 'md' : 'html'}`;
  }

  private async runPreview(name: string, content: string, paramsText: string): Promise<void> {
    const seq = ++this.previewSeq;
    untracked(() => this.previewing.set(true));
    try {
      const result = await this.templates.preview(name, content, parseParams(paramsText).params, this.applicationId ?? undefined);
      if (seq === this.previewSeq) this.applyPreview(result);
    } catch (error) {
      if (seq === this.previewSeq) {
        this.problems.set([{ line: 0, column: 0, message: this.failure(error) }]);
        this.previewStale.set(this.previewDoc() !== '');
      }
    } finally {
      if (seq === this.previewSeq) this.previewing.set(false);
    }
  }

  /** Shows a preview result; one with problems keeps the last valid e-mail on screen, marked as out of date. */
  private applyPreview(result: TemplatePreviewResult): void {
    this.detected.set(result.parameters);
    this.problems.set(result.problems);
    if (result.ok) this.previewDoc.set(previewDocument(result.output));
    this.previewStale.set(!result.ok && this.previewDoc() !== '');
    this.paramsText.update((current) => withDetectedParams(current, result.parameters));
  }

  private problemsFrom(error: unknown): void {
    const body = error instanceof HttpErrorResponse && error.status === 422 ? (error.error as TemplateProblemsBody) : null;
    if (body?.problems) this.problems.set(body.problems);
  }

  private failure(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    switch (status) {
      case 403:
        return 'No tienes permiso para cambiar esta plantilla, o es una plantilla del sistema y falta confirmarlo.';
      case 409:
        return serviceMessage(error) ?? 'Ya existe una plantilla igual.';
      case 412:
        return 'Alguien guardó la plantilla antes que tú.';
      case 413:
        return `El contenido supera ${TEMPLATE_CONTENT_MAX_BYTES} bytes.`;
      case 422:
        return 'La plantilla tiene errores de sintaxis; mira los avisos junto al contenido.';
      case 400:
        return 'Mercury rechazó los datos. Revisa la descripción, el tipo, la severidad y el nombre del archivo.';
      case 404:
        return 'La plantilla ya no existe o no tiene un archivo editable.';
      case 503:
        return 'La gestión de plantillas no está configurada en este entorno.';
      default:
        return 'Inténtalo de nuevo.';
    }
  }
}
