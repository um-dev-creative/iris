import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ApplicationsPageComponent } from './applications-page.component';
import { NotificationService } from '../../../../core/services';
import { API_BASE_URL } from '../../../../core/config';
import { ManagedApplication, TemplateContent, TemplateSummary } from '../../../../core/models';

const URL = '/test/api/v1/general/templates';
const iris: ManagedApplication = { id: 'a1', name: 'Iris', codeName: 'iris' };
const zb: ManagedApplication = { id: 'a2', name: 'ZeroBound', codeName: 'zb' };
const tpl: TemplateSummary = {
  id: 't1', description: 'Bienvenida', location: 'welcome.ftl', fileFormat: 'ftl', templateTypeId: 'ty', applicationId: 'a1', severityTypeId: 'sv', active: true,
};
const content = (over: Partial<TemplateContent> = {}): TemplateContent => ({
  templateId: 't1', name: 'welcome.ftl', format: 'ftl', content: 'Hola ${nombre}', etag: 'e1', exists: true, system: false, parameters: ['nombre'], ...over,
});
const page = (items: TemplateSummary[]) => ({ items, page: 0, size: 50, totalElements: items.length, totalPages: 1 });
const settle = async (fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) => { await fixture.whenStable(); fixture.detectChanges(); };

async function render(initial: ManagedApplication[] | { status: number } = [iris, zb]) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  const fixture = TestBed.createComponent(ApplicationsPageComponent);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  const req = http.expectOne(`${URL}/applications`);
  if (Array.isArray(initial)) req.flush(initial);
  else req.flush({}, { status: initial.status, statusText: 'err' });
  await settle(fixture);
  return { fixture, c: fixture.componentInstance, http, el: fixture.nativeElement as HTMLElement, notes: TestBed.inject(NotificationService) };
}

type Rendered = Awaited<ReturnType<typeof render>>;

/** Selecciona Iris y responde carpeta y plantillas. */
async function pick({ fixture, c, http }: Rendered, templates: TemplateSummary[] = [tpl], folder = { applicationId: 'a1', folder: 'iris', registered: true }) {
  const selecting = c.select(iris);
  http.expectOne(`${URL}/applications/a1/folder`).flush(folder);
  await Promise.resolve(); await Promise.resolve();
  http.expectOne((r) => r.url === URL).flush(page(templates));
  await selecting;
  await settle(fixture);
}

async function openTemplate(r: Rendered, over: Partial<TemplateContent> = {}) {
  const editing = r.c.edit(tpl);
  r.http.expectOne(`${URL}/t1/content`).flush(content(over));
  await editing;
  await settle(r.fixture);
}

