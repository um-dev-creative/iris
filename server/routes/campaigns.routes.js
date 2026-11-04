'use strict';

const router = require('express').Router();
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { proxyToApi } = require('../shared/proxy');
const { MONITORED_APPLICATION_ID } = require('../config/constants');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the browser may set. The application is never one of them: the BFF puts its own. */
const CREATE_FIELDS = ['name', 'channelTypeCode', 'templateId', 'userId', 'recipients', 'templateParams', 'scheduledAt', 'status'];
const UPDATE_FIELDS = ['name', 'templateId', 'recipients', 'templateParams', 'scheduledAt', 'status'];

const pick = (source, fields) => Object.fromEntries(fields.filter((f) => source?.[f] !== undefined).map((f) => [f, source[f]]));

/**
 * Mercury guards /campaigns with two credentials: the Bearer of the application client and the session of the person.
 * The generic /general proxy only carries the session, so campaigns have their own routes.
 */
async function toMercury(req, res, path, body) {
  let bearer;
  try {
    bearer = await backbone.applicationClientToken();
  } catch (err) {
    logger.error(`Campaigns: the application client could not get a token: ${err.message}`);
    return res.status(502).json({ error: 'Backend unavailable' });
  }
  const headers = { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) };
  return proxyToApi(req, res, 'mercury', path, { headers, ...(body === undefined ? {} : { body }) });
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// without the application the list and the creation would have no scope: say so instead of guessing
router.use((_req, res, next) => {
  if (MONITORED_APPLICATION_ID) return next();
  logger.error('Campaigns: MONITORED_APPLICATION_ID (or BACKBONE_APPLICATION_ID) is not set');
  return res.status(503).json({ error: 'Campaign management is not available' });
});

router.param('id', (_req, res, next, id) => (UUID.test(id) ? next() : res.status(400).json({ error: 'Invalid campaign id' })));

router.get('/', (req, res) => toMercury(req, res, `/campaigns/application/${encodeURIComponent(MONITORED_APPLICATION_ID)}`));
router.get('/channel-types', (req, res) => toMercury(req, res, '/channel-types/enabled'));
router.get('/:id', (req, res) => toMercury(req, res, `/campaigns/${req.params.id}`));
router.get('/:id/progress', (req, res) => toMercury(req, res, `/campaigns/${req.params.id}/progress`));

router.post('/', (req, res) =>
  toMercury(req, res, '/campaigns', { ...pick(req.body, CREATE_FIELDS), applicationId: MONITORED_APPLICATION_ID }),
);
router.put('/:id', (req, res) => toMercury(req, res, `/campaigns/${req.params.id}`, pick(req.body, UPDATE_FIELDS)));
router.patch('/:id/toggle', (req, res) => {
  if (!['true', 'false'].includes(req.query.enabled)) return res.status(400).json({ error: 'enabled must be true or false' });
  return toMercury(req, res, `/campaigns/${req.params.id}/toggle`);
});
router.delete('/:id', (req, res) => toMercury(req, res, `/campaigns/${req.params.id}`));

module.exports = router;
