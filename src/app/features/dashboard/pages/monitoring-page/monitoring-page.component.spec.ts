import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../../core/config';
import { MonitoringPageComponent, RuleDraft, draftProblem, toRequest } from './monitoring-page.component';
import { EVENT_SOURCE_FACTORY } from '../../services/monitoring-live.service';
import { FakeEventSource, answerAll } from '../../services/monitoring-live.testing';

async function open() {
  const fixture = TestBed.createComponent(MonitoringPageComponent);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  answerAll(http);
  await vi.waitFor(() => expect(fixture.componentInstance.live.messages()).not.toBeNull());
  fixture.detectChanges();
  return { fixture, http, el: fixture.nativeElement as HTMLElement, live: fixture.componentInstance.live };
}
const button = (el: HTMLElement, text: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.includes(text)) as HTMLButtonElement;

describe('MonitoringPageComponent', () => {
  beforeEach(() => {
    FakeEventSource.instances.length = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/mrc/api/v1' },
        { provide: EVENT_SOURCE_FACTORY, useValue: (url: string) => new FakeEventSource(url) },
      ],
    });
  });

  it('muestra el resumen, los canales, los tipos, los códigos, los servicios y los mensajes', async () => {
    const { el } = await open();

    expect(el.querySelector('[data-testid="sent"]')!.textContent).toContain('90');
    expect(el.querySelector('[data-testid="failed"]')!.textContent).toContain('10');
    expect(el.querySelector('[data-testid="queued"]')!.textContent).toContain('5');
    expect(el.textContent).toContain('Correo');
    expect(el.textContent).toContain('En cola, sin proveedor: 3');
    expect(el.textContent).toContain('Código de verificación');
    expect(el.querySelector('[data-testid="codes-generated"]')!.textContent).toContain('20');
    expect(el.textContent).toContain('SMTP · Degradado');
    expect(el.textContent).toContain('KAFKA · No configurado');
    expect(el.textContent).toContain('The sending limit of the account was exceeded');
    expect(el.textContent).toContain('Degradación parcial');
    expect(el.textContent).toContain('en curso');
    expect(el.textContent).toContain('duró 10 min');
    expect(el.textContent).toContain('j***@e***.com');
    expect(el.querySelector('[data-testid="pages"]')!.textContent).toContain('Página 1 de 3');
    expect(el.textContent).toContain('hace 1 h 30 min');
  });

  it('mientras no hay datos muestra marcadores, no cifras', () => {
    const fixture = TestBed.createComponent(MonitoringPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.animate-pulse')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('[data-testid="sent"]')).toBeNull();
    TestBed.inject(HttpTestingController).match(() => true);
  });

  it('dice si los datos llegan en vivo, por sondeo o no llegan', async () => {
    const { fixture, el, live } = await open();
    expect(el.querySelector('[data-testid="connection"]')!.textContent).toContain('Conectando');

    FakeEventSource.instances[0].open();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="connection"]')!.textContent).toContain('En vivo');

    FakeEventSource.instances[0].fail(0);
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="connection"]')!.textContent).toContain('Actualizando cada 15 s');
    expect(live.connection()).toBe('polling');
  });

  it('avisa cuando los datos pueden estar desactualizados', async () => {
    const { fixture, el, http } = await open();
    expect(el.querySelector('[data-testid="stale"]')).toBeNull();

    const failing = fixture.componentInstance.live.refreshAll();
    answerAll(http, 500);
    await failing;
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="stale"]')!.textContent).toContain('desactualizado');
    expect(el.querySelector('[data-testid="connection"]')!.textContent).toContain('Sin conexión');
  });

  it('el selector de periodo cambia el periodo y lo marca', async () => {
    const { fixture, el, http, live } = await open();

    button(el, '7 días').click();
    answerAll(http);
    fixture.detectChanges();

    expect(live.range()).toBe('7d');
    expect(button(el, '7 días').getAttribute('aria-pressed')).toBe('true');
    expect(button(el, '24 h').getAttribute('aria-pressed')).toBe('false');
  });

  it('un clic en un canal filtra y muestra el filtro activo; «Quitar filtros» lo borra', async () => {
    const { fixture, el, http, live } = await open();

    (el.querySelector('[aria-label="Canales"] button:last-child') as HTMLButtonElement).click();
    answerAll(http);
    fixture.detectChanges();

    expect(live.channel()).toBe('SMS');
    expect(el.querySelector('[aria-label="Canales"] button:last-child')!.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[aria-label="Filtros activos"]')!.textContent).toContain('Canal: SMS');

    button(el, 'Quitar filtros').click();
    answerAll(http);
    fixture.detectChanges();

    expect(live.hasFilters()).toBe(false);
    expect(el.querySelector('[aria-label="Filtros activos"]')).toBeNull();
  });

  it('tipo, estado, servicio y barra se enlazan y se pueden quitar desde sus chips', async () => {
    const { fixture, el, http, live } = await open();

    button(el, 'Campaña').click();
    button(el, 'Fallidos').click();
    button(el, 'SMTP · Degradado').click();
    (el.querySelector('g[role="button"]') as SVGGElement).dispatchEvent(new Event('click'));
    answerAll(http);
    fixture.detectChanges();

    const chips = el.querySelector('[aria-label="Filtros activos"]')!.textContent!;
    for (const text of ['Tipo: Campaña', 'Estado: Fallidos', 'Servicio: SMTP', 'Intervalo: 17/11 06:00']) expect(chips).toContain(text);
    expect(live.visibleOutages().map((o) => o.service)).toEqual(['SMTP']);

    for (const text of ['Tipo:', 'Estado:', 'Servicio:', 'Intervalo:']) {
      button(el, text).click();
      answerAll(http);
      fixture.detectChanges();
    }
    expect(live.hasFilters()).toBe(false);
  });

  it('el estado «Enviados» también filtra', async () => {
    const { fixture, el, http, live } = await open();

    button(el, 'Enviados').click();
    answerAll(http);
    fixture.detectChanges();

    expect(live.status()).toBe('SENT');
    expect(el.querySelector('[aria-label="Filtros activos"]')!.textContent).toContain('Estado: Enviados');
  });

  it('una causa de fallo lleva a los mensajes fallidos de su canal', async () => {
    const { fixture, el, http, live } = await open();

    button(el, 'SEND_FAILED').click();
    answerAll(http);
    fixture.detectChanges();

    expect([live.channel(), live.status()]).toEqual(['EMAIL', 'FAILED']);
  });

  it('la paginación avanza y retrocede, y se desactiva en los extremos', async () => {
    const { fixture, el, http, live } = await open();
    expect(button(el, 'Anterior').disabled).toBe(true);

    button(el, 'Siguiente').click();
    answerAll(http);
    fixture.detectChanges();
    expect(live.page()).toBe(1);

    button(el, 'Anterior').click();
    answerAll(http);
    expect(live.page()).toBe(0);
  });

  it('el botón de actualizar vuelve a pedir todo', async () => {
    const { el, http } = await open();

    (el.querySelector('button[aria-label="Actualizar"]') as HTMLButtonElement).click();

    expect(answerAll(http)).toHaveLength(9);
  });

  it('sin mensajes ni fallos ni caídas lo dice', async () => {
    const { fixture, el, live } = await open();

    live.messages.set({ page: 0, size: 20, total: 0, items: [] });
    live.failures.set({ range: '24h', stuckAfterMinutes: 15, causes: [], stuck: [] });
    live.outages.set({ range: '24h', outages: [] });
    fixture.detectChanges();

    expect(el.textContent).toContain('No hay mensajes con estos filtros.');
    expect(el.textContent).toContain('Sin fallos en este periodo.');
    expect(el.textContent).toContain('Sin caídas en este periodo.');
  });

  describe('alertas', () => {
    it('muestra las alertas que suenan ahora, las reglas y las alertas resueltas', async () => {
      const { el } = await open();

      expect(el.querySelector('[data-testid="firing"]')!.textContent).toContain('1 alerta(s) activa(s)');
      expect(el.querySelector('[data-testid="firing"]')!.textContent).toContain('33.3% of the messages failed');
      expect(el.textContent).toContain('Más de 20 % de fallos en 15 min (mínimo 10 mensajes)');
      expect(el.textContent).toContain('avisa a ops@example.com');
      expect(el.textContent).toContain('SMTP degradado o caído durante 10 min');
      expect(el.textContent).toContain('desactivada');
      expect(el.textContent).toContain('SMTP DOWN for at least 10 min');
    });

    it('sin alertas ni reglas no muestra el aviso y lo dice', async () => {
      const { fixture, el, live } = await open();

      live.alerts.set({ range: '24h', firing: 0, alerts: [] });
      live.rules.set({ rules: [] });
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="firing"]')).toBeNull();
      expect(el.textContent).toContain('Todavía no hay reglas');
    });

    it('activar o desactivar una regla la guarda con el valor contrario', async () => {
      const { fixture, el, live } = await open();
      const save = vi.spyOn(live, 'saveRule').mockResolvedValue(true);

      button(el, 'Desactivar').click();
      button(el, 'Activar').click();
      fixture.detectChanges();

      expect(save).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'FAILURE_RATE', threshold: 20, enabled: false, notifyEmails: ['ops@example.com'] }), 'r-1');
      expect(save).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'SERVICE_DOWN', service: 'SMTP', enabled: true }), 'r-2');
    });

    it('eliminar una regla la borra', async () => {
      const { el, live } = await open();
      const remove = vi.spyOn(live, 'deleteRule').mockResolvedValue(true);

      (el.querySelector('button[aria-label^="Eliminar la regla"]') as HTMLButtonElement).click();

      expect(remove).toHaveBeenCalledWith('r-1');
    });

    it('el formulario crea la regla con lo escrito y se vacía al guardarse', async () => {
      const { fixture, el, live } = await open();
      const save = vi.spyOn(live, 'saveRule').mockResolvedValue(true);
      const form = el.querySelector('form[aria-label="Nueva regla"]') as HTMLFormElement;
      const type = form.querySelector('select') as HTMLSelectElement;

      type.value = 'QUEUE_STUCK';
      type.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      const [threshold, windowMinutes] = Array.from(form.querySelectorAll('input[type="number"]')) as HTMLInputElement[];
      threshold.value = '7';
      threshold.dispatchEvent(new Event('input'));
      windowMinutes.value = '30';
      windowMinutes.dispatchEvent(new Event('input'));
      const emails = form.querySelector('input[type="text"]') as HTMLInputElement;
      emails.value = 'a@x.com, b@x.com';
      emails.dispatchEvent(new Event('input'));
      form.dispatchEvent(new Event('submit'));
      await vi.waitFor(() => expect(save).toHaveBeenCalled());

      expect(save).toHaveBeenCalledWith({ type: 'QUEUE_STUCK', threshold: 7, windowMinutes: 30, notifyEmails: ['a@x.com', 'b@x.com'], enabled: true });
      await vi.waitFor(() => expect(fixture.componentInstance.draft().type).toBe('FAILURE_RATE'));
    });

    it('un formulario con un problema lo dice, desactiva el botón y no guarda', async () => {
      const { fixture, el, live } = await open();
      const save = vi.spyOn(live, 'saveRule').mockResolvedValue(true);

      fixture.componentInstance.patchDraft({ threshold: '0' });
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="draft-error"]')!.textContent).toContain('mayor que 0');
      expect((button(el, 'Crear regla')).disabled).toBe(true);
      await fixture.componentInstance.createRule();
      expect(save).not.toHaveBeenCalled();
    });

    it('si guardar falla el formulario conserva lo escrito', async () => {
      const { fixture, live } = await open();
      vi.spyOn(live, 'saveRule').mockResolvedValue(false);
      fixture.componentInstance.patchDraft({ threshold: '35' });

      await fixture.componentInstance.createRule();

      expect(fixture.componentInstance.draft().threshold).toBe('35');
      expect(fixture.componentInstance.saving()).toBe(false);
    });

    it('una regla de servicio muestra el selector de servicio y no el umbral', async () => {
      const { fixture, el } = await open();

      fixture.componentInstance.patchDraft({ type: 'SERVICE_DOWN', service: 'SMTP' });
      fixture.detectChanges();
      const form = el.querySelector('form[aria-label="Nueva regla"]')!;

      expect(form.textContent).toContain('Servicio');
      expect(form.textContent).not.toContain('Avisar si fallan');
      expect(toRequest(fixture.componentInstance.draft())).toEqual({ type: 'SERVICE_DOWN', windowMinutes: 15, service: 'SMTP', notifyEmails: [], enabled: true });
    });
  });

  describe('mensajes: reintentar y exportar', () => {
    it('solo un correo fallido con id ofrece «Reintentar», y el botón lo reintenta', async () => {
      const { fixture, el, live } = await open();
      const retry = vi.spyOn(live, 'retry').mockResolvedValue(true);
      const withId = { ...live.messages()!.items[0], messageId: '3f0c1f4e-8b1e-4f7e-9d54-0c6f0d2a7b11' };
      live.messages.set({ ...live.messages()!, items: [withId, live.messages()!.items[1]] });
      fixture.detectChanges();

      expect(Array.from(el.querySelectorAll('button')).filter((b) => b.textContent!.includes('Reintentar'))).toHaveLength(1);
      button(el, 'Reintentar').click();

      expect(retry).toHaveBeenCalledWith(withId);
      expect(fixture.componentInstance.canRetry({ ...withId, status: 'SENT' })).toBe(false);
      expect(fixture.componentInstance.canRetry({ ...withId, channel: 'TELEGRAM' })).toBe(false);
      expect(fixture.componentInstance.canRetry({ ...withId, messageId: null })).toBe(false);
    });

    it('los botones de exportar piden CSV o JSON', async () => {
      const { el, live } = await open();
      const exportMessages = vi.spyOn(live, 'exportMessages').mockResolvedValue(true);

      button(el, 'Exportar CSV').click();
      button(el, 'Exportar JSON').click();

      expect(exportMessages).toHaveBeenNthCalledWith(1, 'csv');
      expect(exportMessages).toHaveBeenNthCalledWith(2, 'json');
    });
  });
});

