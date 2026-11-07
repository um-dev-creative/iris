import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ADMIN_URL, UserAccessService } from './user-access.service';
import { CreateUserRequest } from '../../../core/models';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { service: TestBed.inject(UserAccessService), http: TestBed.inject(HttpTestingController) };
}

describe('UserAccessService', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it.each([
    ['applications', [], `${ADMIN_URL}/applications`],
    ['users', ['a/b'], `${ADMIN_URL}/applications/a%2Fb/users`],
    ['roles', ['app'], `${ADMIN_URL}/applications/app/roles`],
    ['access', ['u 1'], `${ADMIN_URL}/users/u%201/access`],
  ] as const)('%s lee con GET en el BFF', async (method, args, url) => {
    const { service, http } = setup();

    const done = (service[method] as (...a: string[]) => Promise<unknown>)(...args);
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(await done).toEqual([]);
  });

  it('da acceso con PUT del rol en la aplicación', async () => {
    const { service, http } = setup();

    const done = service.grant('u', 'a', 'r');
    const req = http.expectOne(`${ADMIN_URL}/users/u/access/a/role/r`);
    expect(req.request.method).toBe('PUT');
    req.flush({ applicationId: 'a' });

    expect(await done).toEqual({ applicationId: 'a' });
  });

  it('quita el acceso con DELETE', async () => {
    const { service, http } = setup();

    const done = service.revoke('u', 'a');
    const req = http.expectOne(`${ADMIN_URL}/users/u/access/a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await done;
  });

  it('crea un usuario con POST', async () => {
    const { service, http } = setup();
    const body = { alias: 'ana' } as CreateUserRequest;

    const done = service.create(body);
    const req = http.expectOne(`${ADMIN_URL}/users`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(body);
    req.flush({ id: 'x' });

    expect(await done).toEqual({ id: 'x' });
  });
});
