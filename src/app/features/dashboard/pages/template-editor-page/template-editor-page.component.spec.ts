import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { TemplateEditorPageComponent } from './template-editor-page.component';
import { NotificationService } from '../../../../core/services';
import { fakeReferences, httpError } from '../../testing/campaigns.testing';
import { contentOf, fakeTemplates, previewOf, summary, versionOf } from '../../testing/templates.testing';
import { HttpErrorResponse } from '@angular/common/http';

async function render(id: string | null = null, setup?: (fake: ReturnType<typeof fakeTemplates>) => void) {
  const fake = fakeTemplates([summary('a')]);
  setup?.(fake);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]), fake.provider, fakeReferences().provider,
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map(id ? [['id', id]] : []) } } },
    ],
  });
  const notifications = TestBed.inject(NotificationService);
  for (const method of ['success', 'error', 'warning'] as const) vi.spyOn(notifications, method).mockImplementation(() => undefined);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TemplateEditorPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, fake, navigate, notifications };
}

const unprocessable = (problems: { line: number; column: number; message: string }[]) =>
  new HttpErrorResponse({ status: 422, error: { message: 'x', problems } });

describe('TemplateEditorPageComponent (crear)', () => {
  afterEach(() => vi.useRealTimers());

  it('arranca con un texto de ejemplo en Markdown y sin cambios', async () => {
    const { component, el } = await render();

    expect(el.textContent).toContain('Nueva plantilla');
    expect(component.format()).toBe('MD');
    expect(component.content()).toContain('# Hola');
    expect(component.dirty()).toBe(true);
  });

  it('propone el nombre del archivo a partir de la descripción hasta que la persona lo cambia', async () => {
    const { component } = await render();

    component.onDescription('Código de verificación');
    expect(component.fileName()).toBe('codigo-de-verificacion.md');

    component.onFileName('mi-archivo.md');
    component.onDescription('Otra cosa');
    expect(component.fileName()).toBe('mi-archivo.md');
  });

  it('cambiar el formato cambia la extensión y el texto de ejemplo, pero no lo que se escribió', async () => {
    const { component } = await render();
    component.onDescription('Aviso');

    component.onFormat('HTML');
    expect(component.fileName()).toBe('aviso.html');
    expect(component.content()).toContain('<h1>');

    component.content.set('Mi texto');
    component.onFormat('MD');
    expect(component.fileName()).toBe('aviso.md');
    expect(component.content()).toBe('Mi texto');
  });

  it('con el nombre editado a mano, el formato cambia solo la extensión', async () => {
    const { component } = await render();
    component.onFileName('propio.md');

    component.onFormat('HTML');

    expect(component.fileName()).toBe('propio.html');
  });

  it.each([
    [{ description: '' }, 'descripción'],
    [{ typeId: '' }, 'tipo'],
    [{ severityId: '' }, 'severidad'],
    [{ fileName: '../x.md' }, 'nombre del archivo'],
    [{ content: 'x'.repeat(262_145) }, 'supera'],
  ])('rechaza %j sin llamar a Mercury', async (override, text) => {
    const { component, fake, notifications } = await render();
    const values = { description: 'Aviso', typeId: 't1', severityId: 's1', fileName: 'aviso.md', content: 'hola', ...override };
    component.description.set(values.description);
    component.typeId.set(values.typeId);
    component.severityId.set(values.severityId);
    component.fileName.set(values.fileName);
    component.content.set(values.content);

    await component.save();

    expect(notifications.error).toHaveBeenCalledWith('Revisa la plantilla', expect.stringContaining(text));
    expect(fake.service.create).not.toHaveBeenCalled();
  });

  it('crea la plantilla, guarda el contenido sin huella y abre la edición', async () => {
    const { component, fake, navigate, notifications } = await render();
    component.onDescription('Aviso');
    component.typeId.set('t1');
    component.severityId.set('s1');
    component.content.set('Hola ${name}');

    await component.save();

    expect(fake.service.create).toHaveBeenCalledWith({
      description: 'Aviso', location: 'aviso.md', fileFormat: 'MD', templateTypeId: 't1', severityTypeId: 's1',
    });
    expect(fake.service.saveContent).toHaveBeenCalledWith('new', 'Hola ${name}', null);
    expect(notifications.success).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/dashboard/templates/new', { replaceUrl: true });
  });

  it('si crear falla se queda y explica por qué', async () => {
    const { component, fake, navigate, notifications } = await render();
    fake.service.create.mockRejectedValue(httpError(403));
    component.onDescription('Aviso');
    component.typeId.set('t1');
    component.severityId.set('s1');

    await component.save();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo crear la plantilla', expect.stringContaining('permiso'));
    expect(fake.service.saveContent).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('si el contenido no se guarda, la plantilla ya existe: avisa, muestra los problemas y abre la edición', async () => {
    const { component, fake, navigate, notifications } = await render();
    fake.service.saveContent.mockRejectedValue(unprocessable([{ line: 2, column: 1, message: 'sin cerrar' }]));
    component.onDescription('Aviso');
    component.typeId.set('t1');
    component.severityId.set('s1');

    await component.save();

    expect(notifications.warning).toHaveBeenCalledWith('Plantilla creada sin contenido', expect.stringContaining('sintaxis'));
    expect(component.problems()).toEqual([{ line: 2, column: 1, message: 'sin cerrar' }]);
    expect(navigate).toHaveBeenCalled();
  });

  it('no permite guardar dos veces a la vez', async () => {
    const { component, fake } = await render();
    component.saving.set(true);

    await component.save();

    expect(fake.service.create).not.toHaveBeenCalled();
  });

  it('el selector de formato de la pantalla cambia el formato', async () => {
    const { fixture, component, el } = await render();
    const html = el.querySelector('input[type="radio"][value="HTML"]') as HTMLInputElement;

    html.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.format()).toBe('HTML');
  });
});

describe('TemplateEditorPageComponent (campos)', () => {
  const type = (el: HTMLElement, selector: string, value: string, event = 'input') => {
    const control = el.querySelector(selector) as HTMLInputElement;
    control.value = value;
    control.dispatchEvent(new Event(event));
  };

  it('cada campo de la pantalla actualiza su estado', async () => {
    const { fixture, component, el } = await render();

    type(el, '#te-description', 'Aviso importante');
    type(el, '#te-type', 't1', 'change');
    type(el, '#te-severity', 's1', 'change');
    type(el, '#te-file', 'mi-aviso.md');
    type(el, '#te-content', 'Hola ${name}');
    type(el, 'textarea[aria-label="Parámetros de ejemplo"]', 'name=Ana');
    fixture.detectChanges();

    expect([component.description(), component.typeId(), component.severityId(), component.fileName(), component.content(), component.paramsText()])
      .toEqual(['Aviso importante', 't1', 's1', 'mi-aviso.md', 'Hola ${name}', 'name=Ana']);
  });

  it('el formulario completo, usado desde la pantalla, crea la plantilla', async () => {
    const { fixture, component, el, fake } = await render();

    type(el, '#te-description', 'Aviso');
    type(el, '#te-type', 't1', 'change');
    type(el, '#te-severity', 's1', 'change');
    fixture.detectChanges();
    (el.querySelector('[data-testid="save"] button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(fake.service.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Aviso', location: 'aviso.md' }));
    expect(component.saving()).toBe(false);
  });

  it('el contador de bytes cuenta bytes y no caracteres', async () => {
    const { component } = await render();

    component.content.set('é');

    expect(component.bytes()).toBe(2);
  });
});

