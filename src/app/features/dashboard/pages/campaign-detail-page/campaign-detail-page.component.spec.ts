import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { CampaignDetailPageComponent } from './campaign-detail-page.component';
import { NotificationService } from '../../../../core/services';
import { campaign, fakeCampaigns, httpError, progressOf } from '../../testing/campaigns.testing';

async function render(existing = campaign('a', { status: 'SCHEDULED', scheduledAt: '2030-01-01 10:00:00' })) {
  const fake = fakeCampaigns([existing]);
  TestBed.configureTestingModule({
    providers: [provideRouter([]), fake.provider, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'a']]) } } }],
  });
  const notifications = TestBed.inject(NotificationService);
  vi.spyOn(notifications, 'success').mockImplementation(() => undefined);
  vi.spyOn(notifications, 'error').mockImplementation(() => undefined);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CampaignDetailPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, fake, navigate, notifications };
}

const button = (el: HTMLElement, text: string) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

describe('CampaignDetailPageComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('muestra la campaña y las cifras de avance', async () => {
    const { el } = await render();

    expect(el.textContent).toContain('Campaña a');
    expect(el.querySelector('[data-testid="progress"]')?.textContent).toContain('Entregados');
    expect(el.textContent).toContain('50 % completado');
  });

  it('sin datos de avance lo dice en lugar de mostrar ceros', async () => {
    const fake = fakeCampaigns([campaign('a')]);
    fake.service.progress.mockRejectedValue(httpError(500));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), fake.provider, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'a']]) } } }],
    });
    const fixture = TestBed.createComponent(CampaignDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="no-progress"]')).not.toBeNull();
  });

  it.each([[403, 'No tienes permiso'], [503, 'no está configurada'], [404, 'No se pudo cargar']])('si cargar falla con %s lo dice', async (status, text) => {
    const fake = fakeCampaigns([]);
    fake.service.get.mockRejectedValue(httpError(status));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), fake.provider, { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'a']]) } } }],
    });
    const fixture = TestBed.createComponent(CampaignDetailPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="load-failed"]')?.textContent).toContain(text);
  });

  it('pausar y reanudar actualizan el estado en pantalla', async () => {
    const { fixture, el, fake } = await render();

    button(el, 'Pausar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fake.service.setEnabled).toHaveBeenCalledWith('a', false);
    expect(el.textContent).toContain('PAUSADA');

    button(el, 'Reanudar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fake.service.setEnabled).toHaveBeenLastCalledWith('a', true);
    expect(el.textContent).not.toContain('PAUSADA');
  });

  it('un 403 al pausar lo explica y no cambia el estado', async () => {
    const { fixture, el, fake, notifications } = await render();
    fake.service.setEnabled.mockRejectedValue(httpError(403));

    button(el, 'Pausar').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo completar', expect.stringContaining('solo quien la creó'));
    expect(el.textContent).not.toContain('PAUSADA');
  });

  it('eliminar pide confirmación, borra y vuelve a la lista', async () => {
    const { fixture, el, fake, navigate } = await render();

    button(el, 'Eliminar').click();
    fixture.detectChanges();
    expect(fake.service.remove).not.toHaveBeenCalled();
    button(el.querySelector('[data-testid="confirm-panel"]') as HTMLElement, 'Eliminar').click();
    await fixture.whenStable();

    expect(fake.service.remove).toHaveBeenCalledWith('a');
    expect(navigate).toHaveBeenCalledWith('/dashboard/campaigns');
  });

  it('cancelar la confirmación cierra el panel', async () => {
    const { fixture, el, fake } = await render();

    button(el, 'Eliminar').click();
    fixture.detectChanges();
    button(el, 'Cancelar').click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="confirm-panel"]')).toBeNull();
    expect(fake.service.remove).not.toHaveBeenCalled();
  });

  it('Actualizar vuelve a pedir la campaña y el avance', async () => {
    const { fixture, el, fake } = await render();

    button(el, 'Actualizar').click();
    await fixture.whenStable();

    expect(fake.service.get).toHaveBeenCalledTimes(2);
    expect(fake.service.progress).toHaveBeenCalledTimes(2);
  });

  it('si Actualizar falla avisa', async () => {
    const { fixture, el, fake, notifications } = await render();
    fake.service.get.mockRejectedValue(httpError(500));

    button(el, 'Actualizar').click();
    await fixture.whenStable();

    expect(notifications.error).toHaveBeenCalledWith('No se pudo actualizar', expect.any(String));
  });

  it('refresca el avance cada 15 s mientras la pestaña está visible', async () => {
    vi.useFakeTimers();
    const { fake } = await render();
    fake.service.progress.mockClear();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(fake.service.progress).toHaveBeenCalledTimes(1);

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await vi.advanceTimersByTimeAsync(15_000);
    expect(fake.service.progress).toHaveBeenCalledTimes(1);
  });

  it('el avance al 100 % muestra los totales', async () => {
    const { component, fixture, el } = await render();
    component.progress.set(progressOf('a', { totalRecipients: 4, delivered: 3, failed: 1, pending: 0, totalSent: 4 }));
    fixture.detectChanges();

    expect(el.textContent).toContain('100 % completado');
  });
});
