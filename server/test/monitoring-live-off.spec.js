'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;

beforeAll(async () => { bff = await start({ env: { BACKBONE_APPLICATION_ID: '', MONITORED_APPLICATION_ID: '' } }); });
afterAll(() => bff.stop());

describe('monitoreo sin aplicación configurada', () => {
  it('las vistas de la aplicación y el stream responden 503, no adivinan una aplicación', async () => {
    for (const path of ['summary', 'series', 'failures', 'verification-codes', 'messages', 'stream']) {
      assert.equal((await bff.call(`/mrc/api/v1/monitoring/${path}`, { cookie: SESSION })).status, 503, path);
    }
  });
});
