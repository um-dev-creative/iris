'use strict';

const assert = require('node:assert/strict');
const path = require.resolve('../config/constants');

const ENV_KEYS = ['TRUST_PROXY', 'TRACE_SAMPLE_RATE', 'TRACING_ENABLED', 'BACKBONE_CLIENT_SCOPES', 'PORT', 'COOKIE_SECURE', 'LOG_LEVEL', 'NODE_ENV'];
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

// constants.js lee process.env al cargarse: cada caso lo vuelve a cargar con su propio entorno
function load(env = {}) {
  ENV_KEYS.forEach((k) => delete process.env[k]);
  Object.assign(process.env, env);
  delete require.cache[path];
  return require(path);
}

afterAll(() => {
  ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  delete require.cache[path];
});

describe('config/constants', () => {
  it('valores por defecto para desarrollo local', () => {
    const c = load();

    assert.equal(c.PORT, 4000);
    assert.equal(c.NODE_ENV, 'development');
    assert.equal(c.TRUST_PROXY, false);
    assert.equal(c.COOKIE_SECURE, false);
    assert.equal(c.TRACING_ENABLED, true);
    assert.equal(c.TRACE_SAMPLE_RATE, 0.1);
    assert.deepEqual(c.BACKBONE_CLIENT_SCOPES, ['session:manage']);
  });

  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['FALSE', false],
    ['1', 1],
    ['2', 2],
    ['true', true],
    ['loopback, 172.16.0.0/12', 'loopback, 172.16.0.0/12'],
  ])('TRUST_PROXY=%j → %j', (value, expected) => {
    assert.equal(load(value === undefined ? {} : { TRUST_PROXY: value }).TRUST_PROXY, expected);
  });

  it('TRACE_SAMPLE_RATE se acota a [0, 1] y tolera basura', () => {
    assert.equal(load({ TRACE_SAMPLE_RATE: '5' }).TRACE_SAMPLE_RATE, 1);
    assert.equal(load({ TRACE_SAMPLE_RATE: '-2' }).TRACE_SAMPLE_RATE, 0);
    assert.equal(load({ TRACE_SAMPLE_RATE: 'abc' }).TRACE_SAMPLE_RATE, 0);
    assert.equal(load({ TRACE_SAMPLE_RATE: '0.5' }).TRACE_SAMPLE_RATE, 0.5);
  });

  it('TRACING_ENABLED=false lo desactiva; cualquier otro valor lo deja activo', () => {
    assert.equal(load({ TRACING_ENABLED: 'false' }).TRACING_ENABLED, false);
    assert.equal(load({ TRACING_ENABLED: 'FALSE' }).TRACING_ENABLED, false);
    assert.equal(load({ TRACING_ENABLED: 'yes' }).TRACING_ENABLED, true);
  });

  it('los scopes se separan por comas y se limpian', () => {
    assert.deepEqual(load({ BACKBONE_CLIENT_SCOPES: ' a , b ,, c ' }).BACKBONE_CLIENT_SCOPES, ['a', 'b', 'c']);
  });

  it('PORT y COOKIE_SECURE se leen del entorno', () => {
    const c = load({ PORT: '7005', COOKIE_SECURE: 'true' });

    assert.equal(c.PORT, 7005);
    assert.equal(c.COOKIE_SECURE, true);
  });
});
