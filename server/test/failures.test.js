'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
before(async () => {
  // nothing listens on port 9: every upstream call fails at the connection
  bff = await start({ env: { MERCURY_BASE_URL: 'http://127.0.0.1:9', BACKBONE_BASE_URL: 'http://127.0.0.1:9' } });
});
after(() => bff.stop());

test('an unreachable mercury is a 502 that carries the trace id', async () => {
  const res = await bff.call('/mrc/api/v1/general/users', { cookie: `iris_session=${tokens.GOOD}` });

  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error, 'Backend unavailable');
  assert.equal(body.traceId, res.headers.get('x-trace-id'));
});

test('an unreachable backbone is a 502 on login and on renewal', async () => {
  const login = await bff.call('/mrc/api/v1/auth/access-token', { method: 'POST', body: { email: 'a', password: 'b' } });
  assert.equal(login.status, 502);

  const me = await bff.call('/mrc/api/v1/auth/me', { cookie: `iris_session=${tokens.EXPIRED}; iris_refresh=${tokens.REFRESH}` });
  assert.equal(me.status, 502);
});
