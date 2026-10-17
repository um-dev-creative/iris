'use strict';

const router = require('express').Router();
const { passThrough } = require('../shared/proxy');

// /mrc/api/v1/general/* → mercury, with the user's session
router.use(passThrough('mercury'));

module.exports = router;
