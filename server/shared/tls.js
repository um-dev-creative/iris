'use strict';

const https = require('node:https');
const tls = require('node:tls');
const { readFileSync } = require('node:fs');
const { BACKBONE_TLS_INSECURE, UPSTREAM_CA_FILE } = require('../config/constants');

/**
 * Axios options for every call to backbone or mercury.
 * - `insecure` (BACKBONE_TLS_INSECURE) accepts any certificate; settings-check refuses it in production.
 * - `caFile` (UPSTREAM_CA_FILE) trusts the internal CA on top of the public roots, which is what a local run against QA needs
 *   (the certificates of api.umdc-qa.tst are signed by it). Validation stays on.
 *
 * @param {{insecure?: boolean, caFile?: string}} [options]
 */
function buildUpstreamTls({ insecure = false, caFile = '' } = {}) {
  if (insecure) return { httpsAgent: new https.Agent({ rejectUnauthorized: false }) };
  if (caFile) return { httpsAgent: new https.Agent({ ca: [...tls.rootCertificates, readFileSync(caFile, 'utf8')] }) };
  return {};
}

const upstreamTls = buildUpstreamTls({ insecure: BACKBONE_TLS_INSECURE, caFile: UPSTREAM_CA_FILE });

module.exports = { upstreamTls, buildUpstreamTls };
