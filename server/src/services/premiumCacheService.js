import redis from "../config/redis.js";

/**
 * ============================================================
 * PREMIUM PRESENTATION CACHE VERSIONING
 * ============================================================
 *
 * IMPORTANT:
 *
 * Subscription records remain the source of truth.
 *
 * These cache versions are ONLY for presentation data such as:
 *
 * - Premium badges
 * - seller Premium state
 * - marketplace listing cards
 *
 * Never use these values for authorization.
 */

const GLOBAL_PREMIUM_CACHE_VERSION_KEY =
  "premium-cache-version:global";

const getPremiumCacheVersionKey = (
  userId
) =>
  `premium-cache-version:${userId}`;

/**
 * ============================================================
 * GET USER PREMIUM CACHE VERSION
 * ============================================================
 */

export const getPremiumCacheVersion =
  async (userId) => {
    if (!userId) {
      return "0";
    }

    try {
      const version =
        await redis.get(
          getPremiumCacheVersionKey(
            userId
          )
        );

      return version || "0";
    } catch (error) {
      console.error(
        "GET PREMIUM CACHE VERSION ERROR:",
        error
      );

      return "0";
    }
  };

/**
 * ============================================================
 * GET GLOBAL PREMIUM CACHE VERSION
 * ============================================================
 */

export const getGlobalPremiumCacheVersion =
  async () => {
    try {
      const version =
        await redis.get(
          GLOBAL_PREMIUM_CACHE_VERSION_KEY
        );

      return version || "0";
    } catch (error) {
      console.error(
        "GET GLOBAL PREMIUM CACHE VERSION ERROR:",
        error
      );

      return "0";
    }
  };

/**
 * ============================================================
 * INVALIDATE PREMIUM PRESENTATION CACHE
 * ============================================================
 */

export const invalidatePremiumCache =
  async (userId) => {
    if (!userId) {
      return null;
    }

    try {
      const [
        userVersion,
        globalVersion,
      ] =
        await Promise.all([
          redis.incr(
            getPremiumCacheVersionKey(
              userId
            )
          ),

          redis.incr(
            GLOBAL_PREMIUM_CACHE_VERSION_KEY
          ),
        ]);

      console.log(
        `Premium cache invalidated for user ${userId}. User version: ${userVersion}, global version: ${globalVersion}`
      );

      return {
        userVersion:
          String(
            userVersion
          ),

        globalVersion:
          String(
            globalVersion
          ),
      };
    } catch (error) {
      console.error(
        "INVALIDATE PREMIUM CACHE ERROR:",
        error
      );

      return null;
    }
  };