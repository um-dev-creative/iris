'use strict';

const router = require('express').Router();
const { proxyToApi } = require('../shared/proxy');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the browser may set when it creates a user. The application and the role are the ones the person picked, as UUIDs. */
const CREATE_FIELDS = ['alias', 'displayName', 'password', 'email', 'applicationId', 'roleId', 'notificationEmail', 'notificationSms', 'privacyDataOutActive'];
const PERSON_FIELDS = ['name', 'lastName', 'middleName', 'gender', 'birthdate'];

const pick = (source, fields) => Object.fromEntries(fields.filter((f) => source?.[f] !== undefined).map((f) => [f, source[f]]));

for (const name of ['userId', 'applicationId', 'roleId']) {
  router.param(name, (_req, res, next, value) => (UUID.test(value) ? next() : res.status(400).json({ error: `Invalid ${name}` })));
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

/**
 * Administration of who may use which application: users, their roles and their access per application. Backbone reads the
 * session of these resources only from `Authorization: Bearer`, so every call carries it, and backbone decides (WRITE_USER,
 * READ_USER) whether the person may do it: a refusal goes back as its own 403.
 */
const toBackbone = (req, res, path, { body } = {}) =>
  proxyToApi(req, res, 'backbone', path, { query: {}, bearer: true, ...(body === undefined ? {} : { body }) });

router.get('/applications', (req, res) => toBackbone(req, res, '/applications'));
router.get('/applications/:applicationId/users', (req, res) => toBackbone(req, res, `/users/application/${req.params.applicationId}`));
router.get('/applications/:applicationId/roles', (req, res) => toBackbone(req, res, `/roles/application/${req.params.applicationId}`));

router.get('/users/:userId/access', (req, res) => toBackbone(req, res, `/users/${req.params.userId}/access`));
router.put('/users/:userId/access/:applicationId/role/:roleId', (req, res) =>
  toBackbone(req, res, `/users/${req.params.userId}/access/${req.params.applicationId}/role/${req.params.roleId}`, { body: {} }),
);
router.delete('/users/:userId/access/:applicationId', (req, res) =>
  toBackbone(req, res, `/users/${req.params.userId}/access/${req.params.applicationId}`),
);

router.post('/users', (req, res) => {
  const { applicationId, roleId } = req.body ?? {};
  if (!UUID.test(String(applicationId)) || !UUID.test(String(roleId))) {
    return res.status(400).json({ error: 'applicationId and roleId must be UUIDs' });
  }
  return toBackbone(req, res, '/users', { body: { ...pick(req.body, CREATE_FIELDS), person: pick(req.body.person, PERSON_FIELDS) } });
});

module.exports = router;
