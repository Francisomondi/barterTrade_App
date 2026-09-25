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
    });

  if (!subscription) {
    throw new Error(
      "Subscription not found."
    );
  }

  /*
   * ==========================================================
   * VERIFY PAYMENT BELONGS TO THIS SUBSCRIPTION
   * ==========================================================
   *
   * We verify this BEFORE the ACTIVE idempotency return.
   *
   * That prevents an unrelated paymentId from being accepted
   * merely because the subscription is already ACTIVE.
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
   * Never restart or extend an ACTIVE subscription.
   *
   * This is critical for duplicate M-Pesa callbacks.
   */

  if (
    subscription.status ===
    "ACTIVE"
  ) {
    return subscription;
  }

  /*
   * Only PENDING can transition into ACTIVE.
   *
   * EXPIRED subscriptions are never reactivated.
   * Renewal must use a NEW subscription row.
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
   * CALCULATE NEW MEMBERSHIP PERIOD
   * ==========================================================
   *
   * Renewal never stacks onto an old endsAt.
   *
   * A new subscription starts from successful activation time.
   */

  const startsAt =
    new Date(activatedAt);

  const endsAt =
    new Date(startsAt);

  endsAt.setDate(
    endsAt.getDate() +
      subscription.durationDays
  );

  /*
   * ==========================================================
   * ACTIVATE
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
 *
 * Used for:
 *
 * - duplicate callback recovery
 * - reconciliation
 * - recovery of Payment COMPLETED + Subscription PENDING
 *
 * Redis/cache side effects do NOT belong here.
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