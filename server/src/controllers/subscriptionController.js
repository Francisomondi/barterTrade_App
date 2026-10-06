import prisma from "../config/prisma.js";
import {SUBSCRIPTION_PLANS,getSubscriptionPlan} from "../config/subscriptionPlans.js";
import { expireSubscriptions,expireSubscriptionIfNeeded} from "../services/subscriptionExpiryService.js";
import {initiateStkPush} from "../services/mpesaService.js";
import { getActiveSubscriptionByPlan, canCreateSubscriptionByPlan} from "../services/subscriptionService.js";

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const MPESA_STK_RETRY_AFTER_MS =
  50 * 1000;

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
 * VALIDATE SUBSCRIPTION ELIGIBILITY
 * ======================================================
 *
 * Eligibility is resolved by the backend.
 *
 * PREMIUM:
 * - available to authenticated users.
 *
 * BUSINESS_PRO:
 * - requires an existing BusinessProfile.
 *
 * The frontend must never decide Business Pro eligibility.
 */

const eligibility =
  await canCreateSubscriptionByPlan(
    userId,
    plan.type
  );

if (
  !eligibility.allowed &&
  eligibility.code !==
    "SUBSCRIPTION_ALREADY_PENDING"
) {
  return res
    .status(eligibility.status || 409)
    .json({
      success: false,

      code:
        eligibility.code ||
        "SUBSCRIPTION_NOT_ALLOWED",

      message:
        eligibility.reason ||
        "This subscription cannot be created.",

      subscription:
        eligibility.subscription || null,
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

    const activeSubscription = await getActiveSubscriptionByPlan(
        userId,
        plan.type
      );

    if (activeSubscription) {
      return res
        .status(409)
        .json({
          success: false,

          code:
            "SUBSCRIPTION_ALREADY_ACTIVE",

          message:
            `Your ${plan.name} subscription is already active. You can renew after it expires.`,

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
                `Payment for this ${plan.name} subscription has already been completed. Activation is being finalized.`,

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
               `Existing pending ${plan.name} subscription returned. Continue payment to activate it.`,

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
            `${plan.name} subscription created. Complete payment to activate it.`,

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

/*
 * ============================================================
 * GET MY SUBSCRIPTIONS
 * ============================================================
 *
 * GET /api/subscriptions/me
 *
 * Returns subscription-management information for:
 *
 * - PREMIUM
 * - BUSINESS_PRO
 *
 * This endpoint is the frontend source of truth for:
 *
 * - active subscription
 * - pending subscription
 * - expiry
 * - days remaining
 * - renewal state
 * - latest payment
 * - payment history
 *
 * IMPORTANT:
 *
 * PREMIUM and BUSINESS_PRO are independent products.
 * One must never affect the entitlement of the other.
 * ============================================================
 */

export const getMySubscription = async (req, res) => {
  try {
    /*
     * --------------------------------------------------------
     * EXPIRE OLD SUBSCRIPTIONS FIRST
     * --------------------------------------------------------
     */

    await expireSubscriptions();

    const userId = req.user.id;

    /*
     * --------------------------------------------------------
     * LOAD USER SUBSCRIPTIONS
     * --------------------------------------------------------
     *
     * We include subscription payments so the frontend can
     * render payment history and the latest M-Pesa receipt.
     * --------------------------------------------------------
     */

    const subscriptions =
      await prisma.subscription.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          payments: {
            where: {
              type: "SUBSCRIPTION",
            },

            orderBy: {
              createdAt: "desc",
            },

            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              provider: true,
              phoneNumber: true,
              receiptNumber: true,
              resultCode: true,
              resultDescription: true,
              merchantRequestId: true,
              checkoutRequestId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    const now = new Date();

    /*
     * --------------------------------------------------------
     * HELPERS
     * --------------------------------------------------------
     */

    const isCurrentlyActive = (subscription) => {
      if (
        !subscription ||
        subscription.status !== "ACTIVE" ||
        !subscription.startsAt ||
        !subscription.endsAt
      ) {
        return false;
      }

      const startsAt =
        new Date(subscription.startsAt);

      const endsAt =
        new Date(subscription.endsAt);

      return (
        startsAt <= now &&
        endsAt > now
      );
    };

    const getDaysRemaining = (subscription) => {
      if (
        !isCurrentlyActive(subscription)
      ) {
        return 0;
      }

      const endsAt =
        new Date(
          subscription.endsAt
        ).getTime();

      const difference =
        endsAt - now.getTime();

      return Math.max(
        0,
        Math.ceil(
          difference /
            (1000 * 60 * 60 * 24)
        )
      );
    };

    /*
     * --------------------------------------------------------
     * BUILD PLAN STATUS
     * --------------------------------------------------------
     */

    const buildPlanStatus = (
      planType
    ) => {
      const plan =
        getSubscriptionPlan(
          planType
        );

      const planSubscriptions =
        subscriptions.filter(
          (subscription) =>
            subscription.plan ===
            planType
        );

      const activeSubscription =
        planSubscriptions.find(
          (subscription) =>
            isCurrentlyActive(
              subscription
            )
        ) || null;

      const pendingSubscription =
        planSubscriptions.find(
          (subscription) =>
            subscription.status ===
            "PENDING"
        ) || null;

      const latestSubscription =
        planSubscriptions[0] ||
        null;

      /*
       * Flatten all payments belonging to this plan.
       */

      const payments =
        planSubscriptions
          .flatMap(
            (subscription) =>
              (
                subscription.payments ||
                []
              ).map(
                (payment) => ({
                  ...payment,

                  subscriptionId:
                    subscription.id,

                  plan:
                    subscription.plan,
                })
              )
          )
          .sort(
            (a, b) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          );

      const latestPayment =
        payments[0] || null;

      const latestCompletedPayment =
        payments.find(
          (payment) =>
            payment.status ===
            "COMPLETED"
        ) || null;

      const daysRemaining =
        getDaysRemaining(
          activeSubscription
        );

      /*
       * Current renewal policy:
       *
       * Active subscriptions cannot be renewed early.
       *
       * This matches createSubscription() and
       * payForSubscription().
       */

      const canRenew =
        !activeSubscription;

      return {
        plan: {
          type:
            plan?.type ||
            planType,

          name:
            plan?.name ||
            planType,

          amount:
            plan?.amount ||
            0,

          currency:
            plan?.currency ||
            "KES",

          durationDays:
            plan?.durationDays ||
            30,

          description:
            plan?.description ||
            null,

          features:
            Array.isArray(
              plan?.features
            )
              ? plan.features
              : [],
        },

        /*
         * Entitlement
         */

        isActive:
          Boolean(
            activeSubscription
          ),

        status:
          activeSubscription
            ? "ACTIVE"
            : pendingSubscription
              ? "PENDING"
              : latestSubscription
                ?.status ||
                "INACTIVE",

        /*
         * Important dates
         */

        startsAt:
          activeSubscription
            ?.startsAt ||
          null,

        endsAt:
          activeSubscription
            ?.endsAt ||
          null,

        daysRemaining,

        /*
         * Subscription records
         */

        activeSubscription,

        pendingSubscription,

        latestSubscription,

        /*
         * Renewal
         */

        canRenew,

        renewalBlockedReason:
          activeSubscription
            ? "Subscription is currently active."
            : null,

        /*
         * Payments
         */

        latestPayment,

        latestCompletedPayment,

        latestReceiptNumber:
          latestCompletedPayment
            ?.receiptNumber ||
          null,

        payments,
      };
    };

    /*
     * --------------------------------------------------------
     * PERSONAL PREMIUM
     * --------------------------------------------------------
     */

    const premium =
      buildPlanStatus(
        "PREMIUM"
      );

    /*
     * --------------------------------------------------------
     * BUSINESS PRO
     * --------------------------------------------------------
     */

    const businessPro =
      buildPlanStatus(
        "BUSINESS_PRO"
      );

    /*
     * --------------------------------------------------------
     * BUSINESS PROFILE ELIGIBILITY
     * --------------------------------------------------------
     *
     * Business Pro should only be offered to accounts that
     * actually own a business profile.
     * --------------------------------------------------------
     */

    const businessProfile =
      await prisma.businessProfile.findUnique({
        where: {
          userId,
        },

        select: {
          id: true,
          businessName: true,
          slug: true,
          status: true,
          verificationStatus: true,
        },
      });

    const businessProEligible =
      Boolean(
        businessProfile
      );

    /*
     * --------------------------------------------------------
     * RESPONSE
     * --------------------------------------------------------
     */

    return res
      .status(200)
      .json({
        success: true,

        /*
         * Backward compatibility
         *
         * Existing Premium.jsx code can continue using these.
         */

        isPremium:
          premium.isActive,

        activeSubscription:
          premium.activeSubscription,

        pendingSubscription:
          premium.pendingSubscription,

        subscriptions,

        /*
         * New structured subscription management API
         */

        plans: {
          premium,

          businessPro: {
            ...businessPro,

            eligible:
              businessProEligible,

            businessProfile:
              businessProfile ||
              null,
          },
        },
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
          "Unable to load subscription information.",
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
 * BLOCK DUPLICATE ACTIVE SUBSCRIPTION FOR SAME PLAN
 * ======================================================
 *
 * Personal Premium and Business Pro are independent.
 *
 * Therefore:
 *
 * PREMIUM must only block another PREMIUM.
 * BUSINESS_PRO must only block another BUSINESS_PRO.
 *
 * Never allow one plan to block the other.
 */

const currentActiveSubscription = await getActiveSubscriptionByPlan(
    userId,
    subscription.plan
  );

if (
  currentActiveSubscription &&
  currentActiveSubscription.id !==
    subscription.id
) {
  return res
    .status(409)
    .json({
      success: false,

      code:
        "SUBSCRIPTION_ALREADY_ACTIVE",

      message:
        `Your ${subscription.plan} subscription is already active. Another ${subscription.plan} subscription cannot be purchased until it expires.`,

      subscription:
        currentActiveSubscription,
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
                `This ${subscription.plan} subscription is already active.`,

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
              subscription.plan === "BUSINESS_PRO"
                ? "BarterTrade Business Pro"
                : "BarterTrade Premium",
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
        * Never activate the subscription from this response.
        *
        * Only the verified M-Pesa callback can activate it.
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