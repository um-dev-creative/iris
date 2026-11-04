'use strict';

const assert = require('node:assert/strict');
const { readSecret } = require('../shared/vault-reader');

const answer = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });

test('reads a KV v2 secret, sending the token in X-Vault-Token', async () => {
  let call;
  const fetchImpl = async (url, init) => {
    call = { url, token: init.headers['X-Vault-Token'] };
    return answer(200, { data: { data: { A: 'b' } } })();
  };

  assert.deepEqual(await readSecret('https://vault.test/', 'tok', '/dev/data/iris/qa', { fetchImpl }), { A: 'b' });
  assert.deepEqual(call, { url: 'https://vault.test/v1/dev/data/iris/qa', token: 'tok' });
});

test('an error names the status and the path, never the token', async () => {
  await assert.rejects(readSecret('https://vault.test', 'very-secret', 'dev/data/x', { fetchImpl: answer(403, {}) }), (error) => {
    assert.match(error.message, /403.*dev\/data\/x/);
    assert.ok(!error.message.includes('very-secret'));
    return true;
  });
});

test('a response without key/value data is an error', async () => {
  await assert.rejects(readSecret('https://vault.test', 't', 'p', { fetchImpl: answer(200, { data: {} }) }), /no key\/value data/);
});

test('an unreachable Vault is reported with its cause', async () => {
  const fetchImpl = async () => {
    throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
  };

  await assert.rejects(readSecret('https://vault.test', 't', 'p', { fetchImpl }), /not reachable.*ECONNREFUSED/);
});
