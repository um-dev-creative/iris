'use strict';

const bool = (v) => String(v).toLowerCase() === 'true';

/**
 * Express 'trust proxy': how many proxies sit in front of the BFF (`1` behind nginx) or which addresses
 * ("loopback, 172.16.0.0/12"). Off when empty, so a client cannot fake its IP with X-Forwarded-For.
 * `true` (trust every hop) is refused by settings-check.
 */
const trustProxy = (v) => {
  const value = String(v ?? '').trim();
  if (value === '' || value.toLowerCase() === 'false') return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  return value.toLowerCase() === 'true' ? true : value;
};

module.exports = {
  // Upstream gateways. The prefixes are the service roots behind them (`/mercury/api/v1`, `/backbone/api/v1`).
  MERCURY_BASE_URL: process.env['MERCURY_BASE_URL'] || 'http://localhost:8080',
  MERCURY_API_PREFIX: process.env['MERCURY_API_PREFIX'] || '/mercury/api/v1',
  BACKBONE_BASE_URL: process.env['BACKBONE_BASE_URL'] || 'http://localhost:8443',
  BACKBONE_API_PREFIX: process.env['BACKBONE_API_PREFIX'] || '/backbone/api/v1',
  BACKBONE_APPLICATION_ID: process.env['BACKBONE_APPLICATION_ID'] || '',
  // The application client of Iris in backbone (managed client, M2M). The secret comes from the environment / secret
  // store, never from a file in git.
  BACKBONE_CLIENT_ID: process.env['BACKBONE_CLIENT_ID'] || '',
  BACKBONE_CLIENT_SECRET: process.env['BACKBONE_CLIENT_SECRET'] || '',
  BACKBONE_CLIENT_SCOPES: (process.env['BACKBONE_CLIENT_SCOPES'] || 'session:manage').split(',').map((s) => s.trim()).filter(Boolean),
  BACKBONE_TLS_INSECURE: bool(process.env['BACKBONE_TLS_INSECURE']),
  COOKIE_SECURE: bool(process.env['COOKIE_SECURE']),
  PORT: parseInt(process.env['PORT'] || '4000', 10),
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  CORS_ORIGIN: process.env['CORS_ORIGIN'] || 'http://localhost:4200',
  TRUST_PROXY: trustProxy(process.env['TRUST_PROXY']),
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env['RATE_LIMIT_MAX'] || '1200', 10),
  // stricter than the general limit: it guards the password check
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env['LOGIN_RATE_LIMIT_MAX'] || '10', 10),
  // Monitoring: the application whose campaigns the dashboard shows (Iris' own by default), and where to probe health
  MONITORED_APPLICATION_ID: process.env['MONITORED_APPLICATION_ID'] || process.env['BACKBONE_APPLICATION_ID'] || '',
  MONITORING_MAX_CAMPAIGNS: parseInt(process.env['MONITORING_MAX_CAMPAIGNS'] || '50', 10),
  MERCURY_HEALTH_PATH: process.env['MERCURY_HEALTH_PATH'] || '/mercury/actuator/health',
  BACKBONE_HEALTH_PATH: process.env['BACKBONE_HEALTH_PATH'] || '/backbone/actuator/health',
  REGISTRATION_RATE_LIMIT_MAX: parseInt(process.env['REGISTRATION_RATE_LIMIT_MAX'] || '5', 10),
  // Iris as a Mercury login client (M2M): sends the verification code and checks it
  MERCURY_LOGIN_ALIAS: process.env['MERCURY_LOGIN_ALIAS'] || '',
  MERCURY_LOGIN_PASSWORD: process.env['MERCURY_LOGIN_PASSWORD'] || '',
  // Sign-up: the role a new user gets in backbone, and the Mercury template that mails the code. Empty = sign-up is off.
  REGISTRATION_ROLE_ID: process.env['REGISTRATION_ROLE_ID'] || '',
  REGISTRATION_TEMPLATE_ES: process.env['REGISTRATION_TEMPLATE_ES'] || '',
  REGISTRATION_TEMPLATE_EN: process.env['REGISTRATION_TEMPLATE_EN'] || '',
  REGISTRATION_MAIL_FROM: process.env['REGISTRATION_MAIL_FROM'] || '',
  SSL_CERT_PATH: process.env['SSL_CERT_PATH'] || '',
  SSL_KEY_PATH: process.env['SSL_KEY_PATH'] || '',
  SESSION_COOKIE: 'iris_session',
  REFRESH_COOKIE: 'iris_refresh',
  CSRF_HEADER: 'x-iris-csrf',
  // W3C trace context towards mercury (off with TRACING_ENABLED=false); share of new traces marked as sampled
  TRACING_ENABLED: String(process.env['TRACING_ENABLED'] ?? 'true').toLowerCase() !== 'false',
  TRACE_SAMPLE_RATE: Math.min(1, Math.max(0, parseFloat(process.env['TRACE_SAMPLE_RATE'] || '0.1') || 0)),
};
