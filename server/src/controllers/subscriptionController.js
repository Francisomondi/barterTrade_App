import prisma from "../config/prisma.js";
import {SUBSCRIPTION_PLANS,getSubscriptionPlan} from "../config/subscriptionPlans.js";
import { expireSubscriptions,expireSubscriptionIfNeeded} from "../services/subscriptionExpiryService.js";
import {initiateStkPush} from "../services/mpesaService.js";
import { getActiveSubscription,} from "../services/subscriptionService.js";

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const MPESA_STK_RETRY_AFTER_MS =
  40 * 1000;

/*
 * ============================================================
 * PHONE NUMBER NORMALIZATION
 * ============================================================
 */

const normalizeKenyanPhone = (
  phoneNumber
) => {
  if (!phoneNumber) {
    return null;
  }

  let phone = String(
    phoneNumber
  )
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (
    phone.startsWith("+")
  ) {
    phone =
      phone.substring(1);
  }

  if (
    phone.startsWith("0")
  ) {
    phone =
      `254${phone.substring(
        1
      )}`;
  }

  if (
    phone.startsWith("7") ||
    phone.startsWith("1")
  ) {
    phone = `254${phone}`;
  }

  /*
   * Kenyan mobile:
   * 2547XXXXXXXX
   * 2541XXXXXXXX
   */
  if (
    !/^254[17]\d{8}$/.test(
      phone
    )
  ) {
    return null;
  }

  return phone;
};

/*
 * ============================================================
 * GET SUBSCRIPTION PLANS
 * ============================================================
 *
 * GET /api/subscriptions/plans
 */

export const getSubscriptionPlans =
  async (req, res) => {
    try {
      const plans =
        Object.values(
          SUBSCRIPTION_PLANS
        );

      return res
        .status(200)
        .json({
          success: true,
          plans,
        });
    } catch (error) {
      console.error(
        "GET SUBSCRIPTION PLANS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load subscription plans.",
        });
    }
  };

/*
 * ============================================================
 * CREATE SUBSCRIPTION
 * ============================================================
 *
 * POST /api/subscriptions
 *
 * BODY:
 * {
 *   plan: "PREMIUM"
 * }
 */

