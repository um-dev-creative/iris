import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { REGISTER_MESSAGES, RegisterPageComponent, passwordScore } from './register-page.component';
import { fakeAuth } from '../../../core/testing/auth.testing';

const PASSWORD = 'Str0ng-pass!'; // gitleaks:allow

function render() {
  localStorage.clear();
  const auth = fakeAuth();
  TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider] });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(RegisterPageComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const el = fixture.nativeElement as HTMLElement;
  const fill = () =>
    component.form.patchValue({
      firstName: 'Ana', lastName: 'Rojas', alias: 'ana.rojas', email: 'ana@example.com', gender: 'F',
      birthdate: '1990-05-01', password: PASSWORD, confirmPassword: PASSWORD,
    });
  const submit = async () => {
    await component.submit();
    fixture.detectChanges();
  };
  return { fixture, component, el, auth, navigate, fill, submit };
}

const httpError = (status: number) => new HttpErrorResponse({ status });

describe('RegisterPageComponent', () => {
  it('no envía un formulario vacío y muestra los errores', async () => {
    const { el, auth, submit } = render();

    await submit();

    expect(auth.service.register).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Ingresa tu nombre.');
    expect(el.textContent).toContain('Ingresa un correo válido.');
  });

  it('exige que las contraseñas coincidan', async () => {
    const { el, component, auth, fill, submit } = render();
    fill();
    component.form.patchValue({ confirmPassword: 'otra-distinta' });
    component.form.controls.confirmPassword.markAsTouched();

    await submit();

    expect(auth.service.register).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('rechaza una fecha de nacimiento futura', async () => {
    const { el, component, fill, submit } = render();
    fill();
    component.form.patchValue({ birthdate: '2999-01-01' });

    await submit();

    expect(el.textContent).toContain('Ingresa una fecha pasada.');
  });

  it('envía los datos sin la confirmación y va a verificar el correo', async () => {
    const { auth, navigate, fill, submit } = render();
    fill();

    await submit();

    const request = auth.service.register.mock.calls[0][0];
    expect(request.person).toEqual({ firstName: 'Ana', lastName: 'Rojas', gender: 'F', birthdate: '1990-05-01' });
    expect(request).not.toHaveProperty('confirmPassword');
    expect(navigate).toHaveBeenCalledWith(['/verify-email'], { queryParams: { alias: 'ana.rojas' } });
  });

  it.each([
    [409, REGISTER_MESSAGES.aliasTaken],
    [400, REGISTER_MESSAGES.invalid],
    [429, REGISTER_MESSAGES.tooMany],
    [503, REGISTER_MESSAGES.unavailable],
  ])('con %i muestra el mensaje correspondiente', async (status, message) => {
    const { el, auth, fill, submit } = render();
    fill();
    auth.service.register.mockRejectedValueOnce(httpError(status));

    await submit();

    expect(el.querySelector('[role=alert]')?.textContent).toContain(message);
  });

  it('muestra la fortaleza de la contraseña', () => {
    const { fixture, component, el } = render();

    component.form.controls.password.setValue(PASSWORD);
    fixture.detectChanges();

    expect(el.textContent).toContain('Fuerte');
  });

  it('alterna la visibilidad de la contraseña', () => {
    const { fixture, el } = render();
    const toggle = el.querySelector<HTMLButtonElement>('[aria-pressed]')!;

    toggle.click();
    fixture.detectChanges();

    expect(el.querySelector<HTMLInputElement>('#register-password')!.type).toBe('text');
  });
});

describe('passwordScore', () => {
  it.each([
    ['corta', 0],
    ['minusculas', 0],
    ['Mayusculas', 1],
    ['Mayusculas1', 2],
    ['Mayusculas1!', 4],
  ])('%s vale %i', (password, score) => {
    expect(passwordScore(password)).toBe(score);
  });
});
