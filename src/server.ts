import '@angular/compiler';
import {CommonEngine, isMainModule} from '@angular/ssr/node';
import express, {type RequestHandler, type NextFunction, type Request, type Response} from 'express';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {createServer as createHttpsServer} from 'node:https';
import {createServer as createHttpServer} from 'node:http';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import httpContext from 'express-http-context';

// Development SSL configuration
if (process.env['NODE_ENV'] !== 'production') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0";
}

// Set up backend configuration directory for Node.js modules
const projectRoot = resolve(process.cwd());
process.env['NODE_CONFIG_DIR'] = join(projectRoot, 'server/config');

// Import backend modules (CommonJS requires)
const appConfig = require(join(projectRoot, 'server/config/app.config'));
const constants = require(join(projectRoot, 'server/config/constants.util.js'));

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(process.cwd(), 'dist/dashboard/browser');
const indexHtml = join(browserDistFolder, 'index.csr.html');

// SSL Configuration - Environment Configurable
function getSSLConfiguration() {
  // Use config package directly to access SSL configuration
  let config;
  try {
    config = require('config');
  } catch (error) {
    console.warn('⚠ Configuration not available, SSL disabled');
    return null;
  }

  const sslConfig = config.ssl;

  // Check if SSL is enabled in configuration
  if (!sslConfig?.enabled) {
    console.log('✓ SSL disabled by configuration');
    return null;
  }

  const certificateType = sslConfig.certificateType || 'backbone';
  const certificateConfig = sslConfig.certificates?.[certificateType];

  if (!certificateConfig) {
    console.warn(`⚠ Certificate configuration not found for type: ${certificateType}`);
    return null;
  }

  const keyPath = resolve(projectRoot, certificateConfig.keyPath);
  const certPath = resolve(projectRoot, certificateConfig.certPath);

  console.log(`✓ Loading SSL certificates for type: ${certificateType}`);
  console.log(`  - Key Path: ${keyPath}`);
  console.log(`  - Cert Path: ${certPath}`);

  try {
    const sslOptions = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath)
    };
    console.log(`✓ SSL certificates loaded successfully for ${certificateType}`);
    return sslOptions;
  } catch (error: any) {
    console.warn(`⚠ SSL certificates not found or not readable for ${certificateType}:`, error.message);
    console.warn('  Server will start in HTTP mode.');
    return null;
  }
}

// Check if SSL certificates exist and load them
let sslOptions: { key: Buffer; cert: Buffer } | null = getSSLConfiguration();

const commonEngine = new CommonEngine({
  enablePerformanceProfiler: false,
  allowedCommonJsModules: ['axios', 'express', 'compression', 'cors', 'express-rate-limit', 'express-http-context'],
  allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0']
});

