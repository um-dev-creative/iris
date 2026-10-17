'use strict';

// vitest globals (see vitest.server.config.mjs)
const before = beforeAll;
const after = afterAll;
const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const AUTH = '/mrc/api/v1/auth';
const login = (body = { email: 'a@b.c', password: 'pw' }) => bff.call(`${AUTH}/access-token`, { method: 'POST', body });
const cookies = (res) => res.headers.getSetCookie().join(' | ');

before(async () => { bff = await start(); });
after(() => bff.stop());
beforeEach(() => Object.assign(bff.state, { loginStatus: 200, refreshStatus: 200, logoutStatus: 204, backboneCalls: [] }));

test('login returns only the profile and sets httpOnly cookies', async () => {
  const res = await login();

  assert.equal(res.status, 200);
  const { expiresAt, ...user } = (await res.json()).user;
  assert.deepEqual(user, { id: 'u-1', username: 'luis', firstname: 'Luis', lastname: 'Mata', name: 'Luis Mata' });
  assert.ok(!Number.isNaN(Date.parse(expiresAt)));
  assert.match(cookies(res), /iris_session=.*HttpOnly/);
  assert.match(cookies(res), /iris_refresh=.*HttpOnly/);
  assert.deepEqual(bff.state.backboneCalls[0].body, { email: 'a@b.c', password: 'pw', applicationId: 'app-1' });
});

test('the legacy `alias` field is accepted as the login name', async () => {
  const res = await login({ alias: 'luis', password: 'pw' });

  assert.equal(res.status, 200);
  assert.equal(bff.state.backboneCalls[0].body.email, 'luis');
});

test('login maps every "wrong credentials" answer of backbone to 401', async () => {
  for (const status of [400, 401, 404, 406]) {
    bff.state.loginStatus = status;
    assert.equal((await login()).status, 401, `backbone ${status}`);
  }
});

test('a locked account answers 429 and an unexpected failure 502', async () => {
  bff.state.loginStatus = 429;
  assert.equal((await login()).status, 429);
  bff.state.loginStatus = 500;
  const res = await login();
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'Authentication service unavailable' });
});

test('login requires both fields to be non-empty strings', async () => {
  for (const body of [{}, { email: 'a@b.c' }, { password: 'pw' }, { email: '', password: 'pw' }, { email: 1, password: 'pw' }]) {
    assert.equal((await login(body)).status, 400, JSON.stringify(body));
  }
});

test('logout revokes in backbone and clears both cookies, also through the legacy path', async () => {
  for (const [method, path] of [['POST', 'logout'], ['DELETE', 'session-end']]) {
    bff.state.backboneCalls = [];
    const res = await bff.call(`${AUTH}/${path}`, { method, cookie: `iris_session=${tokens.GOOD}; iris_refresh=${tokens.REFRESH}` });

    assert.equal(res.status, 204);
    assert.match(cookies(res), /iris_session=;/);
    assert.match(cookies(res), /iris_refresh=;/);
    assert.equal(bff.state.backboneCalls[0].path, '/backbone/api/v1/session/logout');
    assert.equal(bff.state.backboneCalls[0].sessionToken, tokens.GOOD);
  }
});

test('logout without a session, or with backbone failing, still clears the cookies', async () => {
  assert.equal((await bff.call(`${AUTH}/logout`, { method: 'POST' })).status, 204);
  assert.equal(bff.state.backboneCalls.length, 0);

  bff.state.logoutStatus = 500;
  const res = await bff.call(`${AUTH}/logout`, { method: 'POST', cookie: `iris_session=${tokens.GOOD}` });
  assert.equal(res.status, 204);
});

test('me answers the user of a live session, 401 without one', async () => {
  const ok = await bff.call(`${AUTH}/me`, { cookie: `iris_session=${tokens.GOOD}` });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).user.username, 'luis');

  assert.equal((await bff.call(`${AUTH}/me`)).status, 401);
  assert.equal((await bff.call(`${AUTH}/me`, { cookie: 'iris_session=garbage' })).status, 401);
  assert.equal((await bff.call(`${AUTH}/me`, { cookie: `iris_session=${tokens.EXPIRED}` })).status, 401);
});

test('me renews an expired session with the refresh token', async () => {
  const res = await bff.call(`${AUTH}/me`, { cookie: `iris_session=${tokens.EXPIRED}; iris_refresh=${tokens.REFRESH}` });

  assert.equal(res.status, 200);
  assert.match(cookies(res), new RegExp(`iris_session=${tokens.RENEWED.replaceAll('.', '\\.')}`));
});

test('me drops the cookies when the refresh is refused', async () => {
  bff.state.refreshStatus = 401;

  const res = await bff.call(`${AUTH}/me`, { cookie: `iris_session=${tokens.EXPIRED}; iris_refresh=${tokens.REFRESH}` });

  assert.equal(res.status, 401);
  assert.match(cookies(res), /iris_session=;/);
});

test('state-changing API calls need the CSRF header; reads do not', async () => {
  const blocked = await bff.call(`${AUTH}/access-token`, { method: 'POST', body: { email: 'a', password: 'b' }, csrf: false });
  assert.equal(blocked.status, 403);
  assert.equal((await bff.call(`${AUTH}/me`, { csrf: false })).status, 401);
});

test('an unknown API path is a 404, not the SPA', async () => {
  const res = await bff.call('/mrc/api/v1/nothing');
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: 'Not found' });
});

test('health answers UP', async () => {
  assert.deepEqual(await (await bff.call('/health')).json(), { status: 'UP' });
});
