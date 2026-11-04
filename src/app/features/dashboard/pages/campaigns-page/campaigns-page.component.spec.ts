import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CampaignsPageComponent } from './campaigns-page.component';
import { NotificationService } from '../../../../core/services';
import { campaign, fakeCampaigns, httpError } from '../../testing/campaigns.testing';

async function render(list = [campaign('a'), campaign('b', { status: 'SCHEDULED', channelType: 'telegram', enabled: false, createdAt: '2026-02-01 10:00:00' })]) {
  const fake = fakeCampaigns(list);
  TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider] });
  // the real toasts schedule their own dismissal, which would keep whenStable() waiting for seconds
  const notifications = TestBed.inject(NotificationService);
  vi.spyOn(notifications, 'success').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'error').mockImplementation(() => undefined);
  const fixture = TestBed.createComponent(CampaignsPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, fake, notifications, component: fixture.componentInstance };
}

const rows = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-testid="campaign-row"]'));
const button = (el: HTMLElement, text: string) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('CampaignsPageComponent', () => {
  it('carga la lista al abrir y muestra una fila por campaña con su avance', async () => {
    const { el, fake } = await render();

    expect(fake.service.load).toHaveBeenCalled();
    expect(rows(el)).toHaveLength(2);
    expect(el.textContent).toContain('5 entregados');
    expect(fake.service.progress).toHaveBeenCalledTimes(2);
  });

  it('marca como PAUSADA la campaña con enabled=false', async () => {
    const { el } = await render();

    expect(rows(el)[1].textContent).toContain('PAUSADA');
    expect(rows(el)[0].textContent).toContain('DRAFT');
  });

  it('si el avance falla deja la barra vacía en vez de inventar cifras', async () => {
    const fake = fakeCampaigns([campaign('a')]);
    fake.service.progress.mockRejectedValue(httpError(500));
    TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider] });
    const fixture = TestBed.createComponent(CampaignsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('entregados');
  });

  it('muestra el estado vacío', async () => {
    const { el } = await render([]);

    expect(el.querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  it.each([[403, 'forbidden'], [503, 'unavailable'], [500, 'load-failed']])('si la carga falla con %s muestra %s', async (status, testid) => {
    const fake = fakeCampaigns([]);
    fake.service.load.mockRejectedValue(httpError(status));
    TestBed.configureTestingModule({ providers: [provideRouter([]), fake.provider] });
    const fixture = TestBed.createComponent(CampaignsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector(`[data-testid="${testid}"]`)).not.toBeNull();
  });

  it('filtra por nombre, estado, canal y pausadas', async () => {
    const { fixture, el, component } = await render();

    component.search.set('campaña a');
    fixture.detectChanges();
    expect(rows(el)).toHaveLength(1);

    component.search.set('');
    component.status.set('SCHEDULED');
    fixture.detectChanges();
    expect(rows(el).map((r) => r.textContent)).toEqual([expect.stringContaining('Campaña b')]);

    component.status.set('');
    component.channel.set('email');
    fixture.detectChanges();
    expect(rows(el)).toHaveLength(1);

    component.channel.set('');
    component.status.set('__paused');
    fixture.detectChanges();
    expect(rows(el)).toHaveLength(1);

    component.search.set('zzz');
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="no-match"]')).not.toBeNull();
  });

  it('los controles de filtro de la pantalla actualizan los filtros', async () => {
    const { fixture, el, component } = await render();
    const set = (selector: string, value: string, event: string) => {
      const control = el.querySelector(selector) as HTMLInputElement;
      control.value = value;
      control.dispatchEvent(new Event(event));
    };

    set('#cp-search', 'campaña b', 'input');
    fixture.detectChanges();
    expect(component.search()).toBe('campaña b');
    expect(rows(el)).toHaveLength(1);

    set('#cp-search', '', 'input');
    set('#cp-status', 'DRAFT', 'change');
    fixture.detectChanges();
    expect(component.status()).toBe('DRAFT');

    set('#cp-status', '', 'change');
    set('#cp-channel', 'telegram', 'change');
    fixture.detectChanges();
    expect(component.channel()).toBe('telegram');
    expect(rows(el)).toHaveLength(1);
  });

  it('los botones de paginación cambian de página', async () => {
    const many = Array.from({ length: 12 }, (_, i) => campaign(`c${String(i).padStart(2, '0')}`));
    const { fixture, el } = await render(many);

    button(el, 'Siguiente').click();
    fixture.detectChanges();
    expect(rows(el)).toHaveLength(2);

    button(el, 'Anterior').click();
    fixture.detectChanges();
    expect(rows(el)).toHaveLength(10);
  });

  it('pagina de diez en diez', async () => {
    const many = Array.from({ length: 12 }, (_, i) => campaign(`c${String(i).padStart(2, '0')}`));
    const { fixture, el, component } = await render(many);

    expect(rows(el)).toHaveLength(10);
    expect(el.querySelector('[data-testid="range"]')?.textContent).toContain('1–10 de 12');

    component.page.set(2);
    fixture.detectChanges();
    expect(rows(el)).toHaveLength(2);
  });

  it('pausar pide confirmación y no llama hasta confirmar', async () => {
    const { fixture, el, fake, notifications } = await render();
    const success = notifications.success;

    button(el, 'Pausar').click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="confirm-panel"]')).not.toBeNull();
    expect(fake.service.setEnabled).not.toHaveBeenCalled();

    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Pausar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fake.service.setEnabled).toHaveBeenCalledWith('a', false);
    expect(success).toHaveBeenCalled();
    expect(el.querySelector('[data-testid="confirm-panel"]')).toBeNull();
  });

  it('cancelar la confirmación no hace nada', async () => {
    const { fixture, el, fake } = await render();

    button(el, 'Eliminar').click();
    fixture.detectChanges();
    button(el, 'Cancelar').click();
    fixture.detectChanges();

    expect(fake.service.remove).not.toHaveBeenCalled();
    expect(el.querySelector('[data-testid="confirm-panel"]')).toBeNull();
  });

  it('reanudar una pausada no pide confirmación', async () => {
    const { el, fixture, fake } = await render();

    button(el, 'Reanudar').click();
    await fixture.whenStable();

    expect(fake.service.setEnabled).toHaveBeenCalledWith('b', true);
  });

  it('eliminar confirmado llama al servicio', async () => {
    const { fixture, el, fake } = await render();

    button(el, 'Eliminar').click();
    fixture.detectChanges();
    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Eliminar').click();
    await fixture.whenStable();

    expect(fake.service.remove).toHaveBeenCalledWith('a');
  });

  it('un 403 al eliminar avisa que solo el creador puede', async () => {
    const { fixture, el, fake, notifications } = await render();
    fake.service.remove.mockRejectedValue(httpError(403));
    const error = notifications.error;

    button(el, 'Eliminar').click();
    fixture.detectChanges();
    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Eliminar').click();
    await fixture.whenStable();

    expect(error).toHaveBeenCalledWith('No se pudo completar', expect.stringContaining('solo quien la creó'));
  });

  it('confirm sin acción pendiente no hace nada', async () => {
    const { component, fake } = await render();

    await component.confirm();

    expect(fake.service.remove).not.toHaveBeenCalled();
  });

  it('Actualizar vuelve a cargar', async () => {
    const { el, fake, fixture } = await render();

    button(el, 'Actualizar').click();
    await fixture.whenStable();

    expect(fake.service.load).toHaveBeenCalledTimes(2);
  });
});
