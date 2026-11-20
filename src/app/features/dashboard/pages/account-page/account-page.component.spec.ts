import { TestBed } from '@angular/core/testing';
import { AccountPageComponent } from './account-page.component';
import { fakeFederation } from '../../../../core/testing/auth.testing';

const GOOGLE = { provider: 'google', displayName: 'Google' };
const GITHUB = { provider: 'github', displayName: 'GitHub' };

async function render(options: { providers?: typeof GOOGLE[]; identities?: Array<{ id: string; provider: string; email?: string }>; linked?: string; linkError?: string } = {}) {
  const federation = fakeFederation(options.providers ?? [GOOGLE, GITHUB], options.identities ?? []);
  TestBed.configureTestingModule({ providers: [federation.provider] });
  const fixture = TestBed.createComponent(AccountPageComponent);
  if (options.linked) fixture.componentRef.setInput('linked', options.linked);
  if (options.linkError) fixture.componentRef.setInput('linkError', options.linkError);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, federation, click: (selector: string) => { el.querySelector<HTMLElement>(selector)!.click(); fixture.detectChanges(); } };
}

describe('AccountPageComponent', () => {
  it('carga proveedores y cuentas y, sin enlaces, lo dice', async () => {
    const { el, federation } = await render();

    expect(federation.service.loadProviders).toHaveBeenCalled();
    expect(federation.service.loadIdentities).toHaveBeenCalled();
    expect(el.querySelector('[data-testid="empty"]')).not.toBeNull();
  });

  it('lista las cuentas enlazadas y ofrece enlazar solo los proveedores que faltan', async () => {
    const { el } = await render({ identities: [{ id: 'i-1', provider: 'google', email: 'ana@corp.com' }] });

    expect(el.textContent).toContain('ana@corp.com');
    expect(el.querySelector('[data-link="google"]')).toBeNull();
    expect(el.querySelector('[data-link="github"]')).not.toBeNull();
  });

  it('enlazar pide al servicio ir al proveedor con la ruta de vuelta de esta página', async () => {
    const { click, federation } = await render();

    click('[data-link="github"]');

    expect(federation.service.link).toHaveBeenCalledWith('github', '/dashboard/account');
  });

  it('si no se puede iniciar el enlace avisa', async () => {
    const { click, federation, fixture, el } = await render();
    federation.service.link.mockRejectedValueOnce(new Error('x'));

    click('[data-link="github"]');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="problem"]')!.textContent).toContain('no está disponible');
  });

  it('quitar pide confirmación; confirmar desenlaza y cancelar no hace nada', async () => {
    const { el, click, federation, fixture } = await render({ identities: [{ id: 'i-1', provider: 'google' }] });

    click('[data-identity="i-1"] app-button');
    expect(el.textContent).toContain('Confirmar');
    click('[data-identity="i-1"] app-button:nth-of-type(2)');
    expect(federation.service.unlink).not.toHaveBeenCalled();

    click('[data-identity="i-1"] app-button');
    click('[data-identity="i-1"] app-button');
    await fixture.whenStable();
    expect(federation.service.unlink).toHaveBeenCalledWith('i-1');
  });

  it('si desenlazar falla, avisa y la lista sigue', async () => {
    const { click, federation, fixture, el } = await render({ identities: [{ id: 'i-1', provider: 'google' }] });
    federation.service.unlink.mockRejectedValueOnce(new Error('x'));

    click('[data-identity="i-1"] app-button');
    click('[data-identity="i-1"] app-button');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="problem"]')!.textContent).toContain('No pudimos quitar');
  });

  it('si no se pueden cargar las cuentas, avisa', async () => {
    const federation = fakeFederation([GOOGLE]);
    federation.service.loadIdentities.mockRejectedValue(new Error('x'));
    TestBed.configureTestingModule({ providers: [federation.provider] });
    const fixture = TestBed.createComponent(AccountPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="problem"]')!.textContent).toContain('No pudimos cargar');
  });

  it('muestra lo que dejó el BFF: enlazado o el error del enlace', async () => {
    const ok = await render({ linked: 'google' });
    expect(ok.el.querySelector('[data-testid="notice"]')!.textContent).toContain('Se enlazó google');

    TestBed.resetTestingModule();
    const failed = await render({ linkError: 'conflict' });
    expect(failed.el.querySelector('[data-testid="problem"]')!.textContent).toContain('ya está enlazada');
  });
});
