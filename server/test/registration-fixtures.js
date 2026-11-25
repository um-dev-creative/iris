'use strict';

// Shared by the sign-up specs: the BFF settings that switch sign-up on, and one valid registration body.
const CONFIG = {
  REGISTRATION_ROLE_ID: 'role-viewer',
  REGISTRATION_TEMPLATE_ES: 'tpl-es',
  REGISTRATION_TEMPLATE_EN: 'tpl-en',
  REGISTRATION_MAIL_FROM: 'no-reply@iris.test',
  BACKBONE_CLIENT_ID: 'iris',
  BACKBONE_CLIENT_SECRET: 'test-only', // gitleaks:allow
  BACKBONE_CLIENT_SCOPES: 'session:manage,users:manage,mercury:message:write',
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

module.exports = { CONFIG, person, valid };
