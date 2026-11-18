'use strict';

// vitest globals (see vitest.server.config.mjs)
const before = beforeAll;
const after = afterAll;
const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const FED = '/mrc/api/v1/auth/federation';
const CALLBACK_URL = 'https://iris.test/mrc/api/v1/auth/federation/callback';
const cookies = (res) => res.headers.getSetCookie().join(' | ');
const stateCookie = (provider = 'google', extra = {}) =>
  `iris_fed_state=${Buffer.from(JSON.stringify({ state: 'st-1', provider, returnTo: '/dashboard/monitoring', link: false, ...extra })).toString('base64url')}`;
const location = (res) => res.headers.get('location');

before(async () => {
  bff = await start({
    env: {
      FEDERATION_ENABLED: 'true',
      FEDERATION_CALLBACK_URL: CALLBACK_URL,
      BACKBONE_CLIENT_ID: 'iris-client',
      BACKBONE_CLIENT_SECRET: 'x',
      COOKIE_SECURE: 'true',
    },
  });
});
after(() => bff.stop());
beforeEach(() => {
  bff.state.federation = { providers: [{ provider: 'google', displayName: 'Google' }] };
  bff.state.backboneCalls = [];
});

const lastBackboneCall = (suffix) => bff.state.backboneCalls.filter((c) => c.path.endsWith(suffix)).at(-1);

