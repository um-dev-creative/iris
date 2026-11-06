'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
beforeAll(async () => { bff = await start({ env: { BACKBONE_APPLICATION_ID: '', MONITORED_APPLICATION_ID: '' } }); });
afterAll(() => bff.stop());

describe('templates sin aplicación configurada', () => {
  it('responde 503 en lugar de listar sin alcance', async () => {
    const res = await bff.call('/mrc/api/v1/templates/defined', { cookie: `iris_session=${tokens.GOOD}` });

    assert.equal(res.status, 503);
    assert.equal(bff.state.apiCalls.length, 0);
  });

  it('las rutas por aplicación no necesitan la aplicación del BFF: la aplicación viene en la URL', async () => {
    const app = '8249aa97-23fa-47cd-9c6d-4685f0c03cc3';
    const cookie = `iris_session=${tokens.GOOD}`;

    assert.equal((await bff.call(`/mrc/api/v1/templates/applications/${app}`, { cookie })).status, 200);
    assert.equal((await bff.call('/mrc/api/v1/templates/applications', { cookie })).status, 200);
  });
});
