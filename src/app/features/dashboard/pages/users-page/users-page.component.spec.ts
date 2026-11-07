import { TestBed } from '@angular/core/testing';
import { UsersPageComponent, adminFailure } from './users-page.component';
import { UserAccessService } from '../../services';
import { httpError } from '../../testing/campaigns.testing';
import { AdminApplication, AdminRole, AdminUser, UserAccess } from '../../../../core/models';

const APPS: AdminApplication[] = [
  { id: 'z', name: 'Zeronbound', codeName: 'zeronbou', active: true },
  { id: 'i', name: 'Iris', codeName: 'iris', active: true },
  { id: 'x', name: 'Vieja', active: false },
];
const ROLES: AdminRole[] = [{ id: 'r1', name: 'TEMPLATE_ADMIN' }];
const USERS: AdminUser[] = [{ id: 'u1', alias: 'ana', displayName: 'Ana', email: 'ana@example.com' }];
const ACCESS: UserAccess[] = [{ applicationId: 'i', applicationName: 'Iris', roleId: 'r1', roleName: 'VIEWER', active: true }];

function fakeService() {
  return {
    applications: vi.fn().mockResolvedValue(APPS),
    users: vi.fn().mockResolvedValue(USERS),
    roles: vi.fn().mockResolvedValue(ROLES),
    access: vi.fn().mockResolvedValue(ACCESS),
    grant: vi.fn().mockResolvedValue(ACCESS[0]),
    revoke: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({}),
  };
}

async function render(setup?: (service: ReturnType<typeof fakeService>) => void) {
  const service = fakeService();
  setup?.(service);
  TestBed.configureTestingModule({ providers: [{ provide: UserAccessService, useValue: service }] });
  const fixture = TestBed.createComponent(UsersPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, service, settle };
}

