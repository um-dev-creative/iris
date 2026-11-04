'use strict';

const router = require('express').Router();
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { proxyToApi } = require('../shared/proxy');
const { MONITORED_APPLICATION_ID } = require('../config/constants');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The same names Mercury's TemplateNames accepts: a plain file name, never a path. */
const FILE_NAME = /^(?=.{1,128}$)[A-Za-z0-9][A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)*\.(ftl|ftlh|md|html)$/;

/** What the browser may set. The application is never one of them: the BFF puts its own. */
const CREATE_FIELDS = ['description', 'location', 'fileFormat', 'templateTypeId', 'severityTypeId'];
const UPDATE_FIELDS = CREATE_FIELDS;
const SEARCH_FIELDS = ['q', 'templateTypeId', 'severityTypeId', 'active', 'page', 'size', 'sort'];
const PREVIEW_FIELDS = ['name', 'content', 'params'];

const pick = (source, fields) => Object.fromEntries(fields.filter((f) => source?.[f] !== undefined).map((f) => [f, source[f]]));

/**
 * Mercury guards /templates with the Bearer of the application and the session of the person, like /campaigns, so the
 * generic /general proxy (session only) cannot reach it.
 */
async function toMercury(req, res, path, { query, body } = {}) {
  let bearer;
  try {
    bearer = await backbone.applicationClientToken();
  } catch (err) {
    logger.error(`Templates: the application client could not get a token: ${err.message}`);
    return res.status(502).json({ error: 'Backend unavailable' });
  }
  const headers = { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) };
  return proxyToApi(req, res, 'mercury', path, { headers, ...(query ? { query } : {}), ...(body === undefined ? {} : { body }) });
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// the application is the BFF's: without it the lists would have no scope
router.use((_req, res, next) => {
  if (MONITORED_APPLICATION_ID) return next();
  logger.error('Templates: MONITORED_APPLICATION_ID (or BACKBONE_APPLICATION_ID) is not set');
  return res.status(503).json({ error: 'Template management is not available' });
});

router.param('id', (_req, res, next, id) => (UUID.test(id) ? next() : res.status(400).json({ error: 'Invalid template id' })));

const badLocation = (body) => body?.location !== undefined && !FILE_NAME.test(String(body.location));
const rejectLocation = (res) => res.status(400).json({ error: 'location must be a file name ending in .ftl, .ftlh, .md or .html', field: 'location' });

// reference lists (literal paths first, so they are never read as an id)
router.get('/types', (req, res) => toMercury(req, res, '/templates/types', { query: {} }));
router.get('/severities', (req, res) => toMercury(req, res, '/templates/severities', { query: {} }));
router.get('/defined', (req, res) => toMercury(req, res, '/templates/defined', { query: { applicationId: MONITORED_APPLICATION_ID } }));

router.post('/preview', (req, res) =>
  toMercury(req, res, '/templates/preview', { query: {}, body: { ...pick(req.body, PREVIEW_FIELDS), applicationId: MONITORED_APPLICATION_ID } }),
);

// the templates themselves
router.get('/', (req, res) =>
  toMercury(req, res, '/templates', { query: { ...pick(req.query, SEARCH_FIELDS), applicationId: MONITORED_APPLICATION_ID } }),
);
router.post('/', (req, res) => {
  if (badLocation(req.body)) return rejectLocation(res);
  return toMercury(req, res, '/templates', { query: {}, body: { ...pick(req.body, CREATE_FIELDS), applicationId: MONITORED_APPLICATION_ID } });
});
router.get('/:id', (req, res) => toMercury(req, res, `/templates/${req.params.id}`, { query: {} }));
router.put('/:id', (req, res) => {
  if (badLocation(req.body)) return rejectLocation(res);
  return toMercury(req, res, `/templates/${req.params.id}`, { query: {}, body: pick(req.body, UPDATE_FIELDS) });
});
router.delete('/:id', (req, res) => toMercury(req, res, `/templates/${req.params.id}`, { query: {} }));

// the content: If-Match / If-None-Match travel to Mercury and the ETag comes back (see proxy.js)
router.get('/:id/content', (req, res) => toMercury(req, res, `/templates/${req.params.id}/content`, { query: {} }));
router.put('/:id/content', (req, res) =>
  toMercury(req, res, `/templates/${req.params.id}/content`, { query: {}, body: pick(req.body, ['content']) }),
);

module.exports = router;