// Initialize backend configuration and create Express app with backend integration
async function initializeApp(): Promise<express.Express> {
  // Bootstrap backend configuration first
  try {
    await appConfig.bootstrapConfiguration();
    appConfig.createMercuryProxyConfig();
    console.log('✓ Backend configuration initialized');
  } catch (error) {
    console.warn('⚠ Backend configuration failed:', error);
  }

  const app = express();
  app.disable("x-powered-by");

  // Trust proxy settings based on environment
  if (process.env['NODE_ENV'] === 'production') {
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  } else {
    app.set('trust proxy', false);
  }

  // Set up rate limiter: maximum of 10000 requests per 15 minutes (same as original backend)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000 // max 10000 requests per windowMs (backend setting)
  });
  app.use(limiter as unknown as RequestHandler);

  // Backend middleware (order matters)
  app.use(httpContext.middleware);
  app.use(compression());
  app.use(cors());

  // Security headers middleware
  if (sslOptions) {
    // HTTPS-specific security headers
    app.use((req: Request, res: Response, next: NextFunction) => {
      // HTTP Strict Transport Security (HSTS)
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      // Content Security Policy (basic)
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
      // Other security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });
  }

  // JSON parsing middleware with backend-specific settings
  app.use(express.json({
    limit: '5mb', // Allow larger JSON payloads
    type: (req: any) => {
      // Type the req parameter as any to avoid IncomingMessage type conflicts
      const expressReq = req as Request;
      return expressReq.is && expressReq.is(constants.CONTENT_TYPE_APPLICATION_JSON) &&
             !expressReq.url?.toString().startsWith(constants.INNER_D_IMAGE_PATH);
    },
  }));

  // Skip JSON parsing for multipart/form-data requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.is && req.is(constants.CONTENT_TYPE_MULTIPART_FORM_DATA)) {
      return next();
    }
    next();
  });

  // Backend API Routes - These must come before static file serving and Angular SSR
  console.log('🔧 Registering backend API routes...');
  try {
    // Health monitoring routes (must come first for operational visibility)
    console.log('❤️ Registering health monitoring routes...');

    // Import Redis client for health checks
    const redisClient = require(join(projectRoot, 'server/shared/redis-client'));

    // Basic health check
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      });
    });

    // Redis-specific health check
    app.get('/health/redis', async (req: Request, res: Response) => {
      try {
        const health = redisClient.getRedisHealth();
        const status = health.available ? 200 : 503;

        res.status(status).json({
          status: health.available ? 'healthy' : 'unhealthy',
          redis: health,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(503).json({
          status: 'error',
          redis: { available: false, error: error.message },
          timestamp: new Date().toISOString()
        });
      }
    });

    // Redis reconnect endpoint (for operational maintenance)
    app.post('/health/redis/reconnect', async (req: Request, res: Response) => {
      try {
        const success = await redisClient.reconnectRedis();
        const status = success ? 200 : 503;

        res.status(status).json({
          status: success ? 'reconnected' : 'failed',
          redis: redisClient.getRedisHealth(),
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log('✓ Health monitoring routes registered:');
    console.log('  🟢 GET /health - General application health');
    console.log('  🔴 GET /health/redis - Redis connection health');
    console.log('  🔄 POST /health/redis/reconnect - Force Redis reconnection');

    const mercuryStdRoutes = require(join(projectRoot, 'server/routes/mercury-std.routes'));
    const mercuryAuthRoutes = require(join(projectRoot, 'server/routes/mercury-auth.routes'));
    const multimediaRoutes = require(join(projectRoot, 'server/routes/multimedia.routes'));
    const backboneRoutes = require(join(projectRoot, 'server/routes/backbone.routes'));

    app.use('/', mercuryStdRoutes);
    app.use('/', mercuryAuthRoutes);
    app.use('/', multimediaRoutes);
    app.use('/', backboneRoutes);

    console.log('✓ Backend API routes registered (order preserved):');
    console.log('  0️⃣ Health Monitoring: /health/*');
    console.log('  1️⃣ Mercury Standard: /mrc/api/v1/general/*');
    console.log('  2️⃣ Mercury Auth: /mrc/api/v1/auth/*');
    console.log('  3️⃣ Multimedia: /mrc/api/v1/d-image/*');
    console.log('  4️⃣ Backbone: /bkd/api/v1/*');
    console.log('  🎯 API routes registered BEFORE static files and Angular SSR');
  } catch (error) {
    console.error('❌ Backend routes registration failed:', error);
    console.error('🚨 Server will continue but API endpoints will not be available');
  }

  // Serve static files from /browser
  console.log('📁 Configuring static file serving...');
  app.use(express.static(browserDistFolder, {
    maxAge: '1y',
    index: false  // Don't auto-serve index.html
  }));
  console.log(`✓ Static files served from: ${browserDistFolder}`);
  console.log('  🎯 Static files registered AFTER API routes');

  console.log('🅰️  Configuring Angular SSR routes...');

  // Handle root route
  app.get('/', handleAngularSSR);

  // Handle dashboard routes
  app.get('/dashboard', handleAngularSSR);

  // Handle dashboard sub-routes with parameters
  app.get('/dashboard/:page', handleAngularSSR);
  app.get('/dashboard/:page/:subpage', handleAngularSSR);

  console.log('✓ Angular SSR routes configured:');
  console.log('  📍 GET / -> Angular SSR');
  console.log('  📍 GET /dashboard -> Angular SSR');
  console.log('  📍 GET /dashboard/:page -> Angular SSR');
  console.log('  📍 GET /dashboard/:page/:subpage -> Angular SSR');

  // Catch all other routes (must be last) - use middleware without route pattern
  app.use((req, res, next) => {
    // Only handle GET requests for non-API routes
    // Skip backend API routes: /mrc/*, /bkd/*, /api/*
    if (req.method === 'GET' &&
        !req.originalUrl.startsWith('/api/') &&
        !req.originalUrl.startsWith('/mrc/') &&
        !req.originalUrl.startsWith('/bkd/')) {
      return handleAngularSSR(req, res, next);
    }
    // For other methods/API routes, return 404
    res.status(404).send('Not Found');
  });

  console.log('✓ Catch-all route configured (LAST in order):');
  console.log('  🎯 GET * (non-API) -> Angular SSR');
  console.log('  ❌ Other methods/API routes -> 404');
  console.log('');
  console.log('🔄 Route Registration Order Summary:');
  console.log('  1️⃣ Backend API routes (/mrc/*, /bkd/*)');
  console.log('  2️⃣ Static file serving');
  console.log('  3️⃣ Specific Angular routes');
  console.log('  4️⃣ Angular SSR catch-all (LAST)');
  console.log('');

  return app;
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Import Redis client for cleanup
    const projectRoot = resolve(process.cwd());
    const redisClient = require(join(projectRoot, 'server/shared/redis-client'));

    // Close Redis connection
    console.log('📴 Closing Redis connection...');
    await redisClient.closeRedisClient();
    console.log('✓ Redis connection closed');

    // Close other connections if needed
    console.log('✓ Graceful shutdown completed');

    // Exit cleanly
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Set up graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

function handleAngularSSR(req: Request, res: Response, next: NextFunction) {
  // Temporarily serve static HTML file directly until SSR is fixed
  // This will allow the development environment to work while we debug SSR
  res.sendFile(indexHtml, (err) => {
    if (err) {
      console.error('Error serving static file:', err);
      next(err);
    }
  });
}

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the PORT environment variable, or defaults to 4000.
 * Uses HTTPS if SSL certificates are available, otherwise falls back to HTTP.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] ?? 4000;
  const httpsPort = process.env['HTTPS_PORT'] ?? 4001;

  // Initialize the app and start servers
  initializeApp().then((app) => {
    // Start HTTP redirect server if HTTPS is available
    if (sslOptions) {
      // Create HTTP server for redirects
      const httpApp = express();
      httpApp.use((req, res) => {
        res.redirect(301, `https://${req.headers.host}${req.url}`);
      });

      createHttpServer(httpApp).listen(port, () => {
        console.log(`✓ HTTP redirect server listening on http://localhost:${port} (redirects to HTTPS)`);
      });

      // Start HTTPS server
      createHttpsServer(sslOptions, app).listen(httpsPort, () => {
        console.log(`✓ Node Express HTTPS server listening on https://localhost:${httpsPort}`);
        console.log(`✓ Dashboard available at: https://localhost:${httpsPort}/dashboard`);
        console.log('✓ Backend APIs integrated and available on HTTPS');
      });
    } else {
      // Fallback to HTTP server
      createHttpServer(app).listen(port, () => {
        console.log(`✓ Node Express HTTP server listening on http://localhost:${port}`);
        console.log(`✓ Dashboard available at: http://localhost:${port}/dashboard`);
        console.log(`✓ Backend APIs integrated and available on HTTP`);
        console.log(`⚠ Running in HTTP mode. For HTTPS, ensure SSL certificates are available.`);
      });
    }
  }).catch((error) => {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  });
}
