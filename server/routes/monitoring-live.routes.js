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
const RANGES = ['1h', '24h', '7d', '30d'];
const MESSAGES_PATH = 'messages';

/** What the browser may ask for in each view; any other parameter is dropped. */
const QUERY_FIELDS = {
  summary: ['range'],
  series: ['range', 'channel', 'kind'],
  failures: ['range'],
  'verification-codes': ['range'],
  [MESSAGES_PATH]: ['channel', 'status', 'kind', 'templateDefinedId', 'from', 'to', 'page', 'size'],
  stream: ['range'],
};

/** The allowed parameters of a view, or a message saying which one is wrong. */
function cleanQuery(view, query) {
  const out = {};
  for (const field of QUERY_FIELDS[view] ?? ['range']) {
    const value = query[field];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string' || !VALUE.test(value)) return { error: `Invalid ${field}` };
    if (field === 'range' && !RANGES.includes(value)) return { error: 'Invalid range: use 1h, 24h, 7d or 30d' };
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

const applicationPath = (view) => `/monitoring/applications/${encodeURIComponent(MONITORED_APPLICATION_ID)}/${view}`;

/** A view of the application (needs MONITORED_APPLICATION_ID) or a global one (service health). */
const view = (name, { scoped = true, upstream = name } = {}) => async (req, res) => {
  if (scoped && !MONITORED_APPLICATION_ID) {
    logger.error('Monitoring: MONITORED_APPLICATION_ID (or BACKBONE_APPLICATION_ID) is not set');
    return fail(res, 503, 'Monitoring is not available');
  }
  const { query, error } = cleanQuery(name, req.query);
  if (error) return fail(res, 400, error);
  const bearer = await bearerOrFail(res, name);
  if (bearer === false) return undefined;
  const path = scoped ? applicationPath(upstream) : `/monitoring/${upstream}`;
  return proxyToApi(req, res, 'mercury', path, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, query });
};

router.get('/summary', view('summary'));
router.get('/series', view('series'));
router.get('/failures', view('failures'));
router.get('/verification-codes', view('verification-codes'));
router.get('/messages', view(MESSAGES_PATH));
router.get('/health', view('health', { scoped: false }));
router.get('/outages', view('outages', { scoped: false, upstream: 'health/outages' }));

/**
 * The live stream: Mercury's Server-Sent Events passed through untouched. The browser cannot send the Bearer, so the BFF opens the
 * stream and, when the browser leaves, closes it. A refusal of Mercury (401, 429, 400) is answered as plain JSON so the page can fall
 * back to polling.
 */
router.get('/stream', async (req, res) => {
  if (!MONITORED_APPLICATION_ID) return fail(res, 503, 'Monitoring is not available');
  const sessionToken = req.cookies?.[SESSION_COOKIE];
  if (!sessionToken) return fail(res, 401, 'Not authenticated');
  const { query, error } = cleanQuery('stream', req.query);
  if (error) return fail(res, 400, error);
  const bearer = await bearerOrFail(res, 'stream');
  if (bearer === false) return undefined;
  const url = targetUrl(MERCURY_BASE_URL, MERCURY_API_PREFIX, applicationPath('stream'));
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