describe('TemplateEditorPageComponent (editar)', () => {
  afterEach(() => vi.useRealTimers());

  it('carga la plantilla y su contenido, sin cambios pendientes', async () => {
    const { component, el, fake } = await render('a');

    expect(fake.service.get).toHaveBeenCalledWith('a');
    expect(fake.service.content).toHaveBeenCalledWith('a');
    expect(component.description()).toBe('Plantilla a');
    expect(component.content()).toBe('# Hola ${name}');
    expect(component.format()).toBe('MD');
    expect(component.dirty()).toBe(false);
    expect(el.textContent).toContain('plantilla-a.md');
    expect(component.paramsText()).toBe('name=');
    expect(el.querySelector('[data-testid="detected"]')?.textContent).toContain('name');
  });

  it('el botón Guardar está apagado hasta que hay cambios', async () => {
    const { fixture, component, el } = await render('a');
    const save = () => el.querySelector('[data-testid="save"] button') as HTMLButtonElement;

    expect(save().disabled).toBe(true);
    component.content.set('otro');
    fixture.detectChanges();
    expect(save().disabled).toBe(false);
    expect(el.querySelector('[data-testid="dirty"]')).not.toBeNull();
  });

  it('guarda el contenido sobre la huella leída y vuelve a quedar sin cambios', async () => {
    const { component, fake, notifications } = await render('a');
    component.content.set('nuevo');

    await component.save();

    expect(fake.service.update).not.toHaveBeenCalled();
    expect(fake.service.saveContent).toHaveBeenCalledWith('a', 'nuevo', 'etag-1', false);
    expect(notifications.success).toHaveBeenCalled();
    expect(component.dirty()).toBe(false);

    component.content.set('otra vez');
    await component.save();
    expect(fake.service.saveContent).toHaveBeenLastCalledWith('a', 'otra vez', 'etag-2', false);
  });

  it('si solo cambian los metadatos no toca el contenido', async () => {
    const { component, fake } = await render('a');
    component.description.set('Nuevo nombre');
    component.typeId.set('t2');

    await component.save();

    expect(fake.service.update).toHaveBeenCalledWith('a', { description: 'Nuevo nombre', templateTypeId: 't2', severityTypeId: 's1' });
    expect(fake.service.saveContent).not.toHaveBeenCalled();
    expect(component.dirty()).toBe(false);
  });

  it('un archivo que aún no existe se crea con If-None-Match (sin huella)', async () => {
    const { component, fake } = await render('a', (f) => f.service.content.mockResolvedValue(contentOf('a', { exists: false, etag: '', content: '' })));
    component.content.set('primero');

    await component.save();

    expect(fake.service.saveContent).toHaveBeenCalledWith('a', 'primero', null, false);
  });

  it('un 412 muestra el aviso de conflicto y Recargar descarta lo escrito', async () => {
    const { fixture, component, el, fake, notifications } = await render('a');
    fake.service.saveContent.mockRejectedValue(httpError(412));
    component.content.set('mi versión');

    await component.save();
    fixture.detectChanges();

    expect(component.conflict()).toBe(true);
    expect(el.querySelector('[data-testid="conflict"]')).not.toBeNull();
    expect(notifications.error).toHaveBeenCalledWith('No se pudo guardar', expect.stringContaining('antes que tú'));

    fake.service.content.mockResolvedValue(contentOf('a', { content: 'versión de otra persona', etag: 'etag-9' }));
    await component.reload();

    expect(component.conflict()).toBe(false);
    expect(component.content()).toBe('versión de otra persona');
    expect(component.dirty()).toBe(false);
  });

  it('un 422 muestra los problemas con su línea y "Ir a la línea" selecciona esa línea', async () => {
    const { fixture, component, el, fake } = await render('a');
    fake.service.saveContent.mockRejectedValue(unprocessable([{ line: 2, column: 3, message: 'falta cerrar' }]));
    component.content.set('uno\ndos\ntres');

    await component.save();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="problems"]')?.textContent).toContain('Línea 2, columna 3: falta cerrar');
    (el.querySelector('[data-testid="problems"] button') as HTMLButtonElement).click();
    const area = el.querySelector('#te-content') as HTMLTextAreaElement;
    expect([area.selectionStart, area.selectionEnd]).toEqual([4, 7]);
  });

  it('goToLine sin editor no falla', async () => {
    const { component } = await render('a');

    expect(() => component.goToLine(1)).not.toThrow();
  });

  it.each([
    [403, 'permiso'], [413, 'supera'], [400, 'rechazó'], [404, 'ya no existe'], [503, 'no está configurada'], [500, 'Inténtalo'],
  ])('un %s al guardar se explica', async (status, text) => {
    const { component, fake, notifications } = await render('a');
    fake.service.saveContent.mockRejectedValue(httpError(status));
    component.content.set('x');

    await component.save();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo guardar', expect.stringContaining(text));
  });

  it('una plantilla del sistema se abre bloqueada hasta que la persona confirma', async () => {
    const { fixture, component, el, fake } = await render('a', (f) => f.service.content.mockResolvedValue(contentOf('a', { system: true })));
    component.content.set('intento');
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="system"]')).not.toBeNull();
    expect((el.querySelector('#te-content') as HTMLTextAreaElement).readOnly).toBe(true);
    expect((el.querySelector('[data-testid="save"] button') as HTMLButtonElement).disabled).toBe(true);
    await component.save();
    expect(fake.service.saveContent).not.toHaveBeenCalled();
  });

  it('al confirmar se puede editar y se guarda con confirmSystem', async () => {
    const { fixture, component, el, fake } = await render('a', (f) => f.service.content.mockResolvedValue(contentOf('a', { system: true })));
    const check = el.querySelector('[data-testid="confirm-system"]') as HTMLInputElement;

    check.checked = true;
    check.dispatchEvent(new Event('change'));
    component.content.set('cambio consciente');
    fixture.detectChanges();

    expect((el.querySelector('#te-content') as HTMLTextAreaElement).readOnly).toBe(false);
    expect((el.querySelector('[data-testid="save"] button') as HTMLButtonElement).disabled).toBe(false);
    await component.save();
    expect(fake.service.saveContent).toHaveBeenCalledWith('a', 'cambio consciente', 'etag-1', true);
  });

  it('una plantilla normal se guarda sin confirmSystem', async () => {
    const { component, fake } = await render('a');
    component.content.set('x');

    await component.save();

    expect(fake.service.saveContent).toHaveBeenCalledWith('a', 'x', 'etag-1', false);
  });

  it.each([[403, 'No tienes permiso'], [503, 'no está configurada'], [500, 'No se pudo cargar']])('si cargar falla con %s lo dice', async (status, text) => {
    const { el } = await render('a', (f) => f.service.get.mockRejectedValue(httpError(status)));

    expect(el.querySelector('[data-testid="load-failed"]')?.textContent).toContain(text);
  });

  it('reload en una plantilla nueva no hace nada', async () => {
    const { component, fake } = await render();
    fake.service.get.mockClear();

    await component.reload();

    expect(fake.service.get).not.toHaveBeenCalled();
  });

  it('avisa antes de cerrar la pestaña solo si hay cambios', async () => {
    const { component } = await render('a');
    const warn = (event: BeforeUnloadEvent) => (component as unknown as { warnBeforeUnload(e: BeforeUnloadEvent): void }).warnBeforeUnload(event);
    const event = () => new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;

    const clean = event();
    warn(clean);
    expect(clean.defaultPrevented).toBe(false);
    expect(component.hasUnsavedChanges()).toBe(false);

    component.content.set('cambio');
    const dirty = event();
    warn(dirty);
    expect(dirty.defaultPrevented).toBe(true);
    expect(component.hasUnsavedChanges()).toBe(true);
  });

  it('mientras guarda no cuenta como cambios sin guardar', async () => {
    const { component } = await render('a');
    component.content.set('cambio');
    component.saving.set(true);

    expect(component.hasUnsavedChanges()).toBe(false);
  });
});

