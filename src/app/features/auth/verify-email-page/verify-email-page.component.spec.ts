import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { VERIFY_MESSAGES, VerifyEmailPageComponent } from './verify-email-page.component';
import { fakeAuth } from '../../../core/testing/auth.testing';

function render(alias?: string) {
  localStorage.clear();
  const auth = fakeAuth();
  TestBed.configureTestingModule({ providers: [provideRouter([]), auth.provider] });
  const fixture = TestBed.createComponent(VerifyEmailPageComponent);
  if (alias !== undefined) fixture.componentRef.setInput('alias', alias);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const el = fixture.nativeElement as HTMLElement;
  const submit = async (code: string) => {
    component.form.controls.code.setValue(code);
    await component.submit();
    fixture.detectChanges();
  };
  return { fixture, component, el, auth, submit };
}

const unprocessable = (error: object) => new HttpErrorResponse({ status: 422, error });

describe('VerifyEmailPageComponent', () => {
  it('un código correcto confirma la cuenta y ofrece iniciar sesión', async () => {
    const { el, auth, submit } = render('ana');

    await submit('123456');

    expect(auth.service.verifyEmail).toHaveBeenCalledWith('ana', '123456');
    expect(el.textContent).toContain('Correo confirmado');
  });

  it('no envía un código mal formado', async () => {
    const { el, auth, submit } = render('ana');

    await submit('12');

    expect(auth.service.verifyEmail).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Son 6 dígitos.');
  });

  it('informa los intentos restantes', async () => {
    const { el, auth, submit } = render('ana');
    auth.service.verifyEmail.mockRejectedValueOnce(unprocessable({ attemptsRemaining: 2 }));

    await submit('123456');

    expect(el.textContent).toContain('Te quedan 2 intentos.');
  });

  it('sin intentos informados muestra el error genérico', async () => {
    const { el, auth, submit } = render('ana');
    auth.service.verifyEmail.mockRejectedValueOnce(unprocessable({}));

    await submit('123456');

    expect(el.querySelector('[role=alert]')?.textContent).toContain(VERIFY_MESSAGES.wrong);
  });

  it('un código vencido pide otro', async () => {
    const { el, auth, submit } = render('ana');
    auth.service.verifyEmail.mockRejectedValueOnce(unprocessable({ expired: true }));

    await submit('123456');

    expect(el.textContent).toContain(VERIFY_MESSAGES.expired);
  });

  it.each([
    [new HttpErrorResponse({ status: 429 }), VERIFY_MESSAGES.tooMany],
    [new HttpErrorResponse({ status: 503 }), VERIFY_MESSAGES.unavailable],
    [new Error('red'), VERIFY_MESSAGES.unavailable],
  ])('muestra un mensaje claro ante un error', async (error, message) => {
    const { el, auth, submit } = render('ana');
    auth.service.verifyEmail.mockRejectedValueOnce(error);

    await submit('123456');

    expect(el.textContent).toContain(message);
  });

  it('sin alias en la URL lo pide en el formulario', async () => {
    const { el, component, auth, submit, fixture } = render();
    expect(el.querySelector('#verify-alias')).not.toBeNull();

    await submit('123456');
    expect(auth.service.verifyEmail).not.toHaveBeenCalled();

    component.form.controls.aliasInput.setValue(' ana ');
    await submit('123456');
    fixture.detectChanges();

    expect(auth.service.verifyEmail).toHaveBeenCalledWith('ana', '123456');
  });

  it('reenvía el código y lo confirma sin revelar si la cuenta existe', async () => {
    const { fixture, component, el, auth } = render('ana');

    await component.resend();
    fixture.detectChanges();

    expect(auth.service.resendVerification).toHaveBeenCalledWith('ana');
    expect(el.textContent).toContain(VERIFY_MESSAGES.resent);
  });

  it('no reenvía sin usuario', async () => {
    const { component, auth } = render();

    await component.resend();

    expect(auth.service.resendVerification).not.toHaveBeenCalled();
  });

  it('informa si el reenvío falla', async () => {
    const { fixture, component, el, auth } = render('ana');
    auth.service.resendVerification.mockRejectedValueOnce(new HttpErrorResponse({ status: 429 }));

    await component.resend();
    fixture.detectChanges();

    expect(el.textContent).toContain(VERIFY_MESSAGES.tooMany);
  });
});