export const createSubscription = async (req, res) => {
    try {
      /*
       
       * EXPIRE OLD ACTIVE SUBSCRIPTIONS
       * ======================================================
       */

      await expireSubscriptions();

      const userId =
        req.user.id;

      const {
        plan: requestedPlan,
      } = req.body;

      /*
       * ======================================================
       * VALIDATE PLAN
       * ======================================================
       */

      const plan =
        getSubscriptionPlan(
          requestedPlan
        );

      if (!plan) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "INVALID_SUBSCRIPTION_PLAN",

            message:
              "Invalid subscription plan.",
          });
      }

      /*
       * ======================================================
       * BLOCK EARLY RENEWAL
       * ======================================================
       *
       * A user with an ACTIVE Premium subscription cannot
       * create another subscription.
       *
       * This prevents subscription stacking.
       */

      const activeSubscription =
        await getActiveSubscription(
          userId
        );

      if (activeSubscription) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "SUBSCRIPTION_ALREADY_ACTIVE",

            message:
              "Your Premium membership is already active. You can renew after it expires.",

            subscription:
              activeSubscription,
          });
      }

      /*
       * ======================================================
       * FIND EXISTING PENDING SUBSCRIPTION
       * ======================================================
       *
       * We reuse a valid PENDING subscription instead of
       * creating duplicate subscription rows every time the
       * user returns to the Premium page.
       */

      const pendingSubscription =
        await prisma.subscription.findFirst({
          where: {
            userId,

            plan:
              plan.type,

            status:
              "PENDING",
          },

          orderBy: {
            createdAt:
              "desc",
          },

          include: {
            payments: {
              where: {
                type:
                  "SUBSCRIPTION",
              },

              orderBy: {
                createdAt:
                  "desc",
              },
            },
          },
        });

      /*
       * ======================================================
       * HANDLE EXISTING PENDING SUBSCRIPTION
       * ======================================================
       */

      if (pendingSubscription) {
        /*
         * ----------------------------------------------------
         * COMPLETED PAYMENT RECOVERY
         * ----------------------------------------------------
         *
         * If a completed payment exists but the subscription
         * is somehow still PENDING, do NOT create another
         * subscription or another STK request.
         *
         * Callback recovery will be hardened separately.
         */

        const completedPayment =
          pendingSubscription.payments.find(
            (payment) =>
              payment.status ===
              "COMPLETED"
          );

        if (completedPayment) {
          return res
            .status(409)
            .json({
              success: false,

              code:
                "SUBSCRIPTION_PAYMENT_COMPLETED",

              message:
                "Payment for this Premium subscription has already been completed. Activation is being finalized.",

              subscription:
                pendingSubscription,

              payment:
                completedPayment,
            });
        }

        /*
         * ----------------------------------------------------
         * LIVE M-PESA PAYMENT
         * ----------------------------------------------------
         *
         * If there is a recent PENDING payment, preserve the
         * current subscription/payment instead of creating a
         * duplicate.
         */

        const pendingPayment =
          pendingSubscription.payments.find(
            (payment) =>
              payment.status ===
              "PENDING"
          );

        if (pendingPayment) {
          const paymentAge =
            Date.now() -
            new Date(
              pendingPayment.createdAt
            ).getTime();

          if (
            paymentAge <
            MPESA_STK_RETRY_AFTER_MS
          ) {
            const retryAfterSeconds =
              Math.max(
                1,
                Math.ceil(
                  (
                    MPESA_STK_RETRY_AFTER_MS -
                    paymentAge
                  ) /
                    1000
                )
              );

            return res
              .status(200)
              .json({
                success: true,

                reused: true,

                paymentPending: true,

                retryAfterSeconds,

                message:
                  "Your M-Pesa payment request is still pending.",

                subscription:
                  pendingSubscription,

                payment:
                  pendingPayment,
              });
          }
        }

        /*
         * ----------------------------------------------------
         * REUSE PENDING SUBSCRIPTION
         * ----------------------------------------------------
         *
         * Failed, cancelled, or sufficiently old payment
         * attempts do not require a new Subscription row.
         *
         * /:id/pay will deal with stale Payment attempts and
         * create a fresh Payment when necessary.
         */

        return res
          .status(200)
          .json({
            success: true,

            reused: true,

            paymentPending: false,

            message:
              "Existing pending subscription returned. Continue payment to activate Premium.",

            subscription:
              pendingSubscription,
          });
      }

      /*
       * ======================================================
       * CREATE NEW PENDING SUBSCRIPTION
       * ======================================================
       *
       * This is reached when:
       *
       * - user has never subscribed, or
       * - previous subscriptions are EXPIRED/CANCELLED.
       *
       * Price/duration always come from server configuration.
       */

      const subscription =
        await prisma.subscription.create({
          data: {
            userId,

            plan:
              plan.type,

            status:
              "PENDING",

            amount:
              plan.amount,

            currency:
              plan.currency,

            durationDays:
              plan.durationDays,
          },
        });

      return res
        .status(201)
        .json({
          success: true,

          reused: false,

          paymentPending: false,

          message:
            "Subscription created. Complete payment to activate Premium.",

          subscription,
        });
    } catch (error) {
      console.error(
        "CREATE SUBSCRIPTION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to create subscription.",
        });
    }
};

/*
 * ============================================================
 * GET MY SUBSCRIPTION
 * ============================================================
 *
 * GET /api/subscriptions/me
 */

