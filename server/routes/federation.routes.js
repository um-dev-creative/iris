'use strict';

/**
 * Social sign-in (Google, Microsoft, Apple, GitHub, Meta) through backbone, which is the identity broker: it builds the
 * authorization request, verifies what the provider sends back and answers the same tokens as the password login. This BFF
 * only keeps the browser side: the state cookie, the safe return path and the session cookies.
 * See docs/technical/social-federation.md.
 */
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { decodePayload, setSessionCookies } = require('../shared/session');
const {
  COOKIE_SECURE,
  FEDERATION_ENABLED,
  FEDERATION_CALLBACK_URL,
  FEDERATION_RETURN_TO_ALLOWLIST,
  FEDERATION_STATE_COOKIE,
  SESSION_COOKIE,
  RATE_LIMIT_WINDOW_MS,
  LOGIN_RATE_LIMIT_MAX,
} = require('../config/constants');

const PROVIDER = /^[a-z]{1,32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const COOKIE_PATH = '/mrc/api/v1/auth/federation';
const DEFAULT_RETURN = '/dashboard';
const LOGIN_PATH = '/login';

/** Backbone's stable error codes → the short code the login page turns into a message. */
const ERROR_CODES = {
  federation_state_invalid: 'expired',
  federation_token_invalid: 'failed',
  federation_not_registered: 'not_registered',
  federation_email_not_allowed: 'not_allowed',
  federation_not_linked: 'not_linked',
  federation_not_allowed: 'not_allowed',
  federation_identity_conflict: 'conflict',
  federation_idp_unavailable: 'unavailable',
  federation_rate_limited: 'rate_limited',
  federation_session_required: 'expired',
  federation_redirect_uri_invalid: 'unavailable',
  federation_provider_not_found: 'unavailable',
  federation_client_rejected: 'unavailable',
  federation_client_required: 'unavailable',
  federation_disabled: 'unavailable',
};

/**
 * `returnTo` is only honoured when it is a path of this site under one of the allowed prefixes: a sign-in can never be used to
 * send the person somewhere else.
 */
function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n\t]/.test(value)) return DEFAULT_RETURN;
  const path = value.split(/[?#]/)[0];
  const allowed = FEDERATION_RETURN_TO_ALLOWLIST.some((prefix) => path === prefix || path.startsWith(`${prefix.replace(/\/$/, '')}/`));
  return allowed ? value : DEFAULT_RETURN;
}

const loginRedirect = (res, code) => res.redirect(302, `${LOGIN_PATH}?error=${encodeURIComponent(code)}`);
const errorCode = (backboneError, status) => ERROR_CODES[backboneError] ?? (status >= 500 ? 'unavailable' : 'failed');

/** Apple answers with a cross-site POST (`form_post`): its cookie must be sent on it, so it is the one provider that needs None. */
const stateCookieOptions = (provider) => ({
  httpOnly: true,
  secure: COOKIE_SECURE || provider === 'apple',
  sameSite: provider === 'apple' ? 'none' : 'lax',
  path: COOKIE_PATH,
  maxAge: STATE_MAX_AGE_MS,
});

function setStateCookie(res, { state, provider, returnTo, link }) {
  const value = Buffer.from(JSON.stringify({ state, provider, returnTo, link: Boolean(link) })).toString('base64url');
  res.cookie(FEDERATION_STATE_COOKIE, value, stateCookieOptions(provider));
}

function readStateCookie(req) {
  try {
    const parsed = JSON.parse(Buffer.from(String(req.cookies?.[FEDERATION_STATE_COOKIE] ?? ''), 'base64url').toString('utf8'));
    return typeof parsed?.state === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function clearStateCookie(res, provider) {
  const { maxAge: _ignored, ...options } = stateCookieOptions(provider);
  res.clearCookie(FEDERATION_STATE_COOKIE, options);
}

const limiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: LOGIN_RATE_LIMIT_MAX * 3, standardHeaders: true, legacyHeaders: false });

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// everything below is off (404) unless the feature is on; the login page reads /providers to decide whether to show buttons
router.use((req, res, next) => (FEDERATION_ENABLED || req.path === '/providers' ? next() : res.status(404).json({ error: 'Not found' })));

router.get('/providers', async (_req, res) => {
  if (!FEDERATION_ENABLED) return res.json({ enabled: false, providers: [] });
  try {
    const result = await backbone.federationProviders();
    return res.json({ enabled: true, providers: result.status === 200 ? result.providers : [] });
  } catch (err) {
    logger.error(`Federation providers: ${err.message}`);
    return res.json({ enabled: true, providers: [] });
  }
});

router.get('/:provider/start', limiter, async (req, res) => {
  const { provider } = req.params;
  if (!PROVIDER.test(provider)) return loginRedirect(res, 'unavailable');
  try {
    const started = await backbone.federationAuthorize({ provider, redirectUri: FEDERATION_CALLBACK_URL });
    if (started.status !== 200 || !started.authorizationUrl) return loginRedirect(res, errorCode(started.error, started.status));
    setStateCookie(res, { state: started.state, provider, returnTo: safeReturnTo(req.query.returnTo) });
    return res.redirect(302, started.authorizationUrl);
  } catch (err) {
    logger.error(`Federation start (${provider}): ${err.message}`);
    return loginRedirect(res, 'unavailable');
  }
});

/** The provider sent the person back (GET: Google, Microsoft, GitHub, Meta; POST form_post: Apple). */
async function handleCallback(req, res) {
  if (!FEDERATION_ENABLED) return res.status(404).json({ error: 'Not found' });
  const input = req.method === 'POST' ? req.body ?? {} : req.query;
  const remembered = readStateCookie(req);
  clearStateCookie(res, remembered?.provider);
  const fail = (code) => (remembered?.link ? res.redirect(302, `${safeReturnTo(remembered.returnTo)}?linkError=${encodeURIComponent(code)}`) : loginRedirect(res, code));

  if (typeof input.error === 'string') return fail(input.error === 'access_denied' ? 'denied' : 'failed');
  const { state, code } = input;
  // the state must be the one this browser started: without that cookie a callback is somebody else's request
  if (typeof state !== 'string' || typeof code !== 'string' || !remembered || remembered.state !== state) return fail('expired');

  try {
    const sessionToken = remembered.link ? req.cookies?.[SESSION_COOKIE] : undefined;
    const done = await backbone.federationCallback({ state, code, sessionToken });
    if (done.status !== 200) return fail(errorCode(done.error, done.status));
    if (remembered.link) return res.redirect(302, `${safeReturnTo(remembered.returnTo)}?linked=${encodeURIComponent(remembered.provider)}`);
    if (!done.token) return fail('failed');
    setSessionCookies(res, done);
    return res.redirect(302, safeReturnTo(remembered.returnTo));
  } catch (err) {
    logger.error(`Federation callback (${remembered.provider}): ${err.message}`);
    return fail('unavailable');
  }
}

router.get('/callback', limiter, handleCallback);

// ---- linked accounts (need the session) ---------------------------------------------------------------------------------------

function session(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = token ? decodePayload(token) : null;
  if (!payload?.uid || !payload.exp || payload.exp * 1000 <= Date.now()) return res.status(401).json({ error: 'unauthorized' });
  req.sessionToken = token;
  req.userId = payload.uid;
  return next();
}

router.get('/identities', session, async (req, res) => {
  try {
    const result = await backbone.federationIdentities(req.userId, req.sessionToken);
    if (result.status === 200) return res.json({ identities: result.identities });
    return res.status(result.status === 401 || result.status === 403 || result.status === 404 ? result.status : 502).json({ error: 'Could not load the linked accounts' });
  } catch (err) {
    logger.error(`Federation identities: ${err.message}`);
    return res.status(502).json({ error: 'Authentication service unavailable' });
  }
});

router.delete('/identities/:identityId', session, async (req, res) => {
  if (!UUID.test(req.params.identityId)) return res.status(400).json({ error: 'Invalid identityId' });
  try {
    const result = await backbone.federationUnlink(req.userId, req.params.identityId, req.sessionToken);
    if (result.status === 204) return res.status(204).end();
    return res.status(result.status === 404 || result.status === 403 || result.status === 401 ? result.status : 502).json({ error: 'Could not unlink the account' });
  } catch (err) {
    logger.error(`Federation unlink: ${err.message}`);
    return res.status(502).json({ error: 'Authentication service unavailable' });
  }
});

/** Starts linking another provider to the signed-in person; the browser then navigates to the returned URL. */
router.post('/:provider/link', limiter, session, async (req, res) => {
  const { provider } = req.params;
  if (!PROVIDER.test(provider)) return res.status(400).json({ error: 'Invalid provider' });
  try {
    const started = await backbone.federationAuthorize({ provider, redirectUri: FEDERATION_CALLBACK_URL, link: true, sessionToken: req.sessionToken });
    if (started.status !== 200 || !started.authorizationUrl) {
      return res.status(started.status >= 400 && started.status < 500 ? started.status : 502).json({ error: errorCode(started.error, started.status) });
    }
    setStateCookie(res, { state: started.state, provider, returnTo: safeReturnTo(req.body?.returnTo), link: true });
    return res.json({ authorizationUrl: started.authorizationUrl });
  } catch (err) {
    logger.error(`Federation link (${provider}): ${err.message}`);
    return res.status(502).json({ error: 'Authentication service unavailable' });
  }
});

module.exports = router;
module.exports.handleCallback = handleCallback;
module.exports.safeReturnTo = safeReturnTo;
module.exports.ERROR_CODES = ERROR_CODES;
