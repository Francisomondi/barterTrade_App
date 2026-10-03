import {
  deleteCache,
  deleteCacheByPattern,
} from "./redisCache.js";

/**
 * ============================================================
 * INVALIDATE ONE LISTING
 * ============================================================
 *
 * Used when a listing itself changes.
 *
 * Removes:
 * - Individual listing cache
 * - Marketplace listing caches that may contain the listing
 *
 * Returns:
 * true  -> all required invalidation operations succeeded
 * false -> one or more invalidation operations failed
 */
export const invalidateListingCache = async (listingId) => {
  try {
    let individualDeleted = true;

    /*
     * Delete the individual listing cache when an ID
     * was supplied.
     */
    if (listingId) {
      individualDeleted = await deleteCache(
        `listing:${listingId}`
      );
    }

    /*
     * Marketplace responses may also contain this listing.
     */
    const marketplaceDeleted =
      await deleteCacheByPattern("listings:all:*");

    /*
     * redisCache.js returns false instead of throwing when
     * Redis is unavailable or an operation fails.
     *
     * Therefore we must explicitly inspect the results.
     */
    if (
      !individualDeleted ||
      !marketplaceDeleted
    ) {
      console.warn(
        `REDIS LISTING CACHE INVALIDATION INCOMPLETE: ${
          listingId || "all"
        }`
      );

      return false;
    }

    console.log(
      `REDIS CACHE INVALIDATED: listing:${
        listingId || "all"
      }`
    );

    return true;
  } catch (error) {
    console.error(
      "LISTING CACHE INVALIDATION ERROR:",
      error?.message || error
    );

    return false;
  }
};

/**
 * ============================================================
 * INVALIDATE LISTINGS AFTER USER PROFILE CHANGE
 * ============================================================
 *
 * Listing responses can contain seller information such as:
 *
 * - seller name
 * - seller avatar
 * - seller bio
 * - seller location
 *
 * Therefore profile/avatar changes can make cached listing
 * responses stale.
 *
 * IMPORTANT:
 *
 * Current individual listing keys use:
 *
 * listing:<listingId>
 *
 * They do NOT currently use:
 *
 * user:<userId>:listing:<listingId>
 *
 * Therefore we cannot invalidate only one seller's listing
 * cache using userId alone.
 *
 * For correctness we currently invalidate:
 *
 * - all individual listing caches
 * - all marketplace listing caches
 *
 * Later, this can be optimized by introducing seller-aware
 * cache keys or by retrieving the seller's listing IDs first.
 *
 * Returns:
 * true  -> all required invalidation operations succeeded
 * false -> one or more invalidation operations failed
 */
export const invalidateUserListingsCache = async (
  userId
) => {
  try {
    if (!userId) {
      console.warn(
        "USER LISTING CACHE INVALIDATION SKIPPED: missing userId"
      );

      return false;
    }

    /*
     * Individual listing pages can contain seller
     * information.
     *
     * Because current cache keys don't contain userId,
     * invalidate all individual listing caches.
     */
    const individualListingsDeleted =
      await deleteCacheByPattern("listing:*");

    /*
     * Marketplace/listing collection responses can also
     * contain seller information.
     */
    const marketplaceListingsDeleted =
      await deleteCacheByPattern("listings:all:*");

    /*
     * IMPORTANT:
     *
     * deleteCacheByPattern() returns false when Redis is
     * unavailable or deletion fails.
     *
     * Do not report successful invalidation unless BOTH
     * operations succeeded.
     */
    if (
      !individualListingsDeleted ||
      !marketplaceListingsDeleted
    ) {
      console.warn(
        `REDIS USER LISTING CACHE INVALIDATION INCOMPLETE: ${userId}`,
        {
          individualListingsDeleted,
          marketplaceListingsDeleted,
        }
      );

      return false;
    }

    console.log(
      `REDIS USER LISTING CACHE INVALIDATED: ${userId}`
    );

    return true;
  } catch (error) {
    console.error(
      "USER LISTING CACHE INVALIDATION ERROR:",
      error?.message || error
    );

    return false;
  }
};

/**
 * ============================================================
 * INVALIDATE MARKETPLACE LISTING CACHE
 * ============================================================
 *
 * Used when marketplace collection responses need to be
 * refreshed.
 *
 * Removes:
 *
 * listings:all:*
 *
 * This does NOT remove individual:
 *
 * listing:<listingId>
 *
 * caches.
 *
 * Returns:
 * true  -> invalidation succeeded
 * false -> invalidation failed
 */
export const invalidateAllListingsCache = async () => {
  try {
    const marketplaceDeleted =
      await deleteCacheByPattern("listings:all:*");

    /*
     * redisCache.js returns false instead of throwing when
     * Redis is unavailable or deletion fails.
     */
    if (!marketplaceDeleted) {
      console.warn(
        "REDIS MARKETPLACE CACHE INVALIDATION INCOMPLETE"
      );

      return false;
    }

    console.log(
      "REDIS MARKETPLACE CACHE INVALIDATED"
    );

    return true;
  } catch (error) {
    console.error(
      "MARKETPLACE CACHE INVALIDATION ERROR:",
      error?.message || error
    );

    return false;
  }
};