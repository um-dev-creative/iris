// server/shared/redis-lock.js
// Distributed lock utility using Redis SET NX PX with safe release and in-memory fallback
const { v4: uuidv4 } = require('uuid');
const appConfig = require('../config/app.config');
const logger = appConfig.getLoggerApp();

const LOGGER_TAG_ID = '[REDIS_LOCK] :::';

// In-memory lock store for fallback when Redis is unavailable
const memoryLocks = new Map();
const memoryLockExpires = new Map();


/**
 * In-memory lock operations for fallback when Redis is unavailable
 */

/**
 * Acquire lock in memory store
 * @param {string} lockKey - The key to lock
 * @param {string} lockToken - Unique token for this lock
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {boolean} - True if lock acquired
 */
function memoryAcquireLock(lockKey, lockToken, ttlMs) {
  // Check if lock already exists and is not expired
  if (memoryLocks.has(lockKey)) {
    const expiresAt = memoryLockExpires.get(lockKey);
    if (expiresAt && Date.now() < expiresAt) {
      logger.debug(`${LOGGER_TAG_ID} Memory lock already held: ${lockKey}`);
      return false;
    }
    // Lock expired, remove it
    memoryLocks.delete(lockKey);
    memoryLockExpires.delete(lockKey);
  }

  // Acquire new lock
  memoryLocks.set(lockKey, lockToken);
  const expiresAt = Date.now() + ttlMs;
  memoryLockExpires.set(lockKey, expiresAt);
  logger.debug(`${LOGGER_TAG_ID} Memory lock acquired: ${lockKey}`);
  return true;
}

/**
 * Release lock from memory store
 * @param {string} lockKey - The key to unlock
 * @param {string} lockToken - The token that was used to acquire the lock
 * @returns {boolean} - True if lock was released
 */
function memoryReleaseLock(lockKey, lockToken) {
  if (!memoryLocks.has(lockKey)) {
    return false;
  }

  const currentToken = memoryLocks.get(lockKey);
  if (currentToken !== lockToken) {
    logger.debug(`${LOGGER_TAG_ID} Memory lock token mismatch: ${lockKey}`);
    return false;
  }

  memoryLocks.delete(lockKey);
  memoryLockExpires.delete(lockKey);
  logger.debug(`${LOGGER_TAG_ID} Memory lock released: ${lockKey}`);
  return true;
}

/**
 * Clean up expired locks from memory store
 */
function cleanupMemoryLocks() {
  const now = Date.now();
  let cleaned = 0;

  for (const [lockKey, expiresAt] of memoryLockExpires) {
    if (now > expiresAt) {
      memoryLocks.delete(lockKey);
      memoryLockExpires.delete(lockKey);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`${LOGGER_TAG_ID} Memory lock cleanup: removed ${cleaned} expired locks`);
  }

  return cleaned;
}

// Set up periodic cleanup of memory locks (every minute)
setInterval(cleanupMemoryLocks, 60 * 1000);

/**
 * Acquires a distributed lock in Redis or memory fallback
 * @param {Object} redisClient - Redis client instance
 * @param {string} lockKey - The key to lock
 * @param {number} ttlMs - Time to live in milliseconds (default: 10000)
 * @returns {Promise<string|null>} - Lock token if acquired, null otherwise
 */
async function acquireLock(redisClient, lockKey, ttlMs = 10000) {
  const lockToken = uuidv4();

  // Try Redis first if available
  if (redisClient && redisClient.isOpen) {
    try {
      // SET key value NX PX milliseconds
      const result = await redisClient.set(lockKey, lockToken, {
        NX: true,
        PX: ttlMs
      });

      if (result === 'OK') {
        logger.debug(`${LOGGER_TAG_ID} Redis lock acquired: ${lockKey}`);
        return lockToken;
      }

      logger.debug(`${LOGGER_TAG_ID} Redis lock already held: ${lockKey}`);
      return null;
    } catch (error) {
      logger.error(`${LOGGER_TAG_ID} Error acquiring Redis lock: ${error.message}, falling back to memory`);
      // Fall through to memory fallback
    }
  }

  // Fallback to memory lock
  logger.debug(`${LOGGER_TAG_ID} Redis not available, using memory lock for: ${lockKey}`);
  if (memoryAcquireLock(lockKey, lockToken, ttlMs)) {
    return lockToken;
  }

  return null;
}

/**
 * Releases a distributed lock in Redis or memory fallback using compare-and-delete
 * @param {Object} redisClient - Redis client instance
 * @param {string} lockKey - The key to unlock
 * @param {string} lockToken - The token that was returned when acquiring the lock
 * @returns {Promise<boolean>} - True if released, false otherwise
 */
async function releaseLock(redisClient, lockKey, lockToken) {
  if (!lockToken) {
    return false;
  }

  // Try Redis first if available
  if (redisClient && redisClient.isOpen) {
    try {
      // Lua script to compare and delete atomically
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await redisClient.eval(script, {
        keys: [lockKey],
        arguments: [lockToken]
      });

      if (result === 1) {
        logger.debug(`${LOGGER_TAG_ID} Redis lock released: ${lockKey}`);
        return true;
      }

      logger.debug(`${LOGGER_TAG_ID} Redis lock not released (token mismatch or expired): ${lockKey}`);

      // Also try to release from memory in case of mixed state
      memoryReleaseLock(lockKey, lockToken);
      return false;
    } catch (error) {
      logger.error(`${LOGGER_TAG_ID} Error releasing Redis lock: ${error.message}, trying memory fallback`);
      // Fall through to memory fallback
    }
  }

  // Fallback to memory lock
  logger.debug(`${LOGGER_TAG_ID} Redis not available, using memory lock release for: ${lockKey}`);
  return memoryReleaseLock(lockKey, lockToken);
}

/**
 * Executes a function with a distributed lock
 * @param {Object} redisClient - Redis client instance
 * @param {string} lockKey - The key to lock
 * @param {Function} fn - The function to execute while holding the lock
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {Promise<any>} - Result of the function
 */
async function withLock(redisClient, lockKey, fn, ttlMs = 10000) {
  const lockToken = await acquireLock(redisClient, lockKey, ttlMs);

  if (!lockToken) {
    // Lock not acquired, wait and retry or throw
    throw new Error(`Failed to acquire lock: ${lockKey}`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(redisClient, lockKey, lockToken);
  }
}

module.exports = {
  acquireLock,
  releaseLock,
  withLock,
  cleanupMemoryLocks
};
