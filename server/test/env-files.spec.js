'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..', '..');
const CREDENTIALS = ['BACKBONE_CLIENT_ID', 'BACKBONE_CLIENT_SECRET', 'MERCURY_LOGIN_ALIAS', 'MERCURY_LOGIN_PASSWORD'];

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

test('config/bff.env never holds a credential', () => {
  const names = Object.keys(entries('config/bff.env'));

  assert.deepEqual(names.filter((name) => CREDENTIALS.includes(name)), []);
});

test('secrets/bff.env.example names every credential and carries no value', () => {
  const template = entries('secrets/bff.env.example');

  assert.deepEqual(Object.keys(template).sort(), [...CREDENTIALS].sort());
  assert.deepEqual(Object.values(template).filter(Boolean), []);
});

test('every Docker setting is also documented in .env.example', () => {
  const local = Object.keys(entries('.env.example'));
  const docker = [...Object.keys(entries('config/bff.env')), ...Object.keys(entries('secrets/bff.env.example'))];

  // the health paths have a default that suits the local gateway, so only Docker sets them
  assert.deepEqual(docker.filter((name) => !local.includes(name) && !name.endsWith('_HEALTH_PATH')), []);
});

test('the container loads config first and secrets last', () => {
  const compose = read('docker-compose.yml');

  assert.ok(compose.indexOf('- config/bff.env') > -1);
  assert.ok(compose.indexOf('- config/bff.env') < compose.indexOf('- secrets/bff.env'));
});

test('git tracks the templates and ignores what holds secrets', () => {
  ['.env', 'secrets/bff.env', 'default.env', '.env.docker', '.env.secrets'].forEach((file) => assert.ok(isIgnored(file), `${file} must be ignored`));
  ['.env.example', 'config/bff.env', 'secrets/bff.env.example'].forEach((file) => assert.ok(!isIgnored(file), `${file} must be tracked`));
});
