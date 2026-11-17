'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const APP = 'app-1';
const BASE = `/mercury/api/v1/monitoring/applications/${APP}`;
const ID = '3f0c1f4e-8b1e-4f7e-9d54-0c6f0d2a7b11';
const send = (path, { method = 'GET', body, cookie = SESSION, csrf = true } = {}) => bff.call(`/mrc/api/v1/monitoring${path}`, { method, body, cookie, csrf });

beforeAll(async () => { bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris', BACKBONE_CLIENT_SECRET: 's3cret' } }); });
afterAll(() => bff.stop());
beforeEach(() => { bff.state.live = { calls: [], streams: [], closed: 0 }; });

describe('exportar los mensajes', () => {
  it('pasa el archivo de Mercury con sus encabezados y los filtros permitidos', async () => {
    const res = await send('/messages/export?format=csv&channel=EMAIL&status=FAILED&from=2026-11-17T00:00:00&unknown=1');

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/csv/);
    assert.match(res.headers.get('content-disposition'), /attachment; filename=/);
    assert.equal(res.headers.get('x-total-count'), '3');
    assert.equal(res.headers.get('x-export-truncated'), 'false');
    assert.equal(await res.text(), 'occurredAt,channel\r\n');
    const [call] = bff.state.live.calls;
    assert.equal(call.url, `${BASE}/messages/export?format=csv&channel=EMAIL&status=FAILED&from=2026-11-17T00:00:00`);
    assert.match(call.authorization, /^Bearer m2m-/);
    assert.equal(call.token, tokens.GOOD);
  });

  it('rechaza un formato desconocido y exige sesión', async () => {
    assert.equal((await send('/messages/export?format=xml')).status, 400);
    assert.equal((await send('/messages/export', { cookie: null })).status, 401);
    assert.equal(bff.state.live.calls.length, 0);
  });
});

describe('reintentar un mensaje', () => {
  it('hace POST a Mercury con el Bearer y la sesión', async () => {
    const res = await send(`/messages/${ID}/retry`, { method: 'POST' });

    assert.equal(res.status, 202);
    const [call] = bff.state.live.calls;
    assert.equal(call.method, 'POST');
    assert.equal(call.url, `${BASE}/messages/${ID}/retry`);
    assert.match(call.authorization, /^Bearer m2m-/);
    assert.equal(call.token, tokens.GOOD);
  });

  it('valida el id, exige el encabezado CSRF y la sesión', async () => {
    assert.equal((await send('/messages/no-es-uuid/retry', { method: 'POST' })).status, 400);
    assert.equal((await send(`/messages/${ID}/retry`, { method: 'POST', csrf: false })).status, 403);
    assert.equal((await send(`/messages/${ID}/retry`, { method: 'POST', cookie: null })).status, 401);
    assert.equal(bff.state.live.calls.length, 0);
  });

  it('pasa el rechazo de Mercury (404, 409, 403 por falta de permiso de escritura)', async () => {
    for (const status of [404, 409, 403]) {
      bff.state.live.status = status;
      assert.equal((await send(`/messages/${ID}/retry`, { method: 'POST' })).status, status);
    }
  });
});

describe('alertas', () => {
  it('lista las alertas y las reglas de la aplicación', async () => {
    assert.equal((await send('/alerts?range=7d')).status, 200);
    assert.equal((await send('/alerts/rules')).status, 200);

    assert.deepEqual(bff.state.live.calls.map((c) => c.url), [`${BASE}/alerts?range=7d`, `${BASE}/alerts/rules`]);
    assert.equal((await send('/alerts?range=2y')).status, 400);
  });

  it('crea una regla: solo pasan los campos permitidos y la aplicación no va en el cuerpo', async () => {
    const body = { type: 'FAILURE_RATE', threshold: 20, windowMinutes: 15, minVolume: 10, notifyEmails: ['a@x.com'], enabled: true, applicationId: 'otra', id: 'x' };

    const res = await send('/alerts/rules', { method: 'POST', body });

    assert.equal(res.status, 200);
    const [call] = bff.state.live.calls;
    assert.equal(call.method, 'POST');
    assert.equal(call.url, `${BASE}/alerts/rules`);
    assert.deepEqual(call.body, { type: 'FAILURE_RATE', threshold: 20, windowMinutes: 15, minVolume: 10, notifyEmails: ['a@x.com'], enabled: true });
  });

  it('una regla de servicio lleva el servicio', async () => {
    await send('/alerts/rules', { method: 'POST', body: { type: 'SERVICE_DOWN', windowMinutes: 5, service: 'SMTP' } });

    assert.deepEqual(bff.state.live.calls[0].body, { type: 'SERVICE_DOWN', windowMinutes: 5, service: 'SMTP' });
  });

  it.each([
    [{ type: 'OTRO', threshold: 1 }],
    [{}],
    [{ type: 'FAILURE_RATE', threshold: '20' }],
    [{ type: 'FAILURE_RATE', threshold: 20, windowMinutes: '5' }],
    [{ type: 'FAILURE_RATE', threshold: 20, service: 'a b' }],
    [{ type: 'FAILURE_RATE', threshold: 20, service: 5 }],
    [{ type: 'FAILURE_RATE', threshold: 20, notifyEmails: 'a@x.com' }],
    [{ type: 'FAILURE_RATE', threshold: 20, notifyEmails: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    [{ type: 'FAILURE_RATE', threshold: 20, notifyEmails: [1] }],
    [{ type: 'FAILURE_RATE', threshold: 20, enabled: 'yes' }],
  ])('rechaza con 400 una regla inválida: %j', async (body) => {
    assert.equal((await send('/alerts/rules', { method: 'POST', body })).status, 400);
    assert.equal(bff.state.live.calls.length, 0);
  });

  it('actualiza y borra una regla por su id', async () => {
    assert.equal((await send(`/alerts/rules/${ID}`, { method: 'PUT', body: { type: 'QUEUE_STUCK', threshold: 5, enabled: false, service: null, notifyEmails: null } })).status, 200);
    assert.equal((await send(`/alerts/rules/${ID}`, { method: 'DELETE' })).status, 204);

    const [put, del] = bff.state.live.calls;
    assert.equal(put.url, `${BASE}/alerts/rules/${ID}`);
    assert.deepEqual(put.body, { type: 'QUEUE_STUCK', threshold: 5, enabled: false });
    assert.equal(del.method, 'DELETE');
    assert.equal((await send('/alerts/rules/no-es-uuid', { method: 'DELETE' })).status, 400);
  });

  it('exige sesión y el encabezado CSRF en las escrituras', async () => {
    assert.equal((await send('/alerts/rules', { method: 'POST', body: { type: 'QUEUE_STUCK', threshold: 5 }, cookie: null })).status, 401);
    assert.equal((await send('/alerts/rules', { method: 'POST', body: { type: 'QUEUE_STUCK', threshold: 5 }, csrf: false })).status, 403);
  });
});
