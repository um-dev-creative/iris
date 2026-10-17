'use strict';

const { COOKIE_SECURE, SESSION_COOKIE, REFRESH_COOKIE } = require('../config/constants');

/** Reads a JWT payload WITHOUT verifying it — display/expiry hints only; mercury is the authority. */
function decodePayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// Strict: the SPA and the BFF share an origin, so the browser never needs to send the session across sites.
function cookieOptions(maxAgeMs) {
  return { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/', maxAge: maxAgeMs };
}

function setSessionCookies(res, { token, refreshToken }) {
  const refreshExp = refreshToken ? decodePayload(refreshToken)?.exp : undefined;
  const maxAge = refreshExp ? Math.max(refreshExp * 1000 - Date.now(), 0) : 24 * 60 * 60 * 1000;
  res.cookie(SESSION_COOKIE, token, cookieOptions(maxAge));
  if (refreshToken) res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(maxAge));
}

function clearSessionCookies(res) {
  const opts = { httpOnly: true, sameSite: 'strict', secure: COOKIE_SECURE, path: '/' };
  res.clearCookie(SESSION_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

module.exports = { decodePayload, setSessionCookies, clearSessionCookies };
