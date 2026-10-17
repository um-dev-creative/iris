'use strict';

const axios = require('axios');
const logger = require('../config/logger');
const { SESSION_COOKIE, REFRESH_COOKIE, MERCURY_BASE_URL, MERCURY_API_PREFIX, BACKBONE_BASE_URL, BACKBONE_API_PREFIX } = require('../config/constants');
const backbone = require('./backbone');
const { setSessionCookies, clearSessionCookies } = require('./session');
const { toTraceparent } = require('./trace');

// Mercury and backbone authenticate like the rest of the UMDC services (security-oauth's SessionJwtInterceptor):
// the backbone session JWT travels as-is in the `session-token` header, not as `Authorization: Bearer`.
const SESSION_TOKEN_HEADER = 'session-token';

// What the upstream tells about a response (content type, versions, totals, downloads) and the browser must see.
const PASSED_BACK_HEADERS = ['content-type', 'etag', 'x-total-count', 'link', 'content-disposition', 'idempotent-replayed'];

/** The two upstream services the BFF fronts. */
const UPSTREAMS = {
  mercury: { base: MERCURY_BASE_URL, prefix: MERCURY_API_PREFIX },
  backbone: { base: BACKBONE_BASE_URL, prefix: BACKBONE_API_PREFIX },
};

/** Strips control characters (CR/LF included) so user-controlled text cannot forge log lines. */
const clean = (value) => String(value).replace(/[\u0000-\u001f\u007f]/g, ' ');

/**
 * A path stays under the upstream prefix only if it is absolute, free of control characters and backslashes,
 * and has no dot segments (also when percent-encoded).
 */
function isSafePath(path) {
  if (path === '') return true;
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  let decoded;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return false;
  }
  if (/[\u0000-\u001f\u007f\\]/.test(decoded)) return false;
  return !decoded.split('/').some((segment) => segment === '..' || segment === '.');
}

const forward = (req, url, token, { body, headers = {} } = {}) =>
  axios({
    method: req.method,
    url,
    headers: {
      Accept: 'application/json',
      // a prepared body (multipart) brings its own Content-Type
      ...(body === undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { [SESSION_TOKEN_HEADER]: token } : {}),
      ...(req.get('if-match') ? { 'If-Match': req.get('if-match') } : {}),
      ...(req.get('idempotency-key') ? { 'Idempotency-Key': req.get('idempotency-key') } : {}),
      // the upstream continues the trace the BFF is in (nothing is sent when tracing is off)
      ...(req.trace ? { traceparent: toTraceparent(req.trace) } : {}),
      ...headers,
    },
    params: req.query,
    // a repeated parameter (`sort=a&sort=b`) must stay `sort=a&sort=b`: axios' default `sort[]=a` is not bound by Spring
    paramsSerializer: { indexes: null },
    data: body === undefined ? (['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined) : body,
    // the answer goes back byte for byte: JSON, images and downloads alike
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

function sendUpstream(res, response) {
  for (const name of PASSED_BACK_HEADERS) {
    if (response.headers?.[name]) res.set(name, response.headers[name]);
  }
  const data = response.data;
  if (response.status === 204 || !data || data.length === 0) return res.status(response.status).end();
  return res.status(response.status).send(Buffer.from(data));
}

/**
 * Forward a request to `upstream` ('mercury' | 'backbone') at `path` (relative to the service root).
 *
 * @param {object} [options]
 * @param {boolean} [options.public]  no session needed (sign-up, code verification): the call goes out without token
 * @param {*} [options.body]          a prepared body (e.g. FormData) instead of `req.body`
 * @param {object} [options.headers]  extra upstream headers
 *
 * With a session, a 401 silently renews it through backbone once and retries.
 */
async function proxyToApi(req, res, upstream, path, options = {}) {
  const { base, prefix } = UPSTREAMS[upstream];
  if (!isSafePath(path)) return res.status(400).json({ error: 'Invalid path' });
  const url = `${base}${prefix}${path}`;
  let token = req.cookies?.[SESSION_COOKIE];
  if (!token && !options.public) return res.status(401).json({ error: 'Not authenticated' });

  try {
    let response = await forward(req, url, token, options);

    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (token && response.status === 401 && refreshToken) {
      const renewed = await backbone.refresh(refreshToken);
      if (renewed.status === 200 && renewed.token) {
        token = renewed.token;
        setSessionCookies(res, renewed);
        response = await forward(req, url, token, options);
      } else {
        clearSessionCookies(res);
      }
    }

    if (response.status >= 500 && req.trace) {
      logger.warn(`${upstream} answered ${response.status} for ${req.method} ${clean(path)} traceId=${req.trace.traceId}`);
    }
    return sendUpstream(res, response);
  } catch (err) {
    // err.code (e.g. DEPTH_ZERO_SELF_SIGNED_CERT) names a TLS trust failure explicitly
    logger.error(clean(`Proxy error → ${url}: ${err.code ? `[${err.code}] ` : ''}${err.message}${req.trace ? ` traceId=${req.trace.traceId}` : ''}`));
    return res.status(502).json({ error: 'Backend unavailable', ...(req.trace ? { traceId: req.trace.traceId } : {}) });
  }
}

/** Router-level handler: forwards whatever is left of the URL after the mount point. */
const passThrough = (upstream, options) => (req, res) =>
  proxyToApi(req, res, upstream, req.path === '/' ? '' : req.path, options);

/** Router-level handler for a route that maps to one fixed upstream path. */
const fixedPath = (upstream, path, options) => (req, res) => proxyToApi(req, res, upstream, path, options);

module.exports = { proxyToApi, passThrough, fixedPath };