describe('ApplicationsPageComponent', () => {
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); vi.restoreAllMocks(); });

  it('lista las aplicaciones que puede gestionar', async () => {
    const { el } = await render();
    expect(el.querySelectorAll('[data-testid="applications"] button')).toHaveLength(2);
    expect(el.textContent).toContain('ZeroBound');
  });

  it('403: explica que no administra ninguna aplicación', async () => {
    const { el } = await render({ status: 403 });
    expect(el.querySelector('[data-testid="forbidden"]')).not.toBeNull();
  });

  it('otro error: avisa y permite reintentar', async () => {
    const r = await render({ status: 500 });
    expect(r.el.querySelector('[data-testid="failed"]')).not.toBeNull();
    const retry = r.c.reload();
    r.http.expectOne(`${URL}/applications`).flush([iris]);
    await retry;
    await settle(r.fixture);
    expect(r.c.loadError()).toBeNull();
  });

  it('sin aplicaciones muestra el estado vacío', async () => {
    const { el } = await render([]);
    expect(el.querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  it('al elegir una aplicación carga su carpeta y sus plantillas', async () => {
    const r = await render();
    await pick(r);
    expect(r.c.folderDraft()).toBe('iris');
    expect(r.el.querySelectorAll('[data-testid="templates"] li')).toHaveLength(1);
  });

  it('una aplicación sin plantillas lo dice y marca la carpeta sin registrar', async () => {
    const r = await render();
    await pick(r, [], { applicationId: 'a1', folder: 'a1', registered: false });
    expect(r.el.querySelector('[data-testid="no-templates"]')).not.toBeNull();
    expect(r.el.textContent).toContain('Sin registrar');
  });

  it('si falla leer la carpeta avisa pero sigue con las plantillas', async () => {
    const r = await render();
    const selecting = r.c.select(iris);
    r.http.expectOne(`${URL}/applications/a1/folder`).flush({}, { status: 500, statusText: 'x' });
    await Promise.resolve(); await Promise.resolve();
    r.http.expectOne((q) => q.url === URL).flush(page([tpl]));
    await selecting;
    expect(r.c.folder()).toBeNull();
    expect(r.c.templates()).toHaveLength(1);
  });

  it('cambia el nombre de la carpeta', async () => {
    const r = await render();
    await pick(r);
    r.c.folderDraft.set('nueva');
    const saving = r.c.saveFolder();
    r.http.expectOne(`${URL}/applications/a1/folder`).flush({ applicationId: 'a1', folder: 'nueva', registered: true });
    await saving;
    expect(r.c.folder()?.folder).toBe('nueva');
  });

  it('409 al renombrar: dice que otra aplicación la usa', async () => {
    const r = await render();
    await pick(r);
    const error = vi.spyOn(r.notes, 'error');
    r.c.folderDraft.set('zb');
    const saving = r.c.saveFolder();
    r.http.expectOne(`${URL}/applications/a1/folder`).flush({}, { status: 409, statusText: 'Conflict' });
    await saving;
    expect(error).toHaveBeenCalledWith('Carpeta', 'Otra aplicación ya usa esa carpeta.');
  });

  it('otro error al renombrar: mensaje genérico; sin aplicación elegida no hace nada', async () => {
    const r = await render();
    await r.c.saveFolder();
    await r.c.refreshTemplates();
    await pick(r);
    const error = vi.spyOn(r.notes, 'error');
    const saving = r.c.saveFolder();
    r.http.expectOne(`${URL}/applications/a1/folder`).flush({}, { status: 500, statusText: 'x' });
    await saving;
    expect(error).toHaveBeenCalledWith('Carpeta', 'No se pudo cambiar la carpeta.');
  });

  it('busca plantillas con el texto escrito y avisa si falla', async () => {
    const r = await render();
    await pick(r);
    r.c.query.set('hola');
    const searching = r.c.refreshTemplates();
    const req = r.http.expectOne((q) => q.url === URL);
    expect(req.request.params.get('q')).toBe('hola');
    req.flush({}, { status: 500, statusText: 'x' });
    await searching;
    expect(r.c.templates()).toEqual([]);
  });

  describe('nueva plantilla', () => {
    const open = async (r: Rendered) => {
      await pick(r);
      const opening = r.c.openForm();
      r.http.expectOne(`${URL}/types`).flush([{ id: 'ty', name: 'Email' }]);
      r.http.expectOne(`${URL}/severities`).flush([{ id: 'sv', name: 'INFO' }]);
      await opening;
      await settle(r.fixture);
    };
    const fill = (r: Rendered, over: Record<string, string> = {}) => {
      r.c.description.set(over['description'] ?? 'Bienvenida');
      r.c.location.set(over['location'] ?? 'welcome.ftl');
      r.c.typeId.set(over['type'] ?? 'ty');
      r.c.severityId.set(over['severity'] ?? 'sv');
    };

    it('valida descripción, nombre de archivo, tipo y severidad antes de enviar', async () => {
      const r = await render();
      await open(r);
      fill(r, { description: ' ' });
      await r.c.create();
      expect(r.c.formError()).toBe('Escribe una descripción.');
      fill(r, { location: '../x' });
      await r.c.create();
      expect(r.c.formError()).toContain('letras, números');
      fill(r, { type: '' });
      await r.c.create();
      expect(r.c.formError()).toBe('Elige el tipo y la severidad.');
    });

    it('crea la plantilla, refresca la lista y la abre para editar', async () => {
      const r = await render();
      await open(r);
      fill(r);
      const creating = r.c.create();
      const post = r.http.expectOne((q) => q.method === 'POST' && q.url === URL);
      expect(post.request.body).toMatchObject({ location: 'welcome.ftl', applicationId: 'a1', templateTypeId: 'ty', severityTypeId: 'sv', fileFormat: 'ftl' });
      post.flush(tpl);
      await Promise.resolve(); await Promise.resolve();
      r.http.expectOne((q) => q.method === 'GET' && q.url === URL).flush(page([tpl]));
      await new Promise((res) => setTimeout(res));
      r.http.expectOne(`${URL}/applications/a1/folder`).flush({ applicationId: 'a1', folder: 'iris', registered: true });
      await new Promise((res) => setTimeout(res));
      r.http.expectOne(`${URL}/t1/content`).flush(content());
      await creating;
      expect(r.c.formOpen()).toBe(false);
      expect(r.c.editing()?.id).toBe('t1');
    });

    it('403 al crear: dice que no tiene permiso; otro error: mensaje genérico', async () => {
      const r = await render();
      await open(r);
      fill(r);
      let creating = r.c.create();
      r.http.expectOne((q) => q.method === 'POST').flush({}, { status: 403, statusText: 'x' });
      await creating;
      expect(r.c.formError()).toContain('permiso');
      creating = r.c.create();
      r.http.expectOne((q) => q.method === 'POST').flush({}, { status: 500, statusText: 'x' });
      await creating;
      expect(r.c.formError()).toBe('No se pudo crear la plantilla.');
    });

    it('si fallan los catálogos lo avisa en el formulario y cancelar lo limpia', async () => {
      const r = await render();
      await pick(r);
      const opening = r.c.openForm();
      r.http.expectOne(`${URL}/types`).flush({}, { status: 500, statusText: 'x' });
      r.http.expectOne(`${URL}/severities`).flush([]);
      await opening;
      expect(r.c.formError()).toContain('tipos y severidades');
      r.c.closeForm();
      expect(r.c.formOpen()).toBe(false);
      expect(r.c.formError()).toBe('');
    });

    it('crear sin aplicación elegida no hace nada', async () => {
      const r = await render();
      await r.c.create();
      expect(r.c.busy()).toBe(false);
    });
  });

  describe('edición', () => {
    it('abre el contenido con sus parámetros y avisa si es del sistema', async () => {
      const r = await render();
      await pick(r);
      await openTemplate(r, { system: true });
      expect((r.el.querySelector('#t-content') as HTMLTextAreaElement).value).toBe('Hola ${nombre}');
      expect(r.el.textContent).toContain('Parámetros: nombre');
      expect(r.el.querySelector('[data-testid="system-note"]')).not.toBeNull();
    });

    it('si falla leer el contenido cierra el editor', async () => {
      const r = await render();
      await pick(r);
      const editing = r.c.edit(tpl);
      r.http.expectOne(`${URL}/t1/content`).flush({}, { status: 500, statusText: 'x' });
      await editing;
      expect(r.c.editing()).toBeNull();
    });

    it('guarda sobre la versión leída', async () => {
      const r = await render();
      await pick(r);
      await openTemplate(r);
      r.c.draft.set('Nuevo');
      const saving = r.c.save();
      const put = r.http.expectOne((q) => q.method === 'PUT');
      expect(put.request.headers.get('If-Match')).toBe('"e1"');
      put.flush(content({ content: 'Nuevo', etag: 'e2' }));
      await saving;
      expect(r.c.content()?.etag).toBe('e2');
    });

    it('un archivo que aún no existe se crea con If-None-Match', async () => {
      const r = await render();
      await pick(r);
      await openTemplate(r, { exists: false, content: '', etag: '' });
      r.c.draft.set('Primero');
      const saving = r.c.save();
      const put = r.http.expectOne((q) => q.method === 'PUT');
      expect(put.request.headers.get('If-None-Match')).toBe('*');
      put.flush(content({ content: 'Primero' }));
      await saving;
    });

    it('una del sistema pide confirmación; si la rechaza no guarda, si la acepta confirma al backend', async () => {
      const r = await render();
      await pick(r);
      await openTemplate(r, { system: true });
      r.c.draft.set('x');
      const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
      await r.c.save();
      const saving = r.c.save();
      const put = r.http.expectOne((q) => q.method === 'PUT');
      expect(put.request.params.get('confirmSystem')).toBe('true');
      put.flush(content({ system: true, content: 'x' }));
      await saving;
      expect(confirm).toHaveBeenCalledTimes(2);
    });

    const failSave = async (r: Rendered, status: number, body: object = {}) => {
      await pick(r);
      await openTemplate(r);
      r.c.draft.set('x');
      const saving = r.c.save();
      r.http.expectOne((q) => q.method === 'PUT').flush(body, { status, statusText: 'x' });
      await saving;
    };

    it('412: avisa que otra persona la cambió', async () => {
      const r = await render();
      const warning = vi.spyOn(r.notes, 'warning');
      await failSave(r, 412);
      expect(warning).toHaveBeenCalled();
    });

    it('422: muestra los errores de sintaxis con su línea', async () => {
      const r = await render();
      await failSave(r, 422, { message: 'mal', problems: [{ line: 3, column: 1, message: 'Falta cerrar' }] });
      await settle(r.fixture);
      expect(r.el.querySelector('[data-testid="problems"]')!.textContent).toContain('Línea 3: Falta cerrar');
    });

    it('422 sin lista de problemas usa el mensaje', async () => {
      const r = await render();
      await failSave(r, 422, { message: 'Sintaxis' });
      expect(r.c.problems()[0].message).toBe('Sintaxis');
    });

    it('403 y otros errores avisan sin romper', async () => {
      const r = await render();
      const error = vi.spyOn(r.notes, 'error');
      await failSave(r, 403);
      expect(error).toHaveBeenCalledWith('Plantilla', 'No tienes permiso para editar esta plantilla.');
      r.c.draft.set('y');
      const saving = r.c.save();
      r.http.expectOne((q) => q.method === 'PUT').flush({}, { status: 500, statusText: 'x' });
      await saving;
      expect(error).toHaveBeenCalledWith('Plantilla', 'No se pudo guardar.');
    });

    it('un error que no es HTTP también se avisa', async () => {
      const r = await render();
      const error = vi.spyOn(r.notes, 'error');
      (r.c as unknown as { handleSaveError(e: unknown): void }).handleSaveError(new Error('x'));
      expect(error).toHaveBeenCalledWith('Plantilla', 'No se pudo guardar.');
    });

    it('guardar o previsualizar sin plantilla abierta no hace nada', async () => {
      const r = await render();
      await r.c.save();
      await r.c.preview();
      expect(r.c.busy()).toBe(false);
    });

    it('la vista previa muestra el resultado', async () => {
      const r = await render();
      await pick(r);
      await openTemplate(r);
      const previewing = r.c.preview();
      r.http.expectOne(`${URL}/preview`).flush({ ok: true, format: 'ftl', output: 'Hola Ana', problems: [], parameters: [] });
      await previewing;
      await settle(r.fixture);
      expect(r.el.querySelector('[data-testid="preview"]')!.textContent).toContain('Hola Ana');
    });

    it('la vista previa con errores los lista y no muestra salida; si falla avisa', async () => {
      const r = await render();
      await pick(r);
      await openTemplate(r);
      let previewing = r.c.preview();
      r.http.expectOne(`${URL}/preview`).flush({ ok: false, format: 'ftl', output: '', problems: [{ line: 1, message: 'mal' }], parameters: [] });
      await previewing;
      expect(r.c.previewOutput()).toBeNull();
      expect(r.c.problems()).toHaveLength(1);
      const error = vi.spyOn(r.notes, 'error');
      previewing = r.c.preview();
      r.http.expectOne(`${URL}/preview`).flush({}, { status: 500, statusText: 'x' });
      await previewing;
      expect(error).toHaveBeenCalledWith('Vista previa', 'No se pudo generar la vista previa.');
    });
  });
});
