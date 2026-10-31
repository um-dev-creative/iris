'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { fixedPath } = require('../shared/proxy');
const { decodePayload, setSessionCookies, clearSessionCookies } = require('../shared/session');
const { SESSION_COOKIE, REFRESH_COOKIE, RATE_LIMIT_WINDOW_MS, LOGIN_RATE_LIMIT_MAX } = require('../config/constants');

const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined);

/**
 * The profile the browser may see, taken from the session token (nothing else is stored). `email` and `avatarUrl`
 * appear only when Backbone puts them in the token; today it carries uid, username, firstname and lastname.
 */
function toUser(payload) {
  const username = text(payload.sub) ?? text(payload.username);
  const firstname = text(payload.firstname);
  const lastname = text(payload.lastname);
  return {
    id: payload.uid,
    username,
    firstname,
    lastname,
    name: [firstname, lastname].filter(Boolean).join(' ') || username,
    email: text(payload.email),
    avatarUrl: text(payload.avatarUrl) ?? text(payload.picture),
    expiresAt: Number.isFinite(payload.exp) ? new Date(payload.exp * 1000).toISOString() : undefined,
  };
}

// a response about who is signed in must never be stored by the browser or an intermediate cache
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const loginLimiter = rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: LOGIN_RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false });

async function login(req, res) {
  const { password } = req.body ?? {};
  const email = req.body?.email ?? req.body?.alias;
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await backbone.login(email, password);
    if (result.status === 200 && result.token) {
      setSessionCookies(res, result);
      return res.json({ authenticated: true, user: toUser(decodePayload(result.token) ?? {}) });
    }
    // 404 = no such user in the application: the caller is not told that apart from a wrong password
    if ([400, 401, 404, 406].includes(result.status)) return res.status(401).json({ error: 'Invalid credentials' });
    if (result.status === 429) return res.status(429).json({ error: 'Too many attempts. Try again later' });
    logger.error(`Login: unexpected backbone status ${result.status}`);
    return res.status(502).json({ error: 'Authentication service unavailable' });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return res.status(502).json({ error: 'Authentication service unavailable' });
  }
}

async function logout(req, res) {
  // revoke in backbone first (its deny-list is what mercury consults), then forget the cookies whatever backbone said
  await backbone.logout(req.cookies?.[SESSION_COOKIE], req.cookies?.[REFRESH_COOKIE]);
  clearSessionCookies(res);
  res.status(204).end();
}

async function me(req, res) {
  let token = req.cookies?.[SESSION_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  let payload = token ? decodePayload(token) : null;
  const expired = !payload?.exp || payload.exp * 1000 <= Date.now();

  if (expired && refreshToken) {
    try {
      const renewed = await backbone.refresh(refreshToken);
      if (renewed.status === 200 && renewed.token) {
        setSessionCookies(res, renewed);
        payload = decodePayload(renewed.token);
        token = renewed.token;
      } else {
        clearSessionCookies(res);
        payload = null;
      }
    } catch (err) {
      logger.error(`Session renew error: ${err.message}`);
      return res.status(502).json({ error: 'Authentication service unavailable' });
    }
  } else if (expired) {
    payload = null;
  }

  if (!token || !payload) return res.status(401).json({ authenticated: false });
  return res.json({ authenticated: true, user: toUser(payload) });
}

router.post('/access-token', loginLimiter, login);
router.post('/logout', logout);
router.delete('/session-end', logout); // legacy name of the logout
router.get('/me', me);

// sign-up: no session yet, mercury is the authority
router.post('/create-user', fixedPath('mercury', '/users', { public: true }));
router.post('/verify-code', fixedPath('mercury', '/user-register', { public: true }));

module.exports = router;
