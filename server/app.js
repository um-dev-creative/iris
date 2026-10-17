'use strict';

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('node:path');
const { existsSync } = require('node:fs');

const {
  CORS_ORIGIN,
  TRUST_PROXY,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  CSRF_HEADER,
  TRACING_ENABLED,
  TRACE_SAMPLE_RATE,
} = require('./config/constants');
const { traceMiddleware } = require('./shared/trace');
const { requireCsrfHeader } = require('./shared/csrf');
const authRoutes = require('./routes/auth.routes');
const mercuryRoutes = require('./routes/mercury.routes');
const mediaRoutes = require('./routes/media.routes');
const backboneRoutes = require('./routes/backbone.routes');

const API_PREFIXES = ['/mrc/api/v1', '/bkd/api/v1'];

/** @param {{distPath?: string}} [options] where the built Angular app lives (overridable for tests) */
function createApp({ distPath = path.join(__dirname, '../dist/dashboard/browser') } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Behind nginx the client IP is in X-Forwarded-For; without this every user shares nginx's IP in the rate limits
  app.set('trust proxy', TRUST_PROXY);
  app.use(compression());
  app.use(cors({
    origin: CORS_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', CSRF_HEADER, 'If-Match', 'Idempotency-Key'],
    exposedHeaders: ['ETag', 'X-Total-Count', 'Link', 'Idempotent-Replayed', 'X-Trace-Id'],
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX, standardHeaders: true, legacyHeaders: false }));
  app.use(traceMiddleware({ enabled: TRACING_ENABLED, sampleRate: TRACE_SAMPLE_RATE }));

  app.get('/health', (_req, res) => res.json({ status: 'UP' }));

  app.use(API_PREFIXES, requireCsrfHeader);
  app.use('/mrc/api/v1/auth', authRoutes);
  app.use('/mrc/api/v1/general', mercuryRoutes);
  app.use('/mrc/api/v1/d-image', mediaRoutes);
  app.use('/bkd/api/v1', backboneRoutes);

  // an unknown API path is a 404, not the SPA's index.html (which would answer 200 to a typo'd endpoint)
  app.use(API_PREFIXES, (_req, res) => res.status(404).json({ error: 'Not found' }));

  // the SSR build writes index.csr.html, a client-only build index.html
  const indexHtml = ['index.csr.html', 'index.html'].map((f) => path.join(distPath, f)).find(existsSync);
  if (indexHtml) {
    app.use(express.static(distPath, { maxAge: '1y', index: false }));
    app.get('*', (_req, res) => res.sendFile(indexHtml));
  } else {
    app.get('*', (_req, res) => res.status(503).send('Application not built. Run: pnpm build:dev'));
  }

  return { app };
}

module.exports = { createApp };
