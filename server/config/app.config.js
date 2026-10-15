/**
 * Module for bootstrapping application configuration and handling secrets from Vault.
 */

let mercuryProxyConfig = {};
let mercuryAuthProxyConfig = {};
let mercuryCreateUserProxyConfig = {};
let mercuryVerifyCodeProxyConfig = {};
let mercuryUserProfileImageProxyConfig = {};
const fs = require('node:fs');
const {format} = require('logform');
const winston = require('winston');

/**
 * Bootstraps the application configuration by loading secrets from Vault if provided.
 *
 * @returns {Promise} - A promise that resolves with the configuration or null.
 */
module.exports.bootstrapConfiguration = function () {
  const argv = require('yargs').argv;

  return new Promise(function (resolve, reject) {
    require('dotenv').config({path: "default.env"});

    if (argv.vaultToken && argv.vaultUrl && argv.vaultPath) {
      logger.info(`[VAULT] Attempting to load secrets from Vault: ${argv.vaultUrl}/${argv.vaultPath}`);

      loadSecretsIntoEnv(argv.vaultUrl, argv.vaultToken, argv.vaultPath, argv.debugMode).then(config => {
        logger.info("[VAULT] Successfully loaded secrets from Vault");
        resolve(config);
      }, error => {
        logger.error("[VAULT] Unable to load secrets from vault:", error.message || error);

        // In development mode, provide graceful fallback
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
          logger.warn("[VAULT] Development mode: continuing without Vault secrets");
          // Try to load config without Vault secrets for development
          try {
            const config = require('config');
            resolve(config);
          } catch (configError) {
            logger.error("[VAULT] Failed to load fallback configuration:", configError);
            reject(configError);
          }
        } else {
          // In production, Vault failure should be treated as critical
          reject(new Error(`Production Vault failure: ${error.message || error}`));
        }
      });
    } else {
      const missingParams = [];
      if (!argv.vaultToken) missingParams.push('vaultToken');
      if (!argv.vaultUrl) missingParams.push('vaultUrl');
      if (!argv.vaultPath) missingParams.push('vaultPath');

      logger.info(`[VAULT] Vault configuration not provided (missing: ${missingParams.join(', ')}). Running without Vault integration.`);

      // Load default configuration without Vault
      try {
        const config = require('config');
        resolve(config);
      } catch (configError) {
        logger.error("[CONFIG] Failed to load default configuration:", configError);
        resolve(null);
      }
    }
  });
};

/**
 * Loads secrets from Vault into environment variables.
 *
 * @param {string} vaultUrl - The URL of the Vault server.
 * @param {string} vaultToken - The token for authenticating with Vault.
 * @param {string} vaultPath - The path in Vault where secrets are stored.
 * @param isDebugMode - A flag indicating whether debug mode is enabled.
 * @returns {Promise} - A promise that resolves with the configuration or rejects with an error.
 */
let loadSecretsIntoEnv = function (vaultUrl, vaultToken, vaultPath, isDebugMode) {
  return new Promise(function (resolve, reject) {
    let vaultClient = require("node-vault-client");
    console.log('[APP-CFG] - Vault token load:: OK');

    // Only log token details in debug mode and non-production environments
    if(isDebugMode && process.env.NODE_ENV !== 'production') {
      console.log(`[APP-CFG] - Vault URL:: ${vaultUrl}`);
      console.log(`[APP-CFG] - Vault Path:: ${vaultPath}`);
      console.log(`[APP-CFG] - Vault token (first 8 chars):: ${vaultToken.substring(0, 8)}...`);
    } else if (isDebugMode) {
      console.log('[APP-CFG] - Debug mode enabled but token details masked for production security');
    }

    vaultClient = vaultClient.boot('main', {
      api: {url: vaultUrl},
      auth: {
        type: 'token',
        config: {token: vaultToken}
      },
    });

    vaultClient.read(vaultPath).then(v => {
      let vaultValues = v.__data.data;

      if (!vaultValues || typeof vaultValues !== 'object') {
        const error = new Error('Invalid vault response: no data found at specified path');
        logger.error("[VAULT] Invalid vault response structure");
        reject(error);
        return;
      }

      // Load secrets into environment variables
      let loadedCount = 0;
      for (let key in vaultValues) {
        process.env[key] = vaultValues[key];
        loadedCount++;
      }

      logger.info(`[VAULT] Successfully loaded ${loadedCount} secrets into environment`);

      const config = require('config');
      resolve(config);

      if (isDebugMode) {
        printVaultValues(vaultValues);
      }
    }).catch(error => {
      const errorMessage = error.message || error.toString();
      logger.error(`[VAULT] Failed to read from vault path '${vaultPath}':`, errorMessage);

      // Provide more specific error context
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        reject(new Error(`Vault access denied. Check token permissions for path: ${vaultPath}`));
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        reject(new Error(`Vault path not found: ${vaultPath}`));
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        reject(new Error(`Cannot connect to Vault server at: ${vaultUrl}`));
      } else {
        reject(new Error(`Vault operation failed: ${errorMessage}`));
      }
    });
  });
};

