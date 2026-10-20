import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LOGIN_MESSAGES, LoginPageComponent, safeReturnUrl } from './login-page.component';
import { fakeAuth } from '../../../core/testing/auth.testing';

function render(returnUrl?: string) {
  localStorage.clear();
  const auth = fakeAuth();
  TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider] });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoginPageComponent);
  if (returnUrl !== undefined) fixture.componentRef.setInput('returnUrl', returnUrl);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const email = el.querySelector<HTMLInputElement>('#login-email')!;
  const password = el.querySelector<HTMLInputElement>('#login-password')!;
  const type = (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, el, auth, navigate, email, password, type, submit };
}

const httpError = (status: number) => new HttpErrorResponse({ status });

describe('LoginPageComponent', () => {
  describe('formulario (AC3)', () => {
    it('no se puede enviar vacío: no llama al servicio, muestra los errores y enfoca el primero', async () => {
      const { el, auth, email, submit } = render();

      await submit();

      expect(auth.service.login).not.toHaveBeenCalled();
      expect(el.textContent).toContain('Ingresa tu usuario o correo.');
      expect(el.textContent).toContain('Ingresa tu contraseña.');
      expect(email.getAttribute('aria-invalid')).toBe('true');
      expect(document.activeElement).toBe(email);
    });

    it('con usuario y sin contraseña enfoca la contraseña', async () => {
      const { auth, email, password, type, submit } = render();
      type(email, 'luis');
      await submit();

      expect(auth.service.login).not.toHaveBeenCalled();
      expect(password.getAttribute('aria-invalid')).toBe('true');
      expect(email.getAttribute('aria-invalid')).toBe('false');
      expect(document.activeElement).toBe(password);
    });

    it('un usuario de solo espacios no es válido', async () => {
      const { auth, email, password, type, submit } = render();

      type(email, '   ');
      type(password, 'pw');
      await submit();

      expect(auth.service.login).not.toHaveBeenCalled();
    });

    it('los campos tienen etiqueta asociada y autocompletado', () => {
      const { el, email, password } = render();

      expect(el.querySelector('label[for="login-email"]')).not.toBeNull();
      expect(el.querySelector('label[for="login-password"]')).not.toBeNull();
      expect(email.getAttribute('autocomplete')).toBe('username');
      expect(password.getAttribute('autocomplete')).toBe('current-password');
    });

    it('el campo con error se asocia a su mensaje con aria-describedby', async () => {
      const { el, email, submit } = render();

      await submit();

      const id = email.getAttribute('aria-describedby')!;
      expect(el.querySelector(`#${id}`)?.textContent).toContain('usuario o correo');
    });
  });

  describe('mostrar u ocultar la contraseña', () => {
    it('alterna el tipo del campo y el estado del botón', () => {
      const { fixture, el, password } = render();
      const toggle = el.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
      expect(password.type).toBe('password');
      expect(toggle.getAttribute('aria-label')).toBe('Mostrar contraseña');

      toggle.click();
      fixture.detectChanges();
      expect(password.type).toBe('text');
      expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
      expect(toggle.getAttribute('aria-pressed')).toBe('true');

      toggle.click();
      fixture.detectChanges();
      expect(password.type).toBe('password');
    });
  });

  describe('inicio de sesión correcto (AC1)', () => {
    it('envía las credenciales y navega al dashboard por defecto', async () => {
      const { auth, navigate, email, password, type, submit } = render();

      type(email, 'luis@iris.dev');
      type(password, 'secreto');
      await submit();

      expect(auth.service.login).toHaveBeenCalledWith({ email: 'luis@iris.dev', password: 'secreto' });
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    });

    it('navega a returnUrl cuando es una ruta interna', async () => {
      const { navigate, email, password, type, submit } = render('/dashboard/data');

      type(email, 'a');
      type(password, 'b');
      await submit();

      expect(navigate).toHaveBeenCalledWith('/dashboard/data');
    });

    it.each(['https://evil.test/x', '//evil.test/x', '/\\evil.test', 'dashboard', ''])(
      'ignora un returnUrl no interno (%s) y va al dashboard',
      async (returnUrl) => {
        const { navigate, email, password, type, submit } = render(returnUrl);

        type(email, 'a');
        type(password, 'b');
        await submit();

        expect(navigate).toHaveBeenCalledWith('/dashboard');
      },
    );

    it('mientras envía deshabilita el botón y muestra el estado de espera', async () => {
      const { fixture, el, auth, email, password, type } = render();
      let finish!: () => void;
      auth.service.login.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
      type(email, 'a');
      type(password, 'b');

      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(el.querySelector('button[type="submit"]')!.hasAttribute('disabled')).toBe(true);
      expect(el.textContent).toContain('Ingresando');
      // un segundo envío durante la espera no repite la petición
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      expect(auth.service.login).toHaveBeenCalledTimes(1);

      finish();
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(el.querySelector('button[type="submit"]')!.hasAttribute('disabled')).toBe(false);
      });
    });
  });

  describe('errores del servicio (AC2)', () => {
    async function failWith(status: number) {
      const ctx = render();
      ctx.auth.service.login.mockRejectedValue(httpError(status));
      ctx.type(ctx.email, 'luis');
      ctx.type(ctx.password, 'mala');
      await ctx.submit();
      return ctx;
    }

    it('401: "Usuario o contraseña incorrectos" sin indicar cuál, y limpia la contraseña', async () => {
      const { el, navigate, password } = await failWith(401);

      const alert = el.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain('Usuario o contraseña incorrectos');
      expect(alert.textContent).not.toMatch(/no existe|usuario inexistente/i);
      expect(navigate).not.toHaveBeenCalled();
      expect(password.value).toBe('');
      expect(document.activeElement).toBe(password);
    });

    it('429: demasiados intentos', async () => {
      const { el } = await failWith(429);

      expect(el.querySelector('[role="alert"]')!.textContent).toContain(LOGIN_MESSAGES.tooMany);
    });

    it.each([500, 502, 503, 0])('%s: servicio no disponible', async (status) => {
      const { el } = await failWith(status);

      expect(el.querySelector('[role="alert"]')!.textContent).toContain(LOGIN_MESSAGES.unavailable);
    });

    it('un error que no es HTTP también se trata como servicio no disponible', async () => {
      const ctx = render();
      ctx.auth.service.login.mockRejectedValue(new Error('boom'));
      ctx.type(ctx.email, 'a');
      ctx.type(ctx.password, 'b');

      await ctx.submit();

      expect(ctx.el.querySelector('[role="alert"]')!.textContent).toContain(LOGIN_MESSAGES.unavailable);
    });

    it('el aviso desaparece al volver a enviar', async () => {
      const ctx = await failWith(401);
      ctx.auth.service.login.mockResolvedValue(undefined);
      ctx.type(ctx.password, 'buena');

      await ctx.submit();

      expect(ctx.el.querySelector('[role="alert"]')).toBeNull();
    });
  });
});

describe('safeReturnUrl', () => {
  it.each([
    ['/dashboard/data', '/dashboard/data'],
    ['/dashboard/data?x=1', '/dashboard/data?x=1'],
    [undefined, '/dashboard'],
    [null, '/dashboard'],
    ['', '/dashboard'],
    ['//evil.test', '/dashboard'],
    ['https://evil.test', '/dashboard'],
    ['/a\\b', '/dashboard'],
  ])('%s → %s', (value, expected) => {
    expect(safeReturnUrl(value)).toBe(expected);
  });
});
