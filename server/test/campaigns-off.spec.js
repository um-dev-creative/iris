'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
beforeAll(async () => { bff = await start({ env: { BACKBONE_APPLICATION_ID: '', MONITORED_APPLICATION_ID: '' } }); });
afterAll(() => bff.stop());

describe('campaigns sin aplicación configurada', () => {
  it('responde 503 en lugar de listar o crear sin alcance', async () => {
    const res = await bff.call('/mrc/api/v1/campaigns', { cookie: `iris_session=${tokens.GOOD}` });

    assert.equal(res.status, 503);
    assert.equal(bff.state.apiCalls.length, 0);
  });
});