describe('TemplateEditorPageComponent (vista previa)', () => {
  afterEach(() => vi.useRealTimers());

  it('renderiza 500 ms después de la última tecla, con los parámetros de ejemplo', async () => {
    vi.useFakeTimers();
    const { fixture, component, fake } = await render('a');
    fake.service.preview.mockClear();
    component.paramsText.set('name=Ana');

    component.content.set('# Hola ${name}!');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(499);
    expect(fake.service.preview).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    fixture.detectChanges();

    expect(fake.service.preview).toHaveBeenCalledTimes(1);
    expect(fake.service.preview).toHaveBeenCalledWith('plantilla-a.md', '# Hola ${name}!', { name: 'Ana' });
    expect(component.problems()).toEqual([]);
  });

  it('teclear de nuevo reinicia la espera', async () => {
    vi.useFakeTimers();
    const { fixture, component, fake } = await render('a');
    fake.service.preview.mockClear();

    component.content.set('uno');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    component.content.set('dos');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(400);
    expect(fake.service.preview).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);

    expect(fake.service.preview).toHaveBeenCalledTimes(1);
  });

  it('un error de sintaxis se muestra como problema y deja la vista previa en blanco', async () => {
    vi.useFakeTimers();
    const { fixture, component, el, fake } = await render('a');
    fake.service.preview.mockResolvedValue(previewOf({ ok: false, output: '', problems: [{ line: 1, column: 2, message: 'mal' }] }));

    component.content.set('<#if');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="problems"]')?.textContent).toContain('mal');
  });

  it('agrega a los parámetros de ejemplo los que la plantilla empieza a usar', async () => {
    vi.useFakeTimers();
    const { fixture, component, fake } = await render('a');
    fake.service.preview.mockResolvedValue(previewOf({ parameters: ['name', 'code'] }));

    component.content.set('${name} ${code}');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);

    expect(component.paramsText()).toBe('name=\ncode=');
    expect(component.detected()).toEqual(['name', 'code']);
  });

  it('si la vista previa falla lo dice como problema', async () => {
    vi.useFakeTimers();
    const { fixture, component, fake } = await render('a');
    fake.service.preview.mockRejectedValue(httpError(403));

    component.content.set('otra cosa');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);

    expect(component.problems()[0].message).toContain('permiso');
    expect(component.previewing()).toBe(false);
  });

  it('en una plantilla nueva sin nombre válido usa un nombre de vista previa según el formato', async () => {
    vi.useFakeTimers();
    const { fixture, component, fake } = await render();
    fake.service.preview.mockClear();

    component.content.set('hola');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);

    expect(fake.service.preview).toHaveBeenLastCalledWith('vista-previa.md', 'hola', {});
    component.onFormat('HTML');
    component.content.set('hola 2');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);
    expect(fake.service.preview).toHaveBeenLastCalledWith('vista-previa.html', 'hola 2', { name: '' });
  });

  it('el resultado de la vista previa se escribe en el iframe como srcdoc, sin scripts', async () => {
    vi.useFakeTimers();
    const { fixture, component, el, fake } = await render('a');
    fake.service.preview.mockResolvedValue(previewOf({ output: '<h1 style="color:red">Hola Ana</h1>' }));

    component.content.set('# Hola');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();

    const frame = el.querySelector('iframe[data-testid="preview"]') as HTMLIFrameElement;
    expect(frame.srcdoc).toContain('<h1 style="color:red">Hola Ana</h1>');
    expect(frame.srcdoc).toContain("default-src 'none'");
    expect(frame.getAttribute('sandbox')).toBe('');
  });

  it('con problemas la vista previa queda en blanco', async () => {
    vi.useFakeTimers();
    const { fixture, component, el, fake } = await render('a');
    fake.service.preview.mockResolvedValue(previewOf({ ok: false, output: '', problems: [{ line: 1, column: 1, message: 'mal' }] }));

    component.content.set('<#if');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();

    expect((el.querySelector('iframe[data-testid="preview"]') as HTMLIFrameElement).srcdoc).toBe('');
  });

  it('el iframe de la vista previa no tiene permisos (sandbox vacío)', async () => {
    const { el } = await render('a');

    expect(el.querySelector('iframe[data-testid="preview"]')?.getAttribute('sandbox')).toBe('');
  });
});