export const getMySubscription =
  async (req, res) => {
    try {
      await expireSubscriptions();

      const userId =
        req.user.id;

      /*
       * Return latest subscriptions so frontend can show:
       *
       * ACTIVE
       * PENDING
       * EXPIRED
       */

      const subscriptions =
        await prisma.subscription.findMany({
          where: {
            userId,
          },

          orderBy: {
            createdAt:
              "desc",
          },

          include: {
            payments: {
              orderBy: {
                createdAt:
                  "desc",
              },

              take: 1,
            },
          },
        });

      const now =
        new Date();

      const activeSubscription =
        subscriptions.find(
          (subscription) =>
            subscription.status ===
              "ACTIVE" &&
            subscription.startsAt &&
            subscription.endsAt &&
            new Date(
              subscription.startsAt
            ) <= now &&
            new Date(
              subscription.endsAt
            ) > now
        ) || null;

      const pendingSubscription =
        subscriptions.find(
          (subscription) =>
            subscription.status ===
            "PENDING"
        ) || null;

      return res
        .status(200)
        .json({
          success: true,

          isPremium:
            Boolean(
              activeSubscription
            ),

          activeSubscription,

          pendingSubscription,

          subscriptions,
        });
    } catch (error) {
      console.error(
        "GET MY SUBSCRIPTION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load subscription.",
        });
    }
  };

/*
 * ============================================================
 * GET ONE SUBSCRIPTION
 * ============================================================
 *
 * GET /api/subscriptions/:id
 */

export const getSubscription =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const { id } =
        req.params;

      await expireSubscriptionIfNeeded(
        id
      );

      const subscription =
        await prisma.subscription.findFirst({
          where: {
            id,
            userId,
          },

          include: {
            payments: {
              orderBy: {
                createdAt:
                  "desc",
              },
            },
          },
        });

      if (!subscription) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Subscription not found.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          subscription,
        });
    } catch (error) {
      console.error(
        "GET SUBSCRIPTION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load subscription.",
        });
    }
  };

/*
 * ============================================================
 * PAY FOR SUBSCRIPTION
 * ============================================================
 *
 * POST /api/subscriptions/:id/pay
 *
 * BODY:
 * {
 *   phoneNumber: "0712345678"
 * }
 */

