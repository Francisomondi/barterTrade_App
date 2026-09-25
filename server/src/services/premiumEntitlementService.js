import {
  getPremiumStatus,
} from "./subscriptionService.js";

import {
  getEntitlementsForTier,
} from "../config/premiumEntitlements.js";

/*
 * ============================================================
 * GET USER ENTITLEMENTS
 * ============================================================
 */

export const getUserEntitlements = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const premium =
    await getPremiumStatus(
      userId
    );

  const entitlements =
    getEntitlementsForTier(
      premium.isPremium
    );

  return {
    ...entitlements,

    isPremium:
      premium.isPremium,

    premiumPlan:
      premium.premiumPlan,

    premiumStartedAt:
      premium.premiumStartedAt,

    premiumEndsAt:
      premium.premiumEndsAt,
  };
};

/*
 * ============================================================
 * CALCULATE PROMOTION PRICE
 * ============================================================
 *
 * Never accepts a discount from the frontend.
 */

export const calculatePromotionPrice =
  async ({
    userId,
    baseAmount,
  }) => {
    const amount =
      Number(baseAmount);

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      throw new Error(
        "Invalid promotion amount."
      );
    }

    const entitlements =
      await getUserEntitlements(
        userId
      );

    const discountPercent =
      entitlements
        .promotionDiscountPercent;

    const discountAmount =
      Number(
        (
          amount *
          (discountPercent / 100)
        ).toFixed(2)
      );

    const finalAmount =
      Number(
        Math.max(
          0,
          amount -
            discountAmount
        ).toFixed(2)
      );

    return {
      isPremium:
        entitlements.isPremium,

      tier:
        entitlements.tier,

      baseAmount:
        amount,

      discountPercent,

      discountAmount,

      finalAmount,

      currency: "KES",
    };
  };

/*
 * ============================================================
 * ACTIVE LISTING LIMIT
 * ============================================================
 */

export const getListingLimit =
  async (userId) => {
    const entitlements =
      await getUserEntitlements(
        userId
      );

    return {
      isPremium:
        entitlements.isPremium,

      tier:
        entitlements.tier,

      limit:
        entitlements
          .activeListingLimit,
    };
  };

/*
 * ============================================================
 * ADVANCED ANALYTICS ACCESS
 * ============================================================
 */

export const hasAdvancedAnalytics =
  async (userId) => {
    const entitlements =
      await getUserEntitlements(
        userId
      );

    return Boolean(
      entitlements
        .advancedAnalytics
    );
  };

/*
 * ============================================================
 * PRIORITY SUPPORT ACCESS
 * ============================================================
 */

export const hasPrioritySupport =
  async (userId) => {
    const entitlements =
      await getUserEntitlements(
        userId
      );

    return Boolean(
      entitlements
        .prioritySupport
    );
  };