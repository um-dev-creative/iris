'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadEnvironment } = require('../config/load-environment');

let root;

const write = (file, text) => {
  mkdirSync(join(root, file, '..'), { recursive: true });
  writeFileSync(join(root, file), text);
};
const refuseVault = async () => assert.fail('Vault must not be read');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'iris-env-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test('starts without any file, as inside the image', async () => {
  const env = { PORT: '3000' };

  assert.deepEqual(await loadEnvironment({ root, env, read: refuseVault }), []);
  assert.deepEqual(env, { PORT: '3000' });
});

test('precedence: process, secrets/local.env, config/local.env; an empty value counts as not set', async () => {
  write('config/local.env', 'A=config\nB=config\nC=config\nD=config\n');
  write('secrets/local.env', 'B=secret\nC=secret\nD=\n');
  const env = { C: 'process', A: '' };

  await loadEnvironment({ root, env, read: refuseVault });

  assert.deepEqual(env, { A: 'config', B: 'secret', C: 'process', D: 'config' });
});

test('with Vault off the variables come only from local.env and the token is dropped', async () => {
  write('secrets/local.env', 'VAULT_TOKEN=tok\nBACKBONE_CLIENT_SECRET=local\n');
  const env = { VAULT_ENABLED: 'false' };

  await loadEnvironment({ root, env, read: refuseVault });

  assert.deepEqual(env, { VAULT_ENABLED: 'false', BACKBONE_CLIENT_SECRET: 'local' });
});

test('Vault fills what local.env leaves empty and never replaces a written value', async () => {
  write('config/local.env', 'VAULT_ENABLED=true\nVAULT_URI=https://v\nVAULT_PATH=dev/data/iris/qa\nBACKBONE_APPLICATION_ID=\n');
  write('secrets/local.env', 'VAULT_TOKEN=tok\nBACKBONE_CLIENT_ID=local\n');
  const env = {};
  let call;
  const read = async (...args) => {
    call = args;
    return { BACKBONE_APPLICATION_ID: 'vault', BACKBONE_CLIENT_ID: 'vault', RATE_LIMIT_MAX: 5, EMPTY: '', NOTHING: null };
  };

  const names = await loadEnvironment({ root, env, read });

  assert.deepEqual(call, ['https://v', 'tok', 'dev/data/iris/qa']);
  assert.deepEqual(names, ['BACKBONE_APPLICATION_ID', 'RATE_LIMIT_MAX']);
  assert.equal(env.BACKBONE_APPLICATION_ID, 'vault');
  assert.equal(env.BACKBONE_CLIENT_ID, 'local');
  assert.equal(env.RATE_LIMIT_MAX, '5');
  assert.equal('VAULT_TOKEN' in env, false);
});

test('Vault enabled without its settings names what is missing', async () => {
  await assert.rejects(loadEnvironment({ root, env: { VAULT_ENABLED: 'TRUE', VAULT_URI: 'https://v' }, read: refuseVault }), /needs VAULT_PATH, VAULT_TOKEN/);
});

test('a Vault failure stops the start', async () => {
  const env = { VAULT_ENABLED: 'true', VAULT_URI: 'https://v', VAULT_PATH: 'p', VAULT_TOKEN: 't' };

  await assert.rejects(loadEnvironment({ root, env, read: async () => { throw new Error('Vault answered 403'); } }), /403/);
});
