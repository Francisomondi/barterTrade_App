import prisma from "../config/prisma.js";

/*
 * ============================================================
 * EXPIRE ALL OUTDATED SUBSCRIPTIONS
 * ============================================================
 *
 * Converts:
 *
 * ACTIVE + endsAt <= now
 *
 * into:
 *
 * EXPIRED
 *
 * This does NOT delete subscriptions.
 *
 * Historical subscription/payment data must remain available.
 */
export const expireSubscriptions = async () => {
  try {
    const now = new Date();

    const result =
      await prisma.subscription.updateMany({
        where: {
          status: "ACTIVE",

          endsAt: {
            lte: now,
          },
        },

        data: {
          status: "EXPIRED",
        },
      });

    if (result.count > 0) {
      console.log(
        `SUBSCRIPTION EXPIRY: ${result.count} subscription(s) expired.`
      );
    }

    return {
      success: true,

      expiredCount:
        result.count,

      checkedAt:
        now,
    };
  } catch (error) {
    console.error(
      "EXPIRE SUBSCRIPTIONS ERROR:",
      error
    );

    throw error;
  }
};

/*
 * ============================================================
 * EXPIRE ONE SUBSCRIPTION
 * ============================================================
 *
 * Used when loading/checking one subscription.
 */
export const expireSubscriptionIfNeeded = async (
  subscriptionId
) => {
  if (!subscriptionId) {
    return null;
  }

  try {
    const now = new Date();

    /*
     * Only ACTIVE subscriptions can expire.
     *
     * PENDING subscriptions are intentionally left alone because
     * they may still have a valid/late M-Pesa callback.
     */
    await prisma.subscription.updateMany({
      where: {
        id: subscriptionId,

        status: "ACTIVE",

        endsAt: {
          lte: now,
        },
      },

      data: {
        status: "EXPIRED",
      },
    });

    return prisma.subscription.findUnique({
      where: {
        id: subscriptionId,
      },
    });
  } catch (error) {
    console.error(
      "EXPIRE SUBSCRIPTION ERROR:",
      error
    );

    throw error;
  }
};