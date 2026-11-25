'use strict';

const assert = require('node:assert/strict');
const { start } = require('./harness');

// Own file, own BFF: the Mercury token is cached for the life of the process, and every test here counts the exchanges.
const { CONFIG, valid } = require('./registration-fixtures');

let bff;
const flow = () => bff.state.registration;
const post = (path, body) => bff.call(`/mrc/api/v1/auth/${path}`, { method: 'POST', body });

beforeAll(async () => { bff = await start({ env: CONFIG }); });
afterAll(() => bff.stop());
beforeEach(() => { bff.state.registration = { users: [], mails: [] }; });

describe('Mercury token of the Iris application', () => {
  it('exchanges the Backbone token of the application client, with no alias, no password and no body', async () => {
    await post('register', valid);

    const [exchange] = flow().exchanges;
    assert.match(exchange.authorization, /^Bearer m2m-\d+$/);
    assert.deepEqual(exchange.body, {});
    assert.equal(bff.state.clientCredentials.scopes.includes('mercury:message:write'), true);
    assert.equal(flow().mails.length, 1);
  });

  it('reuses the Mercury token it already holds: no second exchange for the next calls', async () => {
    await post('register', valid);
    const mail = flow().mails.at(-1);
    await post('verify-email', { alias: valid.alias, code: mail.params.vc });

    assert.equal(flow().logins ?? 0, 0);
  });

  it('does not queue the mail when Mercury refuses the exchange, and the account stays inactive', async () => {
    flow().exchangeStatus = 403;
    flow().rejectTokens = 1; // drop the cached token: the next call exchanges again
    const res = await post('register', valid);

    assert.equal(res.status, 202);
    assert.equal(flow().mails.length, 0);
    assert.equal(flow().users[0].active, false);
  });
});
