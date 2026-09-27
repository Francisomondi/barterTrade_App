// UPDATE — server/src/services/subscriptionService.js

import prisma from "../config/prisma.js";

/*
 * ============================================================
 * SUBSCRIPTION PLAN TYPES
 * ============================================================
 *
 * Keep these centralized so the rest of the application does
 * not scatter raw subscription plan strings everywhere.
 */
export const SUBSCRIPTION_PLANS = Object.freeze({
  PREMIUM: "PREMIUM",
  BUSINESS_PRO: "BUSINESS_PRO",
});

/*
 * ============================================================
 * VALIDATE SUBSCRIPTION PLAN
 * ============================================================
 */
const isValidSubscriptionPlan = (plan) => {
  return Object.values(SUBSCRIPTION_PLANS).includes(plan);
};

/*
 * ============================================================
 * EXPIRE USER SUBSCRIPTIONS
 * ============================================================
 *
 * ACTIVE subscriptions whose endsAt has passed become EXPIRED.
 *
 * This applies to BOTH:
 *
 * - PREMIUM
 * - BUSINESS_PRO
 *
 * Subscription remains the source of truth for entitlement.
 */
export const expireUserSubscriptions = async (userId) => {
  if (!userId) {
    return {
      count: 0,
    };
  }

  const now = new Date();

  return prisma.subscription.updateMany({
    where: {
      userId,

      status: "ACTIVE",

      endsAt: {
        lte: now,
      },
    },

    data: {
      status: "EXPIRED",
    },
  });
};

/*
 * ============================================================
 * GET ACTIVE SUBSCRIPTION BY PLAN
 * ============================================================
 *
 * Generic entitlement lookup.
 *
 * This is the shared foundation for:
 *
 * - Personal Premium
 * - Business Pro
 */
export const getActiveSubscriptionByPlan = async (
  userId,
  plan
) => {
  if (!userId || !isValidSubscriptionPlan(plan)) {
    return null;
  }

  /*
   * Clean expired ACTIVE rows before checking entitlement.
   */
  await expireUserSubscriptions(userId);

  const now = new Date();

  return prisma.subscription.findFirst({
    where: {
      userId,

      plan,

      status: "ACTIVE",

      startsAt: {
        lte: now,
      },

      endsAt: {
        gt: now,
      },
    },

    orderBy: {
      endsAt: "desc",
    },
  });
};

/*
 * ============================================================
 * GET PENDING SUBSCRIPTION BY PLAN
 * ============================================================
 */
