'use strict';

const assert = require('node:assert/strict');
const { start } = require('./harness');

let bff;

beforeAll(async () => { bff = await start(); });
afterAll(() => bff.stop());

it('sin configuración el registro responde 503 y no crea usuarios', async () => {
  bff.state.registration = { users: [], mails: [] };

  const res = await bff.call('/mrc/api/v1/auth/register', { method: 'POST', body: { alias: 'ana' } });

  assert.equal(res.status, 503);
  assert.equal(bff.state.registration.users.length, 0);
});
