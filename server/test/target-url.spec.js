'use strict';

const assert = require('node:assert/strict');
const { targetUrl } = require('../shared/proxy');

const base = 'https://gateway.test:8443/mercury';
const prefix = '/api/v1';

describe('targetUrl', () => {
  it('une la base, el prefijo y la ruta', () => {
    assert.equal(targetUrl(base, prefix, '/templates/abc'), 'https://gateway.test:8443/mercury/api/v1/templates/abc');
    assert.equal(targetUrl(base, prefix, ''), 'https://gateway.test:8443/mercury/api/v1');
  });

  it('conserva la consulta y los caracteres codificados', () => {
    assert.equal(targetUrl(base, prefix, '/campaigns/application/a%20b?x=1'), 'https://gateway.test:8443/mercury/api/v1/campaigns/application/a%20b?x=1');
  });

  it.each([['/../../admin'], ['/%2e%2e/%2e%2e/admin'], ['/a/../../../etc']])('no sale del prefijo con %s', (path) => {
    assert.equal(targetUrl(base, prefix, path), null);
  });

  it('una base inválida da null en lugar de lanzar', () => {
    assert.equal(targetUrl('not a url', prefix, '/x'), null);
  });
});
