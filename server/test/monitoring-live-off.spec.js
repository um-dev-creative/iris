'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;

beforeAll(async () => { bff = await start({ env: { BACKBONE_APPLICATION_ID: '', MONITORED_APPLICATION_ID: '' } }); });
afterAll(() => bff.stop());

describe('monitoreo sin aplicación configurada', () => {
  it('las vistas de la aplicación y el stream responden 503, no adivinan una aplicación', async () => {
    for (const path of ['summary', 'series', 'failures', 'verification-codes', 'messages', 'messages/export', 'alerts', 'alerts/rules', 'stream']) {
      assert.equal((await bff.call(`/mrc/api/v1/monitoring/${path}`, { cookie: SESSION })).status, 503, path);
    }
  });

  it('las escrituras tampoco adivinan una aplicación', async () => {
    const id = '3f0c1f4e-8b1e-4f7e-9d54-0c6f0d2a7b11';
    assert.equal((await bff.call(`/mrc/api/v1/monitoring/messages/${id}/retry`, { method: 'POST', cookie: SESSION })).status, 503);
    assert.equal((await bff.call('/mrc/api/v1/monitoring/alerts/rules', { method: 'POST', cookie: SESSION, body: { type: 'QUEUE_STUCK', threshold: 5 } })).status, 503);
  });
});
