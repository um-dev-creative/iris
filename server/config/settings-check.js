'use strict';

const { existsSync } = require('node:fs');

const REQUIRED_IN_PRODUCTION = ['BACKBONE_APPLICATION_ID', 'BACKBONE_CLIENT_ID', 'BACKBONE_CLIENT_SECRET'];
const REQUIRED_FOR_REGISTRATION = [
  'BACKBONE_APPLICATION_ID',
  'REGISTRATION_ROLE_ID',
  'REGISTRATION_TEMPLATE_ES',
  'REGISTRATION_MAIL_FROM',
  'BACKBONE_CLIENT_ID',
];
// Mercury's /mail and /verification-code change state: the application client must hold this scope to exchange its token
const MERCURY_WRITE_SCOPE = 'mercury:message:write';

/**
 * Names, never values, of the settings sign-up still needs. Sign-up is optional: they do not stop the BFF from starting.
 * The application client also has to ask for `mercury:message:write`, or Mercury refuses the code mail.
 */
const missingForRegistration = (settings) => {
  const missing = REQUIRED_FOR_REGISTRATION.filter((name) => !settings[name]);
  if (settings.BACKBONE_CLIENT_ID && !(settings.BACKBONE_CLIENT_SCOPES ?? []).includes(MERCURY_WRITE_SCOPE)) {
    missing.push(`BACKBONE_CLIENT_SCOPES (${MERCURY_WRITE_SCOPE})`);
  }
  return missing;
};

/**
 * What stops the BFF from starting. In production a missing application or client is a deployment error, not
 * something to discover at the first login. Outside production the client may be left out, but half a credential
 * is always a mistake.
 *
 * @param {Record<string, any>} settings the values of config/constants.js
 * @returns {string[]} one message per problem; empty when the BFF may start
 */
function settingsProblems(settings) {
  const problems = [];
  if (settings.NODE_ENV === 'production') {
    for (const name of REQUIRED_IN_PRODUCTION) {
      if (!settings[name]) problems.push(`${name} is required in production`);
    }
  }
  if (Boolean(settings.BACKBONE_CLIENT_ID) !== Boolean(settings.BACKBONE_CLIENT_SECRET)) {
    problems.push('BACKBONE_CLIENT_ID and BACKBONE_CLIENT_SECRET must be set together');
  }
  if (settings.BACKBONE_CLIENT_ID && settings.BACKBONE_CLIENT_SCOPES.length === 0) {
    problems.push('BACKBONE_CLIENT_SCOPES must name at least one scope');
  }
  if (settings.NODE_ENV === 'production' && !settings.COOKIE_SECURE) {
    problems.push('COOKIE_SECURE must be true in production: Iris runs on HTTPS');
  }
  if (settings.NODE_ENV === 'production' && settings.BACKBONE_TLS_INSECURE) {
    problems.push('BACKBONE_TLS_INSECURE must not be set in production');
  }
  if (settings.FEDERATION_ENABLED) {
    if (!settings.FEDERATION_CALLBACK_URL) {
      problems.push('FEDERATION_CALLBACK_URL is required when FEDERATION_ENABLED=true');
    } else if (!/^https:\/\/|^http:\/\/(localhost|127\.)/.test(settings.FEDERATION_CALLBACK_URL)) {
      problems.push('FEDERATION_CALLBACK_URL must be an https URL (http only for localhost)');
    }
    if (!settings.BACKBONE_CLIENT_ID) problems.push('FEDERATION_ENABLED=true needs the application client (BACKBONE_CLIENT_ID)');
    if (!settings.BACKBONE_APPLICATION_ID) problems.push('FEDERATION_ENABLED=true needs BACKBONE_APPLICATION_ID');
  }
  if (settings.UPSTREAM_CA_FILE && !existsSync(settings.UPSTREAM_CA_FILE)) {
    problems.push('UPSTREAM_CA_FILE does not point to a file: use the path of umdc-local-ca.crt');
  }
  if (settings.TRUST_PROXY === true) {
    problems.push('TRUST_PROXY=true trusts any X-Forwarded-For; set the number of proxies in front (1 behind nginx) or their addresses');
  }
  if (Boolean(settings.SSL_CERT_PATH) !== Boolean(settings.SSL_KEY_PATH)) {
    problems.push('SSL_CERT_PATH and SSL_KEY_PATH must be set together');
  }
  return problems;
}

module.exports = { settingsProblems, missingForRegistration };
