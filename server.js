'use strict';

const http = require('node:http');
const https = require('node:https');
const { readFileSync } = require('node:fs');

const { loadEnvironment } = require('./server/config/load-environment');

const EX_CONFIG = 78; // do not start half-configured

/** Starts the BFF. Everything that reads the configuration is required here: constants.js reads process.env when loaded. */
function start(vaultVariables) {
  const logger = require('./server/config/logger');
  const constants = require('./server/config/constants');
  const { settingsProblems } = require('./server/config/settings-check');

  const { PORT, NODE_ENV, SSL_CERT_PATH, SSL_KEY_PATH, MERCURY_BASE_URL, BACKBONE_BASE_URL } = constants;

  const problems = settingsProblems(constants);
  if (problems.length > 0) {
    // console, not the logger: its transport is asynchronous and the process ends right here
    problems.forEach((problem) => console.error(`Configuration: ${problem}`));
    process.exit(EX_CONFIG);
  }

  const { createApp } = require('./server/app');

  const { app } = createApp();

  const server =
    SSL_CERT_PATH && SSL_KEY_PATH
      ? https.createServer({ key: readFileSync(SSL_KEY_PATH), cert: readFileSync(SSL_CERT_PATH) }, app)
      : http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`iris BFF on ${SSL_CERT_PATH ? 'https' : 'http'}://localhost:${PORT} → mercury ${MERCURY_BASE_URL}, backbone ${BACKBONE_BASE_URL} [${NODE_ENV}]`);
  });

  if (vaultVariables.length > 0) logger.info(`${vaultVariables.length} settings read from Vault`);
}

loadEnvironment().then(start, (error) => {
  console.error(`Configuration: ${error.message}`);
  process.exit(EX_CONFIG);
});
