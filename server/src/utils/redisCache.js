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
    const cachedData =
      await redisClient.get(key);

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
 * Delete one Redis cache key.
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export const deleteCache = async (key) => {
  if (
    !key ||
    typeof key !== "string"
  ) {
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
 * Delete multiple Redis keys.
 *
 * Invalid and duplicate keys are removed before
 * the DEL command is sent.
 *
 * @param {string[]} keys
 * @returns {Promise<boolean>}
 */
export const deleteCaches = async (
  keys = []
) => {
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
   * Remove invalid and duplicate keys.
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
    const deletedCount =
      await redisClient.del(validKeys);

    console.log(
      `REDIS CACHE KEYS DELETED: ${deletedCount}`
    );

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
 * Examples:
 *
 * deleteCacheByPattern("listing:*")
 * deleteCacheByPattern("listings:all:*")
 *
 * IMPORTANT:
 *
 * SCAN is used instead of KEYS.
 *
 * KEYS can block Redis while inspecting the entire
 * keyspace. SCAN iterates incrementally and is safer
 * for production workloads.
 *
 * Different node-redis versions may yield either:
 *
 * - one key per scan iteration
 * - an array of keys per scan iteration
 *
 * Therefore every result is normalized before it is
 * added to the deletion batch.
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
     * Prevent sending a very large DEL command
     * when many matching keys exist.
     */
    const DELETE_BATCH_SIZE = 100;

    let batch = [];
    let deletedCount = 0;

    /**
     * --------------------------------------------------------
     * FLUSH CURRENT DELETE BATCH
     * --------------------------------------------------------
     */
    const flushBatch = async () => {
      if (batch.length === 0) {
        return;
      }

      /*
       * Defensive normalization.
       *
       * Redis DEL must only receive valid keys.
       */
      const validKeys = [
        ...new Set(
          batch.filter(
            (key) =>
              (
                typeof key === "string" &&
                key.length > 0
              ) ||
              Buffer.isBuffer(key)
          )
        ),
      ];

      /*
       * Clear the current batch before performing
       * the network request.
       */
      batch = [];

      if (validKeys.length === 0) {
        return;
      }

      const deleted =
        await redisClient.del(validKeys);

      deletedCount +=
        Number(deleted) || 0;
    };

    /**
     * --------------------------------------------------------
     * SCAN REDIS
     * --------------------------------------------------------
     */
    for await (
      const result of
        redisClient.scanIterator({
          MATCH: pattern,
          COUNT: 100,
        })
    ) {
      /*
       * node-redis versions can differ in what
       * scanIterator yields.
       *
       * Normalize both forms:
       *
       * "listing:123"
       *
       * or
       *
       * [
       *   "listing:123",
       *   "listing:456"
       * ]
       */
      const scannedKeys =
        Array.isArray(result)
          ? result
          : [result];

      for (const key of scannedKeys) {
        /*
         * Redis keys should only be strings
         * or Buffers.
         */
        if (
          typeof key !== "string" &&
          !Buffer.isBuffer(key)
        ) {
          console.warn(
            `REDIS SCAN SKIPPED INVALID KEY [${pattern}]:`,
            key
          );

          continue;
        }

        /*
         * Ignore empty string keys.
         */
        if (
          typeof key === "string" &&
          key.length === 0
        ) {
          continue;
        }

        batch.push(key);

        /*
         * Delete incrementally.
         */
        if (
          batch.length >=
          DELETE_BATCH_SIZE
        ) {
          await flushBatch();
        }
      }
    }

    /**
     * --------------------------------------------------------
     * DELETE FINAL PARTIAL BATCH
     * --------------------------------------------------------
     */
    await flushBatch();

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