export const getPendingSubscriptionByPlan = async (
  userId,
  plan
) => {
  if (!userId || !isValidSubscriptionPlan(plan)) {
    return null;
  }

  return prisma.subscription.findFirst({
    where: {
      userId,

      plan,

      status: "PENDING",
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

/*
 * ============================================================
 * GET ACTIVE PREMIUM SUBSCRIPTION
 * ============================================================
 *
 * Compatibility wrapper.
 *
 * Existing Premium code can continue calling:
 *
 * getActiveSubscription(userId)
 */
export const getActiveSubscription = async (userId) => {
  return getActiveSubscriptionByPlan(
    userId,
    SUBSCRIPTION_PLANS.PREMIUM
  );
};

/*
 * ============================================================
 * GET PENDING PREMIUM SUBSCRIPTION
 * ============================================================
 *
 * Compatibility wrapper for existing Premium code.
 */
export const getPendingSubscription = async (userId) => {
  return getPendingSubscriptionByPlan(
    userId,
    SUBSCRIPTION_PLANS.PREMIUM
  );
};

/*
 * ============================================================
 * IS PREMIUM USER
 * ============================================================
 */
export const isPremiumUser = async (userId) => {
  const subscription =
    await getActiveSubscriptionByPlan(
      userId,
      SUBSCRIPTION_PLANS.PREMIUM
    );

  return Boolean(subscription);
};

/*
 * ============================================================
 * GET PREMIUM STATUS
 * ============================================================
 *
 * Used by /auth/me and other presentation endpoints.
 */
export const getPremiumStatus = async (userId) => {
  const subscription =
    await getActiveSubscriptionByPlan(
      userId,
      SUBSCRIPTION_PLANS.PREMIUM
    );

  if (!subscription) {
    return {
      isPremium: false,
      premiumPlan: null,
      premiumStartedAt: null,
      premiumEndsAt: null,
    };
  }

  return {
    isPremium: true,

    premiumPlan:
      subscription.plan,

    premiumStartedAt:
      subscription.startsAt,

    premiumEndsAt:
      subscription.endsAt,
  };
};

/*
 * ============================================================
 * GET ACTIVE BUSINESS PRO SUBSCRIPTION
 * ============================================================
 *
 * Business Pro is completely independent from Personal Premium.
 */
export const getActiveBusinessProSubscription = async (
  userId
) => {
  return getActiveSubscriptionByPlan(
    userId,
    SUBSCRIPTION_PLANS.BUSINESS_PRO
  );
};

/*
 * ============================================================
 * GET PENDING BUSINESS PRO SUBSCRIPTION
 * ============================================================
 */
export const getPendingBusinessProSubscription = async (
  userId
) => {
  return getPendingSubscriptionByPlan(
    userId,
    SUBSCRIPTION_PLANS.BUSINESS_PRO
  );
};

/*
 * ============================================================
 * IS BUSINESS PRO USER
 * ============================================================
 *
 * IMPORTANT:
 *
 * This only answers whether the USER owns an active
 * BUSINESS_PRO subscription.
 *
 * It does NOT by itself prove that the user owns a business.
 *
 * Business ownership is enforced separately by the Business
 * Pro entitlement resolver below.
 */
export const isBusinessProUser = async (userId) => {
  const subscription =
    await getActiveBusinessProSubscription(userId);

  return Boolean(subscription);
};

/*
 * ============================================================
 * GET BUSINESS PRO ENTITLEMENT
 * ============================================================
 *
 * Central Business Pro entitlement resolver.
 *
 * Requirements:
 *
 * 1. User must exist.
 * 2. User must own a BusinessProfile.
 * 3. User must have an ACTIVE BUSINESS_PRO subscription.
 * 4. startsAt must have been reached.
 * 5. endsAt must still be in the future.
 *
 * Business status is returned separately.
 *
 * CLOSED and SUSPENDED businesses can still have historical
 * subscription records, but callers can decide whether the
 * requested Pro feature is appropriate for that business status.
 */
export const getBusinessProEntitlement = async (userId) => {
  if (!userId) {
    return {
      isBusiness: false,
      isBusinessPro: false,

      plan: null,
      status: null,

      businessId: null,
      businessStatus: null,

      startedAt: null,
      expiresAt: null,
      daysRemaining: 0,
    };
  }

  /*
   * Business ownership is mandatory.
   *
   * We deliberately do NOT derive Business Pro from a field on
   * BusinessProfile.
   */
  const business =
    await prisma.businessProfile.findUnique({
      where: {
        userId,
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (!business) {
    return {
      isBusiness: false,
      isBusinessPro: false,

      plan: null,
      status: null,

      businessId: null,
      businessStatus: null,

      startedAt: null,
      expiresAt: null,
      daysRemaining: 0,
    };
  }

  const subscription =
    await getActiveBusinessProSubscription(userId);

  if (!subscription) {
    return {
      isBusiness: true,
      isBusinessPro: false,

      plan: null,
      status: null,

      businessId: business.id,
      businessStatus: business.status,

      startedAt: null,
      expiresAt: null,
      daysRemaining: 0,
    };
  }

  const now = new Date();

  const remainingMilliseconds =
    subscription.endsAt.getTime() - now.getTime();

  const daysRemaining =
    remainingMilliseconds > 0
      ? Math.ceil(
          remainingMilliseconds /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  return {
    isBusiness: true,
    isBusinessPro: true,

    plan: subscription.plan,
    status: subscription.status,

    businessId: business.id,
    businessStatus: business.status,

    startedAt: subscription.startsAt,
    expiresAt: subscription.endsAt,

    daysRemaining,
  };
};

/*
 * ============================================================
 * GET BUSINESS PRO STATUS
 * ============================================================
 *
 * Presentation-friendly alias.
 *
 * Controllers may use this when returning Business Pro
 * information to the frontend.
 */
export const getBusinessProStatus = async (userId) => {
  return getBusinessProEntitlement(userId);
};

/*
 * ============================================================
 * CAN CREATE SUBSCRIPTION BY PLAN
 * ============================================================
 *
 * Generic version used by both Premium and future Business Pro
 * purchasing flows.
 *
 * IMPORTANT:
 *
 * This does NOT initiate payment.
 *
 * Business Pro payment will be implemented later under:
 *
 * 9.11.20 — Business Pro Monetization
 */
export const canCreateSubscriptionByPlan = async (
  userId,
  plan
) => {
  if (!userId) {
    return {
      allowed: false,

      reason:
        "Authentication is required.",

      code:
        "AUTHENTICATION_REQUIRED",

      subscription: null,
    };
  }

  if (!isValidSubscriptionPlan(plan)) {
    return {
      allowed: false,

      reason:
        "Invalid subscription plan.",

      code:
        "INVALID_SUBSCRIPTION_PLAN",

      subscription: null,
    };
  }

  /*
   * BUSINESS_PRO requires an existing BusinessProfile.
   */
  if (plan === SUBSCRIPTION_PLANS.BUSINESS_PRO) {
    const business =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
        },
      });

    if (!business) {
      return {
        allowed: false,

        reason:
          "Create a business account before upgrading to Business Pro.",

        code:
          "BUSINESS_ACCOUNT_REQUIRED",

        subscription: null,
      };
    }
  }

  const activeSubscription =
    await getActiveSubscriptionByPlan(
      userId,
      plan
    );

  if (activeSubscription) {
    const planLabel =
      plan === SUBSCRIPTION_PLANS.BUSINESS_PRO
        ? "Business Pro"
        : "Premium";

    return {
      allowed: false,

      code:
        "SUBSCRIPTION_ALREADY_ACTIVE",

      reason:
        `Your ${planLabel} membership is already active.`,

      subscription:
        activeSubscription,
    };
  }

  const pendingSubscription =
    await getPendingSubscriptionByPlan(
      userId,
      plan
    );

  if (pendingSubscription) {
    const planLabel =
      plan === SUBSCRIPTION_PLANS.BUSINESS_PRO
        ? "Business Pro"
        : "Premium";

    return {
      allowed: false,

      code:
        "SUBSCRIPTION_ALREADY_PENDING",

      reason:
        `You already have a pending ${planLabel} subscription.`,

      subscription:
        pendingSubscription,
    };
  }

  return {
    allowed: true,
    code: null,
    reason: null,
    subscription: null,
  };
};

/*
 * ============================================================
 * CAN CREATE PREMIUM SUBSCRIPTION
 * ============================================================
 *
 * Compatibility wrapper.
 *
 * Existing Premium controller code can continue using:
 *
 * canCreateSubscription(userId)
 */
export const canCreateSubscription = async (userId) => {
  return canCreateSubscriptionByPlan(
    userId,
    SUBSCRIPTION_PLANS.PREMIUM
  );
};

/*
 * ============================================================
 * CAN CREATE BUSINESS PRO SUBSCRIPTION
 * ============================================================
 *
 * Prepared for 9.11.20.
 *
 * No payment is initiated here.
 */
export const canCreateBusinessProSubscription = async (
  userId
) => {
  return canCreateSubscriptionByPlan(
    userId,
    SUBSCRIPTION_PLANS.BUSINESS_PRO
  );
};