/**
 * Creates a logger instance using Winston.
 *
 * @returns {Object} - A Winston logger instance.
 */
module.exports.getLoggerApp = function () {
  const argv = require('yargs').argv;
  const debugMode = argv.debugMode === 'true' || process.env.ENABLE_DEBUG === 'true';
  const logLevel = debugMode ? 'debug' : 'info';

  return winston.createLogger({
    level: logLevel,
    format: format.combine(
      format.json(),
      format.timestamp(),
    ),
    transports: [
      new winston.transports.Console()
    ]
  });
};

/**
 * Reads and parses the mercury proxy configuration from a JSON file.
 */
module.exports.createMercuryProxyConfig = function () {
  const configJson = fs.readFileSync('server/config/default.json', 'utf8');
  const config = JSON.parse(configJson);
  mercuryProxyConfig = config['mercuryProxyConfig'];
  mercuryAuthProxyConfig = config['mercuryAuthProxyConfig'];
  mercuryVerifyCodeProxyConfig = config['mercuryVerifyCodeProxyConfig'];
  mercuryCreateUserProxyConfig = config['mercuryCreateUserProxyConfig'];
  mercuryUserProfileImageProxyConfig = config['mercuryUserProfileImageProxyConfig'];
  logger.info("[IR] - Proxy Config [mercury]: " + JSON.stringify(mercuryProxyConfig));
  logger.info("[IR] - Proxy Config [mercury Auth]: " + JSON.stringify(mercuryAuthProxyConfig));
  logger.info("[IR] - Proxy Config [mercury Register]: " + JSON.stringify(mercuryVerifyCodeProxyConfig));
  logger.info("[IR] - Proxy Config [mercury Create User]: " + JSON.stringify(mercuryCreateUserProxyConfig));
  logger.info("[IR] - Proxy Config [mercury User Image Profile]: " + JSON.stringify(mercuryUserProfileImageProxyConfig));
};

/**
 * Retrieves the mercury proxy configuration.
 *
 * @returns {Object} - The mercury proxy configuration.
 */
module.exports.getMercuryProxyConfig = function () {
  return mercuryProxyConfig;
};

/**
 * Retrieves the mercury proxy configuration.
 *
 * @returns {Object} - The mercury proxy configuration.
 */
module.exports.getMercuryAuthProxyConfig = function () {
  return mercuryAuthProxyConfig;
};

/**
 * Retrieves the mercury proxy configuration.
 *
 * @returns {Object} - The mercury proxy configuration.
 */
module.exports.getMercuryCreateUserProxyConfig = function () {
  return mercuryCreateUserProxyConfig;
};

module.exports.getMercuryVerifyCodeProxyConfig = function () {
  return mercuryVerifyCodeProxyConfig;
};

module.exports.getMercuryUserProfileImageProxyConfig = function () {
  return mercuryUserProfileImageProxyConfig;
};

let printVaultValues = function (vaultValues) {
  // Only print vault values in development environment and debug mode
  if (process.env.NODE_ENV === 'production') {
    logger.info("Vault values loaded successfully (details masked for production security)");
    return;
  }

  logger.info("<><><><><><><><><><><><><><> Vault values (DEV MODE) <><><><><><><><><><><><><><>");
  for (let key in vaultValues) {
    // Mask sensitive values even in development
    if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
      logger.info(`${key}: [MASKED]`);
    } else {
      logger.info(`${key}: ${vaultValues[key]}`);
    }
  }
  logger.info("<><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><>");
}

const logger = module.exports.getLoggerApp();
