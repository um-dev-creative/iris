'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const OWN = 'app-1';
const OTHER = '3f0c1f4e-8b1e-4f7e-9d54-0c6f0d2a7b11';
const FOREIGN = '9a1b2c3d-1111-4222-8333-444455556666';
const send = (path, { method = 'GET', body, cookie = SESSION } = {}) => bff.call(`/mrc/api/v1/monitoring${path}`, { method, body, cookie });
const BASE = (app) => `/mercury/api/v1/monitoring/applications/${app}`;

// the application of Iris is not a UUID in these tests ("app-1"), as in the other monitoring specs
beforeAll(async () => { bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris', BACKBONE_CLIENT_SECRET: 's3cret' } }); });
afterAll(() => bff.stop());
beforeEach(() => {
  bff.state.live = { calls: [], streams: [], closed: 0, applications: [{ id: OTHER.toUpperCase(), name: 'ZeroBound' }, { id: 'no-uuid', name: 'junk' }, { name: 'no id' }] };
});

describe('las aplicaciones que se pueden mirar', () => {
  it('lista las que Mercury da a la persona (ids válidos, en minúsculas) y la de Iris por defecto', async () => {
    const res = await send('/applications');

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { defaultId: OWN, applications: [{ id: OTHER, name: 'ZeroBound' }], available: true });
  });

  it('si Mercury no responde la lista, devuelve vacío y lo dice (la página sigue con la de Iris)', async () => {
    bff.state.live.applicationsStatus = 500;
    // another session, so the list the earlier tests read is not served from the cache
    const body = await (await send('/applications', { cookie: `iris_session=${tokens.RENEWED}` })).json();

    assert.deepEqual(body.applications, []);
    assert.equal(body.available, false);
  });

  it('exige sesión', async () => {
    assert.equal((await send('/applications', { cookie: null })).status, 401);
  });

  it('un 401 de Mercury es un 401 (sesión vencida)', async () => {
    bff.state.live.applicationsStatus = 401;
    // another session so the answer of the previous tests is not served from the cache
    const other = `iris_session=${tokens.RENEWED}`;

    assert.equal((await send('/applications', { cookie: other })).status, 401);
  });
});

describe('mirar otra aplicación', () => {
  it('sin applicationId es la de Iris, como siempre, y no pregunta nada a Mercury', async () => {
    await send('/summary?range=1h');

    assert.equal(bff.state.live.calls[0].url, `${BASE(OWN)}/summary?range=1h`);
    assert.equal(bff.state.live.applicationCalls, undefined);
  });

  it('una aplicación de la lista llega a Mercury, y el applicationId no se reenvía como parámetro', async () => {
    const res = await send(`/summary?range=1h&applicationId=${OTHER}`);

    assert.equal(res.status, 200);
    assert.equal(bff.state.live.calls.at(-1).url, `${BASE(OTHER)}/summary?range=1h`);
  });

  it('una aplicación que la persona no puede mirar es 403 y no se llama a Mercury', async () => {
    const res = await send(`/summary?applicationId=${FOREIGN}`);

    assert.equal(res.status, 403);
    assert.equal(bff.state.live.calls.length, 0);
  });

  it('un applicationId mal formado es 400', async () => {
    assert.equal((await send('/summary?applicationId=otra')).status, 400);
    assert.equal((await send('/summary?applicationId[]=a')).status, 400);
  });

  it('la lista se pide una vez por minuto y sesión, no una vez por petición', async () => {
    const before = bff.state.live.applicationCalls ?? 0;
    await send(`/summary?applicationId=${OTHER}`);
    await send(`/series?applicationId=${OTHER}`);
    await send(`/failures?applicationId=${OTHER}`);

    assert.ok((bff.state.live.applicationCalls ?? 0) - before <= 1);
  });

  it('también vale para las vistas de archivo y de alertas, y para el stream', async () => {
    await send(`/messages/export?format=csv&applicationId=${OTHER}`);
    await send(`/alerts?applicationId=${OTHER}`);
    await send(`/alerts/rules?applicationId=${OTHER}`);
    const stream = await send(`/stream?range=1h&applicationId=${OTHER}`);
    await stream.body.cancel();

    assert.deepEqual(bff.state.live.calls.map((c) => c.url.replace(BASE(OTHER), '')), ['/messages/export?format=csv', '/alerts', '/alerts/rules', '/stream?range=1h']);
  });

  it('las escrituras (reintentar, reglas) van a la aplicación elegida y se niegan para otra', async () => {
    const message = '5c1d7a9e-2b3f-4c4d-8e5f-6a7b8c9d0e1f';
    await send(`/messages/${message}/retry?applicationId=${OTHER}`, { method: 'POST' });
    await send(`/alerts/rules?applicationId=${OTHER}`, { method: 'POST', body: { type: 'QUEUE_STUCK', threshold: 5 } });
    await send(`/alerts/rules/${message}?applicationId=${OTHER}`, { method: 'DELETE' });

    assert.deepEqual(bff.state.live.calls.map((c) => `${c.method} ${c.url.replace(BASE(OTHER), '')}`), [`POST /messages/${message}/retry`, 'POST /alerts/rules', `DELETE /alerts/rules/${message}`]);
    bff.state.live.calls.length = 0;
    assert.equal((await send(`/messages/${message}/retry?applicationId=${FOREIGN}`, { method: 'POST' })).status, 403);
    assert.equal((await send(`/alerts/rules?applicationId=${FOREIGN}`, { method: 'POST', body: { type: 'QUEUE_STUCK', threshold: 5 } })).status, 403);
    assert.equal(bff.state.live.calls.length, 0);
  });

  it('sin sesión es 401 aunque pida otra aplicación', async () => {
    assert.equal((await send(`/summary?applicationId=${OTHER}`, { cookie: null })).status, 401);
  });
});
