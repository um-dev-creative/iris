import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TemplatesPageComponent } from './templates-page.component';
import { NotificationService } from '../../../../core/services';
import { fakeReferences, httpError } from '../../testing/campaigns.testing';
import { fakeTemplates, searchOf, summary } from '../../testing/templates.testing';

async function render(items = [summary('a'), summary('b', { description: 'Segunda', templateTypeName: null, severityTypeName: null, updatedAt: null })]) {
  const fake = fakeTemplates(items);
  const refs = fakeReferences();
  TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider, refs.provider] });
  const notifications = TestBed.inject(NotificationService);
  vi.spyOn(notifications, 'success').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'error').mockImplementation(() => undefined);
  const fixture = TestBed.createComponent(TemplatesPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, fake, notifications };
}

const rows = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-testid="template-row"]'));
const button = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('TemplatesPageComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('carga la primera página y llena los filtros de tipo y severidad', async () => {
    const { el, fake } = await render();

    expect(fake.service.search).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 10, q: '' }));
    expect(rows(el)).toHaveLength(2);
    expect(el.querySelector('#tp-type')?.textContent).toContain('WELCOME');
    expect(el.querySelector('#tp-severity')?.textContent).toContain('INFO');
    expect(el.querySelector('[data-testid="range"]')?.textContent).toContain('1–2 de 2');
  });

  it('muestra guiones donde falta tipo, severidad o fecha', async () => {
    const { el } = await render();

    expect(rows(el)[1].textContent).toContain('—');
  });

  it('sin plantillas dice que aún no hay', async () => {
    const { el } = await render([]);

    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain('Aún no hay plantillas');
  });

  it.each([[403, 'forbidden'], [503, 'unavailable'], [500, 'load-failed']])('si la carga falla con %s muestra %s', async (status, testid) => {
    const fake = fakeTemplates();
    fake.service.search.mockRejectedValue(httpError(status));
    TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider, fakeReferences().provider] });
    const fixture = TestBed.createComponent(TemplatesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(`[data-testid="${testid}"]`)).not.toBeNull();
  });

  it('buscar espera 300 ms y vuelve a la primera página', async () => {
    vi.useFakeTimers();
    const { component, fake } = await render();
    fake.service.search.mockClear();
    component.page.set(3);

    component.onSearch('hola');
    component.onSearch('hola mundo');
    expect(fake.service.search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);

    expect(fake.service.search).toHaveBeenCalledTimes(1);
    expect(fake.service.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'hola mundo', page: 0 }));
  });

  it('filtrar por tipo o severidad vuelve a pedir desde la primera página', async () => {
    const { component, fake } = await render();
    component.page.set(2);

    component.onType('t1');
    await Promise.resolve();
    expect(fake.service.search).toHaveBeenLastCalledWith(expect.objectContaining({ templateTypeId: 't1', page: 0 }));

    component.onSeverity('s1');
    await Promise.resolve();
    expect(fake.service.search).toHaveBeenLastCalledWith(expect.objectContaining({ severityTypeId: 's1', templateTypeId: 't1' }));
    expect(component.filtered()).toBe(true);
  });

  it('con filtros y sin resultados lo dice', async () => {
    const { fixture, component, el, fake } = await render();
    fake.service.search.mockResolvedValue(searchOf([]));

    component.typeId.set('t1');
    await component.reload();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain('coincide');
  });

  it('los controles de la pantalla actualizan los filtros', async () => {
    const { fixture, component, el } = await render();
    const set = (selector: string, value: string, event: string) => {
      const control = el.querySelector(selector) as HTMLInputElement;
      control.value = value;
      control.dispatchEvent(new Event(event));
    };

    set('#tp-type', 't1', 'change');
    set('#tp-severity', 's1', 'change');
    set('#tp-search', 'x', 'input');
    fixture.detectChanges();

    expect([component.typeId(), component.severityId(), component.search()]).toEqual(['t1', 's1', 'x']);
  });

  it('pagina en el servidor', async () => {
    const fake = fakeTemplates();
    fake.service.search.mockResolvedValue(searchOf([summary('a')], { totalElements: 25, totalPages: 3 }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider, fakeReferences().provider] });
    const fixture = TestBed.createComponent(TemplatesPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Página 1 de 3');
    button(el, 'Siguiente').click();
    await fixture.whenStable();

    expect(fake.service.search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }));
    expect(fixture.componentInstance.from()).toBe(11);
  });

  it('desactivar pide confirmación, llama al servicio y recarga', async () => {
    const { fixture, el, fake, notifications } = await render();

    button(el, 'Desactivar').click();
    fixture.detectChanges();
    expect(fake.service.deactivate).not.toHaveBeenCalled();
    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Desactivar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fake.service.deactivate).toHaveBeenCalledWith('a');
    expect(notifications.success).toHaveBeenCalled();
    expect(fake.service.search).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[data-testid="confirm-panel"]')).toBeNull();
  });

  it('cancelar la confirmación no desactiva', async () => {
    const { fixture, el, fake } = await render();

    button(el, 'Desactivar').click();
    fixture.detectChanges();
    button(el, 'Cancelar').click();
    fixture.detectChanges();

    expect(fake.service.deactivate).not.toHaveBeenCalled();
  });

  it('un 403 al desactivar avisa del permiso', async () => {
    const { fixture, el, fake, notifications } = await render();
    fake.service.deactivate.mockRejectedValue(httpError(403));

    button(el, 'Desactivar').click();
    fixture.detectChanges();
    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Desactivar').click();
    await fixture.whenStable();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo desactivar', expect.stringContaining('permiso'));
  });

  it('otro error al desactivar pide reintentar', async () => {
    const { fixture, el, fake, notifications } = await render();
    fake.service.deactivate.mockRejectedValue(httpError(500));

    button(el, 'Desactivar').click();
    fixture.detectChanges();
    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Desactivar').click();
    await fixture.whenStable();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo desactivar', 'Inténtalo de nuevo.');
  });

  it('confirmDeactivate sin plantilla pendiente no hace nada', async () => {
    const { component, fake } = await render();

    await component.confirmDeactivate();

    expect(fake.service.deactivate).not.toHaveBeenCalled();
  });

  it('desactivar la última fila de una página vuelve a la anterior', async () => {
    const fake = fakeTemplates();
    fake.service.search.mockResolvedValue(searchOf([summary('a')], { page: 1, totalElements: 11, totalPages: 2 }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider, fakeReferences().provider] });
    const notifications = TestBed.inject(NotificationService);
    vi.spyOn(notifications, 'success').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(TemplatesPageComponent);
    const component = fixture.componentInstance;
    component.page.set(1);
    fixture.detectChanges();
    await fixture.whenStable();

    component.pending.set(summary('a'));
    await component.confirmDeactivate();

    expect(component.page()).toBe(0);
  });
});
