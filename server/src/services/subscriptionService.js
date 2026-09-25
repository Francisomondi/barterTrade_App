import prisma from "../config/prisma.js";

/*
 * ============================================================
 * EXPIRE USER SUBSCRIPTIONS
 * ============================================================
 *
 * ACTIVE subscriptions whose endsAt has passed become EXPIRED.
 *
 * Subscription is the source of truth for Premium entitlement.
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
 * GET ACTIVE SUBSCRIPTION
 * ============================================================
 */
export const getActiveSubscription = async (userId) => {
  if (!userId) {
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

      plan: "PREMIUM",

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
 * GET PENDING SUBSCRIPTION
 * ============================================================
 */
export const getPendingSubscription = async (userId) => {
  if (!userId) {
    return null;
  }

  return prisma.subscription.findFirst({
    where: {
      userId,

      plan: "PREMIUM",

      status: "PENDING",
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

/*
 * ============================================================
 * IS PREMIUM USER
 * ============================================================
 */
export const isPremiumUser = async (userId) => {
  const subscription =
    await getActiveSubscription(userId);

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
    await getActiveSubscription(userId);

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
 * CAN CREATE SUBSCRIPTION
 * ============================================================
 *
 * NOTE:
 *
 * Your current subscriptionController no longer uses this helper
 * because it needs to REUSE an existing PENDING subscription.
 *
 * We keep this export for compatibility with any other code that
 * may still import it.
 *
 * ACTIVE:
 *   cannot create another subscription.
 *
 * PENDING:
 *   should reuse the existing pending subscription.
 *
 * EXPIRED / CANCELLED:
 *   may purchase again.
 */
export const canCreateSubscription = async (userId) => {
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

  const activeSubscription =
    await getActiveSubscription(userId);

  if (activeSubscription) {
    return {
      allowed: false,

      code:
        "SUBSCRIPTION_ALREADY_ACTIVE",

      reason:
        "Your Premium membership is already active.",

      subscription:
        activeSubscription,
    };
  }

  const pendingSubscription =
    await getPendingSubscription(userId);

  if (pendingSubscription) {
    return {
      allowed: false,

      code:
        "SUBSCRIPTION_ALREADY_PENDING",

      reason:
        "You already have a pending Premium subscription.",

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