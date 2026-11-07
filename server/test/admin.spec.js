'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const api = '/bkd/api/v1/admin';
const USER = '11111111-1111-4111-8111-111111111111';
const APP = '22222222-2222-4222-8222-222222222222';
const ROLE = '33333333-3333-4333-8333-333333333333';
const last = () => bff.state.apiCalls.at(-1);

beforeAll(async () => {
  bff = await start();
});
afterAll(() => bff.stop());
beforeEach(() => {
  bff.state.apiCalls.length = 0;
});

describe('administración de accesos', () => {
  it('exige sesión', async () => {
    assert.equal((await bff.call(`${api}/applications`)).status, 401);
  });

  it.each([
    [`/applications`, '/backbone/api/v1/applications'],
    [`/applications/${APP}/users`, `/backbone/api/v1/users/application/${APP}`],
    [`/applications/${APP}/roles`, `/backbone/api/v1/roles/application/${APP}`],
    [`/users/${USER}/access`, `/backbone/api/v1/users/${USER}/access`],
  ])('GET %s va a backbone con la sesión como Bearer (sin el query del navegador)', async (path, upstream) => {
    const res = await bff.call(`${api}${path}?evil=1`, { cookie: SESSION });

    assert.equal(res.status, 200);
    assert.equal(last().url, upstream);
    assert.equal(last().authorization, `Bearer ${tokens.GOOD}`);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('da acceso: PUT del rol en la aplicación', async () => {
    const res = await bff.call(`${api}/users/${USER}/access/${APP}/role/${ROLE}`, { method: 'PUT', cookie: SESSION });

    assert.equal(res.status, 200);
    assert.equal(last().method, 'PUT');
    assert.equal(last().url, `/backbone/api/v1/users/${USER}/access/${APP}/role/${ROLE}`);
    assert.equal(last().authorization, `Bearer ${tokens.GOOD}`);
  });

  it('quita el acceso: DELETE', async () => {
    await bff.call(`${api}/users/${USER}/access/${APP}`, { method: 'DELETE', cookie: SESSION });

    assert.equal(last().method, 'DELETE');
    assert.equal(last().url, `/backbone/api/v1/users/${USER}/access/${APP}`);
  });

  it('crea un usuario con solo los campos permitidos', async () => {
    const body = {
      alias: 'ana', displayName: 'Ana', password: 'Secr3t!pass', email: 'ana@example.com', applicationId: APP, roleId: ROLE,
      active: false, id: 'forced', person: { name: 'Ana', lastName: 'Gil', gender: 'F', birthdate: '1990-01-01', id: 'forced' },
    };
    const res = await bff.call(`${api}/users`, { method: 'POST', cookie: SESSION, body });

    assert.equal(res.status, 200);
    assert.equal(last().url, '/backbone/api/v1/users');
    assert.deepEqual(last().body, {
      alias: 'ana', displayName: 'Ana', password: 'Secr3t!pass', email: 'ana@example.com', applicationId: APP, roleId: ROLE,
      person: { name: 'Ana', lastName: 'Gil', gender: 'F', birthdate: '1990-01-01' },
    });
  });

  it.each([
    ['sin aplicación ni rol', {}],
    ['con una aplicación que no es UUID', { applicationId: 'x', roleId: ROLE }],
    ['con un rol que no es UUID', { applicationId: APP, roleId: '../x' }],
  ])('rechaza crear un usuario %s', async (_name, body) => {
    const res = await bff.call(`${api}/users`, { method: 'POST', cookie: SESSION, body });

    assert.equal(res.status, 400);
    assert.equal(bff.state.apiCalls.length, 0);
  });

  it.each([
    [`/users/not-a-uuid/access`, 'GET'],
    [`/applications/x/users`, 'GET'],
    [`/users/${USER}/access/${APP}/role/zzz`, 'PUT'],
  ])('rechaza un id inválido en %s', async (path, method) => {
    assert.equal((await bff.call(`${api}${path}`, { method, cookie: SESSION })).status, 400);
    assert.equal(bff.state.apiCalls.length, 0);
  });
});
