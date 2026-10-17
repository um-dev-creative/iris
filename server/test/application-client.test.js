'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const login = () => bff.call('/mrc/api/v1/auth/access-token', { method: 'POST', body: { email: 'a@b.c', password: 'pw' } });

before(async () => {
  bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris', BACKBONE_CLIENT_SECRET: 's3cret', BACKBONE_CLIENT_SCOPES: 'session:manage, extra', BACKBONE_TLS_INSECURE: 'true' } });
});
after(() => bff.stop());
beforeEach(() => Object.assign(bff.state, { loginStatus: 200, clientTokenStatus: 200, clientTokenTtl: 3600, backboneCalls: [] }));

test('the login is made as the application client, which is asked for once and reused', async () => {
  assert.equal((await login()).status, 200);
  assert.equal((await login()).status, 200);

  assert.deepEqual(bff.state.clientCredentials, { clientId: 'iris', clientSecret: 's3cret', scopes: ['session:manage', 'extra'] });
  assert.equal(bff.state.clientTokenCalls, 1);
  assert.deepEqual(bff.state.backboneCalls.map((c) => c.authorization), ['Bearer m2m-1', 'Bearer m2m-1']);
});

test('concurrent logins share one token request', async () => {
  bff.state.clientTokenCalls = 0;
  bff.state.clientTokens = [];

  await Promise.all([login(), login(), login()]);

  assert.equal(bff.state.clientTokenCalls, 1);
});

test('a token backbone no longer accepts is replaced once', async () => {
  await login();
  bff.state.clientTokens = []; // backbone revoked it
  const asked = bff.state.clientTokenCalls;

  const res = await login();

  assert.equal(res.status, 200);
  assert.equal(bff.state.clientTokenCalls, asked + 1);
});

test('a client backbone refuses is a configuration error answered as 502, never as the user\'s fault', async () => {
  bff.state.clientTokens = [];
  bff.state.clientTokenStatus = 401;
  // the cached token is revoked, so the retry asks for a new one and is refused
  const res = await login();

  assert.equal(res.status, 502);
});

test('logout carries the user session to backbone', async () => {
  await bff.call('/mrc/api/v1/auth/logout', { method: 'POST', cookie: `iris_session=${tokens.GOOD}` });

  assert.equal(bff.state.backboneCalls.at(-1).sessionToken, tokens.GOOD);
});