const q = (el: HTMLElement, id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

describe('UsersPageComponent', () => {
  it('ofrece las aplicaciones activas por nombre y no carga usuarios hasta elegir una', async () => {
    const { el, service } = await render();

    const options = Array.from(q(el, 'application')!.querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Elige una aplicación…', 'Iris', 'Zeronbound']);
    expect(service.users).not.toHaveBeenCalled();
  });

  it('al elegir una aplicación lista sus usuarios y roles', async () => {
    const { el, component, service, settle } = await render();

    await component.selectApplication('i');
    await settle();

    expect(service.users).toHaveBeenCalledWith('i');
    expect(service.roles).toHaveBeenCalledWith('i');
    expect(el.querySelectorAll('[data-testid="user"]')).toHaveLength(1);
    expect(el.textContent).toContain('ana@example.com');
  });

  it('sin usuarios lo dice, y al volver a "Elige una aplicación" limpia la lista', async () => {
    const { el, component, settle } = await render((s) => s.users.mockResolvedValue([]));

    await component.selectApplication('i');
    await settle();
    expect(q(el, 'no-users')).not.toBeNull();

    await component.selectApplication('');
    await settle();
    expect(q(el, 'no-users')).toBeNull();
  });

  it('si no puede cargar los usuarios de la aplicación lo explica', async () => {
    const { el, component, settle } = await render((s) => s.users.mockRejectedValue(httpError(403)));

    await component.selectApplication('i');
    await settle();

    expect(q(el, 'message')?.textContent).toContain('No tienes permiso');
  });

  it.each([[403, 'No tienes permiso'], [500, 'No se pudieron cargar']])('si falla la carga inicial (%s) lo explica y deja reintentar', async (status, text) => {
    const { el, service, settle } = await render((s) => s.applications.mockRejectedValue(httpError(status)));

    expect(q(el, 'load-failed')?.textContent).toContain(text);
    service.applications.mockResolvedValue(APPS);
    (q(el, 'load-failed')!.querySelector('button') as HTMLButtonElement).click();
    await settle();

    expect(q(el, 'load-failed')).toBeNull();
  });

  it('Actualizar recarga también los usuarios de la aplicación elegida', async () => {
    const { component, service } = await render();
    await component.selectApplication('i');
    service.users.mockClear();

    await component.reload();

    expect(service.applications).toHaveBeenCalledTimes(2);
    expect(service.users).toHaveBeenCalledWith('i');
  });

  describe('accesos', () => {
    async function withUser() {
      const view = await render();
      await view.component.selectApplication('i');
      await view.component.open(USERS[0]);
      view.fixture.detectChanges();
      return view;
    }

    it('muestra las aplicaciones a las que entra la persona', async () => {
      const { el, service } = await withUser();

      expect(service.access).toHaveBeenCalledWith('u1');
      expect(el.querySelectorAll('[data-testid="access"]')).toHaveLength(1);
      expect(q(el, 'accesses')?.textContent).toContain('VIEWER');
    });

    it('sin accesos lo dice', async () => {
      const view = await render((s) => s.access.mockResolvedValue([]));
      await view.component.selectApplication('i');
      await view.component.open(USERS[0]);
      view.fixture.detectChanges();

      expect(q(view.el, 'no-access')).not.toBeNull();
    });

    it('al elegir la aplicación del acceso carga sus roles y da acceso con el rol elegido', async () => {
      const { component, service } = await withUser();

      await component.selectGrantApplication('z');
      expect(service.roles).toHaveBeenCalledWith('z');
      component.grantRoleId.set('r1');
      await component.grant();

      expect(service.grant).toHaveBeenCalledWith('u1', 'z', 'r1');
      expect(component.grantApplicationId()).toBe('');
      expect(component.message()).toBeNull();
    });

    it('no da acceso sin aplicación y rol', async () => {
      const { component, service } = await withUser();

      await component.grant();

      expect(service.grant).not.toHaveBeenCalled();
    });

    it('quita el acceso y vuelve a leerlos', async () => {
      const { component, service } = await withUser();
      service.access.mockClear();

      await component.revoke(ACCESS[0]);

      expect(service.revoke).toHaveBeenCalledWith('u1', 'i');
      expect(service.access).toHaveBeenCalledWith('u1');
    });

    it('si quitar el acceso falla (409: es la principal) lo explica', async () => {
      const { component, service } = await withUser();
      service.revoke.mockRejectedValue(httpError(409));

      await component.revoke(ACCESS[0]);

      expect(component.message()).toContain('aplicación principal');
    });

    it('si dar el acceso falla lo explica', async () => {
      const { component, service } = await withUser();
      service.grant.mockRejectedValue(httpError(403));
      await component.selectGrantApplication('z');
      component.grantRoleId.set('r1');

      await component.grant();

      expect(component.message()).toContain('No tienes permiso');
    });

    it('si falla leer los roles o los accesos lo explica', async () => {
      const { component, service } = await withUser();
      service.roles.mockRejectedValue(httpError(500));
      await component.selectGrantApplication('z');
      expect(component.message()).toContain('No se pudo completar');

      service.access.mockRejectedValue(httpError(404));
      await component.open(USERS[0]);
      expect(component.message()).toContain('No se encontró');
    });

    it('quitar o dar acceso sin usuario elegido no hace nada', async () => {
      const { component, service } = await render();

      await component.revoke(ACCESS[0]);
      await component.grant();

      expect(service.revoke).not.toHaveBeenCalled();
      expect(service.grant).not.toHaveBeenCalled();
    });
  });

  describe('nuevo usuario', () => {
    const fill = (component: UsersPageComponent) => {
      for (const [key, value] of Object.entries({
        alias: ' ana ', displayName: 'Ana', email: 'ana@example.com', password: 'Secr3t!pass', name: 'Ana', lastName: 'Gil', birthdate: '1990-01-01', roleId: 'r1',
      })) component.setDraft(key, value);
    };

    async function withForm() {
      const view = await render();
      await view.component.selectApplication('i');
      view.component.toggleForm();
      view.fixture.detectChanges();
      return view;
    }

    it('abre el formulario con el género por defecto y lo cierra', async () => {
      const { component, el } = await withForm();

      expect(q(el, 'user-form')).not.toBeNull();
      expect(component.draft()['gender']).toBe('F');
      component.toggleForm();
      expect(component.formOpen()).toBe(false);
    });

    it('crea el usuario en la aplicación elegida, limpia el formulario y recarga la lista', async () => {
      const { component, service } = await withForm();
      fill(component);
      service.users.mockClear();

      await component.create();

      expect(service.create).toHaveBeenCalledWith({
        alias: 'ana', displayName: 'Ana', email: 'ana@example.com', password: 'Secr3t!pass', applicationId: 'i', roleId: 'r1',
        person: { name: 'Ana', lastName: 'Gil', gender: 'F', birthdate: '1990-01-01' },
      });
      expect(component.formOpen()).toBe(false);
      expect(service.users).toHaveBeenCalledWith('i');
    });

    it('exige todos los campos y un rol', async () => {
      const { component, service } = await withForm();

      await component.create();

      expect(service.create).not.toHaveBeenCalled();
      expect(component.message()).toContain('Completa todos los campos');
    });

    it('si Backbone lo rechaza lo explica y deja el formulario abierto', async () => {
      const { component, service } = await withForm();
      fill(component);
      service.create.mockRejectedValue(httpError(409));

      await component.create();

      expect(component.message()).toContain('Ya existe');
      expect(component.formOpen()).toBe(true);
      expect(component.saving()).toBe(false);
    });
  });
});

describe('adminFailure', () => {
  it.each([[400, 'rechazó los datos'], [422, 'rechazó los datos'], [403, 'No tienes permiso'], [404, 'No se encontró'], [409, 'Ya existe'], [500, 'No se pudo completar'], [0, 'No se pudo completar']])(
    'explica el estado %s',
    (status, text) => {
      expect(adminFailure(status === 0 ? new Error('x') : httpError(status))).toContain(text);
    },
  );
});
