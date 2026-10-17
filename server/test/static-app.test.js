'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { start } = require('./harness');

const dist = mkdtempSync(path.join(tmpdir(), 'iris-dist-'));
writeFileSync(path.join(dist, 'index.csr.html'), '<html>iris-csr</html>');
writeFileSync(path.join(dist, 'main.js'), 'console.log(1)');

let built;
let unbuilt;
before(async () => {
  built = await start({ appOptions: { distPath: dist } });
  unbuilt = await start({ appOptions: { distPath: path.join(dist, 'missing') } });
});
after(() => { built.stop(); unbuilt.stop(); });

test('static files are served and any other page falls back to the client app', async () => {
  assert.equal(await (await built.call('/main.js')).text(), 'console.log(1)');
  for (const page of ['/', '/dashboard/home', '/dashboard/data']) {
    assert.equal(await (await built.call(page)).text(), '<html>iris-csr</html>', page);
  }
});

test('without a build the app answers 503 with the command to run', async () => {
  const res = await unbuilt.call('/dashboard');

  assert.equal(res.status, 503);
  assert.match(await res.text(), /Application not built/);
});
