'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const AUTH = '/mrc/api/v1/auth';
const login = (body = { email: 'a@b.c', password: 'pw' }) => bff.call(`${AUTH}/access-token`, { method: 'POST', body });
const setCookies = (res) => res.headers.getSetCookie();
const sessionCookie = (res) => setCookies(res).find((c) => c.startsWith('iris_session='));

// HTTPS deployments: COOKIE_SECURE=true is what production sets
beforeAll(async () => { bff = await start({ env: { COOKIE_SECURE: 'true' } }); });
afterAll(() => bff.stop());
beforeEach(() => Object.assign(bff.state, { loginStatus: 200, refreshStatus: 200, apiStatus: 200 }));

describe('cookie de sesión (F2-01 AC1)', () => {
  it.each(['iris_session', 'iris_refresh'])('%s es HttpOnly, Secure, SameSite=Strict y Path=/', async (name) => {
    const cookie = setCookies(await login()).find((c) => c.startsWith(`${name}=`));

    assert.ok(cookie, `${name} no se emitió`);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; SameSite=Strict/);
    assert.match(cookie, /; Path=\//);
  });

  it('la expiración de la cookie sigue a la del refresh token (no a un valor fijo)', async () => {
    const res = await login();
    const expires = new Date(/Expires=([^;]+)/.exec(sessionCookie(res))[1]).getTime();

    // REFRESH expira en 24 h
    assert.ok(Math.abs(expires - (Date.now() + 86_400_000)) < 60_000, `Expires ${new Date(expires).toISOString()}`);
  });

  it('el cuerpo de la respuesta no contiene ningún token', async () => {
    const text = await (await login()).text();

    for (const token of Object.values(tokens)) assert.ok(!text.includes(token));
    assert.ok(!/token/i.test(text), text);
    assert.deepEqual(Object.keys(JSON.parse(text)).sort(), ['authenticated', 'user']);
  });
});

describe('credenciales inválidas (F2-01 AC2)', () => {
  it('responde 401 con el mismo mensaje genérico sea cual sea el motivo del rechazo', async () => {
    const bodies = new Set();
    for (const status of [400, 401, 404, 406]) {
      bff.state.loginStatus = status;
      const res = await login();
      assert.equal(res.status, 401);
      assert.equal(setCookies(res).length, 0);
      bodies.add(await res.text());
    }

    assert.deepEqual([...bodies], [JSON.stringify({ error: 'Invalid credentials' })]);
  });
});

describe('endpoints protegidos (F2-01 AC3)', () => {
  const protectedCall = (cookie) => bff.call('/mrc/api/v1/general/accounts', { cookie });

  it('sin cookie responde 401 sin llegar a Mercury', async () => {
    bff.state.apiCalls = [];

    assert.equal((await protectedCall()).status, 401);
    assert.equal(bff.state.apiCalls.length, 0);
  });

  it('con una cookie inválida o caducada responde 401', async () => {
    assert.equal((await protectedCall('iris_session=garbage')).status, 401);
    assert.equal((await protectedCall(`iris_session=${tokens.EXPIRED}`)).status, 401);
  });

  it('con una sesión viva responde con los datos', async () => {
    assert.equal((await protectedCall(`iris_session=${tokens.GOOD}`)).status, 200);
  });
});

describe('reinicio del BFF (F2-01 AC4)', () => {
  it('la sesión sobrevive porque vive solo en la cookie del navegador', async () => {
    const cookie = `iris_session=${tokens.GOOD}; iris_refresh=${tokens.REFRESH}`;
    assert.equal((await bff.call(`${AUTH}/me`, { cookie })).status, 200);

    await bff.restart();

    const me = await bff.call(`${AUTH}/me`, { cookie });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.username, 'luis');
    assert.equal((await bff.call('/mrc/api/v1/general/accounts', { cookie })).status, 200);
  });
});