test('the providers of the application are listed', async () => {
  const res = await bff.call(`${FED}/providers`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { enabled: true, providers: [{ provider: 'google', displayName: 'Google' }] });
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('an unreachable or refusing backbone leaves the list empty instead of failing the login page', async () => {
  bff.state.federation.providersStatus = 404;
  assert.deepEqual(await (await bff.call(`${FED}/providers`)).json(), { enabled: true, providers: [] });
});

test('start sends the person to the provider and remembers the state in an httpOnly cookie', async () => {
  const res = await bff.call(`${FED}/google/start?returnTo=/dashboard/monitoring`);

  assert.equal(res.status, 302);
  assert.equal(location(res), 'https://idp.example/google/auth?state=st-1');
  assert.match(cookies(res), /iris_fed_state=.*HttpOnly/);
  assert.match(cookies(res), /SameSite=Lax/i);
  assert.match(cookies(res), /Path=\/mrc\/api\/v1\/auth\/federation/);
  const sent = lastBackboneCall('/federation/authorize');
  assert.deepEqual(sent.body, { applicationId: 'app-1', provider: 'google', redirectUri: CALLBACK_URL, intent: 'LOGIN' });
  assert.match(sent.authorization, /^Bearer m2m-/);
  const remembered = JSON.parse(Buffer.from(/iris_fed_state=([^;]+)/.exec(cookies(res))[1], 'base64url').toString());
  assert.equal(remembered.state, 'st-1');
  assert.equal(remembered.returnTo, '/dashboard/monitoring');
});

test('Apple needs a cross-site cookie (its answer is a form POST)', async () => {
  const res = await bff.call(`${FED}/apple/start`);
  assert.match(cookies(res), /SameSite=None/i);
  assert.match(cookies(res), /Secure/i);
});

test('a hostile returnTo falls back to the dashboard', async () => {
  for (const returnTo of ['//evil.example', 'https://evil.example', '/\\evil', '/dashboard\r\nSet-Cookie: x=1', '/admin', 'javascript:alert(1)']) {
    const res = await bff.call(`${FED}/google/start?returnTo=${encodeURIComponent(returnTo)}`);
    const remembered = JSON.parse(Buffer.from(/iris_fed_state=([^;]+)/.exec(cookies(res))[1], 'base64url').toString());
    assert.equal(remembered.returnTo, '/dashboard', returnTo);
  }
});

test('start refuses a malformed provider and maps backbone errors to a login error code', async () => {
  assert.equal(location(await bff.call(`${FED}/GOOGLE/start`)), '/login?error=unavailable');
  assert.equal(location(await bff.call(`${FED}/g..gle/start`)), '/login?error=unavailable');
  bff.state.federation.authorizeStatus = 404;
  bff.state.federation.authorizeError = 'federation_provider_not_found';
  assert.equal(location(await bff.call(`${FED}/github/start`)), '/login?error=unavailable');
  bff.state.federation.authorizeStatus = 429;
  bff.state.federation.authorizeError = 'federation_rate_limited';
  assert.equal(location(await bff.call(`${FED}/github/start`)), '/login?error=rate_limited');
  bff.state.federation.authorizeStatus = 500;
  bff.state.federation.authorizeError = undefined;
  assert.equal(location(await bff.call(`${FED}/github/start`)), '/login?error=unavailable');
});

test('callback with the right state signs the person in and goes back to returnTo', async () => {
  const res = await bff.call(`${FED}/callback?code=c-1&state=st-1`, { cookie: stateCookie() });

  assert.equal(res.status, 302);
  assert.equal(location(res), '/dashboard/monitoring');
  assert.match(cookies(res), /iris_session=.*HttpOnly/);
  assert.match(cookies(res), /iris_refresh=.*HttpOnly/);
  assert.match(cookies(res), /iris_fed_state=;/);
  assert.deepEqual(lastBackboneCall('/federation/callback').body, { state: 'st-1', code: 'c-1' });
});

test('callback with a state that is not the one of this browser never reaches backbone', async () => {
  for (const [path, cookie] of [
    [`${FED}/callback?code=c&state=other`, stateCookie()],
    [`${FED}/callback?code=c&state=st-1`, undefined],
    [`${FED}/callback?code=c&state=st-1`, 'iris_fed_state=not-base64-json'],
    [`${FED}/callback?state=st-1`, stateCookie()],
    [`${FED}/callback?code=c`, stateCookie()],
  ]) {
    bff.state.backboneCalls = [];
    const res = await bff.call(path, { cookie });
    assert.equal(location(res), '/login?error=expired', path);
    assert.equal(bff.state.backboneCalls.filter((c) => c.path.endsWith('/federation/callback')).length, 0);
  }
});

test('a provider denial is told apart from a failure', async () => {
  assert.equal(location(await bff.call(`${FED}/callback?error=access_denied&state=st-1`, { cookie: stateCookie() })), '/login?error=denied');
  assert.equal(location(await bff.call(`${FED}/callback?error=server_error&state=st-1`, { cookie: stateCookie() })), '/login?error=failed');
});

test('every backbone refusal becomes a stable login error code and no session is set', async () => {
  const cases = {
    federation_state_invalid: 'expired',
    federation_token_invalid: 'failed',
    federation_not_registered: 'not_registered',
    federation_email_not_allowed: 'not_allowed',
    federation_not_linked: 'not_linked',
    federation_not_allowed: 'not_allowed',
    federation_idp_unavailable: 'unavailable',
    federation_rate_limited: 'rate_limited',
    federation_a_future_code: 'failed',
  };
  for (const [backboneError, code] of Object.entries(cases)) {
    bff.state.federation.callbackStatus = 403;
    bff.state.federation.callbackError = backboneError;
    const res = await bff.call(`${FED}/callback?code=c&state=st-1`, { cookie: stateCookie() });
    assert.equal(location(res), `/login?error=${code}`, backboneError);
    assert.ok(!/iris_session=[^;]/.test(cookies(res)), 'no session on a refusal');
  }
  bff.state.federation.callbackStatus = 502;
  bff.state.federation.callbackError = undefined;
  assert.equal(location(await bff.call(`${FED}/callback?code=c&state=st-1`, { cookie: stateCookie() })), '/login?error=unavailable');
});

test('a 200 without a token is a failure', async () => {
  bff.state.federation.callbackBody = {};
  assert.equal(location(await bff.call(`${FED}/callback?code=c&state=st-1`, { cookie: stateCookie() })), '/login?error=failed');
  delete bff.state.federation.callbackBody;
});

test("Apple's form POST is accepted without the CSRF header, bound by the state cookie", async () => {
  const post = (cookie) => bff.call(`${FED}/callback`, {
    method: 'POST', csrf: false, cookie, raw: 'code=c-1&state=st-1', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const ok = await post(stateCookie('apple'));
  assert.equal(ok.status, 302);
  assert.equal(location(ok), '/dashboard/monitoring');
  assert.match(cookies(ok), /iris_session=.*HttpOnly/);
  assert.deepEqual(lastBackboneCall('/federation/callback').body, { state: 'st-1', code: 'c-1' });

  // without the cookie it is just somebody else's request
  assert.equal(location(await post(undefined)), '/login?error=expired');
});

test('the CSRF header is still required by every other state-changing federation call', async () => {
  const res = await bff.call(`${FED}/google/link`, { method: 'POST', csrf: false, body: {}, cookie: `iris_session=${tokens.GOOD}` });
  assert.equal(res.status, 403);
});

test('linking returns the provider URL and needs the session; the callback then reports the link', async () => {
  const anon = await bff.call(`${FED}/google/link`, { method: 'POST', body: {} });
  assert.equal(anon.status, 401);

  const res = await bff.call(`${FED}/google/link`, { method: 'POST', body: { returnTo: '/dashboard' }, cookie: `iris_session=${tokens.GOOD}` });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { authorizationUrl: 'https://idp.example/google/auth?state=st-1' });
  const sent = lastBackboneCall('/federation/authorize');
  assert.equal(sent.body.intent, 'LINK');
  assert.equal(sent.sessionToken, tokens.GOOD);

  const done = await bff.call(`${FED}/callback?code=c&state=st-1`, { cookie: `${stateCookie('google', { link: true, returnTo: '/dashboard' })}; iris_session=${tokens.GOOD}` });
  assert.equal(location(done), '/dashboard?linked=google');
  assert.equal(lastBackboneCall('/federation/callback').sessionToken, tokens.GOOD);
  assert.ok(!/iris_session=[^;]/.test(cookies(done)), 'a link never replaces the session');
});

test('a failed link comes back to the page with the reason', async () => {
  bff.state.federation.callbackStatus = 409;
  bff.state.federation.callbackError = 'federation_identity_conflict';
  const res = await bff.call(`${FED}/callback?code=c&state=st-1`, { cookie: `${stateCookie('google', { link: true, returnTo: '/dashboard' })}; iris_session=${tokens.GOOD}` });
  assert.equal(location(res), '/dashboard?linkError=conflict');
});

test('link start maps backbone refusals and a bad provider', async () => {
  assert.equal((await bff.call(`${FED}/G!/link`, { method: 'POST', body: {}, cookie: `iris_session=${tokens.GOOD}` })).status, 400);
  bff.state.federation.authorizeStatus = 401;
  bff.state.federation.authorizeError = 'federation_session_required';
  const res = await bff.call(`${FED}/google/link`, { method: 'POST', body: {}, cookie: `iris_session=${tokens.GOOD}` });
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: 'expired' });
  bff.state.federation.authorizeStatus = 500;
  assert.equal((await bff.call(`${FED}/google/link`, { method: 'POST', body: {}, cookie: `iris_session=${tokens.GOOD}` })).status, 502);
});

test('the linked accounts are listed and unlinked with the session as Bearer', async () => {
  bff.state.federation.identities = [{ id: 'i-1', provider: 'google', email: 'a@b.c' }];
  const list = await bff.call(`${FED}/identities`, { cookie: `iris_session=${tokens.GOOD}` });
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { identities: [{ id: 'i-1', provider: 'google', email: 'a@b.c' }] });
  assert.equal(lastBackboneCall('/federated-identities').authorization, `Bearer ${tokens.GOOD}`);
  assert.match(lastBackboneCall('/federated-identities').path, /\/users\/u-1\/federated-identities$/);

  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal((await bff.call(`${FED}/identities/${id}`, { method: 'DELETE', cookie: `iris_session=${tokens.GOOD}` })).status, 204);
  assert.equal((await bff.call(`${FED}/identities/not-a-uuid`, { method: 'DELETE', cookie: `iris_session=${tokens.GOOD}` })).status, 400);
  assert.equal((await bff.call(`${FED}/identities`)).status, 401);
  assert.equal((await bff.call(`${FED}/identities/${id}`, { method: 'DELETE', csrf: false, cookie: `iris_session=${tokens.GOOD}` })).status, 403);
});

test('backbone failures on the linked accounts are reported, not hidden', async () => {
  const cookie = `iris_session=${tokens.GOOD}`;
  bff.state.federation.identitiesStatus = 500;
  assert.equal((await bff.call(`${FED}/identities`, { cookie })).status, 502);
  bff.state.federation.identitiesStatus = 404;
  assert.equal((await bff.call(`${FED}/identities`, { cookie })).status, 404);
  bff.state.federation.identitiesStatus = 200;
  const id = '11111111-1111-4111-8111-111111111111';
  bff.state.federation.unlinkStatus = 404;
  assert.equal((await bff.call(`${FED}/identities/${id}`, { method: 'DELETE', cookie })).status, 404);
  bff.state.federation.unlinkStatus = 500;
  assert.equal((await bff.call(`${FED}/identities/${id}`, { method: 'DELETE', cookie })).status, 502);
  bff.state.federation.unlinkStatus = 204;
});

test('an expired session cannot manage linked accounts', async () => {
  assert.equal((await bff.call(`${FED}/identities`, { cookie: `iris_session=${tokens.EXPIRED}` })).status, 401);
});
