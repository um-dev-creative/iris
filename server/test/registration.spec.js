'use strict';

const assert = require('node:assert/strict');
const { start } = require('./harness');

const CONFIG = {
  REGISTRATION_ROLE_ID: 'role-viewer',
  REGISTRATION_TEMPLATE_ES: 'tpl-es',
  REGISTRATION_TEMPLATE_EN: 'tpl-en',
  REGISTRATION_MAIL_FROM: 'no-reply@iris.test',
  MERCURY_LOGIN_ALIAS: 'iris',
  MERCURY_LOGIN_PASSWORD: 'test-only', // gitleaks:allow
  REGISTRATION_RATE_LIMIT_MAX: '1000',
};
const person = { firstName: ' Ana ', lastName: 'Rojas', gender: 'F', birthdate: '1990-05-01' };
const valid = {
  alias: 'ana.rojas',
  email: 'ana@example.com',
  password: 'secret-pass', // gitleaks:allow
  person,
  notificationEmail: true,
  notificationSms: false,
  privacyDataOutActive: false,
  language: 'en',
};

let bff;
const flow = () => bff.state.registration;
const post = (path, body) => bff.call(`/mrc/api/v1/auth/${path}`, { method: 'POST', body });

beforeAll(async () => { bff = await start({ env: CONFIG }); });
afterAll(() => bff.stop());
beforeEach(() => { bff.state.registration = { users: [], mails: [] }; });

describe('POST /auth/register', () => {
  it('crea el usuario inactivo con el rol configurado y envía el código', async () => {
    const res = await post('register', valid);

    assert.equal(res.status, 202);
    assert.deepEqual(await res.json(), { status: 'PENDING_VERIFICATION' });
    const [user] = flow().users;
    assert.equal(user.active, false);
    assert.equal(user.roleId, 'role-viewer');
    assert.equal(user.applicationId, 'app-1');
    assert.equal(user.displayName, 'Ana Rojas');
    const [mail] = flow().mails;
    assert.equal(mail.templateDefinedId, 'tpl-en');
    assert.equal(mail.userId, 'user-1');
    assert.match(mail.params.vc, /^\d{6}$/);
    assert.equal(mail.params.expiresInMinutes, '15');
    assert.match(mail.key, /^REGISTER-CODE:user-1:\d+$/);
  });

  it('nunca toma del navegador el rol, la aplicación ni el estado activo', async () => {
    await post('register', { ...valid, roleId: 'admin', applicationId: 'other', active: true });

    const [user] = flow().users;
    assert.equal(user.roleId, 'role-viewer');
    assert.equal(user.applicationId, 'app-1');
    assert.equal(user.active, false);
  });

  it.each([
    ['alias', { alias: 'a!' }],
    ['email', { email: 'no-es-correo' }],
    ['password', { password: 'corta' }],
    ['person', { person: null }],
    ['name', { person: { ...person, lastName: ' ' } }],
    ['gender', { person: { ...person, gender: '' } }],
    ['birthdate', { person: { ...person, birthdate: '2999-01-01' } }],
    ['preferences', { notificationSms: undefined }],
  ])('rechaza un valor inválido de %s', async (field, change) => {
    const res = await post('register', { ...valid, ...change });

    assert.equal(res.status, 400);
    assert.equal((await res.json()).field, field);
    assert.equal(flow().users.length, 0);
  });

  it('un correo ya registrado responde igual que uno nuevo y no crea nada', async () => {
    flow().users.push({ id: 'old', alias: 'otra', email: valid.email });

    const res = await post('register', valid);

    assert.equal(res.status, 202);
    assert.equal(flow().users.length, 1);
    assert.equal(flow().mails.length, 0);
  });

  it('un alias ocupado responde 409', async () => {
    flow().users.push({ id: 'old', alias: valid.alias, email: 'otra@example.com' });

    assert.equal((await post('register', valid)).status, 409);
  });

  it('si la cuenta se creó pero el correo falló, se puede pedir otro código', async () => {
    flow().mailStatus = 503;

    assert.equal((await post('register', valid)).status, 202);
    assert.equal(flow().users.length, 1);

    flow().mailStatus = undefined;
    assert.equal((await post('resend-verification', { alias: valid.alias })).status, 202);
    assert.equal(flow().mails.length, 1);
  });

  it('un fallo inesperado de backbone responde 503', async () => {
    flow().createStatus = 500;

    assert.equal((await post('register', valid)).status, 503);
  });

  it('backbone rechaza los datos: responde 400', async () => {
    flow().createStatus = 422;

    assert.equal((await post('register', valid)).status, 400);
  });
});

describe('POST /auth/verify-email', () => {
  const code = () => flow().mails.at(-1).params.vc;

  it('un código correcto activa la cuenta', async () => {
    await post('register', valid);

    const res = await post('verify-email', { alias: valid.alias, code: code() });

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ACTIVE' });
    assert.equal(flow().users[0].active, true);
  });

  it('un código incorrecto no activa e informa los intentos restantes', async () => {
    await post('register', valid);
    const wrong = code() === '000000' ? '000001' : '000000';

    const res = await post('verify-email', { alias: valid.alias, code: wrong });

    assert.equal(res.status, 422);
    assert.equal((await res.json()).attemptsRemaining, 2);
    assert.equal(flow().users[0].active, false);
  });

  it('sin código pendiente pide uno nuevo', async () => {
    await post('register', valid);
    flow().codeOutcome = 'not-found';

    const res = await post('verify-email', { alias: valid.alias, code: '123456' });

    assert.equal(res.status, 422);
    assert.equal((await res.json()).expired, true);
  });

  it('un alias desconocido se responde como un código vencido', async () => {
    const res = await post('verify-email', { alias: 'nadie', code: '123456' });

    assert.equal(res.status, 422);
    assert.equal((await res.json()).expired, true);
  });

  it('una cuenta ya activa responde ACTIVE sin consultar el código', async () => {
    flow().users.push({ id: 'u', alias: valid.alias, email: valid.email, active: true });

    assert.equal((await post('verify-email', { alias: valid.alias, code: '123456' })).status, 200);
  });

  it('rechaza un código mal formado', async () => {
    assert.equal((await post('verify-email', { alias: valid.alias, code: '12' })).status, 400);
  });

  it('un fallo de mercury responde 503 y no activa', async () => {
    await post('register', valid);
    flow().codeOutcome = 'broken';

    assert.equal((await post('verify-email', { alias: valid.alias, code: '123456' })).status, 503);
    assert.equal(flow().users[0].active, false);
  });

  it('renueva el token de mercury una vez si fue rechazado', async () => {
    await post('register', valid);
    flow().rejectTokens = 1;

    assert.equal((await post('verify-email', { alias: valid.alias, code: code() })).status, 200);
  });
});

describe('POST /auth/resend-verification', () => {
  it('un alias desconocido responde igual y no envía nada', async () => {
    assert.equal((await post('resend-verification', { alias: 'nadie' })).status, 202);
    assert.equal(flow().mails.length, 0);
  });

  it('una cuenta activa no recibe otro código', async () => {
    flow().users.push({ id: 'u', alias: valid.alias, email: valid.email, active: true });

    assert.equal((await post('resend-verification', { alias: valid.alias })).status, 202);
    assert.equal(flow().mails.length, 0);
  });

  it('rechaza un alias inválido', async () => {
    assert.equal((await post('resend-verification', { alias: '!' })).status, 400);
  });
});
