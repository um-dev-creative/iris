'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const get = (path, cookie = SESSION) => bff.call(`/mrc/api/v1/monitoring${path}`, { cookie });
const APP = 'app-1';

beforeAll(async () => { bff = await start({ env: { BACKBONE_CLIENT_ID: 'iris', BACKBONE_CLIENT_SECRET: 's3cret' } }); });
afterAll(() => bff.stop());
beforeEach(() => { bff.state.live = { calls: [], streams: [], closed: 0 }; });

describe('las vistas de monitoreo', () => {
  it.each([
    ['/summary?range=24h', `/mercury/api/v1/monitoring/applications/${APP}/summary?range=24h`],
    ['/series?range=7d&channel=EMAIL&kind=CAMPAIGN', `/mercury/api/v1/monitoring/applications/${APP}/series?range=7d&channel=EMAIL&kind=CAMPAIGN`],
    ['/failures', `/mercury/api/v1/monitoring/applications/${APP}/failures`],
    ['/verification-codes?range=1h', `/mercury/api/v1/monitoring/applications/${APP}/verification-codes?range=1h`],
    ['/messages?status=FAILED&page=1&size=20', `/mercury/api/v1/monitoring/applications/${APP}/messages?status=FAILED&page=1&size=20`],
    ['/health', '/mercury/api/v1/monitoring/health'],
    ['/outages?range=30d', '/mercury/api/v1/monitoring/health/outages?range=30d'],
  ])('%s llega a Mercury con el Bearer del cliente y la sesión de la persona', async (path, upstream) => {
    const res = await get(path);

    assert.equal(res.status, 200);
    const [call] = bff.state.live.calls;
    assert.equal(call.url, upstream);
    assert.equal(call.token, tokens.GOOD);
    assert.match(call.authorization, /^Bearer m2m-/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });

  it('sin elegir otra, la aplicación es la de Iris; un applicationId que no es un UUID se rechaza (elegir otra se prueba en monitoring-applications)', async () => {
    assert.equal((await get('/summary?applicationId=otra&range=1h')).status, 400);
    assert.equal(bff.state.live.calls.length, 0);

    await get('/summary?range=1h');
    assert.equal(bff.state.live.calls[0].url, `/mercury/api/v1/monitoring/applications/${APP}/summary?range=1h`);
  });

  it('deja caer los parámetros que la vista no admite', async () => {
    await get('/summary?range=1h&channel=EMAIL&x=1');

    assert.equal(bff.state.live.calls[0].url.endsWith('/summary?range=1h'), true);
  });

  it.each([
    '/summary?range=1year',
    '/series?channel=EM%20AIL',
    '/messages?templateDefinedId=no-es-uuid',
    '/messages?page=abc',
    '/messages?size=99999',
    '/messages?status[]=a',
  ])('rechaza con 400 un parámetro inválido: %s', async (path) => {
    assert.equal((await get(path)).status, 400);
    assert.equal(bff.state.live.calls.length, 0);
  });

  it('exige sesión', async () => {
    assert.equal((await get('/summary', null)).status, 401);
  });

  it('pasa el estado de Mercury (por ejemplo 403) sin inventar datos', async () => {
    bff.state.live.status = 403;

    assert.equal((await get('/summary')).status, 403);
  });
});

describe('GET /monitoring/stream', () => {
  it('entrega los eventos de Mercury tal cual y sin comprimir', async () => {
    const res = await bff.call(`/mrc/api/v1/monitoring/stream?range=1h`, { cookie: SESSION, headers: { 'Accept-Encoding': 'gzip' } });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/event-stream/);
    assert.equal(res.headers.get('content-encoding'), null);
    assert.match(res.headers.get('cache-control'), /no-transform/);
    const reader = res.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.equal(first, 'event: summary\ndata: {"range":"1h"}\n\n');
    // a second event written later arrives without waiting for the stream to end
    bff.state.live.streams[0].write('event: health\ndata: {}\n\n');
    assert.equal(new TextDecoder().decode((await reader.read()).value), 'event: health\ndata: {}\n\n');
    assert.match(bff.state.live.calls[0].authorization, /^Bearer /);
    assert.equal(bff.state.live.calls[0].token, tokens.GOOD);
    await reader.cancel();
  });

  it('cuando el navegador se va, cierra la conexión con Mercury', async () => {
    const res = await bff.call('/mrc/api/v1/monitoring/stream', { cookie: SESSION });
    const reader = res.body.getReader();
    await reader.read();
    await reader.cancel();

    await vi.waitFor(() => assert.equal(bff.state.live.closed, 1));
  });

  it('cuando Mercury cierra el stream, lo cierra también para el navegador', async () => {
    const res = await bff.call('/mrc/api/v1/monitoring/stream', { cookie: SESSION });
    const reader = res.body.getReader();
    await reader.read();
    bff.state.live.streams[0].end();

    assert.equal((await reader.read()).done, true);
  });

  it.each([[401, 401], [429, 429], [400, 400], [403, 403], [500, 502]])('Mercury responde %i → el navegador recibe %i en JSON', async (upstream, expected) => {
    bff.state.live.status = upstream;

    const res = await bff.call('/mrc/api/v1/monitoring/stream', { cookie: SESSION });

    assert.equal(res.status, expected);
    assert.match(res.headers.get('content-type'), /json/);
  });

  it('exige sesión y valida el rango', async () => {
    assert.equal((await bff.call('/mrc/api/v1/monitoring/stream', {})).status, 401);
    assert.equal((await get('/stream?range=2y')).status, 400);
  });
});