export const payForSubscription = async (req, res) => {
    try {
      await expireSubscriptions();

      const userId =
        req.user.id;

      const subscriptionId =
        req.params.id;

        /*
 * ======================================================
 * BLOCK PAYMENT WHILE PREMIUM IS ALREADY ACTIVE
 * ======================================================
 */

const currentActiveSubscription = await getActiveSubscription( userId);

        if (
        currentActiveSubscription &&
        currentActiveSubscription.id !==
            subscriptionId
        ) {
        return res
            .status(409)
            .json({
            success: false,

            code:
                "SUBSCRIPTION_ALREADY_ACTIVE",

            message:
                "Your Premium membership is already active. Another subscription cannot be purchased until it expires.",

            subscription:
                currentActiveSubscription,
            });
        }

      const {
        phoneNumber,
      } = req.body;

      /*
       * ======================================================
       * VALIDATE PHONE
       * ======================================================
       */

      const normalizedPhone =
        normalizeKenyanPhone(
          phoneNumber
        );

      if (
        !normalizedPhone
      ) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "INVALID_PHONE_NUMBER",

            message:
              "Enter a valid Kenyan Safaricom phone number.",
          });
      }

      /*
       * ======================================================
       * FIND SUBSCRIPTION
       * ======================================================
       */

      const subscription =
        await prisma.subscription.findFirst({
          where: {
            id:
              subscriptionId,

            userId,
          },

          include: {
            payments: {
              where: {
                type:
                  "SUBSCRIPTION",
              },

              orderBy: {
                createdAt:
                  "desc",
              },
            },
          },
        });

      if (!subscription) {
        return res
          .status(404)
          .json({
            success: false,

            code:
              "SUBSCRIPTION_NOT_FOUND",

            message:
              "Subscription not found.",
          });
      }

      /*
       * ======================================================
       * ALREADY ACTIVE
       * ======================================================
       */

      if (
        subscription.status ===
        "ACTIVE"
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "SUBSCRIPTION_ALREADY_ACTIVE",

            message:
              "This Premium subscription is already active.",

            subscription,
          });
      }

      /*
       * Only pending subscriptions can initiate payment.
       */

      if (
        subscription.status !==
        "PENDING"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "SUBSCRIPTION_NOT_PAYABLE",

            message:
              "This subscription cannot be paid for.",
          });
      }

      /*
       * ======================================================
       * COMPLETED PAYMENT SAFETY CHECK
       * ======================================================
       */

      const completedPayment =
        subscription.payments.find(
          (payment) =>
            payment.status ===
            "COMPLETED"
        );

      if (
        completedPayment
      ) {
        /*
         * Normally callback should already have activated
         * the subscription.
         *
         * This prevents another STK push if the subscription
         * somehow remained pending.
         */

        return res
          .status(409)
          .json({
            success: false,

            code:
              "SUBSCRIPTION_PAYMENT_COMPLETED",

            message:
              "Payment for this subscription has already been completed.",

            payment:
              completedPayment,
          });
      }

      /*
       * ======================================================
       * RETRY PROTECTION
       * ======================================================
       */

      const pendingPayment =
        subscription.payments.find(
          (payment) =>
            payment.status ===
            "PENDING"
        );

      if (
        pendingPayment
      ) {
        const paymentAge =
          Date.now() -
          new Date(
            pendingPayment.createdAt
          ).getTime();

        if (
          paymentAge <
          MPESA_STK_RETRY_AFTER_MS
        ) {
          const retryAfterSeconds =
            Math.ceil(
              (
                MPESA_STK_RETRY_AFTER_MS -
                paymentAge
              ) / 1000
            );

          return res
            .status(429)
            .json({
              success: false,

              code:
                "PAYMENT_ALREADY_PENDING",

              message:
                "An M-Pesa payment request is already pending.",

              retryAfterSeconds,

              payment:
                pendingPayment,
            });
        }

        /*
         * Old PENDING payment becomes CANCELLED.
         *
         * IMPORTANT:
         * A late successful callback can still be accepted
         * later by the callback handler.
         */

        await prisma.payment.update({
          where: {
            id:
              pendingPayment.id,
          },

          data: {
            status:
              "CANCELLED",

            resultDescription:
              "Payment attempt replaced by a newer STK request.",
          },
        });
      }

      /*
       * ======================================================
       * CREATE PAYMENT
       * ======================================================
       */

      const payment =
        await prisma.payment.create({
          data: {
            userId,

            subscriptionId:
              subscription.id,

            amount:
              subscription.amount,

            currency:
              subscription.currency,

            status:
              "PENDING",

            type:
              "SUBSCRIPTION",

            provider:
              "MPESA",

            phoneNumber:
              normalizedPhone,

            description:
              `BarterTrade ${subscription.plan} subscription`,
          },
        });

      /*
       * ======================================================
       * INITIATE STK PUSH
       * ======================================================
       */

      try {
        /*
         * IMPORTANT:
         *
         * Match these argument names to your existing
         * mpesaService implementation if its signature differs.
         */

        const stkResponse =
          await initiateStkPush({
            phoneNumber:
              normalizedPhone,

            amount:
              subscription.amount,

            accountReference:
              `SUB-${subscription.id
                .replaceAll(
                  "-",
                  ""
                )
                .slice(
                  0,
                  12
                )}`,

            transactionDescription:
              "BarterTrade Premium",
          });

        /*
         * Daraja commonly returns:
         *
         * MerchantRequestID
         * CheckoutRequestID
         * ResponseCode
         * ResponseDescription
         * CustomerMessage
         */

        const merchantRequestId =
          stkResponse
            ?.MerchantRequestID ||
          stkResponse
            ?.merchantRequestId ||
          null;

        const checkoutRequestId =
          stkResponse
            ?.CheckoutRequestID ||
          stkResponse
            ?.checkoutRequestId ||
          null;

        if (
          !checkoutRequestId
        ) {
          await prisma.payment.update({
            where: {
              id:
                payment.id,
            },

            data: {
              status:
                "FAILED",

              resultDescription:
                stkResponse
                  ?.ResponseDescription ||
                "M-Pesa did not return a checkout request ID.",
            },
          });

          return res
            .status(502)
            .json({
              success: false,

              code:
                "MPESA_STK_FAILED",

              message:
                "Unable to initiate M-Pesa payment.",
            });
        }

        const updatedPayment =
          await prisma.payment.update({
            where: {
              id:
                payment.id,
            },

            data: {
              merchantRequestId,

              checkoutRequestId,

              resultDescription:
                stkResponse
                  ?.ResponseDescription ||
                "M-Pesa STK request initiated.",
            },
          });

        /*
         * IMPORTANT:
         *
         * Subscription remains PENDING here.
         *
         * Never activate Premium from this response.
         *
         * Only the M-Pesa callback can activate it.
         */

        return res
          .status(200)
          .json({
            success: true,

            message:
              stkResponse
                ?.CustomerMessage ||
              "M-Pesa payment request sent. Check your phone.",

            payment:
              updatedPayment,

            subscription: {
              id:
                subscription.id,

              plan:
                subscription.plan,

              status:
                subscription.status,

              amount:
                subscription.amount,

              currency:
                subscription.currency,

              durationDays:
                subscription.durationDays,
            },
          });
      } catch (mpesaError) {
        console.error(
          "SUBSCRIPTION STK ERROR:",
          mpesaError
        );

        await prisma.payment.update({
          where: {
            id:
              payment.id,
          },

          data: {
            status:
              "FAILED",

            resultDescription:
              mpesaError
                ?.response
                ?.data
                ?.errorMessage ||
              mpesaError
                ?.message ||
              "Unable to initiate M-Pesa payment.",
          },
        });

        return res
          .status(502)
          .json({
            success: false,

            code:
              "MPESA_STK_FAILED",

            message:
              mpesaError
                ?.response
                ?.data
                ?.errorMessage ||
              "Unable to initiate M-Pesa payment.",
          });
      }
    } catch (error) {
      console.error(
        "PAY FOR SUBSCRIPTION ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to process subscription payment.",
        });
    }
  };

