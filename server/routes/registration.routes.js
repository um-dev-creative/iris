'use strict';

const crypto = require('node:crypto');
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const mercury = require('../shared/mercury');
const {
  BACKBONE_APPLICATION_ID,
  MERCURY_LOGIN_ALIAS,
  RATE_LIMIT_WINDOW_MS,
  REGISTRATION_MAIL_FROM,
  REGISTRATION_RATE_LIMIT_MAX,
  REGISTRATION_ROLE_ID,
  REGISTRATION_TEMPLATE_EN,
  REGISTRATION_TEMPLATE_ES,
} = require('../config/constants');

const CODE_MINUTES = 15;
const RESEND_SLOT_SECONDS = 60;
const ALIAS = /^[A-Za-z0-9._-]{3,64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^\d{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TEMPLATES = { es: REGISTRATION_TEMPLATE_ES, en: REGISTRATION_TEMPLATE_EN };

const PENDING = { status: 'PENDING_VERIFICATION' };
const ACTIVE = { status: 'ACTIVE' };
const UNAVAILABLE = { error: 'Registration is not available' };

const text = (value, max) => typeof value === 'string' && value.trim() !== '' && value.trim().length <= max;
const flag = (value) => typeof value === 'boolean';
const languageOf = (value) => (value === 'en' ? 'en' : 'es');
const isPast = (value) => typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value) < new Date();

/** Sign-up stays off until every value it needs exists: a half-configured flow would create users nobody can activate. */
const configured = () =>
  Boolean(BACKBONE_APPLICATION_ID && REGISTRATION_ROLE_ID && REGISTRATION_TEMPLATE_ES && REGISTRATION_MAIL_FROM && MERCURY_LOGIN_ALIAS);

const limited = () =>
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: REGISTRATION_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again later' },
  });

/** Answers 503 instead of a partial sign-up, and turns an unexpected failure into the same answer. */
const guarded = (handler) => async (req, res) => {
  if (!configured()) return res.status(503).json(UNAVAILABLE);
  try {
    return await handler(req, res);
  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    return res.status(503).json(UNAVAILABLE);
  }
};

function invalidField(body) {
  const person = body.person;
  if (!ALIAS.test(body.alias ?? '')) return 'alias';
  if (!text(body.email, 254) || !EMAIL.test(body.email.trim())) return 'email';
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) return 'password';
  if (!person || typeof person !== 'object' || Array.isArray(person)) return 'person';
  if (!text(person.firstName, 100) || !text(person.lastName, 100)) return 'name';
  if (!text(person.gender, 20)) return 'gender';
  if (!isPast(person.birthdate)) return 'birthdate';
  if (!flag(body.notificationEmail) || !flag(body.notificationSms) || !flag(body.privacyDataOutActive)) return 'preferences';
  return null;
}

async function queueCode(user, language) {
  const lang = TEMPLATES[language] ? language : 'es';
  const slot = Math.floor(Date.now() / 1000 / RESEND_SLOT_SECONDS);
  try {
    await mercury.mailVerificationCode({
      userId: user.id,
      email: user.email,
      userName: user.displayName ?? user.alias,
      language: lang,
      templateId: TEMPLATES[lang],
      code: String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'),
      expiresInMinutes: CODE_MINUTES,
      dedupKey: `REGISTER-CODE:${user.id}:${slot}`,
    });
  } catch (err) {
    // the account exists and the person can ask for another code
    logger.warn(`The verification mail could not be queued: ${err.message}`);
  }
}

async function register(req, res) {
  const body = req.body ?? {};
  const invalid = invalidField(body);
  if (invalid) return res.status(400).json({ error: 'Invalid registration data', field: invalid });

  const alias = body.alias;
  const email = body.email.trim();
  // an e-mail that already has an account answers like a new one: the form must not reveal who is registered
  if (await backbone.isTaken('email', email)) return res.status(202).json(PENDING);
  if (await backbone.isTaken('alias', alias)) return res.status(409).json({ error: 'That alias is already taken', field: 'alias' });

  const firstName = body.person.firstName.trim();
  const lastName = body.person.lastName.trim();
  const created = await backbone.createInactiveUser({
    alias,
    displayName: `${firstName} ${lastName}`,
    email,
    password: body.password,
    notificationEmail: body.notificationEmail,
    notificationSms: body.notificationSms,
    privacyDataOutActive: body.privacyDataOutActive,
    roleId: REGISTRATION_ROLE_ID,
    person: { firstName, lastName, gender: body.person.gender.trim(), birthdate: body.person.birthdate },
  });
  if (created.status === 409) {
    // lost a race: tell the alias apart from the e-mail, which stays silent
    if (await backbone.isTaken('alias', alias)) return res.status(409).json({ error: 'That alias is already taken', field: 'alias' });
    return res.status(202).json(PENDING);
  }
  if (created.status === 400 || created.status === 422) return res.status(400).json({ error: 'Invalid registration data' });
  if (created.status !== 200 && created.status !== 201) throw new Error(`backbone answered ${created.status} creating a user`);

  await queueCode({ ...created.data, email }, languageOf(body.language));
  return res.status(202).json(PENDING);
}

async function verify(req, res) {
  const { alias, code } = req.body ?? {};
  if (!ALIAS.test(alias ?? '') || typeof code !== 'string' || !CODE.test(code)) {
    return res.status(400).json({ error: 'Alias and a six-digit code are required' });
  }
  const user = await backbone.findUserByAlias(alias);
  if (!user) return res.status(422).json({ error: 'Invalid or expired code', expired: true });
  if (user.active) return res.json(ACTIVE);

  const result = await mercury.checkVerificationCode(user.id, code);
  if (result.outcome === 'wrong') {
    return res.status(422).json({ error: 'Invalid or expired code', attemptsRemaining: result.attemptsRemaining });
  }
  if (result.outcome === 'not-found') return res.status(422).json({ error: 'Invalid or expired code', expired: true });

  await backbone.activateUser(user.id);
  return res.json(ACTIVE);
}

async function resend(req, res) {
  const { alias, language } = req.body ?? {};
  if (!ALIAS.test(alias ?? '')) return res.status(400).json({ error: 'An alias is required' });
  const user = await backbone.findUserByAlias(alias);
  if (user && !user.active) await queueCode(user, languageOf(language));
  // the same answer whatever happened: the form must not reveal who is registered
  return res.status(202).json(PENDING);
}

router.post('/register', limited(), guarded(register));
router.post('/verify-email', limited(), guarded(verify));
router.post('/resend-verification', limited(), guarded(resend));

module.exports = router;
