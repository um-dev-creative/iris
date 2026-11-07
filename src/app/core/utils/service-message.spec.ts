import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { serviceMessage } from './service-message';

const failure = (error: unknown, headers: Record<string, string> = {}, status = 409): HttpErrorResponse =>
  new HttpErrorResponse({ status, error, headers: new HttpHeaders(headers) });

describe('serviceMessage', () => {
  it('lee el mensaje del cuerpo de Mercury', () => {
    expect(serviceMessage(failure({ message: 'Login client already exists: svc' }))).toBe('Login client already exists: svc');
  });

  it('lee el error del cuerpo del BFF', () => {
    expect(serviceMessage(failure({ error: 'That alias is already taken', field: 'alias' }))).toBe('That alias is already taken');
  });

  it('lee el motivo de Backbone de la cabecera Message-header, con el cuerpo vacío', () => {
    expect(serviceMessage(failure(null, { 'Message-header': 'E-mail previously exist.' }))).toBe('E-mail previously exist.');
  });

  it('lee la cabecera Warning y quita la forma estándar 199 - "texto"', () => {
    expect(serviceMessage(failure('', { Warning: 'User previously exist.' }))).toBe('User previously exist.');
    expect(serviceMessage(failure('', { Warning: '199 - "Role name previously exist."' }))).toBe('Role name previously exist.');
  });

  it('prefiere el cuerpo a las cabeceras', () => {
    expect(serviceMessage(failure({ message: 'del cuerpo' }, { Warning: 'de la cabecera' }))).toBe('del cuerpo');
  });

  it('ignora lo que no es texto o está vacío', () => {
    expect(serviceMessage(failure({ message: 42, error: '   ' }))).toBeNull();
    expect(serviceMessage(failure('texto suelto'))).toBeNull();
    expect(serviceMessage(failure(null))).toBeNull();
  });

  it('recorta un mensaje demasiado largo', () => {
    expect(serviceMessage(failure({ message: 'x'.repeat(500) }))).toHaveLength(200);
  });

  it('devuelve null si no es un error HTTP', () => {
    expect(serviceMessage(new Error('boom'))).toBeNull();
    expect(serviceMessage(undefined)).toBeNull();
  });
});
