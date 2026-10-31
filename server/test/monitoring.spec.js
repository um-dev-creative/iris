'use strict';

const assert = require('node:assert/strict');
const { start, tokens } = require('./harness');

let bff;
const SESSION = `iris_session=${tokens.GOOD}`;
const overview = (cookie = SESSION) => bff.call('/mrc/api/v1/monitoring/overview', { cookie });
const body = async (res) => res.json();
const campaign = (id, createdAt, extra = {}) => ({ id, name: `Campaña ${id}`, channelType: 'EMAIL', status: 'ACTIVE', totalRecipients: 10, createdAt, ...extra });

beforeAll(async () => { bff = await start({ env: { MONITORING_MAX_CAMPAIGNS: '2' } }); });
afterAll(() => bff.stop());
beforeEach(() => {
  Object.assign(bff.state, {
    monitoring: {
      calls: [],
      campaigns: [campaign('a', '2026-01-01 10:00:00'), campaign('b', '2026-01-02 10:00:00')],
      progress: {
        a: { totalRecipients: 10, totalSent: 10, delivered: 9, failed: 1, pending: 0 },
        b: { totalRecipients: 20, totalSent: 5, delivered: 3, failed: 1, pending: 15 },
      },
    },
    mercuryHealth: 200,
    backboneHealth: 200,
    backboneHealthBody: 'UP',
  });
});

describe('GET /monitoring/overview', () => {
  it('exige sesión', async () => {
    assert.equal((await overview(null)).status, 401);
  });

  it('suma las campañas reales y calcula la tasa de entrega', async () => {
    const data = await body(await overview());

    assert.equal(data.campaignsAvailable, true);
    assert.deepEqual(data.totals, { total: 30, sent: 15, delivered: 12, failed: 2, pending: 15, deliveryRate: 12 / 14 });
  });

  it('muestra primero las campañas más recientes y normaliza el canal', async () => {
    const data = await body(await overview());

    assert.deepEqual(data.campaigns.map((c) => c.id), ['b', 'a']);
    assert.equal(data.campaigns[0].channel, 'email');
  });

  it('respeta el máximo de campañas consultadas', async () => {
    bff.state.monitoring.campaigns.push(campaign('c', '2026-01-03 10:00:00'));
    bff.state.monitoring.progress.c = { totalRecipients: 1, delivered: 1, failed: 0, pending: 0 };

    const data = await body(await overview());

    assert.deepEqual(data.campaigns.map((c) => c.id), ['c', 'b']);
  });

  it('envía a mercury la sesión del usuario', async () => {
    await overview();

    const [call] = bff.state.monitoring.calls;
    assert.equal(call.url, '/mercury/api/v1/campaigns/application/app-1');
    assert.equal(call.token, tokens.GOOD);
  });

  it('sin campañas no inventa una tasa de entrega', async () => {
    bff.state.monitoring.campaigns = [];

    const data = await body(await overview());

    assert.equal(data.totals.deliveryRate, null);
    assert.equal(data.campaignsAvailable, true);
  });

  it('una campaña sin progreso no cuenta como entregada', async () => {
    bff.state.monitoring.progress = {};

    const data = await body(await overview());

    assert.equal(data.totals.delivered, 0);
    assert.equal(data.totals.total, 20);
  });

  it('una sesión rechazada por mercury responde 401', async () => {
    bff.state.monitoring.status = 401;

    assert.equal((await overview()).status, 401);
  });

  it('si mercury falla informa que no hay datos, sin inventarlos', async () => {
    bff.state.monitoring.status = 503;

    const res = await overview();
    const data = await body(res);

    assert.equal(res.status, 200);
    assert.equal(data.campaignsAvailable, false);
    assert.deepEqual(data.campaigns, []);
  });

  it('informa la salud real de cada servicio con su latencia', async () => {
    const { services } = await body(await overview());

    assert.deepEqual(services.map((s) => [s.name, s.status]), [['Mercury', 'operational'], ['Backbone', 'operational']]);
    assert.equal(typeof services[0].latencyMs, 'number');
  });

  it('un servicio caído o que no responde UP aparece como caído', async () => {
    Object.assign(bff.state, { mercuryHealth: 503, backboneHealthBody: 'DOWN' });

    const { services } = await body(await overview());

    assert.deepEqual(services.map((s) => s.status), ['down', 'down']);
  });

  it('nunca guarda la respuesta en caché', async () => {
    assert.equal((await overview()).headers.get('cache-control'), 'no-store');
  });
});