describe('formulario de reglas', () => {
  const draft = (patch: Partial<RuleDraft>): RuleDraft => ({ type: 'FAILURE_RATE', threshold: '20', windowMinutes: '15', minVolume: '10', service: '', emails: '', ...patch });

  it.each([
    [{}, null],
    [{ windowMinutes: '0' }, 'La ventana debe ser de 1 a 1440 minutos.'],
    [{ windowMinutes: '1441' }, 'La ventana debe ser de 1 a 1440 minutos.'],
    [{ windowMinutes: '1.5' }, 'La ventana debe ser de 1 a 1440 minutos.'],
    [{ threshold: '' }, 'El umbral debe ser mayor que 0.'],
    [{ threshold: 'abc' }, 'El umbral debe ser mayor que 0.'],
    [{ threshold: '101' }, 'El umbral de la tasa de fallos es un porcentaje, hasta 100.'],
    [{ type: 'QUEUE_STUCK', threshold: '500' }, null],
    [{ minVolume: '' }, 'El mínimo de mensajes debe ser 0 o más.'],
    [{ minVolume: '-1' }, 'El mínimo de mensajes debe ser 0 o más.'],
    [{ emails: 'a@x.com,b@x.com,c@x.com,d@x.com,e@x.com,f@x.com' }, 'Como máximo 5 correos.'],
    [{ emails: 'no-es-correo' }, 'Hay un correo que no es válido.'],
    [{ type: 'SERVICE_DOWN', threshold: '', minVolume: '' }, null],
  ] as [Partial<RuleDraft>, string | null][])('draftProblem(%j) = %s', (patch, problem) => expect(draftProblem(draft(patch))).toBe(problem));

  it('toRequest solo lleva lo que aplica al tipo', () => {
    expect(toRequest(draft({ emails: ' a@x.com , ' }))).toEqual({ type: 'FAILURE_RATE', windowMinutes: 15, threshold: 20, minVolume: 10, notifyEmails: ['a@x.com'], enabled: true });
    expect(toRequest(draft({ type: 'QUEUE_STUCK' }))).toEqual({ type: 'QUEUE_STUCK', windowMinutes: 15, threshold: 20, notifyEmails: [], enabled: true });
    expect(toRequest(draft({ type: 'SERVICE_DOWN' }))).toEqual({ type: 'SERVICE_DOWN', windowMinutes: 15, notifyEmails: [], enabled: true });
  });
});
