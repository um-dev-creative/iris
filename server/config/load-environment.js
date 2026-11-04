'use strict';

const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const dotenv = require('dotenv');
const { readSecret } = require('../shared/vault-reader');

/** Sets each value only where the variable is still empty, so the first source to give a value wins. */
function fillEmpty(values, env) {
  const filled = [];
  for (const [name, value] of Object.entries(values)) {
    if (!env[name] && value !== '' && value !== null && value !== undefined) {
      env[name] = String(value);
      filled.push(name);
    }
  }
  return filled;
}

/**
 * Reads secrets/local.env and then config/local.env. Neither exists inside the image, where env_file already set them.
 *
 * @param {string} root folder that holds config/ and secrets/
 * @param {NodeJS.ProcessEnv} env the environment to fill
 */
function loadLocalFiles(root, env) {
  for (const file of ['secrets/local.env', 'config/local.env']) {
    const path = join(root, file);
    if (existsSync(path)) fillEmpty(dotenv.parse(readFileSync(path)), env);
  }
}

/**
 * Fills the environment before config/constants.js reads it. Order of precedence: the process environment,
 * secrets/local.env, config/local.env and, with VAULT_ENABLED=true, Vault. An empty value counts as not set.
 * The token leaves the environment once used.
 *
 * @param {{root?: string, env?: NodeJS.ProcessEnv, read?: typeof readSecret}} [options] test seams
 * @returns {Promise<string[]>} the names of the variables that came from Vault
 * @throws {Error} when Vault is enabled and cannot be read: the BFF must not start half-configured
 */
async function loadEnvironment({ root = process.cwd(), env = process.env, read = readSecret } = {}) {
  loadLocalFiles(root, env);
  if (String(env.VAULT_ENABLED).toLowerCase() !== 'true') {
    delete env.VAULT_TOKEN;
    return [];
  }
  const missing = ['VAULT_URI', 'VAULT_PATH', 'VAULT_TOKEN'].filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`VAULT_ENABLED=true needs ${missing.join(', ')}`);
  const token = env.VAULT_TOKEN;
  delete env.VAULT_TOKEN;
  return fillEmpty(await read(env.VAULT_URI, token, env.VAULT_PATH), env);
}

module.exports = { loadEnvironment };
