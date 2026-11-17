'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;

// nothing listens on port 9
beforeAll(async () => { bff = await start({ env: { MERCURY_BASE_URL: 'http://127.0.0.1:9' } }); });
afterAll(() => bff.stop());

describe('monitoreo con Mercury caído', () => {
  it('el stream y las vistas responden 502', async () => {
    assert.equal((await bff.call('/mrc/api/v1/monitoring/stream', { cookie: SESSION })).status, 502);
    assert.equal((await bff.call('/mrc/api/v1/monitoring/summary', { cookie: SESSION })).status, 502);
  });
});
