import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { CampaignFormPageComponent } from './campaign-form-page.component';
import { AuthService, NotificationService } from '../../../../core/services';
import { fakeAuth } from '../../../../core/testing/auth.testing';
import { campaign, fakeCampaigns, httpError } from '../../testing/campaigns.testing';

const TEMPLATE = '11111111-1111-4111-8111-111111111111';

async function render(id: string | null = null, existing = campaign('a', { status: 'SCHEDULED', scheduledAt: '2030-01-01 10:00:00', metadata: { template: { params: { firstName: 'Ana' } } } })) {
  const fake = fakeCampaigns([existing]);
  const auth = fakeAuth({ id: 'u-1', username: 'luis', name: 'Luis' });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]), fake.provider, auth.provider,
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map(id ? [['id', id]] : []) } } },
    ],
  });
  const notifications = TestBed.inject(NotificationService);
  vi.spyOn(notifications, 'success').mockImplementation(() => undefined);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CampaignFormPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, fake, navigate, notifications };
}

function fill(c: CampaignFormPageComponent, extra: Partial<Record<'name' | 'channel' | 'templateId' | 'recipientsText' | 'paramsText' | 'scheduledAt', string>> = {}) {
  c.name.set(extra.name ?? 'Bienvenida');
  c.channel.set(extra.channel ?? 'email');
  c.templateId.set(extra.templateId ?? TEMPLATE);
  c.recipientsText.set(extra.recipientsText ?? 'a@x.co,Ana\nb@x.co');
  c.paramsText.set(extra.paramsText ?? 'firstName=Ana');
  if (extra.scheduledAt !== undefined) c.scheduledAt.set(extra.scheduledAt);
}

describe('CampaignFormPageComponent (crear)', () => {
  it('carga los canales habilitados en el selector', async () => {
    const { el } = await render();

    expect(el.querySelector('select#cf-channel')?.textContent).toContain('Email (email)');
  });

  it('si los canales no cargan deja un campo de texto', async () => {
    const fake = fakeCampaigns([]);
    fake.service.channelTypes.mockRejectedValue(httpError(500));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), fake.provider, fakeAuth().provider, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } }],
    });
    const fixture = TestBed.createComponent(CampaignFormPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input#cf-channel')).not.toBeNull();
  });

  it.each([
    [{ name: '  ' }, 'nombre'],
    [{ channel: '' }, 'canal'],
    [{ templateId: 'nope' }, 'UUID'],
    [{ recipientsText: '' }, 'al menos un destinatario'],
    [{ recipientsText: 'a@x.co\n,sin id' }, 'sin identificador'],
    [{ paramsText: 'mal' }, 'clave=valor'],
    [{ name: 'x'.repeat(151) }, 'hasta 150'],
  ])('rechaza %j sin llamar a Mercury', async (extra, message) => {
    const { component, fake } = await render();
    fill(component, extra);

    await component.submit();

    expect(component.formError()).toContain(message);
    expect(fake.service.create).not.toHaveBeenCalled();
  });

  it('rechaza más destinatarios del máximo', async () => {
    const { component } = await render();
    fill(component, { recipientsText: Array.from({ length: 5001 }, (_, i) => `u${i}@x.co`).join('\n') });

    await component.submit();

    expect(component.formError()).toContain('hasta 5000');
  });

  it('una campaña programada exige fecha futura', async () => {
    const { component } = await render();
    fill(component);
    component.status.set('SCHEDULED');

    await component.submit();
    expect(component.formError()).toContain('fecha y hora');

    component.scheduledAt.set('2020-01-01T10:00');
    await component.submit();
    expect(component.formError()).toContain('en el futuro');
  });

  it('crea con el usuario de la sesión, avisa y vuelve a la lista', async () => {
    const { component, fake, navigate, notifications } = await render();
    fill(component);

    await component.submit();

    expect(fake.service.create).toHaveBeenCalledWith({
      name: 'Bienvenida', channelTypeCode: 'email', templateId: TEMPLATE, userId: 'u-1',
      recipients: [{ identifier: 'a@x.co', name: 'Ana' }, { identifier: 'b@x.co' }],
      templateParams: { firstName: 'Ana' }, status: 'DRAFT',
    });
    expect(notifications.success).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/dashboard/campaigns');
  });

  it('envía la fecha con segundos cuando se programa', async () => {
    const { component, fake } = await render();
    fill(component, { scheduledAt: '2099-01-01T10:00', paramsText: '' });
    component.status.set('SCHEDULED');

    await component.submit();

    const sent = fake.service.create.mock.calls[0][0];
    expect(sent.scheduledAt).toBe('2099-01-01T10:00:00');
    expect(sent.templateParams).toBeUndefined();
  });

  it('muestra el error de Mercury y no navega', async () => {
    const { component, fake, navigate } = await render();
    fake.service.create.mockRejectedValue(httpError(422));
    fill(component);

    await component.submit();

    expect(component.formError()).toContain('rechazó los datos');
    expect(navigate).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });

  it('importa un CSV en el cuadro de destinatarios', async () => {
    const { component, el } = await render();
    const input = el.querySelector('[data-testid="csv-input"]') as HTMLInputElement;
    const file = new File(['email,nombre\nz@x.co,Zoe'], 'lista.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file] });

    await component.importFile({ target: input } as unknown as Event);

    expect(component.recipientsText()).toContain('z@x.co');
    expect(component.parsedRecipients().recipients).toHaveLength(1);
  });

  it('importFile sin archivo no cambia nada', async () => {
    const { component } = await render();
    component.recipientsText.set('keep');

    await component.importFile({ target: { files: [] } } as unknown as Event);

    expect(component.recipientsText()).toBe('keep');
  });

  it('sin sesión envía un userId vacío y Mercury lo rechaza', async () => {
    const { component, fake } = await render();
    TestBed.inject(AuthService);
    fill(component);

    await component.submit();

    expect(fake.service.create).toHaveBeenCalled();
  });
});

