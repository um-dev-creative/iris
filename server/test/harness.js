'use strict';

/**
 * A BFF wired to stand-ins for backbone (login/refresh/logout) and mercury (the API), both with behaviour a test can
 * change on the fly. Must be required before anything loads the BFF: the BFF reads its environment at require time.
 */
const http = require('node:http');
const express = require('express');

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));

const jwt = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
const inFuture = (s) => Math.floor(Date.now() / 1000) + s;

const tokens = {
  GOOD: jwt({ uid: 'u-1', sub: 'luis', firstname: 'Luis', lastname: 'Mata', exp: inFuture(3600) }),
  EXPIRED: jwt({ uid: 'u-1', sub: 'luis', exp: Math.floor(Date.now() / 1000) - 60 }),
  RENEWED: jwt({ uid: 'u-1', sub: 'luis', exp: inFuture(7200) }),
  REFRESH: jwt({ exp: inFuture(86400) }),
};

/** Starts both stand-ins and the BFF. `env` entries are set before the BFF is loaded. */
async function start({ env = {}, appOptions } = {}) {
  const state = {
    loginStatus: 200,        // what backbone answers to /session/token for valid credentials
    refreshStatus: 200,      // ... and to /session/refresh
    logoutStatus: 204,
    apiStatus: 200,          // what mercury answers when the token is good
    apiHeaders: {},          // headers it adds (ETag, X-Total-Count, Link)
    apiBody: { ok: true },
    apiCalls: [],            // { method, url, token, body, ifMatch, idempotencyKey, traceparent, contentType }
    backboneCalls: [],       // every call backbone received: { path, authorization, sessionToken, body }
    clientTokenCalls: 0,     // how many times the application client asked for an M2M token
    clientTokenStatus: 200,
    clientTokens: [],        // the M2M tokens backbone still accepts (another Bearer gets 401 invalid_token)
    clientTokenTtl: 3600,
  };

  const backbone = express();
  backbone.use(express.json());
  const record = (req) =>
    state.backboneCalls.push({ path: req.path, authorization: req.headers.authorization, sessionToken: req.headers['session-token'], body: req.body });
  const knownClient = (req, res) => {
    const bearer = req.headers.authorization?.replace('Bearer ', '');
    if (bearer && !state.clientTokens.includes(bearer)) {
      res.status(401).json({ error: 'invalid_token' });
      return false;
    }
    return true;
  };
  const root = '/backbone/api/v1';
  backbone.post(`${root}/managed-clients/token`, (req, res) => {
    state.clientTokenCalls += 1;
    state.clientCredentials = req.body;
    if (state.clientTokenStatus !== 200) return res.status(state.clientTokenStatus).json({ error: 'invalid_client' });
    const accessToken = `m2m-${state.clientTokenCalls}`;
    state.clientTokens.push(accessToken);
    res.json({ accessToken, tokenType: 'Bearer', expiresIn: state.clientTokenTtl, scopes: req.body.scopes });
  });
  backbone.post(`${root}/session/token`, (req, res) => {
    record(req);
    if (!knownClient(req, res)) return;
    if (state.loginStatus !== 200) return res.status(state.loginStatus).json({});
    res.json({ token: tokens.GOOD, refreshToken: tokens.REFRESH });
  });
  backbone.post(`${root}/session/refresh`, (req, res) => {
    record(req);
    if (!knownClient(req, res)) return;
    if (state.refreshStatus !== 200) return res.status(state.refreshStatus).json({});
    res.json({ token: tokens.RENEWED });
  });
  backbone.post(`${root}/session/logout`, (req, res) => {
    record(req);
    res.status(state.logoutStatus).end();
  });
  // anything else under /backbone/api/v1 is a resource of the backbone API, guarded by the session token
  backbone.use(root, (req, res) => {
    state.apiCalls.push({ service: 'backbone', method: req.method, url: req.originalUrl, token: req.headers['session-token'] });
    res.status(200).json({ service: 'backbone' });
  });
  const backboneServer = await listen(http.createServer(backbone));

  const mercury = express();
  mercury.use(express.json());
  mercury.use('/mercury/api/v1', (req, res) => {
    state.apiCalls.push({
      service: 'mercury', method: req.method, url: req.originalUrl, token: req.headers['session-token'], body: req.body,
      ifMatch: req.headers['if-match'], idempotencyKey: req.headers['idempotency-key'], traceparent: req.headers['traceparent'],
      contentType: req.headers['content-type'],
    });
    const public_ = req.originalUrl.startsWith('/mercury/api/v1/users') || req.originalUrl.startsWith('/mercury/api/v1/user-register');
    if (public_ || [tokens.GOOD, tokens.RENEWED].includes(req.headers['session-token'])) {
      res.set(state.apiHeaders);
      return state.apiStatus === 204 ? res.status(204).end() : res.status(state.apiStatus).json(state.apiBody);
    }
    res.status(401).json({});
  });
  const mercuryServer = await listen(http.createServer(mercury));

  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOGIN_RATE_LIMIT_MAX: '1000',   // tests log in a lot; the limit itself has its own test
    BACKBONE_BASE_URL: `http://127.0.0.1:${backboneServer.port}`,
    BACKBONE_APPLICATION_ID: 'app-1',
    MERCURY_BASE_URL: `http://127.0.0.1:${mercuryServer.port}`,
    ...env,
  });
  const { createApp } = require('../app');
  const { app } = createApp(appOptions);
  let bff = await listen(http.createServer(app));

  const call = (path, { method = 'GET', body, cookie, csrf = true, headers = {} } = {}) =>
    fetch(`http://127.0.0.1:${bff.port}${path}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'x-iris-csrf': '1' } : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

  /** Stops the BFF and starts a fresh instance on a new port against the same stand-ins: a process restart. */
  const restart = async () => {
    await new Promise((resolve) => bff.server.close(resolve));
    bff = await listen(http.createServer(createApp(appOptions).app));
  };

  return {
    state, call, tokens, restart,
    stop: () => [backboneServer, mercuryServer, bff].forEach((s) => s.server.close()),
  };
}

module.exports = { start, tokens, jwt, inFuture, listen };
