'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTraceparent, toTraceparent, traceMiddleware } = require('../shared/trace');

const VALID = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
const run = (middleware, headers = {}) => {
  const req = { trace: undefined, get: (name) => headers[name.toLowerCase()] };
  const res = { headers: {}, set(k, v) { this.headers[k] = v; } };
  let called = false;
  middleware(req, res, () => { called = true; });
  return { req, res, called };
};

test('a valid traceparent is parsed; malformed or all-zero ones are not', () => {
  assert.deepEqual(parseTraceparent(VALID), { traceId: '0af7651916cd43dd8448eb211c80319c', parentId: 'b7ad6b7169203331', flags: '01' });
  for (const bad of [undefined, '', 'garbage', '01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
    '00-00000000000000000000000000000000-b7ad6b7169203331-01', '00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01']) {
    assert.equal(parseTraceparent(bad), null, String(bad));
  }
});

test('the middleware continues an incoming trace with a new span', () => {
  const { req, res, called } = run(traceMiddleware(), { traceparent: VALID });

  assert.ok(called);
  assert.equal(req.trace.traceId, '0af7651916cd43dd8448eb211c80319c');
  assert.notEqual(req.trace.spanId, 'b7ad6b7169203331');
  assert.equal(res.headers['X-Trace-Id'], req.trace.traceId);
  assert.match(toTraceparent(req.trace), /^00-0af7651916cd43dd8448eb211c80319c-[0-9a-f]{16}-01$/);
});

test('without an incoming trace it starts one, sampled by the rate', () => {
  assert.equal(run(traceMiddleware({ sampleRate: 1, random: () => 0.5 })).req.trace.flags, '01');
  assert.equal(run(traceMiddleware({ sampleRate: 0.1, random: () => 0.5 })).req.trace.flags, '00');
  assert.match(run(traceMiddleware()).req.trace.traceId, /^[0-9a-f]{32}$/);
});

test('disabled, it does nothing', () => {
  const { req, res, called } = run(traceMiddleware({ enabled: false }), { traceparent: VALID });

  assert.ok(called);
  assert.equal(req.trace, undefined);
  assert.deepEqual(res.headers, {});
});
