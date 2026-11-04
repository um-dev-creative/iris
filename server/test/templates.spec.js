'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const api = '/mrc/api/v1/templates';
const last = () => bff.state.apiCalls.at(-1);

beforeAll(async () => {
  bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris-client', BACKBONE_CLIENT_SECRET: 'not-a-real-secret' } });
});
afterAll(() => bff.stop());
beforeEach(() => {
  bff.state.apiCalls.length = 0;
  Object.assign(bff.state, { apiStatus: 200, apiBody: [{ id: 'x' }], monitoring: undefined });
});

describe('templates (listas de referencia)', () => {
  it('exige sesión', async () => {
    assert.equal((await bff.call(`${api}/types`)).status, 401);
  });

  it.each([['types'], ['severities']])('lista %s con el Bearer de la aplicación y la sesión', async (name) => {
    const res = await bff.call(`${api}/${name}`, { cookie: SESSION });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ id: 'x' }]);
    assert.equal(last().url, `/mercury/api/v1/templates/${name}`);
    assert.equal(last().token, tokens.GOOD);
    assert.match(last().authorization, /^Bearer m2m-/);
  });

  it('las plantillas utilizables van siempre con la aplicación del BFF, aunque el navegador mande otra', async () => {
    await bff.call(`${api}/defined?applicationId=other-app&extra=1`, { cookie: SESSION });

    assert.equal(last().url, '/mercury/api/v1/templates/defined?applicationId=app-1');
  });

  it('no deja la respuesta en caché', async () => {
    assert.equal((await bff.call(`${api}/types`, { cookie: SESSION })).headers.get('cache-control'), 'no-store');
  });

  it('devuelve tal cual el 403 de Mercury', async () => {
    bff.state.apiStatus = 403;
    bff.state.apiBody = { message: 'no' };

    assert.equal((await bff.call(`${api}/defined`, { cookie: SESSION })).status, 403);
  });

  it('solo existen las listas de lectura: lo demás es 404', async () => {
    assert.equal((await bff.call(`${api}/anything`, { cookie: SESSION })).status, 404);
  });
});
