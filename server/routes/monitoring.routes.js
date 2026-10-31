'use strict';

const axios = require('axios');
const router = require('express').Router();
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const {
  BACKBONE_BASE_URL,
  BACKBONE_HEALTH_PATH,
  MERCURY_API_PREFIX,
  MERCURY_BASE_URL,
  MERCURY_HEALTH_PATH,
  MONITORED_APPLICATION_ID,
  MONITORING_MAX_CAMPAIGNS,
  SESSION_COOKIE,
} = require('../config/constants');

const PROBE_TIMEOUT_MS = 3000;
const SLOW_MS = 1000;

/** Mercury asks for both: the Bearer of the application client and the session of the person looking. */
const fromMercury = (path, bearer, sessionToken) =>
  axios.get(`${MERCURY_BASE_URL}${MERCURY_API_PREFIX}${path}`, {
    headers: { Accept: 'application/json', 'session-token': sessionToken, ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    validateStatus: () => true,
  });

async function probe(name, url) {
  const started = Date.now();
  try {
    const r = await axios.get(url, { timeout: PROBE_TIMEOUT_MS, validateStatus: () => true });
    const latencyMs = Date.now() - started;
    if (r.status !== 200 || r.data?.status !== 'UP') return { name, status: 'down', latencyMs };
    return { name, status: latencyMs > SLOW_MS ? 'degraded' : 'operational', latencyMs };
  } catch {
    return { name, status: 'down', latencyMs: Date.now() - started };
  }
}

const servicesHealth = () =>
  Promise.all([
    probe('Mercury', `${MERCURY_BASE_URL}${MERCURY_HEALTH_PATH}`),
    probe('Backbone', `${BACKBONE_BASE_URL}${BACKBONE_HEALTH_PATH}`),
  ]);

const count = (value) => (Number.isFinite(value) ? value : 0);

/** The row of a campaign. Without its progress it keeps the recipients and shows nothing as delivered. */
function toCampaign(campaign, progress) {
  return {
    id: campaign.id,
    name: campaign.name,
    channel: String(campaign.channelType ?? '').toLowerCase(),
    status: campaign.status,
    createdAt: campaign.createdAt,
    total: count(progress?.totalRecipients ?? campaign.totalRecipients),
    sent: count(progress?.totalSent),
    delivered: count(progress?.delivered),
    failed: count(progress?.failed),
    pending: count(progress?.pending),
  };
}

function summarize(campaigns) {
  const totals = { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 };
  for (const campaign of campaigns) {
    for (const key of Object.keys(totals)) totals[key] += campaign[key];
  }
  const finished = totals.delivered + totals.failed;
  return { ...totals, deliveryRate: finished > 0 ? totals.delivered / finished : null };
}

async function overview(req, res) {
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (!sessionToken) return res.status(401).json({ error: 'Session required' });

  const services = await servicesHealth();
  if (!MONITORED_APPLICATION_ID) {
    return res.json({ generatedAt: new Date().toISOString(), campaignsAvailable: false, totals: summarize([]), campaigns: [], services });
  }
  try {
    const bearer = await backbone.applicationClientToken();
    const list = await fromMercury(`/campaigns/application/${encodeURIComponent(MONITORED_APPLICATION_ID)}`, bearer, sessionToken);
    if (list.status === 401) return res.status(401).json({ error: 'Session required' });
    if (list.status !== 200 || !Array.isArray(list.data)) {
      logger.warn(`Monitoring: mercury answered ${list.status} listing campaigns`);
      return res.json({ generatedAt: new Date().toISOString(), campaignsAvailable: false, totals: summarize([]), campaigns: [], services });
    }
    const recent = [...list.data]
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, MONITORING_MAX_CAMPAIGNS);
    const campaigns = await Promise.all(
      recent.map(async (campaign) => {
        const r = await fromMercury(`/campaigns/${encodeURIComponent(campaign.id)}/progress`, bearer, sessionToken);
        return toCampaign(campaign, r.status === 200 ? r.data : undefined);
      }),
    );
    return res.json({ generatedAt: new Date().toISOString(), campaignsAvailable: true, totals: summarize(campaigns), campaigns, services });
  } catch (err) {
    logger.error(`Monitoring error: ${err.message}`);
    return res.json({ generatedAt: new Date().toISOString(), campaignsAvailable: false, totals: summarize([]), campaigns: [], services });
  }
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.get('/overview', overview);

module.exports = router;