describe('TemplateEditorPageComponent (historial)', () => {
  const open = async (id: string | null = 'a', setup?: (fake: ReturnType<typeof fakeTemplates>) => void) => {
    const ctx = await render(id, setup);
    (ctx.el.querySelector('[data-testid="history-toggle"] button') as HTMLButtonElement | null)?.click();
    await ctx.fixture.whenStable();
    ctx.fixture.detectChanges();
    return ctx;
  };
  const button = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

  it('no hay historial en una plantilla nueva', async () => {
    expect((await render()).el.querySelector('[data-testid="history-toggle"]')).toBeNull();
  });

  it('ni en una plantilla que aún no tiene archivo', async () => {
    const { el } = await render('a', (f) => f.service.content.mockResolvedValue(contentOf('a', { exists: false, etag: '', content: '' })));

    expect(el.querySelector('[data-testid="history-toggle"]')).toBeNull();
  });

  it('abre el historial y lista las versiones con su motivo', async () => {
    const { el, fake } = await open();

    expect(fake.service.versions).toHaveBeenCalledWith('a');
    const rows = Array.from(el.querySelectorAll('[data-testid="version-row"]'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Versión 2');
    expect(rows[0].textContent).toContain('Guardado');
    expect(rows[1].textContent).toContain('Original');
  });

  it('el botón alterna entre ver y ocultar', async () => {
    const { fixture, el } = await open();

    (el.querySelector('[data-testid="history-toggle"] button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="versions"]')).toBeNull();
  });

  it('sin versiones lo dice', async () => {
    const { el } = await open('a', (f) => f.service.versions.mockResolvedValue([]));

    expect(el.querySelector('[data-testid="history-empty"]')).not.toBeNull();
  });

  it('si cargar el historial falla avisa', async () => {
    const { el } = await open('a', (f) => f.service.versions.mockRejectedValue(httpError(500)));

    expect(el.querySelector('[data-testid="history-error"]')).not.toBeNull();
  });

  it('compara una versión con lo que hay en el editor, línea por línea', async () => {
    const { fixture, component, el, fake } = await open();
    component.content.set('uno\ntres');
    fixture.detectChanges();

    button(el.querySelector('[data-testid="version-row"]') as HTMLElement, 'Comparar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fake.service.version).toHaveBeenCalledWith('a', 2);
    const lines = Array.from(el.querySelectorAll('[data-testid="diff-line"]')).map((l) => l.textContent?.trim());
    expect(lines).toEqual(['uno', '- dos', '+ tres']);
    expect(el.querySelector('[data-testid="comparison"]')?.textContent).toContain('2 líneas distintas');

    button(el.querySelector('[data-testid="comparison"]') as HTMLElement, 'Cerrar').click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="comparison"]')).toBeNull();
  });

  it('con una sola línea distinta usa el singular y una versión vacía se compara como todo agregado', async () => {
    const { fixture, component, el, fake } = await open();
    fake.service.version.mockResolvedValue({ ...versionOf(2), content: null });
    component.content.set('solo');
    fixture.detectChanges();

    await component.compare(versionOf(2));
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="comparison"]')?.textContent).toContain('1 línea distinta');
  });

  it('si leer la versión falla avisa', async () => {
    const { component, fake, notifications } = await open();
    fake.service.version.mockRejectedValue(httpError(404));

    await component.compare(versionOf(2));

    expect(notifications.error).toHaveBeenCalledWith('No se pudo leer la versión', expect.stringContaining('ya no existe'));
  });

  it('restaurar pide confirmación y avisa si hay cambios sin guardar', async () => {
    const { fixture, component, el, fake } = await open();
    component.content.set('cambio sin guardar');
    fixture.detectChanges();

    button(el.querySelector('[data-testid="version-row"]') as HTMLElement, 'Restaurar').click();
    fixture.detectChanges();

    expect(fake.service.restore).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="restore-confirm"]')?.textContent).toContain('se perderán');
    button(el.querySelector('[data-testid="restore-confirm"]') as HTMLElement, 'Cancelar').click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="restore-confirm"]')).toBeNull();
  });

  it('confirmar la restauración usa la huella actual, actualiza el editor y recarga el historial', async () => {
    const { fixture, component, el, fake, notifications } = await open();

    button(el.querySelector('[data-testid="version-row"]') as HTMLElement, 'Restaurar').click();
    fixture.detectChanges();
    button(el.querySelector('[data-testid="restore-confirm"]') as HTMLElement, 'Restaurar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fake.service.restore).toHaveBeenCalledWith('a', 2, 'etag-1', false);
    expect(component.content()).toBe('uno\ndos');
    expect(component.dirty()).toBe(false);
    expect(notifications.success).toHaveBeenCalledWith('Versión restaurada', 'Versión 2');
    expect(fake.service.versions).toHaveBeenCalledTimes(2);
  });

  it('restaurar una plantilla del sistema envía la confirmación', async () => {
    const { component, fake } = await open('a', (f) => f.service.content.mockResolvedValue(contentOf('a', { system: true })));
    component.confirmSystem.set(true);
    component.askRestore(versionOf(1));

    await component.confirmRestore();

    expect(fake.service.restore).toHaveBeenCalledWith('a', 1, 'etag-1', true);
  });

  it('un 412 al restaurar muestra el conflicto; otro error lo explica', async () => {
    const { fixture, component, el, fake, notifications } = await open();
    fake.service.restore.mockRejectedValue(httpError(412));
    component.askRestore(versionOf(2));

    await component.confirmRestore();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="conflict"]')).not.toBeNull();
    expect(notifications.error).toHaveBeenCalledWith('No se pudo restaurar', expect.stringContaining('antes que tú'));
    expect(component.restoring()).toBe(false);

    fake.service.restore.mockRejectedValue(unprocessable([{ line: 1, column: 1, message: 'ya no es válida' }]));
    await component.confirmRestore();
    expect(component.problems()[0].message).toBe('ya no es válida');
  });

  it('confirmRestore sin versión elegida no hace nada', async () => {
    const { component, fake } = await open();

    await component.confirmRestore();

    expect(fake.service.restore).not.toHaveBeenCalled();
  });

  it('Recargar también refresca el historial abierto y cierra la comparación', async () => {
    const { component, fake } = await open();
    component.comparison.set({ version: 1, lines: [], changes: 0 });

    await component.reload();

    expect(component.comparison()).toBeNull();
    expect(fake.service.versions).toHaveBeenCalledTimes(2);
  });

  it('etiqueta cada motivo', async () => {
    const { component } = await render('a');

    expect(component.reasonLabel('SAVE')).toBe('Guardado');
    expect(component.reasonLabel('RESTORE')).toBe('Restauración');
    expect(component.reasonLabel('BASELINE')).toBe('Original');
    expect(component.marker({ kind: 'add', text: '' })).toBe('+');
    expect(component.lineClass({ kind: 'del', text: '' })).toContain('destructive');
  });
});
