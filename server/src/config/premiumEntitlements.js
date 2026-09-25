/*
 * ============================================================
 * PREMIUM ENTITLEMENTS
 * ============================================================
 *
 * Central configuration for Free vs Premium capabilities.
 *
 * IMPORTANT:
 * These values are enforced by the backend.
 * React must never be treated as the authority.
 */

export const FREE_ENTITLEMENTS = {
  activeListingLimit: 10,

  promotionDiscountPercent: 0,

  advancedAnalytics: false,

  prioritySupport: false,
};

export const PREMIUM_ENTITLEMENTS = {
  activeListingLimit: 30,

  promotionDiscountPercent: 20,

  advancedAnalytics: true,

  prioritySupport: true,
};

/*
 * ============================================================
 * GET ENTITLEMENTS
 * ============================================================
 */

export const getEntitlementsForTier = (
  isPremium
) => {
  return isPremium
    ? {
        tier: "PREMIUM",
        ...PREMIUM_ENTITLEMENTS,
      }
    : {
        tier: "FREE",
        ...FREE_ENTITLEMENTS,
      };
};