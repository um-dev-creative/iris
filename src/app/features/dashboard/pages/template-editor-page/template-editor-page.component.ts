import { ChangeDetectionStrategy, Component, ElementRef, HostListener, NgZone, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertTriangle, ArrowLeft, Eye, LucideAngularModule, Lock, Save } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { HasUnsavedChanges } from '../../../../core/guards';
import { NotificationService } from '../../../../core/services';
import {
  ReferenceItem,
  TEMPLATE_CONTENT_MAX_BYTES,
  TEMPLATE_DESCRIPTION_MAX,
  TemplateContent,
  TemplateProblem,
  TemplateProblemsBody,
  TemplateSummary,
} from '../../../../core/models';
import { ROUTE_PATHS, routeUrl } from '../../../../core/routes';
import { ReferenceDataService, TemplatesService } from '../../services';
import { loadFailure, LoadFailure } from '../../utils/campaign-errors';
import { parseParams } from '../../utils/campaign-input';
import {
  EditorFormat,
  TEMPLATE_FILE_NAME,
  describeProblem,
  fileNameFor,
  formatOfFile,
  lineRange,
  previewDocument,
  withDetectedParams,
  withFormat,
} from '../../utils/template-input';

const listUrl = routeUrl(ROUTE_PATHS.DASHBOARD, ROUTE_PATHS.TEMPLATES);
const PREVIEW_DELAY_MS = 500;
const STARTER: Record<EditorFormat, string> = {
  MD: '# Hola ${name}\n\nEscribe aquí el mensaje. Usa **negritas**, listas y [enlaces](https://example.com).\n',
  HTML: '<h1>Hola ${name}</h1>\n<p>Escribe aquí el mensaje.</p>\n',
};

/**
 * Crear (`templates/new`) o editar (`templates/:id`) una plantilla: metadatos, contenido en HTML o Markdown con vista previa, y
 * guardado con bloqueo optimista (Mercury responde 412 si alguien guardó antes). Las plantillas del sistema se abren de solo lectura.
 */
