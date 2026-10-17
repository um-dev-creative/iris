'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { settingsProblems } = require('../config/settings-check');

const complete = {
  NODE_ENV: 'production', BACKBONE_APPLICATION_ID: 'app', BACKBONE_CLIENT_ID: 'id', BACKBONE_CLIENT_SECRET: 'secret',
  BACKBONE_CLIENT_SCOPES: ['session:manage'], BACKBONE_TLS_INSECURE: false, TRUST_PROXY: false, SSL_CERT_PATH: '', SSL_KEY_PATH: '',
};

test('a complete production configuration starts', () => {
  assert.deepEqual(settingsProblems(complete), []);
});

test('production needs the application and its client', () => {
  const problems = settingsProblems({ ...complete, BACKBONE_APPLICATION_ID: '', BACKBONE_CLIENT_ID: '', BACKBONE_CLIENT_SECRET: '' });

  assert.deepEqual(problems, [
    'BACKBONE_APPLICATION_ID is required in production',
    'BACKBONE_CLIENT_ID is required in production',
    'BACKBONE_CLIENT_SECRET is required in production',
  ]);
});

test('development may run without a client, but never with half of one', () => {
  const dev = { ...complete, NODE_ENV: 'development', BACKBONE_CLIENT_ID: '', BACKBONE_CLIENT_SECRET: '' };

  assert.deepEqual(settingsProblems(dev), []);
  assert.deepEqual(settingsProblems({ ...dev, BACKBONE_CLIENT_ID: 'id' }), ['BACKBONE_CLIENT_ID and BACKBONE_CLIENT_SECRET must be set together']);
});

test('a client needs at least one scope', () => {
  assert.deepEqual(settingsProblems({ ...complete, BACKBONE_CLIENT_SCOPES: [] }), ['BACKBONE_CLIENT_SCOPES must name at least one scope']);
});

test('production never skips TLS verification', () => {
  assert.deepEqual(settingsProblems({ ...complete, BACKBONE_TLS_INSECURE: true }), ['BACKBONE_TLS_INSECURE must not be set in production']);
});

test('TRUST_PROXY=true is refused', () => {
  assert.equal(settingsProblems({ ...complete, TRUST_PROXY: true }).length, 1);
  assert.deepEqual(settingsProblems({ ...complete, TRUST_PROXY: 1 }), []);
});

test('the TLS certificate and its key come together', () => {
  assert.deepEqual(settingsProblems({ ...complete, SSL_CERT_PATH: '/c.crt' }), ['SSL_CERT_PATH and SSL_KEY_PATH must be set together']);
  assert.deepEqual(settingsProblems({ ...complete, SSL_CERT_PATH: '/c.crt', SSL_KEY_PATH: '/c.key' }), []);
});