/*
 * ============================================================
 * GET PAYMENT STATUS
 * ============================================================
 *
 * GET /api/subscriptions/payments/:paymentId/status
 */

export const getSubscriptionPaymentStatus =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const {
        paymentId,
      } = req.params;

      const payment =
        await prisma.payment.findFirst({
          where: {
            id:
              paymentId,

            userId,

            type:
              "SUBSCRIPTION",
          },

          include: {
            subscription:
              true,
          },
        });

      if (!payment) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Subscription payment not found.",
          });
      }

      if (
        payment.subscriptionId
      ) {
        await expireSubscriptionIfNeeded(
          payment.subscriptionId
        );
      }

      /*
       * Re-fetch after expiry check.
       */

      const freshPayment =
        await prisma.payment.findFirst({
          where: {
            id:
              paymentId,

            userId,

            type:
              "SUBSCRIPTION",
          },

          include: {
            subscription:
              true,
          },
        });

      return res
        .status(200)
        .json({
          success: true,

          payment: {
            id:
              freshPayment.id,

            status:
              freshPayment.status,

            amount:
              freshPayment.amount,

            currency:
              freshPayment.currency,

            phoneNumber:
              freshPayment.phoneNumber,

            receiptNumber:
              freshPayment.receiptNumber,

            resultCode:
              freshPayment.resultCode,

            resultDescription:
              freshPayment.resultDescription,

            checkoutRequestId:
              freshPayment.checkoutRequestId,

            createdAt:
              freshPayment.createdAt,

            updatedAt:
              freshPayment.updatedAt,
          },

          subscription:
            freshPayment.subscription,
        });
    } catch (error) {
      console.error(
        "GET SUBSCRIPTION PAYMENT STATUS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to check subscription payment status.",
        });
    }
  };