'use strict';

// vitest globals (see vitest.server.config.mjs)
const before = beforeAll;
const after = afterAll;
const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const FED = '/mrc/api/v1/auth/federation';

before(async () => { bff = await start(); });
after(() => bff.stop());

test('with the feature off the login page learns there are no providers and every other route is a 404', async () => {
  const providers = await bff.call(`${FED}/providers`);
  assert.equal(providers.status, 200);
  assert.deepEqual(await providers.json(), { enabled: false, providers: [] });

  for (const [method, path] of [['GET', '/google/start'], ['GET', '/callback?code=c&state=s'], ['GET', '/identities'], ['POST', '/google/link']]) {
    assert.equal((await bff.call(`${FED}${path}`, { method, body: method === 'POST' ? {} : undefined, cookie: `iris_session=${tokens.GOOD}` })).status, 404, path);
  }
  const apple = await bff.call(`${FED}/callback`, { method: 'POST', csrf: false, raw: 'code=c&state=s', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(apple.status, 404);
  assert.equal(bff.state.backboneCalls?.length ?? 0, 0, 'backbone is never called');
});
