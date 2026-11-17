'use strict';

const axios = require('axios');
const router = require('express').Router();
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { upstreamTls } = require('../shared/tls');
const { proxyToApi, targetUrl } = require('../shared/proxy');
const { MONITORED_APPLICATION_ID, MERCURY_BASE_URL, MERCURY_API_PREFIX, SESSION_COOKIE } = require('../config/constants');

/**
 * The monitoring views of Mercury (`/api/v1/monitoring/*`): summary, series, failures, verification codes, messages, service health,
 * outages and the live stream. Mercury asks for two credentials, the Bearer of the application client and the session of the person;
 * the BFF adds the first and fixes the application, so a person only ever sees the data of their own application.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALUE = /^[A-Za-z0-9_:.+-]{1,40}$/;
const RANGES = new Set(['1h', '24h', '7d', '30d']);
const MESSAGES_PATH = 'messages';

/** What the browser may ask for in each view; any other parameter is dropped. */
const QUERY_FIELDS = {
  summary: ['range'],
  series: ['range', 'channel', 'kind'],
  failures: ['range'],
  'verification-codes': ['range'],
  [MESSAGES_PATH]: ['channel', 'status', 'kind', 'templateDefinedId', 'from', 'to', 'page', 'size'],
  stream: ['range'],
  alerts: ['range'],
  export: ['format', 'channel', 'status', 'kind', 'templateDefinedId', 'from', 'to'],
};

/** The allowed parameters of a view, or a message saying which one is wrong. */
function cleanQuery(view, query) {
  const out = {};
  for (const field of QUERY_FIELDS[view] ?? ['range']) {
    const value = query[field];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || !VALUE.test(value)) return { error: `Invalid ${field}` };
    if (field === 'range' && !RANGES.has(value)) return { error: 'Invalid range: use 1h, 24h, 7d or 30d' };
    if (field === 'format' && !['csv', 'json'].includes(value)) return { error: 'Invalid format: use csv or json' };
    if (field === 'templateDefinedId' && !UUID.test(value)) return { error: 'Invalid templateDefinedId' };
    if ((field === 'page' || field === 'size') && !/^\d{1,4}$/.test(value)) return { error: `Invalid ${field}` };
    out[field] = value;
  }
  return { query: out };
}

const fail = (res, status, error) => res.status(status).json({ error });

