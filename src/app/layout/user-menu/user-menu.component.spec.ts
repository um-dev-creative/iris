import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserMenuComponent } from './user-menu.component';
import { fakeAuth } from '../../core/testing/auth.testing';
import { User } from '../../core/models';

const USER: User = { id: 'u-1', username: 'luis', name: 'Luis Mata' };

function render(user: User | null = USER) {
  localStorage.clear();
  const auth = fakeAuth(user);
  TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider] });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(UserMenuComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = () => el.querySelector<HTMLButtonElement>('#user-menu-button')!;
  const menu = () => el.querySelector('#user-menu');
  const item = (text: string) => [...el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent!.includes(text));
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, auth, navigate, button, menu, item, settle };
}

describe('UserMenuComponent', () => {
  it('cerrado: muestra iniciales y nombre (AC1) y no el menú', () => {
    const { el, button, menu } = render();

    expect(el.textContent).toContain('LM');
    expect(el.textContent).toContain('Luis Mata');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(menu()).toBeNull();
  });

  it('al abrirlo muestra nombre y usuario cuando no hay correo', () => {
    const { fixture, el, button, menu } = render();

    button().click();
    fixture.detectChanges();

    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(menu()!.textContent).toContain('Luis Mata');
    expect(menu()!.textContent).toContain('@luis');
    expect(el.querySelector('[role="menu"]')!.getAttribute('aria-labelledby')).toBe('user-menu-button');
  });

  it('muestra el correo si existe', () => {
    const { fixture, button, menu } = render({ ...USER, email: 'luis@iris.dev' });

    button().click();
    fixture.detectChanges();

    expect(menu()!.textContent).toContain('luis@iris.dev');
    expect(menu()!.textContent).not.toContain('@luis');
  });

  it('muestra el avatar cuando hay avatarUrl', () => {
    const { el } = render({ ...USER, avatarUrl: 'https://cdn.iris.dev/luis.png' });

    expect(el.querySelector('img')!.getAttribute('src')).toBe('https://cdn.iris.dev/luis.png');
  });

  it('un segundo clic en el botón lo cierra', () => {
    const { fixture, button, menu } = render();

    button().click();
    fixture.detectChanges();
    button().click();
    fixture.detectChanges();

    expect(menu()).toBeNull();
  });

  it('Escape y un clic fuera lo cierran; un clic dentro no', () => {
    const { fixture, button, menu } = render();
    button().click();
    fixture.detectChanges();

    menu()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(menu()).toBeNull();

    button().click();
    fixture.detectChanges();
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('un clic fuera con el menú cerrado no hace nada', () => {
    const { fixture, menu } = render();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(menu()).toBeNull();
  });

  describe('cerrar sesión', () => {
    function openAndAsk(ctx: ReturnType<typeof render>) {
      ctx.button().click();
      ctx.fixture.detectChanges();
      ctx.item('Cerrar sesión')!.click();
      ctx.fixture.detectChanges();
    }

    it('pide confirmación en el propio menú antes de cerrar', () => {
      const ctx = render();

      openAndAsk(ctx);

      expect(ctx.menu()!.textContent).toContain('¿Cerrar la sesión?');
      expect(ctx.auth.service.logout).not.toHaveBeenCalled();
    });

    it('Cancelar vuelve a la opción inicial sin cerrar', () => {
      const ctx = render();
      openAndAsk(ctx);

      ctx.item('Cancelar')!.click();
      ctx.fixture.detectChanges();

      expect(ctx.auth.service.logout).not.toHaveBeenCalled();
      expect(ctx.menu()!.textContent).not.toContain('¿Cerrar la sesión?');
      expect(ctx.item('Cerrar sesión')).toBeDefined();
    });

    it('al confirmar cierra la sesión y navega al login reemplazando el historial (AC2)', async () => {
      const ctx = render();
      openAndAsk(ctx);

      ctx.item('Sí, cerrar sesión')!.click();
      await ctx.settle();

      expect(ctx.auth.service.logout).toHaveBeenCalledTimes(1);
      expect(ctx.navigate).toHaveBeenCalledExactlyOnceWith(['/login'], { replaceUrl: true });
      expect(ctx.menu()).toBeNull();
    });

    it('mientras cierra deshabilita los botones y Escape no cierra el menú', async () => {
      const ctx = render();
      let finish!: () => void;
      ctx.auth.service.logout.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
      openAndAsk(ctx);

      ctx.item('Sí, cerrar sesión')!.click();
      ctx.fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      ctx.fixture.detectChanges();

      expect(ctx.item('Sí, cerrar sesión')!.disabled).toBe(true);
      expect(ctx.item('Cancelar')!.disabled).toBe(true);
      expect(ctx.menu()).not.toBeNull();

      finish();
      await vi.waitFor(() => {
        ctx.fixture.detectChanges();
        expect(ctx.menu()).toBeNull();
      });
    });
  });
});
