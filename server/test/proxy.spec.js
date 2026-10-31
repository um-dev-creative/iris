'use strict';

// vitest globals (see vitest.server.config.mjs)
const before = beforeAll;
const after = afterAll;
const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const GOOD = `iris_session=${tokens.GOOD}; iris_refresh=${tokens.REFRESH}`;
const EXPIRED = `iris_session=${tokens.EXPIRED}; iris_refresh=${tokens.REFRESH}`;
const last = () => bff.state.apiCalls.at(-1);

before(async () => { bff = await start(); });
after(() => bff.stop());
beforeEach(() => Object.assign(bff.state, { refreshStatus: 200, apiStatus: 200, apiHeaders: {}, apiBody: { ok: true }, apiCalls: [], backboneCalls: [] }));

test('general calls go to mercury with the session token from the cookie', async () => {
  const res = await bff.call('/mrc/api/v1/general/accounts/7?expand=roles', { cookie: GOOD });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(last().url, '/mercury/api/v1/accounts/7?expand=roles');
  assert.equal(last().token, tokens.GOOD);
});

test('the root of a service is reachable too', async () => {
  await bff.call('/mrc/api/v1/general', { cookie: GOOD });

  assert.equal(last().url, '/mercury/api/v1');
});

test('bodies and methods are forwarded; repeated query parameters stay repeated', async () => {
  await bff.call('/mrc/api/v1/general/items?sort=a&sort=b', { method: 'POST', body: { name: 'x' }, cookie: GOOD });

  assert.equal(last().method, 'POST');
  assert.equal(last().url, '/mercury/api/v1/items?sort=a&sort=b');
  assert.deepEqual(last().body, { name: 'x' });
});

test('without a session cookie the answer is 401 and nothing reaches mercury', async () => {
  const res = await bff.call('/mrc/api/v1/general/accounts');

  assert.equal(res.status, 401);
  assert.equal(bff.state.apiCalls.length, 0);
});

test('an expired token is renewed once and the call retried with the new one', async () => {
  const res = await bff.call('/mrc/api/v1/general/accounts', { cookie: EXPIRED });

  assert.equal(res.status, 200);
  assert.deepEqual(bff.state.apiCalls.map((c) => c.token), [tokens.EXPIRED, tokens.RENEWED]);
  assert.match(res.headers.getSetCookie().join(), new RegExp(`iris_session=${tokens.RENEWED.replaceAll('.', '\\.')}`));
});

test('when the renewal is refused the 401 goes back and the cookies are cleared', async () => {
  bff.state.refreshStatus = 401;

  const res = await bff.call('/mrc/api/v1/general/accounts', { cookie: EXPIRED });

  assert.equal(res.status, 401);
  assert.equal(bff.state.apiCalls.length, 1);
  assert.match(res.headers.getSetCookie().join(), /iris_session=;/);
});

test('versions, totals and downloads are passed back; 204 has no body', async () => {
  bff.state.apiHeaders = { ETag: '"v3"', 'X-Total-Count': '42', Link: '<next>; rel="next"' };
  const res = await bff.call('/mrc/api/v1/general/accounts', { cookie: GOOD });
  assert.equal(res.headers.get('etag'), '"v3"');
  assert.equal(res.headers.get('x-total-count'), '42');
  assert.equal(res.headers.get('link'), '<next>; rel="next"');

  bff.state.apiStatus = 204;
  const empty = await bff.call('/mrc/api/v1/general/accounts/1', { method: 'DELETE', cookie: GOOD });
  assert.equal(empty.status, 204);
  assert.equal(await empty.text(), '');
});

test('If-Match and Idempotency-Key reach mercury', async () => {
  await bff.call('/mrc/api/v1/general/items/1', {
    method: 'PUT', body: {}, cookie: GOOD, headers: { 'If-Match': '"v3"', 'Idempotency-Key': 'k-1' },
  });

  assert.equal(last().ifMatch, '"v3"');
  assert.equal(last().idempotencyKey, 'k-1');
});

test('the trace continues towards mercury and its id is answered', async () => {
  const incoming = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

  const res = await bff.call('/mrc/api/v1/general/accounts', { cookie: GOOD, headers: { traceparent: incoming } });

  assert.equal(res.headers.get('x-trace-id'), '0af7651916cd43dd8448eb211c80319c');
  assert.match(last().traceparent, /^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-01$/);
});