/** The Bearer of the application client (null when none is configured), or false after answering 502 because backbone refused it. */
async function bearerOrFail(res, label) {
  try {
    return await backbone.applicationClientToken();
  } catch (err) {
    logger.error(`Monitoring (${label}): the application client could not get a token: ${err.message}`);
    fail(res, 502, 'Backend unavailable');
    return false;
  }
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const applicationPath = (application, view) => `/monitoring/applications/${encodeURIComponent(application)}/${view}`;

/**
 * The applications the person may look at: the ones Mercury lists for them in `/templates/applications` (all of them for a platform
 * administrator, the ones they manage for anybody else). It is asked once a minute per session, not once per request.
 */
const VISIBLE_TTL_MS = 60_000;
const MAX_CACHED_SESSIONS = 500;
const visibleCache = new Map();

async function visibleApplications(sessionToken, bearer) {
  const cached = visibleCache.get(sessionToken);
  if (cached && Date.now() - cached.at < VISIBLE_TTL_MS) return cached;
  const r = await axios.get(`${MERCURY_BASE_URL}${MERCURY_API_PREFIX}/templates/applications`, {
    headers: { Accept: 'application/json', 'session-token': sessionToken, ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    validateStatus: () => true,
    ...upstreamTls,
  });
  const result = { status: r.status, at: Date.now(), list: [], ids: new Set() };
  if (r.status === 200 && Array.isArray(r.data)) {
    result.list = r.data.filter((a) => typeof a?.id === 'string' && UUID.test(a.id)).map((a) => ({ id: a.id.toLowerCase(), name: String(a.name ?? a.codeName ?? a.id).slice(0, 120) }));
    result.ids = new Set(result.list.map((a) => a.id));
    if (visibleCache.size >= MAX_CACHED_SESSIONS) visibleCache.clear();
    visibleCache.set(sessionToken, result);
  }
  return result;
}

/**
 * The application a monitoring request is about: the one the person chose (`applicationId`, which must be one they may look at) or, without
 * one, the application of Iris itself. Answers the error and returns null when there is none.
 */
async function applicationOf(req, res, bearer) {
  const requested = req.query.applicationId;
  if (requested === undefined || requested === '') {
    if (MONITORED_APPLICATION_ID) return MONITORED_APPLICATION_ID;
    logger.error('Monitoring: MONITORED_APPLICATION_ID (or BACKBONE_APPLICATION_ID) is not set');
    fail(res, 503, 'Monitoring is not available');
    return null;
  }
  if (typeof requested !== 'string' || !UUID.test(requested)) {
    fail(res, 400, 'Invalid applicationId');
    return null;
  }
  if (requested.toLowerCase() === String(MONITORED_APPLICATION_ID).toLowerCase()) return MONITORED_APPLICATION_ID;
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (!sessionToken) {
    fail(res, 401, 'Not authenticated');
    return null;
  }
  let visible;
  try {
    visible = await visibleApplications(sessionToken, bearer);
  } catch (err) {
    logger.error(`Monitoring: the applications of the person could not be read: ${err.code ?? err.message}`);
    fail(res, 502, 'Backend unavailable');
    return null;
  }
  if (visible.status === 401) {
    fail(res, 401, 'Not authenticated');
    return null;
  }
  if (visible.status !== 200) {
    fail(res, 502, 'Backend unavailable');
    return null;
  }
  if (!visible.ids.has(requested.toLowerCase())) {
    logger.warn('Monitoring: a person asked for an application they may not look at');
    fail(res, 403, 'Not allowed to look at that application');
    return null;
  }
  return requested.toLowerCase();
}

/** A view of the application (needs MONITORED_APPLICATION_ID) or a global one (service health). */
const view = (name, { scoped = true, upstream = name } = {}) => async (req, res) => {
  const { query, error } = cleanQuery(name, req.query);
  if (error) return fail(res, 400, error);
  if (scoped && !MONITORED_APPLICATION_ID && !req.query.applicationId) return applicationOf(req, res, null);
  const bearer = await bearerOrFail(res, name);
  if (bearer === false) return undefined;
  let application;
  if (scoped) {
    application = await applicationOf(req, res, bearer);
    if (application === null) return undefined;
  }
  const path = scoped ? applicationPath(application, upstream) : `/monitoring/${upstream}`;
  return proxyToApi(req, res, 'mercury', path, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, query });
};

router.get('/summary', view('summary'));
router.get('/series', view('series'));
router.get('/failures', view('failures'));
router.get('/verification-codes', view('verification-codes'));
router.get('/messages', view(MESSAGES_PATH));
router.get('/messages/export', view('export', { upstream: 'messages/export' }));
router.get('/alerts', view('alerts'));
router.get('/alerts/rules', view('alerts-rules', { upstream: 'alerts/rules' }));
/** The applications the page can switch between, and the one it starts with. */
router.get('/applications', async (req, res) => {
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (!sessionToken) return fail(res, 401, 'Not authenticated');
  const bearer = await bearerOrFail(res, 'applications');
  if (bearer === false) return undefined;
  try {
    const visible = await visibleApplications(sessionToken, bearer);
    if (visible.status === 401) return fail(res, 401, 'Not authenticated');
    const applications = visible.status === 200 ? visible.list : [];
    return res.json({ defaultId: MONITORED_APPLICATION_ID ? MONITORED_APPLICATION_ID.toLowerCase() : null, applications, available: visible.status === 200 });
  } catch (err) {
    logger.error(`Monitoring: the applications could not be listed: ${err.code ?? err.message}`);
    return fail(res, 502, 'Backend unavailable');
  }
});

router.get('/health', view('health', { scoped: false }));
router.get('/outages', view('outages', { scoped: false, upstream: 'health/outages' }));

/** The fields of an alert rule the browser may set; the BFF checks their type and Mercury their values. */
const RULE_TYPES = ['FAILURE_RATE', 'QUEUE_STUCK', 'SERVICE_DOWN'];

/** The rule of the request body, or a message saying what is wrong. */
function cleanRule(body) {
  const rule = {};
  if (typeof body?.type !== 'string' || !RULE_TYPES.includes(body.type)) return { error: 'Invalid type' };
  rule.type = body.type;
  for (const field of ['threshold', 'windowMinutes', 'minVolume']) {
    if (body[field] === undefined || body[field] === null) continue;
    if (typeof body[field] !== 'number' || !Number.isFinite(body[field])) return { error: `Invalid ${field}` };
    rule[field] = body[field];
  }
  if (body.service !== undefined && body.service !== null && body.service !== '') {
    if (typeof body.service !== 'string' || !VALUE.test(body.service)) return { error: 'Invalid service' };
    rule.service = body.service;
  }
  if (body.notifyEmails !== undefined && body.notifyEmails !== null) {
    if (!Array.isArray(body.notifyEmails) || body.notifyEmails.length > 5 || body.notifyEmails.some((a) => typeof a !== 'string' || a.length > 320)) {
      return { error: 'Invalid notifyEmails' };
    }
    rule.notifyEmails = body.notifyEmails;
  }
  if (body.enabled !== undefined && body.enabled !== null) {
    if (typeof body.enabled !== 'boolean') return { error: 'Invalid enabled' };
    rule.enabled = body.enabled;
  }
  return { rule };
}

/** A write to Mercury (retry, alert rules): needs the application, the Bearer and, in Mercury, the write scope. */
const write = (path, { withBody = false } = {}) => async (req, res) => {
  if (!MONITORED_APPLICATION_ID && !req.query.applicationId) return applicationOf(req, res, null);
  let body;
  if (withBody) {
    const { rule, error } = cleanRule(req.body);
    if (error) return fail(res, 400, error);
    body = rule;
  }
  const bearer = await bearerOrFail(res, 'write');
  if (bearer === false) return undefined;
  const application = await applicationOf(req, res, bearer);
  if (application === null) return undefined;
  const upstream = typeof path === 'function' ? path(req) : path;
  return proxyToApi(req, res, 'mercury', applicationPath(application, upstream), {
    query: {},
    headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    ...(withBody ? { body } : {}),
  });
};

router.param('id', (_req, res, next, id) => (UUID.test(id) ? next() : fail(res, 400, 'Invalid id')));
router.post('/messages/:id/retry', write((req) => `messages/${req.params.id}/retry`));
router.post('/alerts/rules', write('alerts/rules', { withBody: true }));
router.put('/alerts/rules/:id', write((req) => `alerts/rules/${req.params.id}`, { withBody: true }));
router.delete('/alerts/rules/:id', write((req) => `alerts/rules/${req.params.id}`));

/**
 * The live stream: Mercury's Server-Sent Events passed through untouched. The browser cannot send the Bearer, so the BFF opens the
 * stream and, when the browser leaves, closes it. A refusal of Mercury (401, 429, 400) is answered as plain JSON so the page can fall
 * back to polling.
 */
router.get('/stream', async (req, res) => {
  if (!MONITORED_APPLICATION_ID && !req.query.applicationId) return applicationOf(req, res, null);
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (!sessionToken) return fail(res, 401, 'Not authenticated');
  const { query, error } = cleanQuery('stream', req.query);
  if (error) return fail(res, 400, error);
  const bearer = await bearerOrFail(res, 'stream');
  if (bearer === false) return undefined;
  const application = await applicationOf(req, res, bearer);
  if (application === null) return undefined;
  const url = targetUrl(MERCURY_BASE_URL, MERCURY_API_PREFIX, applicationPath(application, 'stream'));
  if (url === null) return fail(res, 400, 'Invalid path');

  const controller = new AbortController();
  res.on('close', () => controller.abort());
  try {
    const upstream = await axios({
      ...upstreamTls,
      method: 'GET',
      url,
      params: query,
      headers: { Accept: 'text/event-stream', 'session-token': sessionToken, ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      responseType: 'stream',
      validateStatus: () => true,
      signal: controller.signal,
      // no timeout on the body: the stream lives as long as Mercury keeps it
    });
    if (upstream.status !== 200) {
      upstream.data.destroy();
      logger.warn(`Monitoring: mercury answered ${upstream.status} opening the stream`);
      return fail(res, [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 502, 'The live stream is not available');
    }
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      // no-transform: nothing in between may buffer or compress the events
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    upstream.data.on('error', () => res.end());
    upstream.data.on('end', () => res.end());
    upstream.data.pipe(res);
    return undefined;
  } catch (err) {
    if (controller.signal.aborted) return undefined;
    logger.error(`Monitoring: the live stream could not be opened: ${err.code ?? err.message}`);
    return fail(res, 502, 'Backend unavailable');
  }
});

module.exports = router;
