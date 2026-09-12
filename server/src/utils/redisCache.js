import redisClient from "../config/redis.js";

/**

* Get data from Redis cache.
*
* @param {string} key
* @returns {Promise<any|null>}
  */
  export const getCache = async (key) => {
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
console.error(`Redis GET error [${key}]:`, error.message);
return null;
}
};

/**

* Store data in Redis cache.
*
* @param {string} key
* @param {any} data
* @param {number} ttlSeconds
* @returns {Promise<boolean>}
  */
  export const setCache = async (key, data, ttlSeconds = 300) => {
  if (!redisClient || !redisClient.isReady) {
  return false;
  }

try {
await redisClient.set(key, JSON.stringify(data), {
EX: ttlSeconds,
});


return true;


} catch (error) {
console.error(`Redis SET error [${key}]:`, error.message);
return false;
}
};

/**

* Delete one cache entry.
*
* @param {string} key
* @returns {Promise<boolean>}
  */
  export const deleteCache = async (key) => {
  if (!redisClient || !redisClient.isReady) {
  return false;
  }

try {
await redisClient.del(key);


return true;


} catch (error) {
console.error(`Redis DELETE error [${key}]:`, error.message);
return false;
}
};

/**

* Delete multiple cache entries.
*
* @param {string[]} keys
* @returns {Promise<boolean>}
  */
  export const deleteCaches = async (keys = []) => {
  if (!redisClient || !redisClient.isReady) {
  return false;
  }

if (!Array.isArray(keys) || keys.length === 0) {
return true;
}

try {
await redisClient.del(keys);


return true;


} catch (error) {
console.error("Redis DELETE MULTIPLE error:", error.message);
return false;
}
};

/**

* Delete cache entries matching a pattern.
*
* Example:
* deleteCacheByPattern("listings:*")
*
* @param {string} pattern
* @returns {Promise<boolean>}
  */
  export const deleteCacheByPattern = async (pattern) => {
  if (!redisClient || !redisClient.isReady) {
  return false;
  }

try {
const keys = [];


for await (const key of redisClient.scanIterator({
  MATCH: pattern,
  COUNT: 100,
})) {
  keys.push(key);
}

if (keys.length > 0) {
  await redisClient.del(keys);
}

return true;


} catch (error) {
console.error(
`Redis DELETE PATTERN error [${pattern}]:`,
error.message
);


return false;


}
};
