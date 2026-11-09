import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AppWindow, Eye, FolderPen, LucideAngularModule, Plus, Save } from 'lucide-angular';
import { AppBadgeComponent, AppButtonComponent, AppCardComponent } from '../../../../shared/components';
import { NotificationService } from '../../../../core/services';
import {
  ApplicationFolder,
  ManagedApplication,
  ReferenceItem,
  TEMPLATE_FORMATS,
  TEMPLATE_LOCATION_PATTERN,
  TemplateContent,
  TemplateProblem,
  TemplateSummary,
} from '../../../../core/models';
import { TemplatesService } from '../../services';

type LoadError = 'forbidden' | 'failed';

const INPUT =
  'w-full px-4 py-2.5 border border-input rounded-lg text-sm bg-background text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring';

/**
 * Aplicaciones que usan Mercury para su mensajería y sus plantillas: elegir una aplicación, ver y renombrar su carpeta, listar,
 * crear y editar sus plantillas con vista previa. Mercury decide qué aplicaciones puede gestionar cada persona; si ninguna, 403.
 */
@Component({
  selector: 'app-applications-page',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, AppCardComponent, AppButtonComponent, AppBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-foreground">Aplicaciones y plantillas</h2>
      <p class="text-sm text-muted-foreground mt-1">
        Aplicaciones que envían mensajes con Mercury y el texto de cada mensaje. Solo ves las aplicaciones que administras.
      </p>
    </div>

    @if (loadError() === 'forbidden') {
      <div role="alert" class="rounded-xl border border-border bg-card p-6" data-testid="forbidden">
        No administras ninguna aplicación. Pide a un administrador de la plataforma que te asigne el permiso de plantillas en la aplicación.
      </div>
    } @else if (loadError() === 'failed') {
      <div role="alert" class="rounded-xl border border-destructive bg-destructive/10 p-6" data-testid="failed">
        No se pudieron cargar las aplicaciones.
        <app-button variant="secondary" size="sm" (click)="reload()">Reintentar</app-button>
      </div>
    } @else if (!service.loading() && service.applications().length === 0) {
      <div class="rounded-xl border border-border bg-card p-6" data-testid="empty">No hay aplicaciones para gestionar.</div>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6" data-testid="applications">
        @for (app of service.applications(); track app.id) {
          <button type="button" (click)="select(app)" [attr.aria-pressed]="selected()?.id === app.id"
            class="text-left rounded-xl border p-4 bg-card transition-colors"
            [class.border-ring]="selected()?.id === app.id" [class.border-border]="selected()?.id !== app.id">
            <div class="flex items-center gap-2 font-semibold text-foreground">
              <lucide-icon [img]="AppWindow" [size]="16" strokeWidth="2" /> {{ app.name }}
            </div>
            <div class="text-xs text-muted-foreground mt-1">{{ app.codeName }}</div>
          </button>
        }
      </div>
    }

    @if (selected(); as app) {
      <app-card [title]="'Carpeta de ' + app.name" subtitle="Dónde se guardan sus plantillas en el almacenamiento" class="block mb-6">
        @if (folder(); as f) {
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex-1 min-w-48">
              <label for="app-folder" class="block text-sm font-medium text-foreground mb-1.5">Carpeta</label>
              <input id="app-folder" name="folder" type="text" [class]="INPUT" [ngModel]="folderDraft()" (ngModelChange)="folderDraft.set($event)" />
            </div>
            <app-button variant="secondary" (click)="saveFolder()" [disabled]="!folderDraft().trim() || folderDraft().trim() === f.folder">
              <lucide-icon [img]="FolderPen" [size]="16" strokeWidth="2" /> Cambiar nombre
            </app-button>
            @if (!f.registered) {
              <app-badge>Sin registrar: se crea con la primera plantilla</app-badge>
            }
          </div>
          <p class="text-xs text-muted-foreground mt-2">Cambiar el nombre no mueve los archivos que ya existan.</p>
        }
      </app-card>

      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-lg font-semibold text-foreground">Plantillas</h3>
        <div class="flex gap-2">
          <input type="search" name="q" placeholder="Buscar" aria-label="Buscar plantillas" [class]="INPUT" [ngModel]="query()" (ngModelChange)="query.set($event)" (keyup.enter)="refreshTemplates()" />
          <app-button (click)="openForm()" [disabled]="formOpen()">
            <lucide-icon [img]="Plus" [size]="16" strokeWidth="2" /> Nueva plantilla
          </app-button>
        </div>
      </div>

      @if (formOpen()) {
        <app-card title="Nueva plantilla" subtitle="Se crea vacía; escribe su contenido después" class="block mb-6">
          <form class="grid gap-4 sm:grid-cols-2" (ngSubmit)="create()" novalidate>
            <div class="sm:col-span-2">
              <label for="t-desc" class="block text-sm font-medium mb-1.5">Descripción</label>
              <input id="t-desc" name="description" type="text" [class]="INPUT" [ngModel]="description()" (ngModelChange)="description.set($event)" />
            </div>
            <div>
              <label for="t-loc" class="block text-sm font-medium mb-1.5">Archivo</label>
              <input id="t-loc" name="location" type="text" placeholder="welcome_es.ftl" [class]="INPUT" [ngModel]="location()" (ngModelChange)="location.set($event)" />
              <p class="text-xs text-muted-foreground mt-1">Solo el nombre: letras, números, punto, guion y guion bajo.</p>
            </div>
            <div>
              <label for="t-format" class="block text-sm font-medium mb-1.5">Formato</label>
              <select id="t-format" name="format" [class]="INPUT" [ngModel]="format()" (ngModelChange)="format.set($event)">
                @for (f of formats; track f) { <option [value]="f">{{ f }}</option> }
              </select>
            </div>
            <div>
              <label for="t-type" class="block text-sm font-medium mb-1.5">Tipo</label>
              <select id="t-type" name="type" [class]="INPUT" [ngModel]="typeId()" (ngModelChange)="typeId.set($event)">
                <option value="">Elige…</option>
                @for (t of types(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
              </select>
            </div>
            <div>
              <label for="t-sev" class="block text-sm font-medium mb-1.5">Severidad</label>
              <select id="t-sev" name="severity" [class]="INPUT" [ngModel]="severityId()" (ngModelChange)="severityId.set($event)">
                <option value="">Elige…</option>
                @for (s of severities(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
              </select>
            </div>
            @if (formError()) { <p role="alert" class="sm:col-span-2 text-sm text-destructive" data-testid="form-error">{{ formError() }}</p> }
            <div class="sm:col-span-2 flex gap-2">
              <app-button type="submit" [disabled]="busy()">Crear</app-button>
              <app-button variant="ghost" (click)="closeForm()">Cancelar</app-button>
            </div>
          </form>
        </app-card>
      }

      <div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <ul class="space-y-2" data-testid="templates">
          @for (t of templates(); track t.id) {
            <li>
              <button type="button" (click)="edit(t)" [attr.aria-pressed]="editing()?.id === t.id"
                class="w-full text-left rounded-lg border p-3 bg-card" [class.border-ring]="editing()?.id === t.id" [class.border-border]="editing()?.id !== t.id">
                <div class="text-sm font-medium text-foreground">{{ t.description }}</div>
                <div class="text-xs text-muted-foreground">{{ t.location }}</div>
              </button>
            </li>
          } @empty {
            <li class="text-sm text-muted-foreground" data-testid="no-templates">Esta aplicación aún no tiene plantillas.</li>
          }
        </ul>

        @if (editing(); as t) {
          <app-card [title]="t.description" [subtitle]="t.location" class="block">
            @if (content(); as c) {
              @if (c.system) {
                <p class="mb-3 text-sm rounded-lg border border-warning bg-warning/10 p-3" data-testid="system-note">
                  Plantilla del sistema: se usa en mensajes reales. Guardar pedirá confirmación.
                </p>
              }
              <label for="t-content" class="sr-only">Contenido</label>
              <textarea id="t-content" name="content" rows="14" spellcheck="false" [class]="INPUT + ' font-mono'" [ngModel]="draft()" (ngModelChange)="draft.set($event)"></textarea>
              @if (c.parameters.length) {
                <p class="text-xs text-muted-foreground mt-2">Parámetros: {{ c.parameters.join(', ') }}</p>
              }
              @if (problems().length) {
                <ul role="alert" class="mt-3 text-sm text-destructive" data-testid="problems">
                  @for (p of problems(); track $index) { <li>{{ p.line ? 'Línea ' + p.line + ': ' : '' }}{{ p.message }}</li> }
                </ul>
              }
              <div class="mt-3 flex flex-wrap gap-2">
                <app-button (click)="save()" [disabled]="busy() || draft() === c.content">
                  <lucide-icon [img]="Save" [size]="16" strokeWidth="2" /> Guardar
                </app-button>
                <app-button variant="secondary" (click)="preview()" [disabled]="busy()">
                  <lucide-icon [img]="Eye" [size]="16" strokeWidth="2" /> Vista previa
                </app-button>
              </div>
              @if (previewOutput() !== null) {
                <pre class="mt-3 rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-wrap" data-testid="preview">{{ previewOutput() }}</pre>
              }
            } @else {
              <p class="text-sm text-muted-foreground">Cargando…</p>
            }
          </app-card>
        }
      </div>
    }
  `,
})
export class ApplicationsPageComponent implements OnInit {
  protected readonly service = inject(TemplatesService);
  private readonly notes = inject(NotificationService);

  protected readonly AppWindow = AppWindow;
  protected readonly Eye = Eye;
  protected readonly FolderPen = FolderPen;
  protected readonly Plus = Plus;
  protected readonly Save = Save;
  protected readonly INPUT = INPUT;
  protected readonly formats = TEMPLATE_FORMATS;

  readonly loadError = signal<LoadError | null>(null);
  readonly selected = signal<ManagedApplication | null>(null);
  readonly folder = signal<ApplicationFolder | null>(null);
  readonly folderDraft = signal('');
  readonly query = signal('');
  readonly templates = signal<TemplateSummary[]>([]);
  readonly types = signal<ReferenceItem[]>([]);
  readonly severities = signal<ReferenceItem[]>([]);

  readonly formOpen = signal(false);
  readonly description = signal('');
  readonly location = signal('');
  readonly format = signal<string>(TEMPLATE_FORMATS[0]);
  readonly typeId = signal('');
  readonly severityId = signal('');
  readonly formError = signal('');

  readonly editing = signal<TemplateSummary | null>(null);
  readonly content = signal<TemplateContent | null>(null);
  readonly draft = signal('');
  readonly problems = signal<TemplateProblem[]>([]);
  readonly previewOutput = signal<string | null>(null);
  readonly busy = signal(false);

  readonly hasSelection = computed(() => this.selected() !== null);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loadError.set(null);
    try {
      await this.service.loadApplications();
    } catch (error) {
      this.loadError.set(error instanceof HttpErrorResponse && error.status === 403 ? 'forbidden' : 'failed');
    }
  }

  async select(app: ManagedApplication): Promise<void> {
    this.selected.set(app);
    this.closeEditor();
    this.closeForm();
    this.folder.set(null);
    try {
      const folder = await this.service.folder(app.id);
      this.folder.set(folder);
      this.folderDraft.set(folder.folder);
    } catch {
      this.notes.error('Carpeta', 'No se pudo leer la carpeta de la aplicación.');
    }
    await this.refreshTemplates();
  }

  async saveFolder(): Promise<void> {
    const app = this.selected();
    if (!app) return;
    try {
      const folder = await this.service.assignFolder(app.id, this.folderDraft().trim());
      this.folder.set(folder);
      this.folderDraft.set(folder.folder);
      this.notes.success('Carpeta', 'Carpeta actualizada. Los archivos existentes no se movieron.');
    } catch (error) {
      this.notes.error('Carpeta', error instanceof HttpErrorResponse && error.status === 409 ? 'Otra aplicación ya usa esa carpeta.' : 'No se pudo cambiar la carpeta.');
    }
  }

  async refreshTemplates(): Promise<void> {
    const app = this.selected();
    if (!app) return;
    try {
      this.templates.set((await this.service.search(app.id, this.query())).items);
    } catch {
      this.templates.set([]);
      this.notes.error('Plantillas', 'No se pudieron cargar las plantillas.');
    }
  }

  async openForm(): Promise<void> {
    this.formOpen.set(true);
    this.formError.set('');
    if (this.types().length === 0 || this.severities().length === 0) {
      try {
        const [types, severities] = await Promise.all([this.service.templateTypes(), this.service.severities()]);
        this.types.set(types);
        this.severities.set(severities);
      } catch {
        this.formError.set('No se pudieron cargar los tipos y severidades.');
      }
    }
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.description.set('');
    this.location.set('');
    this.typeId.set('');
    this.severityId.set('');
    this.formError.set('');
  }

  async create(): Promise<void> {
    const app = this.selected();
    if (!app) return;
    const description = this.description().trim();
    const location = this.location().trim();
    if (!description) return this.formError.set('Escribe una descripción.');
    if (!TEMPLATE_LOCATION_PATTERN.test(location)) return this.formError.set('El archivo solo admite letras, números, punto, guion y guion bajo.');
    if (!this.typeId() || !this.severityId()) return this.formError.set('Elige el tipo y la severidad.');
    this.busy.set(true);
    try {
      const created = await this.service.create({
        description, location, fileFormat: this.format(), templateTypeId: this.typeId(), severityTypeId: this.severityId(), applicationId: app.id,
      });
      this.notes.success('Plantilla', 'Plantilla creada.');
      this.closeForm();
      await this.refreshTemplates();
      this.folder.set(await this.service.folder(app.id).catch(() => this.folder()));
      await this.edit(created);
    } catch (error) {
      this.formError.set(error instanceof HttpErrorResponse && error.status === 403 ? 'No tienes permiso para crear plantillas aquí.' : 'No se pudo crear la plantilla.');
    } finally {
      this.busy.set(false);
    }
  }

  async edit(template: TemplateSummary): Promise<void> {
    this.editing.set(template);
    this.content.set(null);
    this.problems.set([]);
    this.previewOutput.set(null);
    try {
      const content = await this.service.content(template.id);
      this.content.set(content);
      this.draft.set(content.content);
    } catch {
      this.editing.set(null);
      this.notes.error('Plantilla', 'No se pudo leer el contenido.');
    }
  }

  async save(): Promise<void> {
    const template = this.editing();
    const current = this.content();
    if (!template || !current) return;
    if (current.system && !globalThis.confirm('Es una plantilla del sistema y se usa en mensajes reales. ¿Guardar de todos modos?')) return;
    this.busy.set(true);
    this.problems.set([]);
    try {
      const saved = await this.service.saveContent(template.id, this.draft(), current.exists ? current.etag : null, current.system);
      this.content.set(saved);
      this.draft.set(saved.content);
      this.notes.success('Plantilla', 'Contenido guardado.');
    } catch (error) {
      this.handleSaveError(error);
    } finally {
      this.busy.set(false);
    }
  }

  async preview(): Promise<void> {
    const app = this.selected();
    const template = this.editing();
    if (!app || !template) return;
    this.busy.set(true);
    try {
      const result = await this.service.preview(app.id, template.location, this.draft());
      this.problems.set(result.problems);
      this.previewOutput.set(result.ok ? result.output : null);
    } catch {
      this.notes.error('Vista previa', 'No se pudo generar la vista previa.');
    } finally {
      this.busy.set(false);
    }
  }

  private handleSaveError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) return void this.notes.error('Plantilla', 'No se pudo guardar.');
    if (error.status === 412) return void this.notes.warning('Plantilla', 'Otra persona cambió esta plantilla. Vuelve a abrirla para ver su versión.');
    if (error.status === 422) {
      this.problems.set((error.error?.problems as TemplateProblem[] | undefined) ?? [{ message: String(error.error?.message ?? 'Error de sintaxis') }]);
      return;
    }
    this.notes.error('Plantilla', error.status === 403 ? 'No tienes permiso para editar esta plantilla.' : 'No se pudo guardar.');
  }

  private closeEditor(): void {
    this.editing.set(null);
    this.content.set(null);
    this.problems.set([]);
    this.previewOutput.set(null);
  }
}
