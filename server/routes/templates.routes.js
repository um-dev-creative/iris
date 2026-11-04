'use strict';

const router = require('express').Router();
const logger = require('../config/logger');
const backbone = require('../shared/backbone');
const { proxyToApi } = require('../shared/proxy');
const { MONITORED_APPLICATION_ID } = require('../config/constants');

/**
 * Mercury guards /templates with the Bearer of the application and the session of the person, like /campaigns, so the
 * generic /general proxy (session only) cannot reach it.
 */
async function toMercury(req, res, path, { query } = {}) {
  let bearer;
  try {
    bearer = await backbone.applicationClientToken();
  } catch (err) {
    logger.error(`Templates: the application client could not get a token: ${err.message}`);
    return res.status(502).json({ error: 'Backend unavailable' });
  }
  return proxyToApi(req, res, 'mercury', path, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, ...(query ? { query } : {}) });
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// the application is the BFF's: without it the lists would have no scope
router.use((_req, res, next) => {
  if (MONITORED_APPLICATION_ID) return next();
  logger.error('Templates: MONITORED_APPLICATION_ID (or BACKBONE_APPLICATION_ID) is not set');
  return res.status(503).json({ error: 'Template management is not available' });
});

router.get('/types', (req, res) => toMercury(req, res, '/templates/types', { query: {} }));
router.get('/severities', (req, res) => toMercury(req, res, '/templates/severities', { query: {} }));
router.get('/defined', (req, res) => toMercury(req, res, '/templates/defined', { query: { applicationId: MONITORED_APPLICATION_ID } }));

module.exports = router;
