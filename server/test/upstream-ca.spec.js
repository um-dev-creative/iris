'use strict';

const assert = require('node:assert/strict');
const https = require('node:https');
const tls = require('node:tls');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const axios = require('axios');
const { buildUpstreamTls } = require('../shared/tls');
const { settingsProblems } = require('../config/settings-check');

let dir;
let server;
let url;
let caFile;

// A self-signed certificate for localhost plays the internal CA and the server certificate at once.
beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'iris-ca-'));
  caFile = join(dir, 'ca.crt');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '2', '-keyout', join(dir, 'k.key'), '-out', caFile, '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
  server = https.createServer({ key: readFileSync(join(dir, 'k.key')), cert: readFileSync(caFile) }, (_req, res) => res.end('ok'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `https://localhost:${server.address().port}/`;
});
afterAll(() => new Promise((resolve) => server.close(resolve)));

test('without the CA the upstream certificate is refused', async () => {
  await assert.rejects(axios.get(url, buildUpstreamTls()), /unable to verify|self.signed/i);
});

test('with UPSTREAM_CA_FILE the certificate it signed is accepted and validation stays on', async () => {
  assert.equal((await axios.get(url, buildUpstreamTls({ caFile }))).data, 'ok');
  const { ca } = buildUpstreamTls({ caFile }).httpsAgent.options;
  assert.equal(ca.length, tls.rootCertificates.length + 1);
});

test('another certificate is still refused with the CA configured', async () => {
  const other = join(dir, 'other.crt');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '2', '-keyout', join(dir, 'o.key'), '-out', other, '-subj', '/CN=other'], { stdio: 'ignore' });

  await assert.rejects(axios.get(url, buildUpstreamTls({ caFile: other })), /unable to verify|self.signed/i);
});

test('insecure still skips validation, and nothing set means no agent', async () => {
  assert.equal((await axios.get(url, buildUpstreamTls({ insecure: true }))).data, 'ok');
  assert.deepEqual(buildUpstreamTls(), {});
});

test('a missing CA file is reported at start, an existing one is not', () => {
  writeFileSync(join(dir, 'empty.crt'), '');
  const base = { NODE_ENV: 'development', BACKBONE_CLIENT_SCOPES: ['session:manage'], FEDERATION_RETURN_TO_ALLOWLIST: [] };

  assert.deepEqual(settingsProblems({ ...base, UPSTREAM_CA_FILE: join(dir, 'nope.crt') }), ['UPSTREAM_CA_FILE does not point to a file: use the path of umdc-local-ca.crt']);
  assert.deepEqual(settingsProblems({ ...base, UPSTREAM_CA_FILE: join(dir, 'empty.crt') }), []);
});
