'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;

beforeAll(async () => { bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris', BACKBONE_CLIENT_SECRET: 's3cret' } }); });
afterAll(() => bff.stop());

describe('monitoreo con el cliente de aplicación rechazado por Backbone', () => {
  it('responde 502 y no llama a Mercury', async () => {
    bff.state.clientTokenStatus = 401;
    bff.state.live = { calls: [], streams: [], closed: 0 };

    for (const path of ['health', 'stream']) {
      assert.equal((await bff.call(`/mrc/api/v1/monitoring/${path}`, { cookie: SESSION })).status, 502, path);
    }
    assert.equal(bff.state.live.calls.length, 0);
  });
});
