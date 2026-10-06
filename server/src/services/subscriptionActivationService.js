import prisma from "../config/prisma.js";

/*
 * ============================================================
 * ACTIVATE SUBSCRIPTION INSIDE EXISTING TRANSACTION
 * ============================================================
 *
 * IMPORTANT:
 *
 * This function does NOT create its own transaction.
 *
 * It receives Prisma's transaction client so:
 *
 * Payment = COMPLETED
 *
 * and
 *
 * Subscription = ACTIVE
 *
 * can happen in the same DB transaction.
 *
 * Supports:
 *
 * - normal subscription activation
 * - safe subscription renewal
 * - duplicate callback recovery
 */
export const activateSubscriptionWithTx = async ({
  tx,
  subscriptionId,
  paymentId,
  activatedAt = new Date(),
}) => {
  if (!tx) {
    throw new Error(
      "Transaction client is required."
    );
  }

  if (!subscriptionId) {
    throw new Error(
      "Subscription ID is required."
    );
  }

  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  /*
   * ==========================================================
   * GET SUBSCRIPTION
   * ==========================================================
   */

  const subscription =
    await tx.subscription.findUnique({
      where: {
        id: subscriptionId,
      },

      include: {
        renewalOf: true,
      },
    });

  if (!subscription) {
    throw new Error(
      "Subscription not found."
    );
  }

  /*
   * ==========================================================
   * VERIFY PAYMENT
   * ==========================================================
   */

  const payment =
    await tx.payment.findFirst({
      where: {
        id: paymentId,

        subscriptionId:
          subscription.id,

        userId:
          subscription.userId,

        type:
          "SUBSCRIPTION",

        status:
          "COMPLETED",
      },
    });

  if (!payment) {
    throw new Error(
      "Completed subscription payment not found."
    );
  }

  /*
   * ==========================================================
   * IDEMPOTENCY
   * ==========================================================
   *
   * Never restart or extend an already ACTIVE subscription.
   *
   * Duplicate Safaricom callbacks therefore remain harmless.
   */

  if (
    subscription.status ===
    "ACTIVE"
  ) {
    return subscription;
  }

  /*
   * Only PENDING subscriptions may activate.
   */

  if (
    subscription.status !==
    "PENDING"
  ) {
    throw new Error(
      `Subscription cannot be activated from status ${subscription.status}.`
    );
  }

  /*
   * ==========================================================
   * VALIDATE RENEWAL RELATIONSHIP
   * ==========================================================
   */

  if (subscription.renewalOfId) {
    const previous =
      subscription.renewalOf;

    if (!previous) {
      throw new Error(
        "Renewal source subscription not found."
      );
    }

    if (
      previous.userId !==
      subscription.userId
    ) {
      throw new Error(
        "Renewal subscription belongs to a different user."
      );
    }

    if (
      previous.plan !==
      subscription.plan
    ) {
      throw new Error(
        "Renewal subscription plan does not match the previous subscription."
      );
    }

    if (!previous.endsAt) {
      throw new Error(
        "Previous subscription does not have an expiry date."
      );
    }
  }

  /*
   * ==========================================================
   * CALCULATE MEMBERSHIP PERIOD
   * ==========================================================
   */

  const activationTime =
    new Date(activatedAt);

  let startsAt =
    new Date(activationTime);

  /*
   * RENEWAL:
   *
   * If the previous subscription still has paid time remaining,
   * begin the renewed period when that subscription expires.
   *
   * If it has already expired by the time payment completes,
   * begin immediately.
   */

  if (
    subscription.renewalOf?.endsAt
  ) {
    const previousEndsAt =
      new Date(
        subscription
          .renewalOf
          .endsAt
      );

    if (
      previousEndsAt >
      activationTime
    ) {
      startsAt =
        previousEndsAt;
    }
  }

  const endsAt =
    new Date(startsAt);

  endsAt.setDate(
    endsAt.getDate() +
      subscription.durationDays
  );

  /*
   * ==========================================================
   * ACTIVATE SUBSCRIPTION
   * ==========================================================
   */

  const activatedSubscription =
    await tx.subscription.update({
      where: {
        id:
          subscription.id,
      },

      data: {
        status:
          "ACTIVE",

        startsAt,

        endsAt,
      },

      include: {
        renewalOf: true,
      },
    });

  /*
   * ==========================================================
   * CANCEL OTHER PENDING PAYMENT ATTEMPTS
   * ==========================================================
   */

  await tx.payment.updateMany({
    where: {
      subscriptionId:
        subscription.id,

      type:
        "SUBSCRIPTION",

      status:
        "PENDING",

      id: {
        not:
          payment.id,
      },
    },

    data: {
      status:
        "CANCELLED",

      resultDescription:
        "Subscription activated by another successful payment attempt.",
    },
  });

  return activatedSubscription;
};

/*
 * ============================================================
 * STANDALONE ACTIVATION / RECOVERY
 * ============================================================
 */

export const activateSubscription = async ({
  subscriptionId,
  paymentId,
  activatedAt = new Date(),
}) => {
  if (!subscriptionId) {
    throw new Error(
      "Subscription ID is required."
    );
  }

  if (!paymentId) {
    throw new Error(
      "Payment ID is required."
    );
  }

  return prisma.$transaction(
    async (tx) => {
      return activateSubscriptionWithTx({
        tx,
        subscriptionId,
        paymentId,
        activatedAt,
      });
    }
  );
};