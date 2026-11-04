'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const ID = '00000000-0000-0000-0000-0000000000a1';
const api = '/mrc/api/v1/campaigns';
const last = () => bff.state.apiCalls.at(-1);

beforeAll(async () => {
  bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris-client', BACKBONE_CLIENT_SECRET: 'not-a-real-secret' } });
});
afterAll(() => bff.stop());
beforeEach(() => {
  bff.state.apiCalls.length = 0;
  Object.assign(bff.state, { apiStatus: 200, apiBody: [{ id: ID }], monitoring: undefined });
});

describe('campaigns', () => {
  it('exige sesión', async () => {
    assert.equal((await bff.call(api)).status, 401);
  });

  it('lista las campañas de la aplicación con el Bearer del cliente y la sesión de la persona', async () => {
    const res = await bff.call(api, { cookie: SESSION });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), [{ id: ID }]);
    assert.equal(last().url, '/mercury/api/v1/campaigns/application/app-1');
    assert.equal(last().token, tokens.GOOD);
    assert.match(last().authorization, /^Bearer m2m-/);
  });

  it('no deja la respuesta en caché', async () => {
    assert.equal((await bff.call(api, { cookie: SESSION })).headers.get('cache-control'), 'no-store');
  });

  it('lee el detalle y el progreso', async () => {
    await bff.call(`${api}/${ID}`, { cookie: SESSION });
    assert.equal(last().url, `/mercury/api/v1/campaigns/${ID}`);

    await bff.call(`${api}/${ID}/progress`, { cookie: SESSION });
    assert.equal(last().url, `/mercury/api/v1/campaigns/${ID}/progress`);
  });

  it('lista los canales habilitados antes de interpretar "channel-types" como id', async () => {
    const res = await bff.call(`${api}/channel-types`, { cookie: SESSION });

    assert.equal(res.status, 200);
    assert.equal(last().url, '/mercury/api/v1/channel-types/enabled');
  });

  it('rechaza un id que no es UUID sin llamar a Mercury', async () => {
    const res = await bff.call(`${api}/not-a-uuid`, { cookie: SESSION });

    assert.equal(res.status, 400);
    assert.equal(bff.state.apiCalls.length, 0);
  });

  it('crea con la aplicación del BFF e ignora campos no permitidos', async () => {
    bff.state.apiStatus = 201;
    const res = await bff.call(api, {
      method: 'POST',
      cookie: SESSION,
      body: { name: 'Bienvenida', channelTypeCode: 'EMAIL', templateId: ID, userId: 'u-1', recipients: [{ identifier: 'a@b.co' }], status: 'DRAFT', applicationId: 'other-app', createdBy: 'x' },
    });

    assert.equal(res.status, 201);
    assert.equal(last().method, 'POST');
    assert.equal(last().url, '/mercury/api/v1/campaigns');
    assert.equal(last().body.applicationId, 'app-1');
    assert.equal(last().body.createdBy, undefined);
    assert.equal(last().body.name, 'Bienvenida');
    assert.equal(last().contentType, 'application/json');
  });

  it('edita sin permitir cambiar la aplicación', async () => {
    await bff.call(`${api}/${ID}`, { method: 'PUT', cookie: SESSION, body: { name: 'Nuevo', applicationId: 'other-app', status: 'SCHEDULED' } });

    assert.equal(last().method, 'PUT');
    assert.deepEqual(last().body, { name: 'Nuevo', status: 'SCHEDULED' });
  });

  it('pausa y reanuda, y exige enabled booleano', async () => {
    bff.state.apiStatus = 204;
    const ok = await bff.call(`${api}/${ID}/toggle?enabled=false`, { method: 'PATCH', cookie: SESSION });
    assert.equal(ok.status, 204);
    assert.equal(last().method, 'PATCH');
    assert.match(last().url, /toggle\?enabled=false$/);

    bff.state.apiCalls.length = 0;
    const bad = await bff.call(`${api}/${ID}/toggle?enabled=maybe`, { method: 'PATCH', cookie: SESSION });
    assert.equal(bad.status, 400);
    assert.equal(bff.state.apiCalls.length, 0);
  });

  it('elimina', async () => {
    bff.state.apiStatus = 204;
    const res = await bff.call(`${api}/${ID}`, { method: 'DELETE', cookie: SESSION });

    assert.equal(res.status, 204);
    assert.equal(last().method, 'DELETE');
  });

  it('devuelve tal cual lo que Mercury responde (403 si no es el creador)', async () => {
    bff.state.apiStatus = 403;
    bff.state.apiBody = { message: 'Caller lacks permission to update this campaign' };
    const res = await bff.call(`${api}/${ID}`, { method: 'PUT', cookie: SESSION, body: { name: 'x' } });

    assert.equal(res.status, 403);
  });

  it('exige la cabecera CSRF en las escrituras', async () => {
    const res = await bff.call(api, { method: 'POST', cookie: SESSION, csrf: false, body: { name: 'x' } });

    assert.equal(res.status, 403);
  });
});
