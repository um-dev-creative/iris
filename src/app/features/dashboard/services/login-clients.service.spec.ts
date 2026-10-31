import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginClientsService } from './login-clients.service';
import { API_BASE_URL } from '../../../core/config';
import { LoginClient } from '../../../core/models';

const URL = '/test/api/v1/general/login-clients';
const zerobound: LoginClient = { id: 'z-1', alias: 'zerobound', description: null, active: true };
const smartkin: LoginClient = { id: 's-1', alias: 'Smartkin-backend', description: 'SmartKin REST', active: true };

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/test/api/v1' }],
  });
  return { service: TestBed.inject(LoginClientsService), http: TestBed.inject(HttpTestingController) };
}

describe('LoginClientsService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('carga la lista ordenada por alias sin distinguir mayúsculas y apaga loading', async () => {
    const { service, http } = setup();

    const done = service.load();
    expect(service.loading()).toBe(true);
    http.expectOne(URL).flush([zerobound, smartkin]);
    await done;

    expect(service.clients().map((c) => c.alias)).toEqual(['Smartkin-backend', 'zerobound']);
    expect(service.loading()).toBe(false);
  });

  it('si la carga falla conserva la lista anterior, apaga loading y rechaza', async () => {
    const { service, http } = setup();
    const first = service.load();
    http.expectOne(URL).flush([zerobound]);
    await first;

    const failing = service.load();
    http.expectOne(URL).flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });

    await expect(failing).rejects.toMatchObject({ status: 403 });
    expect(service.clients()).toEqual([zerobound]);
    expect(service.loading()).toBe(false);
  });

  it('crea un cliente, lo agrega a la lista y devuelve la contraseña generada', async () => {
    const { service, http } = setup();

    const done = service.create({ alias: 'smartkin-backend', description: 'SmartKin REST' });
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ alias: 'smartkin-backend', description: 'SmartKin REST' });
    req.flush({ client: smartkin, password: 'generated-once' });
    const result = await done;

    expect(result.password).toBe('generated-once');
    expect(service.clients()).toEqual([smartkin]);
  });

  it('actualiza un cliente existente sin duplicarlo', async () => {
    const { service, http } = setup();
    const loaded = service.load();
    http.expectOne(URL).flush([zerobound, smartkin]);
    await loaded;

    const done = service.update('z-1', { active: false });
    const req = http.expectOne(`${URL}/z-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ active: false });
    req.flush({ ...zerobound, active: false });
    await done;

    expect(service.clients()).toHaveLength(2);
    expect(service.clients().find((c) => c.id === 'z-1')?.active).toBe(false);
  });

  it('rota la contraseña: sin contraseña manda cuerpo vacío, con contraseña la envía', async () => {
    const { service, http } = setup();

    const generated = service.rotatePassword('z-1');
    const first = http.expectOne(`${URL}/z-1/password`);
    expect(first.request.method).toBe('PUT');
    expect(first.request.body).toEqual({});
    first.flush({ client: zerobound, password: 'new-generated' });
    expect((await generated).password).toBe('new-generated');

    const supplied = service.rotatePassword('z-1', 'my-own-password-1');
    const second = http.expectOne(`${URL}/z-1/password`);
    expect(second.request.body).toEqual({ password: 'my-own-password-1' });
    second.flush({ client: zerobound });
    expect((await supplied).password).toBeUndefined();
  });

  it('borra un cliente y lo quita de la lista', async () => {
    const { service, http } = setup();
    const loaded = service.load();
    http.expectOne(URL).flush([zerobound, smartkin]);
    await loaded;

    const done = service.remove('z-1');
    const req = http.expectOne(`${URL}/z-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await done;

    expect(service.clients().map((c) => c.id)).toEqual(['s-1']);
  });

  it('codifica el id en la ruta', async () => {
    const { service, http } = setup();

    const done = service.remove('a/b');
    http.expectOne(`${URL}/a%2Fb`).flush(null, { status: 204, statusText: 'No Content' });
    await done;
  });
});
