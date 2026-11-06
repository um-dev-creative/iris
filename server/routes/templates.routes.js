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
const VERSION = /^[1-9][0-9]{0,8}$/;

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

const badLocation = (body) => body?.location !== undefined && !FILE_NAME.test(String(body.location));
const rejectLocation = (res) => res.status(400).json({ error: 'location must be a file name ending in .ftl, .ftlh, .md or .html', field: 'location' });

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.param('applicationId', (_req, res, next, applicationId) => (UUID.test(applicationId) ? next() : res.status(400).json({ error: 'Invalid application id' })));

// The applications of Backbone, so the person picks the one whose templates they manage. Mercury still decides, per application,
// whether the person may manage it (TEMPLATE_MANAGE): an application they cannot manage answers 403 when it is opened.
router.get('/applications', (req, res) => proxyToApi(req, res, 'backbone', '/applications', { query: {} }));

// The application comes from the URL (validated as a UUID), not from the body or the query. Mercury authorizes it for the person.
router.get('/applications/:applicationId', (req, res) =>
  toMercury(req, res, '/templates', { query: { ...pick(req.query, SEARCH_FIELDS), applicationId: req.params.applicationId } }),
);
router.post('/applications/:applicationId', (req, res) => {
  if (badLocation(req.body)) return rejectLocation(res);
  return toMercury(req, res, '/templates', { query: {}, body: { ...pick(req.body, CREATE_FIELDS), applicationId: req.params.applicationId } });
});
router.post('/applications/:applicationId/preview', (req, res) =>
  toMercury(req, res, '/templates/preview', { query: {}, body: { ...pick(req.body, PREVIEW_FIELDS), applicationId: req.params.applicationId } }),
);

// the application is the BFF's: without it the lists would have no scope
router.use((_req, res, next) => {
  if (MONITORED_APPLICATION_ID) return next();
  logger.error('Templates: MONITORED_APPLICATION_ID (or BACKBONE_APPLICATION_ID) is not set');
  return res.status(503).json({ error: 'Template management is not available' });
});

router.param('version', (_req, res, next, version) => (VERSION.test(version) ? next() : res.status(400).json({ error: 'Invalid version' })));
router.param('id', (_req, res, next, id) => (UUID.test(id) ? next() : res.status(400).json({ error: 'Invalid template id' })));


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
/** `?confirmSystem=true` is the only query the content writes take; anything but true/false is refused. */
const confirmation = (req) => (['true', 'false'].includes(req.query.confirmSystem) ? { confirmSystem: req.query.confirmSystem } : {});
const badConfirmation = (req) => req.query.confirmSystem !== undefined && !['true', 'false'].includes(req.query.confirmSystem);

router.put('/:id/content', (req, res) => {
  if (badConfirmation(req)) return res.status(400).json({ error: 'confirmSystem must be true or false' });
  return toMercury(req, res, `/templates/${req.params.id}/content`, { query: confirmation(req), body: pick(req.body, ['content']) });
});

// the history of the content
router.get('/:id/versions', (req, res) => toMercury(req, res, `/templates/${req.params.id}/versions`, { query: {} }));
router.get('/:id/versions/:version', (req, res) => toMercury(req, res, `/templates/${req.params.id}/versions/${req.params.version}`, { query: {} }));
router.post('/:id/versions/:version/restore', (req, res) => {
  if (badConfirmation(req)) return res.status(400).json({ error: 'confirmSystem must be true or false' });
  return toMercury(req, res, `/templates/${req.params.id}/versions/${req.params.version}/restore`, { query: confirmation(req) });
});

module.exports = router;