describe('CampaignFormPageComponent (formulario)', () => {
  const type = (el: HTMLElement, selector: string, value: string, event = 'input') => {
    const control = el.querySelector(selector) as HTMLInputElement;
    control.value = value;
    control.dispatchEvent(new Event(event));
  };

  it('cada campo del formulario actualiza su estado', async () => {
    const { fixture, component, el } = await render();

    type(el, '#cf-name', 'Desde la pantalla');
    type(el, '#cf-channel', 'email', 'change');
    type(el, '#cf-template', TEMPLATE);
    type(el, '#cf-recipients', 'p@x.co,Pía');
    type(el, '#cf-params', 'k=v');
    type(el, '#cf-status', 'SCHEDULED', 'change');
    type(el, '#cf-when', '2099-05-05T09:30');
    fixture.detectChanges();

    expect([component.name(), component.channel(), component.templateId(), component.recipientsText(), component.paramsText(), component.status(), component.scheduledAt()])
      .toEqual(['Desde la pantalla', 'email', TEMPLATE, 'p@x.co,Pía', 'k=v', 'SCHEDULED', '2099-05-05T09:30']);
    expect(el.querySelector('[data-testid="recipients-summary"]')?.textContent).toContain('1 destinatarios');
  });

  it('el envío del formulario desde la pantalla crea la campaña', async () => {
    const { fixture, el, fake } = await render();
    type(el, '#cf-name', 'N');
    type(el, '#cf-channel', 'email', 'change');
    type(el, '#cf-template', TEMPLATE);
    type(el, '#cf-recipients', 'p@x.co');
    fixture.detectChanges();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(fake.service.create).toHaveBeenCalled();
  });

  it('el resumen avisa de repetidos y de líneas sin identificador', async () => {
    const { fixture, component, el } = await render();
    component.recipientsText.set('a@x.co\na@x.co\n,sin id');
    fixture.detectChanges();

    const summary = el.querySelector('[data-testid="recipients-summary"]')?.textContent ?? '';
    expect(summary).toContain('1 repetidos descartados');
    expect(summary).toContain('líneas sin identificador: 3');
  });

  it('muestra el error de validación en pantalla', async () => {
    const { fixture, component, el } = await render();
    await component.submit();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="form-error"]')?.textContent).toContain('nombre');
  });
});

describe('CampaignFormPageComponent (editar)', () => {
  it('rellena el formulario con la campaña y sus parámetros', async () => {
    const { component } = await render('a');

    expect(component.name()).toBe('Campaña a');
    expect(component.channel()).toBe('email');
    expect(component.status()).toBe('SCHEDULED');
    expect(component.scheduledAt()).toBe('2030-01-01T10:00');
    expect(component.paramsText()).toBe('firstName=Ana');
  });

  it('guardar sin destinatarios conserva los actuales (no los envía)', async () => {
    const { component, fake, navigate } = await render('a');
    component.scheduledAt.set('2099-01-01T10:00');

    await component.submit();

    const [id, body] = fake.service.update.mock.calls[0];
    expect(id).toBe('a');
    expect(body.recipients).toBeUndefined();
    expect(body.templateParams).toEqual({ firstName: 'Ana' });
    expect(navigate).toHaveBeenCalledWith('/dashboard/campaigns');
  });

  it('con destinatarios nuevos los reemplaza', async () => {
    const { component, fake } = await render('a');
    component.scheduledAt.set('2099-01-01T10:00');
    component.recipientsText.set('n@x.co');

    await component.submit();

    expect(fake.service.update.mock.calls[0][1].recipients).toEqual([{ identifier: 'n@x.co' }]);
  });

  it('un 403 explica que solo el creador puede editar', async () => {
    const { component, fake } = await render('a');
    fake.service.update.mockRejectedValue(httpError(403));
    component.scheduledAt.set('2099-01-01T10:00');

    await component.submit();

    expect(component.formError()).toContain('solo quien la creó');
  });

  it('al editar, el canal no se puede cambiar', async () => {
    const { el } = await render('a');

    expect((el.querySelector('#cf-channel') as HTMLSelectElement).disabled).toBe(true);
  });

  it('no deja editar una campaña que ya empezó', async () => {
    const { el } = await render('a', campaign('a', { status: 'COMPLETED' }));

    expect(el.querySelector('[data-testid="locked"]')).not.toBeNull();
    expect(el.querySelector('form')).toBeNull();
  });

  it.each([[403, 'No tienes permiso'], [500, 'No se pudo cargar']])('si cargar falla con %s lo dice', async (status, text) => {
    const fake = fakeCampaigns([]);
    fake.service.get.mockRejectedValue(httpError(status));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), fake.provider, fakeAuth().provider, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'a']]) } } }],
    });
    const fixture = TestBed.createComponent(CampaignFormPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="load-failed"]')?.textContent).toContain(text);
  });
});
