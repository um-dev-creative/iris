/**
 * server.js — Main entry point for the integrated Angular + Node.js BFF server.
 *
 * Run:  node server.js [options]
 *
 * CLI flags (all optional, fall back to env vars / config):
 *   --ssl           true|false   Override SSL enabled flag
 *   --ssl-key       <path>       Override SSL key path
 *   --ssl-cert      <path>       Override SSL cert path
 *   --vaultToken    <token>      Vault token
 *   --vaultUrl      <url>        Vault address
 *   --vaultPath     <path>       Vault secret path
 *   --debugMode     <bool>       Enable debug mode
 */

'use strict';

// ─── Environment bootstrap ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const path = require('node:path');
const fs   = require('node:fs');
const http  = require('node:http');
const https = require('node:https');

const express        = require('express');
const compression    = require('compression');
const cors           = require('cors');
const RateLimit      = require('express-rate-limit');
const httpContext     = require('express-http-context');

// ─── Backend config directory (for the `config` npm package) ────────────────
process.env.NODE_CONFIG_DIR = path.join(__dirname, 'server/config');

const appConfig = require('./server/config/app.config');
const constants = require('./server/config/constants.util');

// ─── Paths ──────────────────────────────────────────────────────────────────
const BROWSER_DIST = path.join(__dirname, 'dist/dashboard/browser');

/**
 * Resolve the index HTML file Angular generated.
 * The SSR build produces `index.csr.html`; a client-only build produces `index.html`.
 */
function resolveIndexHtml() {
  const csr = path.join(BROWSER_DIST, 'index.csr.html');
  if (fs.existsSync(csr)) return csr;
  return path.join(BROWSER_DIST, 'index.html');
}

// ─── SSL configuration ─────────────────────────────────────────────────────
function getSSLConfiguration() {
  let config;
  try {
    config = require('config');
  } catch (_) {
    console.warn('⚠ Configuration package not available, SSL disabled');
    return null;
  }

  const sslConfig = config.ssl;
  if (!sslConfig?.enabled) {
    console.log('ℹ SSL disabled by configuration');
    return null;
  }

  // CLI overrides
  const argv = require('yargs').argv;
  if (argv.ssl === 'false' || argv.ssl === false) {
    console.log('ℹ SSL disabled by --ssl false');
    return null;
  }

  let keyPath, certPath;

  if (argv.sslKey && argv.sslCert) {
    // Paths supplied on CLI
    keyPath  = path.resolve(argv.sslKey);
    certPath = path.resolve(argv.sslCert);
  } else {
    // Resolve from config
    const certType   = sslConfig.certificateType || 'backbone';
    const certConfig = sslConfig.certificates?.[certType];
    if (!certConfig) {
      console.warn(`⚠ No certificate config for type "${certType}"`);
      return null;
    }
    keyPath  = path.resolve(__dirname, certConfig.keyPath);
    certPath = path.resolve(__dirname, certConfig.certPath);
  }

  console.log(`✓ Loading SSL certificates`);
  console.log(`  Key : ${keyPath}`);
  console.log(`  Cert: ${certPath}`);

  try {
    const opts = {
      key:  fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    console.log('✓ SSL certificates loaded');
    return opts;
  } catch (err) {
    console.warn(`⚠ Could not load SSL certificates: ${err.message}`);
    console.warn('  Server will start in HTTP-only mode.');
    return null;
  }
}

// ─── Create & configure Express app ─────────────────────────────────────────
async function createApp() {
  // 1) Bootstrap backend configuration (Vault, proxy configs, etc.)
  try {
    await appConfig.bootstrapConfiguration();
    appConfig.createMercuryProxyConfig();
    console.log('✓ Backend configuration initialized');
  } catch (err) {
    console.warn('⚠ Backend configuration failed:', err.message || err);
  }

  const logger = appConfig.getLoggerApp();
  const app    = express();

  app.disable('x-powered-by');

  // Trust proxy
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  } else {
    app.set('trust proxy', false);
  }

  logger.info(`[SERVER] ENVM       : ${process.env.ENVM}`);
  logger.info(`[SERVER] NODE_ENV   : ${process.env.NODE_ENV}`);
  logger.info(`[SERVER] DEBUG_MODE : ${process.env.DEBUG_MODE}`);

  // ── Middleware ──────────────────────────────────────────────────────────
  app.use(RateLimit({ windowMs: 15 * 60 * 1000, max: 10000 }));
  app.use(httpContext.middleware);
  app.use(compression());
  app.use(cors());

  // Security headers when running HTTPS
  const sslOptions = getSSLConfiguration();
  if (sslOptions) {
    app.use((_req, res, next) => {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  // JSON body parser (skip multipart)
  app.use(express.json({
    limit: '5mb',
    type: (req) =>
      req.is(constants.CONTENT_TYPE_APPLICATION_JSON) &&
      !req.url.toString().startsWith(constants.INNER_D_IMAGE_PATH),
  }));
  app.use((req, _res, next) => {
    if (req.is(constants.CONTENT_TYPE_MULTIPART_FORM_DATA)) return next();
    next();
  });

  // ── Health routes ──────────────────────────────────────────────────────
  console.log('❤️  Registering health monitoring routes…');
  let redisClient;
  try {
    redisClient = require('./server/shared/redis-client');
  } catch (err) {
    console.warn('⚠ Redis client could not be loaded:', err.message);
  }

  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    });
  });

  if (redisClient) {
    app.get('/health/redis', async (_req, res) => {
      try {
        const h = redisClient.getRedisHealth();
        res.status(h.available ? 200 : 503).json({ status: h.available ? 'healthy' : 'unhealthy', redis: h, timestamp: new Date().toISOString() });
      } catch (e) {
        res.status(503).json({ status: 'error', redis: { available: false, error: e.message }, timestamp: new Date().toISOString() });
      }
    });

    app.post('/health/redis/reconnect', async (_req, res) => {
      try {
        const ok = await redisClient.reconnectRedis();
        res.status(ok ? 200 : 503).json({ status: ok ? 'reconnected' : 'failed', redis: redisClient.getRedisHealth(), timestamp: new Date().toISOString() });
      } catch (e) {
        res.status(503).json({ status: 'error', error: e.message, timestamp: new Date().toISOString() });
      }
    });
  }

  console.log('  🟢 GET  /health');
  console.log('  🔴 GET  /health/redis');
  console.log('  🔄 POST /health/redis/reconnect');

  // ── Backend API routes ─────────────────────────────────────────────────
  console.log('🔧 Registering backend API routes…');
  try {
    app.use('/', require('./server/routes/mercury-std.routes'));
    app.use('/', require('./server/routes/mercury-auth.routes'));
    app.use('/', require('./server/routes/multimedia.routes'));
    app.use('/', require('./server/routes/backbone.routes'));

    console.log('✓ Backend API routes registered:');
    console.log('  1️⃣  Mercury Std  : /mrc/api/v1/general/*');
    console.log('  2️⃣  Mercury Auth : /mrc/api/v1/auth/*');
    console.log('  3️⃣  Multimedia   : /mrc/api/v1/d-image/*');
    console.log('  4️⃣  Backbone     : /bkd/api/v1/*');
  } catch (err) {
    console.error('❌ Backend routes registration failed:', err.message || err);
    console.error('🚨 Server will continue but API endpoints will not be available');
  }

  // ── Static files (after API routes) ────────────────────────────────────
  console.log('📁 Serving static files from:', BROWSER_DIST);
  app.use(express.static(BROWSER_DIST, { maxAge: '1y', index: false }));

  // ── Angular CSR fallback (last) ────────────────────────────────────────
  const indexHtml = resolveIndexHtml();
  console.log('🅰️  Angular fallback:', indexHtml);

  const angularFallback = (_req, res) => {
    res.sendFile(indexHtml, (err) => {
      if (err) res.status(500).send('Server error');
    });
  };

  app.get('/',                          angularFallback);
  app.get('/dashboard',                 angularFallback);
  app.get('/dashboard/:page',           angularFallback);
  app.get('/dashboard/:page/:subpage',  angularFallback);

  // Catch-all: non-API GET → Angular, everything else → 404
  app.use((req, res, _next) => {
    if (req.method === 'GET' &&
        !req.originalUrl.startsWith('/api/') &&
        !req.originalUrl.startsWith('/mrc/') &&
        !req.originalUrl.startsWith('/bkd/') &&
        !req.originalUrl.startsWith('/health')) {
      return angularFallback(req, res);
    }
    res.status(404).send('Not Found');
  });

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('');
  console.log('🔄 Route registration order:');
  console.log('  1️⃣  Health monitoring  /health/*');
  console.log('  2️⃣  Backend APIs       /mrc/*, /bkd/*');
  console.log('  3️⃣  Static files       dist/dashboard/browser');
  console.log('  4️⃣  Angular fallback   (catch-all → index.csr.html)');
  console.log('');

  return { app, sslOptions, logger };
}

