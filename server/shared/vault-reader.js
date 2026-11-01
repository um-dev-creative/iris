'use strict';

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Reads the key/value pairs of a Vault KV v2 path, `data` segment included. Same reader as smartkin-frontend.
 *
 * @param {string} vaultUrl base URL, with or without a trailing slash
 * @param {string} vaultToken sent in `X-Vault-Token`; it never appears in an error message
 * @param {string} vaultPath path of the secret under `/v1/`
 * @param {{timeoutMs?: number, fetchImpl?: Function}} [options] test seams
 * @returns {Promise<Record<string, unknown>>} the secret's key/value pairs
 */
async function readSecret(vaultUrl, vaultToken, vaultPath, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = options;
  const url = `${String(vaultUrl).replace(/\/+$/, '')}/v1/${String(vaultPath).replace(/^\/+/, '')}`;
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { 'X-Vault-Token': vaultToken, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(`Vault is not reachable at ${vaultUrl}: ${error.cause?.code ?? error.name}`);
  }
  if (!response.ok) throw new Error(`Vault answered ${response.status} for ${vaultPath}`);
  const body = await response.json();
  const values = body?.data?.data;
  if (values === null || typeof values !== 'object') throw new Error(`Vault returned no key/value data for ${vaultPath}`);
  return values;
}

module.exports = { readSecret, DEFAULT_TIMEOUT_MS };
