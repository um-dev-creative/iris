'use strict';

const assert = require('node:assert/strict');
const { start, tokens, jwt, inFuture } = require('./harness');

let bff;
const me = (cookie) => bff.call('/mrc/api/v1/auth/me', { cookie });

beforeAll(async () => { bff = await start(); });
afterAll(() => bff.stop());
beforeEach(() => Object.assign(bff.state, { refreshStatus: 200 }));

describe('GET /auth/me (F2-02)', () => {
  it('AC1: con sesión válida responde 200 con el perfil', async () => {
    const res = await me(`iris_session=${tokens.GOOD}`);
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.authenticated, true);
    assert.equal(body.user.id, 'u-1');
    assert.equal(body.user.name, 'Luis Mata');
    assert.equal(body.user.username, 'luis');
    assert.ok(Math.abs(Date.parse(body.user.expiresAt) - (Date.now() + 3_600_000)) < 60_000, body.user.expiresAt);
  });

  it('AC1: no devuelve tokens ni campos que no sean del perfil', async () => {
    const body = await (await me(`iris_session=${tokens.GOOD}`)).json();

    assert.deepEqual(Object.keys(body.user).sort(), ['expiresAt', 'firstname', 'id', 'lastname', 'name', 'username']);
    assert.ok(!JSON.stringify(body).includes(tokens.GOOD));
  });

  it('AC2: sin sesión responde 401', async () => {
    const res = await me();

    assert.equal(res.status, 401);
    assert.deepEqual(await res.json(), { authenticated: false });
  });

  it('AC3: la respuesta no se cachea (200 y 401)', async () => {
    assert.equal((await me(`iris_session=${tokens.GOOD}`)).headers.get('cache-control'), 'no-store');
    assert.equal((await me()).headers.get('cache-control'), 'no-store');
  });

  it('el login tampoco se cachea', async () => {
    const res = await bff.call('/mrc/api/v1/auth/access-token', { method: 'POST', body: { email: 'a@b.c', password: 'pw' } });

    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('sin nombre en el token, name cae al usuario', async () => {
    const token = jwt({ uid: 'u-9', sub: 'solo-usuario', exp: inFuture(600) });

    const { user } = await (await me(`iris_session=${token}`)).json();

    assert.equal(user.name, 'solo-usuario');
    assert.equal(user.firstname, undefined);
  });

  it('con el usuario en el claim `username` y un solo nombre', async () => {
    const token = jwt({ uid: 'u-8', username: 'ana', firstname: ' Ana ', exp: inFuture(600) });

    const { user } = await (await me(`iris_session=${token}`)).json();

    assert.equal(user.username, 'ana');
    assert.equal(user.name, 'Ana');
  });

  it('incluye email y avatarUrl cuando Backbone los pone en el token', async () => {
    const token = jwt({ uid: 'u-7', sub: 'eva', email: 'eva@iris.dev', picture: 'https://cdn.iris.dev/eva.png', exp: inFuture(600) });

    const { user } = await (await me(`iris_session=${token}`)).json();

    assert.equal(user.email, 'eva@iris.dev');
    assert.equal(user.avatarUrl, 'https://cdn.iris.dev/eva.png');
  });

  it('ignora claims que no son texto', async () => {
    const token = jwt({ uid: 'u-6', sub: 'leo', email: 42, avatarUrl: { x: 1 }, firstname: '  ', exp: inFuture(600) });

    const { user } = await (await me(`iris_session=${token}`)).json();

    assert.equal(user.email, undefined);
    assert.equal(user.avatarUrl, undefined);
    assert.equal(user.name, 'leo');
  });

  it('un token sin exp se trata como sesión caducada', async () => {
    const token = jwt({ uid: 'u-5', sub: 'sin-exp' });

    assert.equal((await me(`iris_session=${token}`)).status, 401);
  });
});
