const constants = require('../config/constants.util');
const express = require('express');
const router = express.Router();

let authController = require('../controller/mercury-auth.controller');
let registerController = require('../controller/mercury-register.controller');
let createUserController = require('../controller/mercury-create-user.controller');

 router.post(`${constants.INNER_ACCESS_TOKEN_PATH}*`, authController.proxyApi);
 router.delete('/mrc/api/v1/auth/session-end*', authController.closeSession);
 router.post(`${constants.INNER_CREATE_USER_PATH}*`, createUserController.proxyApi);
 router.post(`${constants.INNER_VERIFY_CODE_PATH}*`, registerController.registerProxyApi);

module.exports = router;
