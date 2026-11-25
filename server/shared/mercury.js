'use strict';

const axios = require('axios');
const {
  MERCURY_BASE_URL,
  MERCURY_API_PREFIX,
  REGISTRATION_MAIL_FROM,
  BACKBONE_APPLICATION_ID,
} = require('../config/constants');
const { decodePayload } = require('./session');
const backbone = require('./backbone');
const { upstreamTls } = require('./tls');

const SESSION_TOKEN_HEADER = 'session-token';
// Renewed a minute before it expires, so a token is never sent in its last seconds.
const TOKEN_MARGIN_MS = 60_000;
const SUBJECTS = { es: 'Tu código de verificación de Iris', en: 'Your Iris verification code' };

const url = (path) => `${MERCURY_BASE_URL}${MERCURY_API_PREFIX}${path}`;
const send = (method, path, data, headers = {}) =>
  axios({
    method,
    url: url(path),
    data,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    validateStatus: () => true,
    ...upstreamTls,
  });

let cached = null; // { value, expiresAt }

/**
 * Mercury has no login clients any more: the application proves who it is with the Bearer of its Backbone managed client
 * (the same one that signs users in) and exchanges it, with no body, for Mercury's own M2M token. Mercury ties that token
 * to the application Backbone registers the client for, and keeps the `mercury:*` scopes of the client: /mail and
 * /verification-code change state, so the client needs `mercury:message:write` (BACKBONE_CLIENT_SCOPES).
 */
async function requestToken() {
  const bearer = await backbone.applicationClientToken();
  if (!bearer) throw new Error('no application client is configured: set BACKBONE_CLIENT_ID and BACKBONE_CLIENT_SECRET');
  const r = await send('post', '/auth/token', undefined, { Authorization: `Bearer ${bearer}` });
  if (r.status === 403) throw new Error('mercury refused the exchange (403): the client needs the mercury:message:write scope and an application in backbone');
  if (r.status !== 200 || !r.data?.token) throw new Error(`mercury refused the application client (${r.status})`);
  const exp = decodePayload(r.data.token)?.exp;
  cached = { value: r.data.token, expiresAt: Number.isFinite(exp) ? exp * 1000 - TOKEN_MARGIN_MS : 0 };
  return cached.value;
}

const machineToken = async () => (cached && Date.now() < cached.expiresAt ? cached.value : requestToken());

/** A call as the Iris application (Mercury M2M token); an expired or revoked token gets one new try. */
async function asLoginClient(method, path, data, headers = {}) {
  const call = async () => send(method, path, data, { ...headers, [SESSION_TOKEN_HEADER]: await machineToken() });
  let r = await call();
  if (r.status === 401) {
    cached = null;
    r = await call();
  }
  return r;
}

/** Mails the code. Mercury renders the template and registers the code for the later check. */
async function mailVerificationCode({ userId, email, userName, language, templateId, code, expiresInMinutes, dedupKey }) {
  const r = await asLoginClient(
    'post',
    '/mail',
    {
      templateDefinedId: templateId,
      userId,
      from: REGISTRATION_MAIL_FROM,
      to: [{ email, name: email }],
      cc: [],
      subject: SUBJECTS[language] ?? SUBJECTS.es,
      body: 'verification', // mercury requires a body; the template renders the real one
      params: { vc: code, user_name: userName, expiresInMinutes: String(expiresInMinutes) },
    },
    { 'Idempotency-Key': dedupKey },
  );
  if (r.status < 200 || r.status >= 300) throw new Error(`mercury answered ${r.status} to the verification mail`);
}

/**
 * Checks a code. Mercury answers 202 accepted, 406 wrong (with the attempts left in a header) and 404 when no code is
 * pending.
 * @returns {Promise<{outcome: 'accepted'|'wrong'|'not-found', attemptsRemaining?: number}>}
 */
async function checkVerificationCode(userId, code) {
  const r = await asLoginClient('post', '/verification-code', { applicationId: BACKBONE_APPLICATION_ID, userId, code });
  if (r.status === 202) return { outcome: 'accepted' };
  if (r.status === 404) return { outcome: 'not-found' };
  if (r.status === 406) {
    const left = Number.parseInt(r.headers?.['attempts-remaining'] ?? r.headers?.['x-attempts-remaining'], 10);
    return { outcome: 'wrong', attemptsRemaining: Number.isNaN(left) ? undefined : left };
  }
  throw new Error(`mercury answered ${r.status} to a code check`);
}

module.exports = { mailVerificationCode, checkVerificationCode };