// ─── Graceful shutdown ──────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} — shutting down…`);
  try {
    const rc = require('./server/shared/redis-client');
    await rc.closeRedisClient();
    console.log('✓ Redis closed');
  } catch (_) { /* noop */ }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('uncaughtException',  (err) => { console.error('❌ Uncaught:', err); gracefulShutdown('UNCAUGHT_EXCEPTION'); });
process.on('unhandledRejection', (reason) => { console.error('❌ Unhandled Rejection:', reason); gracefulShutdown('UNHANDLED_REJECTION'); });

// ─── Start ──────────────────────────────────────────────────────────────────
const HTTP_PORT  = process.env.PORT       || 4000;
const HTTPS_PORT = process.env.HTTPS_PORT || 4001;

createApp()
  .then(({ app, sslOptions }) => {
    if (sslOptions) {
      // HTTPS + HTTP redirect
      const httpRedirect = express();
      httpRedirect.use((req, res) => res.redirect(301, `https://${req.headers.host}${req.url}`));
      http.createServer(httpRedirect).listen(HTTP_PORT, () => {
        console.log(`✓ HTTP  redirect on http://localhost:${HTTP_PORT}`);
      });

      https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
        console.log(`✓ HTTPS server   on https://localhost:${HTTPS_PORT}`);
        console.log(`✓ Dashboard      → https://localhost:${HTTPS_PORT}/dashboard`);
        console.log('✓ Backend APIs available on HTTPS');
      });
    } else {
      // HTTP only
      http.createServer(app).listen(HTTP_PORT, () => {
        console.log(`✓ HTTP server on http://localhost:${HTTP_PORT}`);
        console.log(`✓ Dashboard  → http://localhost:${HTTP_PORT}/dashboard`);
        console.log('⚠ Running without SSL — add certificates to /ssl for HTTPS');
      });
    }
  })
  .catch((err) => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
  });
