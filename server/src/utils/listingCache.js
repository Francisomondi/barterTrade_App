import {
deleteCache,
deleteCacheByPattern,
} from "./redisCache.js";

/**

* Invalidate the cache for one listing.
*
* Removes:
* * Individual listing cache
* * All marketplace listing caches
    */
    export const invalidateListingCache = async (listingId) => {
    try {
    if (listingId) {
    await deleteCache(`listing:${listingId}`);
    }

  await deleteCacheByPattern("listings:all:*");

  console.log(
  `REDIS CACHE INVALIDATED: listing:${listingId || "all"}`
  );

  return true;
  } catch (error) {
  console.error(
  "LISTING CACHE INVALIDATION ERROR:",
  error.message
  );

  return false;
  }
  };

/**

* Invalidate all marketplace listing caches.
*
* Used when a new listing is created or when
* a change can affect marketplace results.
  */
  export const invalidateAllListingsCache = async () => {
  try {
  await deleteCacheByPattern("listings:all:*");

  console.log(
  "REDIS MARKETPLACE CACHE INVALIDATED"
  );

  return true;
  } catch (error) {
  console.error(
  "MARKETPLACE CACHE INVALIDATION ERROR:",
  error.message
  );

  return false;
  }
  };
