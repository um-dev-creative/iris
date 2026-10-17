'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const GOOD = `iris_session=${tokens.GOOD}; iris_refresh=${tokens.REFRESH}`;

beforeAll(async () => { bff = await start(); });
afterAll(() => bff.stop());
beforeEach(() => { bff.state.apiCalls = []; });

// Equivalente a la antigua lista blanca de dominios (`domainsList`): el host de destino nunca sale de la configuración.
describe('el BFF solo habla con los hosts configurados (AC2)', () => {
  const attempts = [
    '/mrc/api/v1/general/@evil.test/x',
    '/mrc/api/v1/general//evil.test/x',
    '/mrc/api/v1/general/http://evil.test/x',
    '/mrc/api/v1/general/%2F%2Fevil.test/x',
    '/mrc/api/v1/general/..%2F..%2F..%2Fadmin',
    '/bkd/api/v1/@evil.test/x',
    '/bkd/api/v1/http://evil.test/x',
  ];

  it.each(attempts)('%s se queda bajo el prefijo del servicio configurado', async (path) => {
    const res = await bff.call(path, { cookie: GOOD });

    assert.ok([200, 400, 401, 404].includes(res.status), `status ${res.status}`);
    for (const call of bff.state.apiCalls) {
      assert.match(call.url, call.service === 'mercury' ? /^\/mercury\/api\/v1\// : /^\/backbone\/api\/v1\//);
    }
  });

  it.each([
    '/mrc/api/v1/general/..%2F..%2Fadmin',
    '/mrc/api/v1/general/a%5Cb',
  ])('%s se rechaza con 400 sin llegar al upstream', async (path) => {
    const res = await bff.call(path, { cookie: GOOD });

    assert.equal(res.status, 400);
    assert.deepEqual(bff.state.apiCalls, []);
  });

  it('una petición para mercury nunca llega a backbone y viceversa', async () => {
    await bff.call('/mrc/api/v1/general/accounts', { cookie: GOOD });
    await bff.call('/bkd/api/v1/users', { cookie: GOOD });

    assert.deepEqual(bff.state.apiCalls.map((c) => c.service), ['mercury', 'backbone']);
  });
});
