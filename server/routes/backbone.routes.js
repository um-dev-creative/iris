'use strict';

const router = require('express').Router();
const { passThrough } = require('../shared/proxy');

// /bkd/api/v1/* → backbone, with the user's session
router.use(passThrough('backbone'));

module.exports = router;
