'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const NIL = '00000000-0000-0000-0000-000000000000';

// the application of Iris is not configured: the monitoring does not need it, it is about every application of Mercury
beforeAll(async () => { bff = await start({ env: { BACKBONE_APPLICATION_ID: '', MONITORED_APPLICATION_ID: '', BACKBONE_CLIENT_ID: 'iris', BACKBONE_CLIENT_SECRET: 's3cret' } }); });
afterAll(() => bff.stop());
beforeEach(() => { bff.state.live = { calls: [], streams: [], closed: 0 }; });

describe('monitoreo sin la aplicación de Iris configurada', () => {
  it('las vistas cubren todas las aplicaciones de Mercury: no hace falta MONITORED_APPLICATION_ID', async () => {
    for (const path of ['summary', 'series', 'failures', 'verification-codes', 'messages', 'messages/export', 'alerts', 'alerts/rules']) {
      assert.equal((await bff.call(`/mrc/api/v1/monitoring/${path}`, { cookie: SESSION })).status, 200, path);
    }
    assert.ok(bff.state.live.calls.every((c) => c.url.startsWith(`/mercury/api/v1/monitoring/applications/${NIL}/`)));
  });

  it('el stream también', async () => {
    const stream = await bff.call('/mrc/api/v1/monitoring/stream', { cookie: SESSION });

    assert.equal(stream.status, 200);
    await stream.body.cancel();
    assert.ok(bff.state.live.calls[0].url.startsWith(`/mercury/api/v1/monitoring/applications/${NIL}/stream`));
  });

  it('las escrituras (reintentar, reglas) son de todas las aplicaciones', async () => {
    const id = '3f0c1f4e-8b1e-4f7e-9d54-0c6f0d2a7b11';
    assert.equal((await bff.call(`/mrc/api/v1/monitoring/messages/${id}/retry`, { method: 'POST', cookie: SESSION })).status, 202);
    assert.equal((await bff.call('/mrc/api/v1/monitoring/alerts/rules', { method: 'POST', cookie: SESSION, body: { type: 'QUEUE_STUCK', threshold: 5 } })).status, 200);
    assert.ok(bff.state.live.calls.every((c) => c.url.startsWith(`/mercury/api/v1/monitoring/applications/${NIL}/`)));
  });
});