test('backbone calls go to the backbone API with the session token', async () => {
  const res = await bff.call('/bkd/api/v1/users', { cookie: GOOD });

  assert.deepEqual(await res.json(), { service: 'backbone' });
  assert.equal(last().url, '/backbone/api/v1/users');
  assert.equal(last().token, tokens.GOOD);
});

test('profile image upload is re-sent to mercury as multipart', async () => {
  const form = new FormData();
  form.append('imageData', new Blob(['png-bytes'], { type: 'image/png' }), 'me.png');

  const res = await bff.call('/mrc/api/v1/d-image/users/profile', { method: 'POST', body: form, cookie: GOOD });

  assert.equal(res.status, 200);
  assert.equal(last().url, '/mercury/api/v1/profile/image');
  assert.match(last().contentType, /^multipart\/form-data/);
});

test('an upload without a file or with the wrong field is a 400', async () => {
  const wrong = new FormData();
  wrong.append('other', new Blob(['x']), 'x.png');

  assert.equal((await bff.call('/mrc/api/v1/d-image/users/profile', { method: 'POST', body: wrong, cookie: GOOD })).status, 400);
  assert.equal((await bff.call('/mrc/api/v1/d-image/users/profile', { method: 'POST', body: new FormData(), cookie: GOOD })).status, 400);
});

test('an oversized upload is a 413', async () => {
  const big = new FormData();
  big.append('imageData', new Blob([Buffer.alloc(8 * 1024 * 1024 + 1)]), 'big.png');

  assert.equal((await bff.call('/mrc/api/v1/d-image/users/profile', { method: 'POST', body: big, cookie: GOOD })).status, 413);
});

test('mercury answering 5xx is passed back as is', async () => {
  bff.state.apiStatus = 503;
  bff.state.apiBody = { error: 'down' };

  const res = await bff.call('/mrc/api/v1/general/accounts', { cookie: GOOD });

  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'down' });
});

// Login clients (Mercury's /api/v1/login-clients): the BFF adds nothing of its own, the user's session decides at Mercury.
test('login clients: create goes to mercury with the session token and the generated password comes back untouched', async () => {
  bff.state.apiStatus = 201;
  bff.state.apiBody = { client: { id: 's-1', alias: 'smartkin-backend', active: true }, password: 'generated-once-123' }; // gitleaks:allow

  const res = await bff.call('/mrc/api/v1/general/login-clients', { method: 'POST', body: { alias: 'smartkin-backend' }, cookie: GOOD });

  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), bff.state.apiBody);
  assert.equal(last().method, 'POST');
  assert.equal(last().url, '/mercury/api/v1/login-clients');
  assert.equal(last().token, tokens.GOOD);
  assert.deepEqual(last().body, { alias: 'smartkin-backend' });
});

test('login clients: rotate, switch off and delete reach mercury with their method and id', async () => {
  await bff.call('/mrc/api/v1/general/login-clients/s-1/password', { method: 'PUT', body: {}, cookie: GOOD });
  assert.equal(last().method, 'PUT');
  assert.equal(last().url, '/mercury/api/v1/login-clients/s-1/password');

  await bff.call('/mrc/api/v1/general/login-clients/s-1', { method: 'PUT', body: { active: false }, cookie: GOOD });
  assert.equal(last().url, '/mercury/api/v1/login-clients/s-1');
  assert.deepEqual(last().body, { active: false });

  bff.state.apiStatus = 204;
  bff.state.apiBody = undefined;
  const deleted = await bff.call('/mrc/api/v1/general/login-clients/s-1', { method: 'DELETE', cookie: GOOD });
  assert.equal(deleted.status, 204);
  assert.equal(last().method, 'DELETE');
});

test('login clients: a 403 from mercury (no permission) reaches the page as a 403, not as a renewed session', async () => {
  bff.state.apiStatus = 403;
  bff.state.apiBody = { status: 403, message: 'Login clients administration is not configured' };

  const res = await bff.call('/mrc/api/v1/general/login-clients', { cookie: GOOD });

  assert.equal(res.status, 403);
  assert.equal(bff.state.backboneCalls.length, 0);
  assert.equal(bff.state.apiCalls.length, 1);
});

test('login clients: without the CSRF header a mutation never reaches mercury', async () => {
  const res = await bff.call('/mrc/api/v1/general/login-clients', { method: 'POST', body: { alias: 'x' }, cookie: GOOD, csrf: false });

  assert.equal(res.status, 403);
  assert.equal(bff.state.apiCalls.length, 0);
});
