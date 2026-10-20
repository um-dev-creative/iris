import { isAuthUrl, isBffUrl } from './bff';

describe('isBffUrl', () => {
  it.each(['/mrc/api/v1/general/x', '/bkd/api/v1/users', '/mrc/api/v1/auth/me'])('%s es del BFF', (url) => {
    expect(isBffUrl(url)).toBe(true);
  });

  it.each(['https://api.test/mrc/api/v1/x', '/assets/a.json', '/mrc/other', '//evil.test/mrc/api/', '', 'mrc/api/v1/x'])(
    '%s no es del BFF',
    (url) => {
      expect(isBffUrl(url)).toBe(false);
    },
  );
});

describe('isAuthUrl', () => {
  it('reconoce /auth/ solo dentro del BFF', () => {
    expect(isAuthUrl('/mrc/api/v1/auth/access-token')).toBe(true);
    expect(isAuthUrl('/mrc/api/v1/general/auth/x')).toBe(false);
    expect(isAuthUrl('/mrc/api/v1/general/accounts')).toBe(false);
    expect(isAuthUrl('https://api.test/auth/login')).toBe(false);
  });
});
