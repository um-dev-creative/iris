import { HttpErrorResponse } from '@angular/common/http';
import { actionErrorMessage, loadFailure } from './campaign-errors';

const http = (status: number) => new HttpErrorResponse({ status });

describe('campaign-errors', () => {
  it.each([[403, 'forbidden'], [503, 'unavailable'], [500, 'failed'], [0, 'failed']])('loadFailure(%s) = %s', (status, expected) => {
    expect(loadFailure(http(status))).toBe(expected);
  });

  it('loadFailure trata un error que no es HTTP como fallo', () => {
    expect(loadFailure(new Error('x'))).toBe('failed');
  });

  it.each([
    [400, /rechazó los datos/], [422, /rechazó los datos/], [403, /solo quien la creó/], [404, /ya no existe/],
    [503, /no está configurada/], [500, /No se pudo eliminar/],
  ])('actionErrorMessage(%s)', (status, pattern) => {
    expect(actionErrorMessage(http(status), 'eliminar')).toMatch(pattern);
  });

  it('nombra la acción', () => {
    expect(actionErrorMessage(new Error('x'), 'pausar')).toContain('pausar');
  });
});
