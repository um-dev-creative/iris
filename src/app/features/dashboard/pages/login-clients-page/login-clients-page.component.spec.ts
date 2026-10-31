import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginClientsPageComponent } from './login-clients-page.component';
import { NotificationService } from '../../../../core/services';
import { API_BASE_URL } from '../../../../core/config';
import { LoginClient } from '../../../../core/models';

const URL = '/test/api/v1/general/login-clients';
const zerobound: LoginClient = { id: 'z-1', alias: 'zerobound', description: 'Zerobound API', active: true, updatedAt: '2026-10-29T10:00:00' };
const smartkin: LoginClient = { id: 's-1', alias: 'smartkin-backend', description: null, active: false };

async function render(initial: LoginClient[] | { status: number } = [zerobound, smartkin]) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  const fixture = TestBed.createComponent(LoginClientsPageComponent);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  const req = http.expectOne(URL);
  if (Array.isArray(initial)) req.flush(initial);
  else req.flush({ message: 'x' }, { status: initial.status, statusText: 'err' });
  await fixture.whenStable();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, c: fixture.componentInstance, http, el, notes: TestBed.inject(NotificationService) };
}

const type = (el: HTMLElement, selector: string, value: string) => {
  const input = el.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
};

describe('LoginClientsPageComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista los clientes con su estado', async () => {
    const { el } = await render();

    const rows = el.querySelectorAll('[data-testid="client-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('smartkin-backend');
    expect(rows[0].textContent).toContain('Inactivo');
    expect(rows[1].textContent).toContain('Activo');
    expect(rows[1].textContent).toContain('Zerobound API');
  });

  it('sin clientes explica que la configuración estática de Mercury sigue valiendo', async () => {
    const { el } = await render([]);

    expect(el.querySelector('[data-testid="empty"]')?.textContent).toContain('siguen funcionando');
  });

  it('un 403 muestra que falta el permiso y cuál es', async () => {
    const { el } = await render({ status: 403 });

    expect(el.querySelector('[data-testid="forbidden"]')?.textContent).toContain('LOGIN_CLIENT_MANAGE');
  });

  it('otro error ofrece reintentar y el reintento recarga la lista', async () => {
    const { c, http, el, fixture } = await render({ status: 404 });
    expect(el.querySelector('[data-testid="load-failed"]')).not.toBeNull();

    const again = c.reload();
    http.expectOne(URL).flush([zerobound]);
    await again;
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="load-failed"]')).toBeNull();
    expect(el.querySelectorAll('[data-testid="client-row"]')).toHaveLength(1);
  });

  describe('crear', () => {
    it('valida el alias, la descripción y la contraseña antes de enviar', async () => {
      const { c } = await render([]);
      c.openForm();

      await c.submitForm();
      expect(c.formError()).toContain('alias');

      c.alias.set('bad alias;');
      await c.submitForm();
      expect(c.formError()).toContain('letras');

      c.alias.set('smartkin-backend');
      c.description.set('d'.repeat(201));
      await c.submitForm();
      expect(c.formError()).toContain('200');

      c.description.set('');
      c.password.set('short');
      await c.submitForm();
      expect(c.formError()).toContain('12 a 72');
    });

    it('sin contraseña pide que Mercury la genere y la muestra una sola vez', async () => {
      const { c, http, el, fixture, notes } = await render([]);
      const toast = vi.spyOn(notes, 'success');
      c.openForm();
      fixture.detectChanges();
      await fixture.whenStable();
      type(el, '#lc-alias', 'smartkin-backend');
      type(el, '#lc-description', ' SmartKin REST ');

      const done = c.submitForm();
      const req = http.expectOne(URL);
      expect(req.request.body).toEqual({ alias: 'smartkin-backend', description: 'SmartKin REST' });
      req.flush({ client: smartkin, password: 'generated-once-123' }); // gitleaks:allow
      await done;
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="secret-value"]')?.textContent).toContain('generated-once-123');
      expect(toast).toHaveBeenCalled();
      expect(c.formOpen()).toBe(false);

      c.dismissSecret();
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="secret-panel"]')).toBeNull();
    });

    it('con una contraseña propia la envía y no muestra ningún panel de secreto', async () => {
      const { c, http, el, fixture } = await render([]);
      c.openForm();
      c.alias.set('zerobound');
      c.password.set('my-own-password-1');

      const done = c.submitForm();
      const req = http.expectOne(URL);
      expect(req.request.body).toEqual({ alias: 'zerobound', password: 'my-own-password-1' });
      req.flush({ client: zerobound });
      await done;
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="secret-panel"]')).toBeNull();
    });

    it.each([
      [409, 'Ya existe'],
      [403, 'permiso'],
      [400, 'rechazó'],
      [500, 'No se pudo crear'],
    ])('un %s explica el motivo dentro del formulario', async (status, text) => {
      const { c, http } = await render([]);
      c.openForm();
      c.alias.set('zerobound');

      const done = c.submitForm();
      http.expectOne(URL).flush({ message: 'x' }, { status, statusText: 'err' });
      await done;

      expect(c.formError()).toContain(text);
      expect(c.saving()).toBe(false);
      expect(c.formOpen()).toBe(true);
    });

    it('cancelar limpia y cierra el formulario', async () => {
      const { c } = await render([]);
      c.openForm();
      c.alias.set('x');

      c.closeForm();

      expect(c.formOpen()).toBe(false);
      expect(c.alias()).toBe('');
    });
  });

  describe('copiar la contraseña', () => {
    it('la copia al portapapeles y avisa', async () => {
      const { c, http, fixture } = await render([]);
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      c.openForm();
      c.alias.set('smartkin-backend');
      const done = c.submitForm();
      http.expectOne(URL).flush({ client: smartkin, password: 'copy-me-12345' });
      await done;

      await c.copySecret();
      fixture.detectChanges();

      expect(writeText).toHaveBeenCalledWith('copy-me-12345');
      expect(c.copied()).toBe(true);
      vi.unstubAllGlobals();
    });

    it('si el navegador lo impide, avisa en vez de fallar', async () => {
      const { c, http, notes } = await render([]);
      const warn = vi.spyOn(notes, 'warning');
      vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
      c.openForm();
      c.alias.set('smartkin-backend');
      const done = c.submitForm();
      http.expectOne(URL).flush({ client: smartkin, password: 'copy-me-12345' });
      await done;

      await c.copySecret();

      expect(warn).toHaveBeenCalled();
      expect(c.copied()).toBe(false);
      vi.unstubAllGlobals();
    });

    it('sin secreto visible no hace nada', async () => {
      const { c } = await render([]);

      await expect(c.copySecret()).resolves.toBeUndefined();
    });
  });

  describe('acciones con confirmación', () => {
    it('rotar pide confirmación, muestra la contraseña nueva y no actúa si se cancela', async () => {
      const { c, http, el, fixture } = await render();
      c.ask('rotate', zerobound);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="confirm-panel"]')?.textContent).toContain('Rotar la contraseña de «zerobound»');

      c.cancelPending();
      expect(c.pending()).toBeNull();

      c.ask('rotate', zerobound);
      const done = c.confirm();
      expect(c.busyId()).toBe('z-1');
      http.expectOne(`${URL}/z-1/password`).flush({ client: zerobound, password: 'rotated-xyz-123' }); // gitleaks:allow
      await done;
      fixture.detectChanges();

      expect(c.pending()).toBeNull();
      expect(c.busyId()).toBeNull();
      expect(el.querySelector('[data-testid="secret-value"]')?.textContent).toContain('rotated-xyz-123');
    });

    it('desactivar y activar cambian el estado', async () => {
      const { c, http } = await render();

      c.ask('toggle', zerobound);
      expect(c.confirmText('toggle', zerobound)).toContain('Desactivar');
      let done = c.confirm();
      http.expectOne(`${URL}/z-1`).flush({ ...zerobound, active: false });
      await done;
      expect(c.clients().find((x) => x.id === 'z-1')?.active).toBe(false);

      c.ask('toggle', smartkin);
      expect(c.confirmText('toggle', smartkin)).toContain('Activar');
      done = c.confirm();
      const req = http.expectOne(`${URL}/s-1`);
      expect(req.request.body).toEqual({ active: true });
      req.flush({ ...smartkin, active: true });
      await done;
    });

    it('eliminar lo quita de la lista y advierte del respaldo estático', async () => {
      const { c, http } = await render();

      c.ask('delete', zerobound);
      expect(c.confirmText('delete', zerobound)).toContain('Desactivar');
      expect(c.confirmLabel('delete')).toBe('Eliminar');
      const done = c.confirm();
      http.expectOne(`${URL}/z-1`).flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(c.clients().map((x) => x.id)).toEqual(['s-1']);
    });

    it('un error al confirmar avisa y deja la confirmación abierta para reintentar', async () => {
      const { c, http, notes } = await render();
      const error = vi.spyOn(notes, 'error');
      c.ask('delete', zerobound);

      const done = c.confirm();
      http.expectOne(`${URL}/z-1`).flush({}, { status: 403, statusText: 'Forbidden' });
      await done;

      expect(error).toHaveBeenCalledWith('No se pudo completar la acción', expect.stringContaining('permiso'));
      expect(c.pending()).not.toBeNull();
      expect(c.busyId()).toBeNull();
    });

    it('un 404 al confirmar dice que el cliente ya no existe', async () => {
      const { c, http, notes } = await render();
      const error = vi.spyOn(notes, 'error');
      c.ask('rotate', zerobound);

      const done = c.confirm();
      http.expectOne(`${URL}/z-1/password`).flush({}, { status: 404, statusText: 'Not Found' });
      await done;

      expect(error).toHaveBeenCalledWith('No se pudo completar la acción', expect.stringContaining('ya no existe'));
    });

    it('cualquier otro error pide reintentar y confirm sin acción pendiente no hace nada', async () => {
      const { c, http, notes } = await render();
      const error = vi.spyOn(notes, 'error');
      await expect(c.confirm()).resolves.toBeUndefined();

      c.ask('toggle', zerobound);
      const done = c.confirm();
      http.expectOne(`${URL}/z-1`).flush({}, { status: 409, statusText: 'Conflict' });
      await done;

      expect(error).toHaveBeenCalledWith('No se pudo completar la acción', expect.stringContaining('Intenta de nuevo'));
    });

    it('la contraseña rotada que Mercury no devuelve no deja ningún panel', async () => {
      const { c, http, el, fixture } = await render();
      c.ask('rotate', zerobound);

      const done = c.confirm();
      http.expectOne(`${URL}/z-1/password`).flush({ client: zerobound });
      await done;
      fixture.detectChanges();

      expect(el.querySelector('[data-testid="secret-panel"]')).toBeNull();
    });
  });

  it('al salir de la página la contraseña revelada se borra de memoria', async () => {
    const { c, http } = await render([]);
    c.openForm();
    c.alias.set('smartkin-backend');
    const done = c.submitForm();
    http.expectOne(URL).flush({ client: smartkin, password: 'will-be-cleared' });
    await done;
    expect(c.secret()).not.toBeNull();

    c.ngOnDestroy();

    expect(c.secret()).toBeNull();
  });
});
