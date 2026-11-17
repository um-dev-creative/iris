import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../../core/config';
import { MonitoringPageComponent } from './monitoring-page.component';
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

    expect(answerAll(http)).toHaveLength(7);
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
});
