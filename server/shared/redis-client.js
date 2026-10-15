// server/shared/redis-client.js
// Redis client singleton with connection management and in-memory fallback
const { createClient } = require('redis');
const appConfig = require('../config/app.config');
const logger = appConfig.getLoggerApp();

const LOGGER_TAG_ID = '[REDIS_CLIENT] :::';

let redisClient = null;
let isConnecting = false;
let lastConnectionTime = null;
let lastConnectionError = null;
let connectionAttempts = 0;
let isRedisAvailable = false;

// In-memory fallback store for when Redis is unavailable
const memoryStore = new Map();
const memoryExpires = new Map();

/**
 * Validate Redis configuration parameters
 * @returns {Object} Validation result with isValid boolean and errors array
 */
function validateRedisConfig() {
  const errors = [];
  const redisUrl = process.env.REDIS_URL;
  const redisPort = process.env.REDIS_PORT;
  const redisUsername = process.env.REDIS_USERNAME;
  const redisPassword = process.env.REDIS_PASSWORD;

  if (!redisUrl || typeof redisUrl !== 'string' || redisUrl.trim() === '') {
    errors.push('REDIS_URL is required and must be a non-empty string');
  }

  if (!redisPort) {
    errors.push('REDIS_PORT is required');
  } else {
    const port = parseInt(redisPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('REDIS_PORT must be a valid port number (1-65535)');
    }
  }

  if (!redisUsername || typeof redisUsername !== 'string' || redisUsername.trim() === '') {
    errors.push('REDIS_USERNAME is required and must be a non-empty string');
  }

  if (!redisPassword || typeof redisPassword !== 'string' || redisPassword.trim() === '') {
    errors.push('REDIS_PASSWORD is required and must be a non-empty string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get or create Redis client instance
 * @returns {Promise<Object|null>} Redis client or null if connection fails
 */
async function getRedisClient() {
  // Return existing client if connected
  if (redisClient && redisClient.isOpen) {
    isRedisAvailable = true;
    return redisClient;
  }

  // Don't create multiple connections simultaneously
  if (isConnecting) {
    logger.debug(`${LOGGER_TAG_ID} Already connecting to Redis, waiting...`);
    // Wait a bit and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getRedisClient();
  }

  // Validate Redis configuration
  const configValidation = validateRedisConfig();
  if (!configValidation.isValid) {
    const errorMessage = `Redis configuration invalid: ${configValidation.errors.join(', ')}`;
    logger.warn(`${LOGGER_TAG_ID} ${errorMessage}. Redis features disabled, using in-memory fallback`);
    lastConnectionError = errorMessage;
    isRedisAvailable = false;
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  const redisPort = process.env.REDIS_PORT;
  const redisUsername = process.env.REDIS_USERNAME;
  const redisPassword = process.env.REDIS_PASSWORD;

  try {
    isConnecting = true;
    connectionAttempts++;
    logger.info(`${LOGGER_TAG_ID} Connecting to Redis (attempt ${connectionAttempts})...`);

    redisClient = createClient({
      url: `redis://${redisUsername}:${redisPassword}@${redisUrl}:${redisPort}`,
      // url: "redis://DRT-USR:MD7Bj!q.csZL:KJ@redis-18974.crce174.ca-central-1-1.ec2.redns.redis-cloud.com:18974",
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error(`${LOGGER_TAG_ID} Max reconnection attempts reached`);
            isRedisAvailable = false;
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.debug(`${LOGGER_TAG_ID} Reconnecting to Redis in ${delay}ms...`);
          return delay;
        }
      }
    });

    // Set up error handler
    redisClient.on('error', (err) => {
      logger.error(`${LOGGER_TAG_ID} Redis client error: ${err.message}`);
      lastConnectionError = err.message;
      isRedisAvailable = false;
    });

    // Set up ready handler
    redisClient.on('ready', () => {
      logger.info(`${LOGGER_TAG_ID} Redis client ready`);
      lastConnectionTime = new Date().toISOString();
      lastConnectionError = null;
      isRedisAvailable = true;
    });

    // Set up connect handler
    redisClient.on('connect', () => {
      logger.info(`${LOGGER_TAG_ID} Redis client connected`);
      isRedisAvailable = true;
    });

    // Set up disconnect handler
    redisClient.on('disconnect', () => {
      logger.warn(`${LOGGER_TAG_ID} Redis client disconnected`);
      isRedisAvailable = false;
    });

    // Connect
    await redisClient.connect();
    logger.info(`${LOGGER_TAG_ID} Successfully connected to Redis`);
    lastConnectionTime = new Date().toISOString();
    lastConnectionError = null;
    isRedisAvailable = true;

    return redisClient;
  } catch (error) {
    logger.error(`${LOGGER_TAG_ID} Failed to connect to Redis: ${error.message}`);
    lastConnectionError = error.message;
    isRedisAvailable = false;
    redisClient = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Close Redis connection
 */
async function closeRedisClient() {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info(`${LOGGER_TAG_ID} Redis connection closed`);
    } catch (error) {
      logger.error(`${LOGGER_TAG_ID} Error closing Redis connection: ${error.message}`);
    }
    redisClient = null;
    isRedisAvailable = false;
  }
}

/**
 * In-memory store operations for fallback when Redis is unavailable
 */

/**
 * Set value in memory store with expiration
 * @param {string} key - Key to set
 * @param {string} value - Value to set
 * @param {number} expirationSeconds - Expiration in seconds
 */
function memorySet(key, value, expirationSeconds = 3600) {
  memoryStore.set(key, value);
  if (expirationSeconds > 0) {
    const expiresAt = Date.now() + (expirationSeconds * 1000);
    memoryExpires.set(key, expiresAt);
  }
  logger.debug(`${LOGGER_TAG_ID} Memory store SET: ${key} (expires in ${expirationSeconds}s)`);
}

/**
 * Get value from memory store, checking expiration
 * @param {string} key - Key to get
 * @returns {string|null} - Value or null if not found/expired
 */
function memoryGet(key) {
  // Check if key exists
  if (!memoryStore.has(key)) {
    return null;
  }

  // Check expiration
  if (memoryExpires.has(key)) {
    const expiresAt = memoryExpires.get(key);
    if (Date.now() > expiresAt) {
      // Expired, remove from both stores
      memoryStore.delete(key);
      memoryExpires.delete(key);
      logger.debug(`${LOGGER_TAG_ID} Memory store expired and removed: ${key}`);
      return null;
    }
  }

  const value = memoryStore.get(key);
  logger.debug(`${LOGGER_TAG_ID} Memory store GET: ${key}`);
  return value;
}

/**
 * Delete value from memory store
 * @param {string} key - Key to delete
 * @returns {boolean} - True if key existed
 */
function memoryDel(key) {
  const existed = memoryStore.has(key);
  memoryStore.delete(key);
  memoryExpires.delete(key);
  logger.debug(`${LOGGER_TAG_ID} Memory store DEL: ${key} (existed: ${existed})`);
  return existed;
}

/**
 * Get Redis health status
 * @returns {Object} Health status information
 */
function getRedisHealth() {
  return {
    available: isRedisAvailable,
    connected: redisClient && redisClient.isOpen,
    lastConnectionTime,
    lastConnectionError,
    connectionAttempts,
    memoryStoreSize: memoryStore.size,
    uptime: process.uptime()
  };
}

/**
 * Check if Redis is available for operations
 * @returns {boolean} True if Redis is available
 */
function isRedisHealthy() {
  return isRedisAvailable && redisClient && redisClient.isOpen;
}

/**
 * Force reconnection to Redis (for health endpoint testing)
 * @returns {Promise<boolean>} True if reconnection successful
 */
async function reconnectRedis() {
  logger.info(`${LOGGER_TAG_ID} Forced reconnection requested`);

  // Close existing connection if any
  await closeRedisClient();

  // Reset state
  isRedisAvailable = false;
  lastConnectionError = null;

  // Attempt new connection
  const client = await getRedisClient();
  return client !== null;
}

/**
 * Clean up expired entries from memory store (maintenance function)
 */
function cleanupMemoryStore() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, expiresAt] of memoryExpires) {
    if (now > expiresAt) {
      memoryStore.delete(key);
      memoryExpires.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug(`${LOGGER_TAG_ID} Memory store cleanup: removed ${cleaned} expired entries`);
  }

  return cleaned;
}

// Set up periodic cleanup of memory store (every 5 minutes)
setInterval(cleanupMemoryStore, 5 * 60 * 1000);

module.exports = {
  getRedisClient,
  closeRedisClient,
  validateRedisConfig,
  memorySet,
  memoryGet,
  memoryDel,
  getRedisHealth,
  isRedisHealthy,
  reconnectRedis,
  cleanupMemoryStore
};