@Component({
  selector: 'app-template-editor-page',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="listUrl" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <lucide-icon [img]="ArrowLeft" [size]="14" strokeWidth="2" /> Plantillas
    </a>

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
            @if (readOnly()) { <app-badge color="warning"><lucide-icon [img]="Lock" [size]="12" strokeWidth="2" class="mr-1" /> Solo lectura</app-badge> }
            @if (dirty()) { <app-badge color="primary" data-testid="dirty">Cambios sin guardar</app-badge> }
            @if (!creating() && !exists()) { <app-badge color="warning">Sin contenido guardado</app-badge> }
          </div>
        </div>
        <div class="flex gap-2">
          <app-button (click)="save()" [disabled]="saving() || readOnly() || !dirty()" data-testid="save">
            <lucide-icon [img]="Save" [size]="16" strokeWidth="2" /> {{ saving() ? 'Guardando…' : 'Guardar' }}
          </app-button>
        </div>
      </div>

      @if (readOnly()) {
        <p role="status" class="mb-4 rounded-lg border border-warning bg-warning/10 p-3 text-sm text-foreground" data-testid="readonly">
          Esta es una plantilla del sistema: otros servicios dependen de su nombre y de sus parámetros, por eso no se puede cambiar desde Iris. Puedes verla y previsualizarla.
        </p>
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
            <input id="te-description" type="text" autocomplete="off" [maxlength]="descriptionMax" [ngModel]="description()" (ngModelChange)="onDescription($event)" [disabled]="readOnly()"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60" />
          </div>
          <div>
            <label for="te-type" class="block text-sm font-medium text-foreground mb-1.5">Tipo</label>
            <select id="te-type" [ngModel]="typeId()" (ngModelChange)="typeId.set($event)" [disabled]="readOnly()"
              class="w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-60">
              <option value="" disabled>Elige un tipo</option>
              @for (option of types(); track option.id) { <option [value]="option.id">{{ option.name }}</option> }
            </select>
          </div>
          <div>
            <label for="te-severity" class="block text-sm font-medium text-foreground mb-1.5">Severidad</label>
            <select id="te-severity" [ngModel]="severityId()" (ngModelChange)="severityId.set($event)" [disabled]="readOnly()"
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
          <textarea #editor id="te-content" aria-label="Contenido de la plantilla" rows="22" spellcheck="false" [ngModel]="content()" (ngModelChange)="content.set($event)" [readOnly]="readOnly()"
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
          <app-card title="Vista previa" subtitle="Así se verá el mensaje con los parámetros de ejemplo" class="block">
            <div class="relative">
              @if (previewing()) { <span class="absolute right-2 top-2 text-xs text-muted-foreground" data-testid="previewing">Actualizando…</span> }
              <iframe title="Vista previa de la plantilla" sandbox="" class="h-80 w-full rounded-lg border border-border bg-white" [srcdoc]="previewHtml()" data-testid="preview"></iframe>
            </div>
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
    }
  `,
})
export class TemplateEditorPageComponent implements OnInit, HasUnsavedChanges {
  private readonly templates = inject(TemplatesService);
  private readonly references = inject(ReferenceDataService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly zone = inject(NgZone);
  private readonly id: string | null = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? null;
  private readonly editor = viewChild<ElementRef<HTMLTextAreaElement>>('editor');

  readonly ArrowLeft = ArrowLeft;
  readonly Save = Save;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly AlertTriangle = AlertTriangle;
  readonly listUrl = listUrl;
  readonly descriptionMax = TEMPLATE_DESCRIPTION_MAX;
  readonly maxBytes = TEMPLATE_CONTENT_MAX_BYTES;

  readonly creating = signal(this.id === null);
  readonly ready = signal(false);
  readonly loadError = signal<LoadFailure | null>(null);
  readonly types = signal<ReferenceItem[]>([]);
  readonly severities = signal<ReferenceItem[]>([]);

  readonly description = signal('');
  readonly typeId = signal('');
  readonly severityId = signal('');
  readonly format = signal<EditorFormat>('MD');
  readonly fileName = signal('');
  readonly content = signal('');
  readonly paramsText = signal('');
  readonly detected = signal<string[]>([]);

  readonly exists = signal(false);
  readonly readOnly = signal(false);
  readonly saving = signal(false);
  readonly conflict = signal(false);
  readonly problems = signal<TemplateProblem[]>([]);
  readonly previewing = signal(false);
  readonly previewHtml = signal<SafeHtml>('');

  private etag: string | null = null;
  private fileNameTouched = false;
  private saved = signal({ description: '', typeId: '', severityId: '', content: '' });

  readonly bytes = computed(() => new TextEncoder().encode(this.content()).length);
  readonly dirty = computed(() => {
    const saved = this.saved();
    return (
      this.content() !== saved.content ||
      this.description() !== saved.description ||
      this.typeId() !== saved.typeId ||
      this.severityId() !== saved.severityId
    );
  });

  constructor() {
    // the preview follows what is typed, a moment after the last key
    effect((onCleanup) => {
      const name = this.previewName();
      const content = this.content();
      const params = this.paramsText();
      if (!this.ready()) return;
      // outside Angular's zone so a pending preview never keeps the application from being stable
      const timer = this.zone.runOutsideAngular(() => setTimeout(() => this.zone.run(() => void this.runPreview(name, content, params)), PREVIEW_DELAY_MS));
      onCleanup(() => clearTimeout(timer));
    });
  }

  async ngOnInit(): Promise<void> {
    this.references.templateTypes().then((list) => this.types.set(list), () => undefined);
    this.references.severityTypes().then((list) => this.severities.set(list), () => undefined);
    if (this.id === null) {
      this.content.set(STARTER[this.format()]);
      this.saved.set({ description: '', typeId: '', severityId: '', content: '' });
      this.ready.set(true);
      return;
    }
    await this.load(this.id);
  }

  /** Vuelve a leer la plantilla del servidor, descartando lo escrito. */
  async reload(): Promise<void> {
    if (this.id === null) return;
    this.conflict.set(false);
    this.problems.set([]);
    await this.load(this.id);
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

  goToLine(line: number): void {
    const area = this.editor()?.nativeElement;
    if (!area) return;
    const { start, end } = lineRange(this.content(), line);
    area.focus();
    area.setSelectionRange(start, end);
  }

  async save(): Promise<void> {
    if (this.readOnly() || this.saving()) return;
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
      });
    } catch (error) {
      this.notifications.error('No se pudo crear la plantilla', this.failure(error));
      return;
    }
    try {
      await this.templates.saveContent(created.id, this.content(), null);
      this.notifications.success('Plantilla creada', created.description);
    } catch (error) {
      // the template exists without its text: take the person to it so they can finish
      this.problemsFrom(error);
      this.notifications.warning('Plantilla creada sin contenido', `${this.failure(error)} Ábrela para guardar el contenido.`);
    }
    this.saved.set({ ...this.saved(), content: this.content(), description: this.description(), typeId: this.typeId(), severityId: this.severityId() });
    await this.router.navigateByUrl(`${listUrl}/${created.id}`, { replaceUrl: true });
  }

  private async update(): Promise<void> {
    const id = this.id as string;
    const before = this.saved();
    try {
      if (this.description() !== before.description || this.typeId() !== before.typeId || this.severityId() !== before.severityId) {
        await this.templates.update(id, { description: this.description().trim(), templateTypeId: this.typeId(), severityTypeId: this.severityId() });
        this.saved.update((s) => ({ ...s, description: this.description(), typeId: this.typeId(), severityId: this.severityId() }));
      }
      if (this.content() !== before.content) {
        const saved = await this.templates.saveContent(id, this.content(), this.exists() ? this.etag : null);
        this.applyContent(saved);
        this.saved.update((s) => ({ ...s, content: saved.content }));
      }
      this.conflict.set(false);
      this.notifications.success('Plantilla guardada', this.description().trim());
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 412) this.conflict.set(true);
      this.problemsFrom(error);
      this.notifications.error('No se pudo guardar', this.failure(error));
    }
  }

  private async load(id: string): Promise<void> {
    try {
      const [summary, content] = await Promise.all([this.templates.get(id), this.templates.content(id)]);
      this.description.set(summary.description);
      this.typeId.set(summary.templateTypeId);
      this.severityId.set(summary.severityTypeId);
      this.fileName.set(content.name);
      this.format.set(formatOfFile(content.name));
      this.applyContent(content);
      this.content.set(content.content);
      this.saved.set({ description: summary.description, typeId: summary.templateTypeId, severityId: summary.severityTypeId, content: content.content });
      this.paramsText.set(withDetectedParams('', content.parameters));
      this.ready.set(true);
    } catch (error) {
      this.loadError.set(loadFailure(error));
    }
  }

  private applyContent(content: TemplateContent): void {
    this.etag = content.exists ? content.etag : null;
    this.exists.set(content.exists);
    this.readOnly.set(content.readOnly);
    this.detected.set(content.parameters);
  }

  private previewName(): string {
    const name = this.fileName();
    return TEMPLATE_FILE_NAME.test(name) ? name : `vista-previa.${this.format() === 'MD' ? 'md' : 'html'}`;
  }

  private async runPreview(name: string, content: string, paramsText: string): Promise<void> {
    untracked(() => this.previewing.set(true));
    try {
      const result = await this.templates.preview(name, content, parseParams(paramsText).params);
      this.detected.set(result.parameters);
      this.problems.set(result.problems);
      this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(result.ok ? previewDocument(result.output) : ''));
      this.paramsText.update((current) => withDetectedParams(current, result.parameters));
    } catch (error) {
      this.problems.set([{ line: 0, column: 0, message: this.failure(error) }]);
    } finally {
      this.previewing.set(false);
    }
  }

  private problemsFrom(error: unknown): void {
    const body = error instanceof HttpErrorResponse && error.status === 422 ? (error.error as TemplateProblemsBody) : null;
    if (body?.problems) this.problems.set(body.problems);
  }

  private failure(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    switch (status) {
      case 403:
        return 'No tienes permiso para cambiar esta plantilla, o es una plantilla del sistema.';
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
