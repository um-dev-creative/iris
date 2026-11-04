'use strict';

const https = require('node:https');
const { BACKBONE_TLS_INSECURE } = require('../config/constants');

/**
 * Axios options for every call to backbone or mercury. BACKBONE_TLS_INSECURE accepts the self-signed certificates of
 * the test environments; settings-check refuses it in production.
 */
const upstreamTls = BACKBONE_TLS_INSECURE ? { httpsAgent: new https.Agent({ rejectUnauthorized: false }) } : {};

module.exports = { upstreamTls };
