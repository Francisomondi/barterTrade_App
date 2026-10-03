import redisClient from "../config/redis.js";

/**
 * ============================================================
 * GET CACHE
 * ============================================================
 *
 * Retrieve and deserialize a value from Redis.
 *
 * Redis failures must never break the main application.
 *
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export const getCache = async (key) => {
  if (!key) {
    return null;
  }

  if (!redisClient || !redisClient.isReady) {
    return null;
  }

  try {
    const cachedData = await redisClient.get(key);

    if (!cachedData) {
      return null;
    }

    return JSON.parse(cachedData);
  } catch (error) {
    console.error(
      `Redis GET error [${key}]:`,
      error?.message || error
    );

    return null;
  }
};

/**
 * ============================================================
 * SET CACHE
 * ============================================================
 *
 * Serialize and store data in Redis.
 *
 * Default TTL:
 * 300 seconds = 5 minutes.
 *
 * @param {string} key
 * @param {any} data
 * @param {number} ttlSeconds
 * @returns {Promise<boolean>}
 */
export const setCache = async (
  key,
  data,
  ttlSeconds = 300
) => {
  if (!key) {
    return false;
  }

  if (!redisClient || !redisClient.isReady) {
    return false;
  }

  /*
   * Prevent invalid Redis expiry values.
   */
  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds <= 0
  ) {
    console.error(
      `Redis SET invalid TTL [${key}]:`,
      ttlSeconds
    );

    return false;
  }

  try {
    await redisClient.set(
      key,
      JSON.stringify(data),
      {
        EX: ttlSeconds,
      }
    );

    return true;
  } catch (error) {
    console.error(
      `Redis SET error [${key}]:`,
      error?.message || error
    );

    return false;
  }
};

/**
 * ============================================================
 * DELETE ONE CACHE ENTRY
 * ============================================================
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export const deleteCache = async (key) => {
  if (!key) {
    return false;
  }

  if (!redisClient || !redisClient.isReady) {
    return false;
  }

  try {
    await redisClient.del(key);

    return true;
  } catch (error) {
    console.error(
      `Redis DELETE error [${key}]:`,
      error?.message || error
    );

    return false;
  }
};

/**
 * ============================================================
 * DELETE MULTIPLE CACHE ENTRIES
 * ============================================================
 *
 * @param {string[]} keys
 * @returns {Promise<boolean>}
 */
export const deleteCaches = async (keys = []) => {
  if (!Array.isArray(keys)) {
    return false;
  }

  if (keys.length === 0) {
    return true;
  }

  if (!redisClient || !redisClient.isReady) {
    return false;
  }

  /*
   * Remove invalid/duplicate keys before sending them
   * to Redis.
   */
  const validKeys = [
    ...new Set(
      keys.filter(
        (key) =>
          typeof key === "string" &&
          key.length > 0
      )
    ),
  ];

  if (validKeys.length === 0) {
    return true;
  }

  try {
    /*
     * node-redis accepts an array of keys for DEL.
     */
    await redisClient.del(validKeys);

    return true;
  } catch (error) {
    console.error(
      "Redis DELETE MULTIPLE error:",
      error?.message || error
    );

    return false;
  }
};

/**
 * ============================================================
 * DELETE CACHE BY PATTERN
 * ============================================================
 *
 * Safely delete Redis keys matching a pattern.
 *
 * Example:
 *
 * deleteCacheByPattern("listings:all:*")
 * deleteCacheByPattern("listing:*")
 *
 * IMPORTANT:
 *
 * We intentionally use SCAN instead of KEYS.
 *
 * KEYS can block Redis when the database contains a large
 * number of keys.
 *
 * SCAN iterates incrementally and is therefore much safer
 * for production workloads.
 *
 * Matching keys are deleted in batches so we don't build
 * one huge in-memory array or send one enormous DEL command.
 *
 * @param {string} pattern
 * @returns {Promise<boolean>}
 */
export const deleteCacheByPattern = async (
  pattern
) => {
  if (
    !pattern ||
    typeof pattern !== "string"
  ) {
    return false;
  }

  if (!redisClient || !redisClient.isReady) {
    return false;
  }

  try {
    /*
     * Number of keys we'll collect before issuing DEL.
     */
    const DELETE_BATCH_SIZE = 100;

    let batch = [];

    let deletedCount = 0;

    /*
     * scanIterator uses Redis SCAN internally.
     *
     * COUNT is a hint to Redis about how many keys should
     * be inspected/returned during each iteration.
     */
    for await (
      const key of redisClient.scanIterator({
        MATCH: pattern,
        COUNT: 100,
      })
    ) {
      batch.push(key);

      /*
       * Delete incrementally instead of storing every
       * matching key in memory.
       */
      if (
        batch.length >= DELETE_BATCH_SIZE
      ) {
        const deleted =
          await redisClient.del(batch);

        deletedCount += deleted;

        batch = [];
      }
    }

    /*
     * Delete the final partial batch.
     */
    if (batch.length > 0) {
      const deleted =
        await redisClient.del(batch);

      deletedCount += deleted;
    }

    console.log(
      `REDIS CACHE PATTERN DELETED: ${pattern} (${deletedCount} keys)`
    );

    return true;
  } catch (error) {
    console.error(
      `Redis DELETE PATTERN error [${pattern}]:`,
      error?.message || error
    );

    return false;
  }
};