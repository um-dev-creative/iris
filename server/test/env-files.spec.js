'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..', '..');
const CREDENTIALS = ['VAULT_TOKEN', 'BACKBONE_CLIENT_ID', 'BACKBONE_CLIENT_SECRET', 'MERCURY_LOGIN_ALIAS', 'MERCURY_LOGIN_PASSWORD'];

const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const entries = (file) =>
  Object.fromEntries(
    read(file)
      .split('\n')
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  );
const isIgnored = (file) => {
  try {
    execFileSync('git', ['check-ignore', '--no-index', '-q', file], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
};

test('config/local.env never holds a credential', () => {
  const names = Object.keys(entries('config/local.env'));

  assert.deepEqual(names.filter((name) => CREDENTIALS.includes(name)), []);
});

test('secrets/local.env.example names every credential and carries no value', () => {
  const template = entries('secrets/local.env.example');

  assert.deepEqual(Object.keys(template).sort(), [...CREDENTIALS].sort());
  assert.deepEqual(Object.values(template).filter(Boolean), []);
});

test('the container loads config first and secrets last', () => {
  const compose = read('docker-compose.yml');

  assert.ok(compose.indexOf('- config/local.env') > -1);
  assert.ok(compose.indexOf('- config/local.env') < compose.indexOf('- secrets/local.env'));
});

test('pnpm start:bff is the one script that starts the BFF, config first and secrets last', () => {
  const { scripts } = JSON.parse(read('package.json'));
  const script = scripts['start:bff'];

  assert.ok(script.indexOf('config/local.env') > -1);
  assert.ok(script.indexOf('config/local.env') < script.indexOf('secrets/local.env'));
  assert.deepEqual(Object.keys(scripts).filter((name) => scripts[name].includes('server.js') && name !== 'start:bff'), []);
  assert.match(scripts.dev, /start:bff/);
  assert.match(scripts['serve:integrated'], /start:bff/);
});

test('git tracks the templates and ignores what holds secrets', () => {
  ['.env', 'secrets/local.env', 'default.env', '.env.docker', '.env.secrets'].forEach((file) => assert.ok(isIgnored(file), `${file} must be ignored`));
  ['.env.example', 'config/local.env', 'secrets/local.env.example'].forEach((file) => assert.ok(!isIgnored(file), `${file} must be tracked`));
});
