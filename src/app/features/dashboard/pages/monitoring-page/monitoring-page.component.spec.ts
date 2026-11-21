import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../../core/config';
import { MonitoringPageComponent, RuleDraft, draftProblem, toRequest } from './monitoring-page.component';
import { EVENT_SOURCE_FACTORY } from '../../services/monitoring-live.service';
import { FakeEventSource, OTHER_APP, answerAll, healthFixture, outagesFixture } from '../../services/monitoring-live.testing';

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
    expect(el.querySelectorAll('[data-testid="outage-row"]')[1].textContent).toContain('10 min');
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
    const plot = el.querySelector('[data-testid="trend-plot"]')!;
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    const requests = answerAll(http);
    fixture.detectChanges();
    expect(requests.find((r) => r.request.url.endsWith('/outages'))!.request.params.get('service')).toBe('SMTP');

    const chips = el.querySelector('[aria-label="Filtros activos"]')!.textContent!;
    for (const text of ['Tipo: Campaña', 'Estado: Fallidos', 'Servicio: SMTP', 'Intervalo: 17/11 06:00']) expect(chips).toContain(text);
    expect(live.service()).toBe('SMTP');

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
    const messages = el.querySelector('[aria-label="Mensajes"]') as HTMLElement;
    expect(button(messages, 'Anterior').disabled).toBe(true);

    button(messages, 'Siguiente').click();
    answerAll(http);
    fixture.detectChanges();
    expect(live.page()).toBe(1);

    button(messages, 'Anterior').click();
    answerAll(http);
    expect(live.page()).toBe(0);
  });

  it('el botón de actualizar vuelve a pedir todo', async () => {
    const { el, http } = await open();

    (el.querySelector('button[aria-label="Actualizar"]') as HTMLButtonElement).click();

    expect(answerAll(http)).toHaveLength(10);
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

    it('tras reintentar, la fila se queda donde está: dice «Reintento en cola» y no se pide la tabla', async () => {
      const { fixture, el, live, http } = await open();
      const item = { ...live.messages()!.items[0], messageId: '3f0c1f4e-8b1e-4f7e-9d54-0c6f0d2a7b11' };
      live.messages.set({ ...live.messages()!, items: [item, live.messages()!.items[1]] });
      fixture.detectChanges();

      button(el, 'Reintentar').click();
      fixture.detectChanges();
      expect(button(el, 'Reintentando…').disabled).toBe(true);
      http.expectOne((r) => r.url.endsWith('/retry')).flush(null, { status: 202, statusText: 'Accepted' });
      await vi.waitFor(() => expect(live.retried().has(item.id)).toBe(true));
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="retry-queued"]')?.textContent).toContain('Reintento en cola');
      expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent!.includes('Reintentar'))).toBe(false);
      expect(http.match((r) => r.url.endsWith('/messages'))).toHaveLength(0);
      expect(live.messages()!.items[0]).toBe(item);
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

  describe('aplicación y almacenamiento', () => {
    it('muestra el selector con «Todas las aplicaciones» y las de la persona, y elegir una la cambia; volver a «Todas» la quita', async () => {
      const { fixture, el, http, live } = await open();
      const select = el.querySelector('[data-testid="application"]') as HTMLSelectElement;

      expect(Array.from(select.options).map((o) => [o.value, o.textContent!.trim()])).toEqual([['', 'Todas las aplicaciones'], [OTHER_APP, 'ZeroBound']]);
      expect(select.value).toBe('');

      select.value = OTHER_APP;
      select.dispatchEvent(new Event('change'));
      answerAll(http);
      fixture.detectChanges();

      expect(live.application()).toBe(OTHER_APP);
      expect(fixture.componentInstance.selectedApplication()).toBe(OTHER_APP);

      select.value = '';
      select.dispatchEvent(new Event('change'));
      answerAll(http);
      expect(live.application()).toBeNull();
    });

    it('sin otras aplicaciones que elegir no hay selector', async () => {
      const { fixture, el, live } = await open();

      live.applications.set({ applications: [], available: true });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="application"]')).toBeNull();

      live.applications.set(null);
      expect(fixture.componentInstance.applicationOptions()).toEqual([]);
    });

    it('si a Mercury le faltan las tablas lo dice, con las tablas y las migraciones, en vez de dejar las vistas vacías', async () => {
      const { fixture, el, live } = await open();
      expect(el.querySelector('[data-testid="storage-missing"]')).toBeNull();

      live.health.set({ ...healthFixture(), storage: { ready: false, missingTables: ['send_events', 'alert_rules'], migrations: ['V2039__send_events.sql', 'V2041__monitoring_alerts.sql'], recordFailures: 4 } });
      fixture.detectChanges();

      const banner = el.querySelector('[data-testid="storage-missing"]')!;
      expect(banner.textContent).toContain('Mercury no está registrando los envíos');
      expect(banner.textContent).toContain('send_events, alert_rules');
      expect(banner.textContent).toContain('V2039__send_events.sql, V2041__monitoring_alerts.sql');
      expect(el.querySelector('[data-testid="storage-failures"]')).toBeNull();
    });

    it('si hay tablas pero fallaron registros, avisa cuántos', async () => {
      const { fixture, el, live } = await open();

      live.health.set({ ...healthFixture(), storage: { ready: true, missingTables: [], migrations: [], recordFailures: 3 } });
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="storage-failures"]')!.textContent).toContain('3 envío(s)');
      expect(el.querySelector('[data-testid="storage-missing"]')).toBeNull();

      live.health.set({ ...healthFixture(), storage: { ready: true, missingTables: [], migrations: [], recordFailures: 0 } });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="storage-failures"]')).toBeNull();
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

  describe('proporciones de los gráficos', () => {
    beforeEach(() => {
      FakeEventSource.instances.length = 0;
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/mrc/api/v1' },
          { provide: EVENT_SOURCE_FACTORY, useValue: (url: string) => new FakeEventSource(url) },
        ],
      });
    });

    it('tasa de fallos, parte del volumen y escala de causas', async () => {
      const { fixture } = await open();
      const page = fixture.componentInstance;
      const totals = { sent: 90, failed: 10, queued: 0, successRate: 0.9 };

      expect(page.failureRate(totals)).toBeCloseTo(0.1);
      expect(page.failureRate({ ...totals, sent: 0, failed: 0 })).toBeNull();
      const summary = { range: '24h', generatedAt: '', totals, channels: [], kinds: [] };
      expect(page.volumeShare(summary, 25)).toBeCloseTo(0.25);
      expect(page.volumeShare({ ...summary, totals: { ...totals, sent: 0, failed: 0 } }, 0)).toBeNull();
      const causes = [{ cause: 'a', channel: 'EMAIL', total: 3 }, { cause: 'b', channel: 'SMS', total: 6 }];
      expect(page.causeShare(6, causes)).toBe(100);
      expect(page.causeShare(3, causes)).toBe(50);
      expect(page.causeShare(0, [])).toBe(0);
      expect(page.ratePercent(null)).toBe(0);
      expect(page.ratePercent(0.9234)).toBe(92.3);
      expect(page.ratePercent(1.4)).toBe(100);
      expect(page.health(null)).toBeNull();
      expect(page.health(0.97)!.label).toBe('Saludable');
      expect(page.health(0.85)!.label).toBe('Atención');
      expect(page.health(0.5)!.label).toBe('Crítico');
    });

    it('dibuja la cifra principal, las tendencias y las barras de canales, tipos y códigos', async () => {
      const { el, fixture } = await open();
      const page = (_: HTMLElement) => fixture.componentInstance;

      expect(el.querySelectorAll('app-ratio-bar').length).toBeGreaterThan(3);
      expect(el.querySelector('[data-testid="codes-bar"]')).not.toBeNull();
      expect(el.querySelector('[data-testid="hero-detail"]')?.textContent).toContain('90 de 100 entregados');
      expect(el.querySelector('[data-testid="success-rate"]')?.textContent).toContain('90.0 %');
      expect(el.querySelector('[data-testid="hero-status"]')?.textContent).toContain('Atención');
      expect(el.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('90');
      expect(el.querySelectorAll('app-trend-spark')).toHaveLength(2);
      expect(page(el).sentTrend()).toEqual([10, 20]);
    });
  });

  describe('historial de caídas', () => {
    beforeEach(() => {
      FakeEventSource.instances.length = 0;
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/mrc/api/v1' },
          { provide: EVENT_SOURCE_FACTORY, useValue: (url: string) => new FakeEventSource(url) },
        ],
      });
    });
    afterEach(() => vi.useRealTimers());

    const outageRequest = (http: HttpTestingController) => {
      const requests = answerAll(http);
      return requests.find((r) => r.request.url.endsWith('/outages'))?.request.params;
    };
    const change = (el: HTMLElement, testid: string, value: string) => {
      const field = el.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement | HTMLSelectElement;
      field.value = value;
      field.dispatchEvent(new Event(field.tagName === 'INPUT' && (field as HTMLInputElement).type === 'search' ? 'input' : 'change'));
    };

    it('lista las caídas en una tabla, dice cuántas hay y en qué periodo', async () => {
      const { el } = await open();

      expect(el.querySelectorAll('[data-testid="outage-row"]')).toHaveLength(2);
      expect(el.querySelector('[data-testid="outage-count"]')?.textContent).toContain('2 caídas · últimas 24 h');
      expect(el.querySelector('[data-testid="outage-pages"]')?.textContent).toContain('Página 1 de 1');
      expect((el.querySelector('[data-testid="outage-prev"]') as HTMLButtonElement).disabled).toBe(true);
      expect((el.querySelector('[data-testid="outage-next"]') as HTMLButtonElement).disabled).toBe(true);
      expect(el.querySelector('[data-testid="outage-clear"]')).toBeNull();
    });

    it('la búsqueda se pide a Mercury un momento después de la última tecla', async () => {
      const { fixture, el, http } = await open();
      vi.useFakeTimers();

      change(el, 'outage-search', 'tim');
      change(el, 'outage-search', 'timeout');
      vi.advanceTimersByTime(299);
      expect(http.match((r) => r.url.endsWith('/outages'))).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(outageRequest(http)?.get('q')).toBe('timeout');
      fixture.detectChanges();
      expect(fixture.componentInstance.outageSearch()).toBe('timeout');
    });

    it('servicio, estado y periodo filtran; elegir fechas muestra sus campos', async () => {
      const { fixture, el, http, live } = await open();

      change(el, 'outage-service', 'SMTP');
      expect(outageRequest(http)?.get('service')).toBe('SMTP');
      change(el, 'outage-status', 'DOWN');
      expect(outageRequest(http)?.get('status')).toBe('DOWN');
      change(el, 'outage-period', '30d');
      expect(outageRequest(http)?.get('range')).toBe('30d');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-count"]')?.textContent).toContain('últimos 30 días');
      expect(el.querySelector('[data-testid="outage-from"]')).toBeNull();

      change(el, 'outage-period', 'custom');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-window-problem"]')?.textContent).toContain('Elige desde cuándo');
      change(el, 'outage-from', '2026-11-18T00:00');
      const params = outageRequest(http);
      expect(params?.get('from')).toBe('2026-11-18T00:00:00');
      expect(live.outageFilter().period).toBe('custom');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-window-problem"]')).toBeNull();
      expect((el.querySelector('[data-testid="outage-to"]') as HTMLInputElement).max).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      change(el, 'outage-to', '2026-11-19T00:00');
      expect(outageRequest(http)?.get('to')).toBe('2026-11-19T00:00:00');
    });

    it('el periodo propio se describe con sus fechas', async () => {
      const { fixture, live } = await open();
      live.setOutageFilter({ period: 'custom', from: '2026-11-18T00:00' });
      live.outages.set({ range: 'custom', outages: [], from: '2026-11-18T00:00:00', to: '2026-11-19T06:30:00', page: 0, size: 10, total: 0 });
      expect(fixture.componentInstance.outageWindowLabel()).toBe('del 18/11/26 00:00 al 19/11/26 06:30 (UTC)');

      live.outages.set({ range: 'custom', outages: [], from: '2026-11-18T00:00:00', to: null });
      expect(fixture.componentInstance.outageWindowLabel()).toBe('del 18/11/26 00:00 al ahora (UTC)');
      live.outages.set(null);
      expect(fixture.componentInstance.outageWindowLabel()).toBe('periodo propio');
    });

    it('pagina en Mercury y quitar los filtros vuelve a todo, también el texto escrito', async () => {
      const { fixture, el, http, live } = await open();
      live.outages.set({ ...outagesFixture(), page: 0, size: 10, total: 23 });
      fixture.detectChanges();

      (el.querySelector('[data-testid="outage-next"]') as HTMLButtonElement).click();
      expect(outageRequest(http)?.get('page')).toBe('1');
      await vi.waitFor(() => expect(live.outagesLoading()).toBe(false));
      live.outages.set({ ...outagesFixture(), page: 1, size: 10, total: 23 });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-pages"]')?.textContent).toContain('Página 2 de 3');
      (el.querySelector('[data-testid="outage-prev"]') as HTMLButtonElement).click();
      expect(outageRequest(http)?.get('page')).toBe('0');

      fixture.componentInstance.onOutageSearch('smtp');
      change(el, 'outage-status', 'DEGRADED');
      answerAll(http);
      fixture.detectChanges();
      (el.querySelector('[data-testid="outage-clear"]') as HTMLButtonElement).click();
      const params = outageRequest(http);
      expect(params?.has('status')).toBe(false);
      expect(params?.has('q')).toBe(false);
      expect(fixture.componentInstance.outageSearch()).toBe('');
    });

    it('al cambiar de página muestra un progreso infinito en la tabla hasta que llega la página', async () => {
      const { fixture, el, http, live } = await open();
      live.outages.set({ ...outagesFixture(), page: 0, size: 10, total: 23 });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-loading"]')).toBeNull();

      (el.querySelector('[data-testid="outage-next"]') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-loading"]')?.getAttribute('role')).toBe('progressbar');
      expect(el.querySelector('[data-testid="outage-loading"]')?.parentElement?.getAttribute('aria-busy')).toBe('true');
      expect((el.querySelector('[data-testid="outage-next"]') as HTMLButtonElement).disabled).toBe(true);
      expect((el.querySelector('[data-testid="outage-prev"]') as HTMLButtonElement).disabled).toBe(true);

      http.match((r) => r.url.endsWith('/outages')).forEach((r) => r.flush({ ...outagesFixture(), page: 1, size: 10, total: 23 }));
      await vi.waitFor(() => expect(live.outagesLoading()).toBe(false));
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-loading"]')).toBeNull();
      expect(el.querySelector('[data-testid="outage-pages"]')?.textContent).toContain('Página 2 de 3');
      expect((el.querySelector('[data-testid="outage-prev"]') as HTMLButtonElement).disabled).toBe(false);
      http.match(() => true);
    });

    it('sin resultados distingue «no hubo caídas» de «nada coincide»', async () => {
      const { fixture, el, live } = await open();
      live.outages.set({ range: '24h', outages: [], page: 0, size: 10, total: 0 });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-empty"]')?.textContent).toContain('Sin caídas en este periodo');

      live.setOutageService('SMTP');
      live.outages.set({ range: '24h', outages: [], page: 0, size: 10, total: 0 });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-empty"]')?.textContent).toContain('Ninguna caída coincide');
      expect(el.querySelector('[data-testid="outage-count"]')?.textContent).toContain('0 caídas');
    });

    it('una sola caída se nombra en singular, y al salir no queda una búsqueda pendiente', async () => {
      const { fixture, el, live, http } = await open();
      live.outages.set({ range: '24h', outages: [outagesFixture().outages[0]], page: 0, size: 10, total: 1 });
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="outage-count"]')?.textContent).toContain('1 caída ·');

      vi.useFakeTimers();
      fixture.componentInstance.onOutageSearch('x');
      fixture.destroy();
      vi.advanceTimersByTime(500);
      expect(http.match((r) => r.url.endsWith('/outages'))).toHaveLength(0);
    });
  });
});
