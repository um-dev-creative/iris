import { TestBed } from '@angular/core/testing';
import { SettingsPageComponent } from './settings-page.component';
import { ApiService, NotificationService } from '../../../../core/services';
import { environment } from '../../../../../environments/environment';

function render() {
  localStorage.clear();
  const fixture = TestBed.createComponent(SettingsPageComponent);
  fixture.detectChanges();
  return {
    fixture,
    c: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
    api: TestBed.inject(ApiService),
    notes: TestBed.inject(NotificationService),
  };
}

describe('SettingsPageComponent', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('carga la configuración actual en el formulario', () => {
    const { c, api } = render();

    expect(c.config()).toEqual(api.getConfig());
    expect(c.config().baseUrl).toBe(environment.apiBaseUrl);
  });

  it('updateField cambia solo el campo indicado', () => {
    const { c } = render();

    c.updateField('baseUrl', 'https://otra.test');
    c.updateField('authType', 'bearer');

    expect(c.config()).toMatchObject({ baseUrl: 'https://otra.test', authType: 'bearer', apiKey: '' });
  });

  it('guardar persiste en ApiService y avisa', () => {
    const { c, api, notes } = render();
    c.updateField('baseUrl', 'https://guardada.test');

    c.saveConfig();

    expect(api.getConfig().baseUrl).toBe('https://guardada.test');
    expect(notes.toasts()[0]).toMatchObject({ type: 'success', title: 'Configuración guardada' });
  });

  it('restaurar vuelve a los valores del entorno y avisa', () => {
    const { c, api, notes } = render();
    c.updateField('baseUrl', 'https://x.test');
    c.updateField('apiKey', 'k');

    c.resetConfig();

    expect(c.config()).toEqual({ baseUrl: environment.apiBaseUrl, apiKey: '', authType: 'none' });
    expect(api.getConfig().apiKey).toBe('');
    expect(notes.toasts()[0]).toMatchObject({ type: 'info', title: 'Configuración restaurada' });
  });

  it('probar conexión correcta: usa fetch contra la base URL y marca éxito', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const { c, notes } = render();
    c.updateField('baseUrl', 'https://api.test');

    const pending = c.testConnection();
    expect(c.testing()).toBe(true);
    await pending;

    expect(fetchMock).toHaveBeenCalledWith('https://api.test');
    expect(c.testResult()).toBe('success');
    expect(c.testing()).toBe(false);
    expect(notes.toasts()[0]).toMatchObject({ type: 'success', title: 'Conexión exitosa' });
  });

  it('probar conexión con respuesta de error: marca fallo con el estado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const { c, notes } = render();

    await c.testConnection();

    expect(c.testResult()).toBe('error');
    expect(notes.toasts()[0].message).toContain('503');
  });

  it('probar conexión sin red: marca fallo y libera el botón', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fallo de red')));
    const { c, notes } = render();

    await c.testConnection();

    expect(c.testResult()).toBe('error');
    expect(c.testing()).toBe(false);
    expect(notes.toasts()[0]).toMatchObject({ type: 'error', title: 'Error de conexión' });
  });

  it('muestra el resultado de la prueba en la página', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const { fixture, c, el } = render();

    await c.testConnection();
    fixture.detectChanges();

    expect(el.textContent).toContain('Conexión exitosa');
  });
});
