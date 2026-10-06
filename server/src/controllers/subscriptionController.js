import prisma from "../config/prisma.js";
import {SUBSCRIPTION_PLANS,getSubscriptionPlan} from "../config/subscriptionPlans.js";
import { expireSubscriptions,expireSubscriptionIfNeeded} from "../services/subscriptionExpiryService.js";
import {initiateStkPush} from "../services/mpesaService.js";
import { getActiveSubscriptionByPlan,getPendingSubscriptionByPlan, getPendingRenewalByPlan, canCreateSubscriptionByPlan} from "../services/subscriptionService.js";

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
     * ======================================================
     * EXPIRE OLD ACTIVE SUBSCRIPTIONS
     * ======================================================
     */

    await expireSubscriptions();

    const userId = req.user.id;

    const {
      plan: requestedPlan,
      renew = false,
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
     * NORMALIZE RENEWAL INTENT
     * ======================================================
     *
     * Require an actual boolean.
     *
     * This prevents values such as:
     *
     * "false"
     *
     * from accidentally being treated as truthy.
     */

    if (
      typeof renew !==
      "boolean"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          code:
            "INVALID_RENEWAL_VALUE",

          message:
            "renew must be a boolean.",
        });
    }

    /*
     * ======================================================
     * VALIDATE SUBSCRIPTION ELIGIBILITY
     * ======================================================
     *
     * PREMIUM:
     * - available to authenticated users.
     *
     * BUSINESS_PRO:
     * - requires an existing BusinessProfile.
     *
     * IMPORTANT:
     *
     * canCreateSubscriptionByPlan() normally rejects an
     * existing ACTIVE subscription.
     *
     * That rejection is allowed through ONLY when this is
     * an explicit renewal request.
     */

    const eligibility =
      await canCreateSubscriptionByPlan(
        userId,
        plan.type
      );

    const activeSubscription =
      await getActiveSubscriptionByPlan(
        userId,
        plan.type
      );

    const isAllowedActiveRenewal =
      renew === true &&
      eligibility.code ===
        "SUBSCRIPTION_ALREADY_ACTIVE" &&
      Boolean(activeSubscription);

    if (
      !eligibility.allowed &&
      eligibility.code !==
        "SUBSCRIPTION_ALREADY_PENDING" &&
      !isAllowedActiveRenewal
    ) {
      return res
        .status(
          eligibility.status ||
            409
        )
        .json({
          success: false,

          code:
            eligibility.code ||
            "SUBSCRIPTION_NOT_ALLOWED",

          message:
            eligibility.reason ||
            "This subscription cannot be created.",

          subscription:
            eligibility.subscription ||
            null,
        });
    }

    /*
     * ======================================================
     * NORMAL PURCHASE WHILE ALREADY ACTIVE
     * ======================================================
     *
     * Existing behaviour remains unchanged.
     *
     * An ACTIVE subscription may only be bypassed through
     * an explicit:
     *
     * renew: true
     */

    if (
      activeSubscription &&
      !renew
    ) {
      return res
        .status(409)
        .json({
          success: false,

          code:
            "SUBSCRIPTION_ALREADY_ACTIVE",

          message:
            `Your ${plan.name} subscription is already active.`,

          subscription:
            activeSubscription,

          canRenew: true,
        });
    }

    /*
     * ======================================================
     * INVALID RENEWAL
     * ======================================================
     *
     * Renewal requires an ACTIVE subscription.
     *
     * If the previous subscription has already expired,
     * the user should simply purchase a normal subscription.
     */

    if (
      renew &&
      !activeSubscription
    ) {
      return res
        .status(409)
        .json({
          success: false,

          code:
            "NO_ACTIVE_SUBSCRIPTION_TO_RENEW",

          message:
            `You do not currently have an active ${plan.name} subscription to renew.`,
        });
    }

/*
 * ======================================================
 * FIND EXISTING PENDING SUBSCRIPTION
 * ======================================================
 *
 * NORMAL PURCHASE:
 *
 * getPendingSubscriptionByPlan()
 *
 * Only searches:
 *
 * renewalOfId = null
 *
 *
 * RENEWAL:
 *
 * getPendingRenewalByPlan()
 *
 * Only searches for a renewal tied to the current
 * active subscription.
 */

const pendingSubscriptionBase =
  renew
    ? await getPendingRenewalByPlan(
        userId,
        plan.type,
        activeSubscription.id
      )
    : await getPendingSubscriptionByPlan(
        userId,
        plan.type
      );

/*
 * The service helpers intentionally return only the
 * subscription record.
 *
 * createSubscription() also needs its payment history
 * for completed-payment and duplicate-STK protection.
 */

const pendingSubscription =
  pendingSubscriptionBase
    ? await prisma.subscription.findUnique({
        where: {
          id: pendingSubscriptionBase.id,
        },

        include: {
          payments: {
            where: {
              type: "SUBSCRIPTION",
            },

            orderBy: {
              createdAt: "desc",
            },
          },

          renewalOf: true,
        },
      })
    : null;

    /*
     * ======================================================
     * REUSE EXISTING PENDING SUBSCRIPTION
     * ======================================================
     */

    if (pendingSubscription) {
      const completedPayment =
        pendingSubscription.payments.find(
          (payment) =>
            payment.status ===
            "COMPLETED"
        );

      /*
       * Financial payment already completed.
       *
       * Do not create another subscription or another
       * payment attempt while activation/recovery is pending.
       */

      if (completedPayment) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "SUBSCRIPTION_PAYMENT_COMPLETED",

            message:
              `Payment for this ${plan.name} ${
                renew
                  ? "renewal"
                  : "subscription"
              } has already been completed. Activation is being finalized.`,

            subscription:
              pendingSubscription,

            payment:
              completedPayment,
          });
      }

      /*
       * Check for a recently-created M-Pesa payment.
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

              renewal:
                renew,

              paymentPending:
                true,

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
       * Pending subscription exists but there is no recent
       * payment preventing another STK attempt.
       */

      return res
        .status(200)
        .json({
          success: true,

          reused: true,

          renewal:
            renew,

          paymentPending:
            false,

          message:
            renew
              ? `Existing pending ${plan.name} renewal returned. Continue payment to renew your subscription.`
              : `Existing pending ${plan.name} subscription returned. Continue payment to activate it.`,

          subscription:
            pendingSubscription,
        });
    }

    /*
     * ======================================================
     * CREATE NEW PENDING SUBSCRIPTION
     * ======================================================
     *
     * NORMAL:
     *
     * renewalOfId = null
     *
     * RENEWAL:
     *
     * renewalOfId = current ACTIVE subscription
     *
     * No entitlement is granted here.
     *
     * The subscription remains PENDING until M-Pesa confirms
     * the payment.
     */

    let subscription;

    try {
      subscription =
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

            renewalOfId:
              renew
                ? activeSubscription.id
                : null,
          },

          include: {
            renewalOf:
              true,
          },
        });
    } catch (error) {
      /*
      * --------------------------------------------------------
      * DUPLICATE RENEWAL RACE
      * --------------------------------------------------------
      *
      * PostgreSQL is the final concurrency guard.
      *
      * Two requests may both observe:
      *
      * no pending renewal
      *
      * before either INSERT commits.
      *
      * @@unique([renewalOfId]) guarantees that only one wins.
      *
      * Prisma reports a unique-constraint violation as P2002.
      */

      if (
        renew &&
        error?.code === "P2002"
      ) {
        const existingRenewal =
          await prisma.subscription.findFirst({
            where: {
              userId,

              plan:
                plan.type,

              renewalOfId:
                activeSubscription.id,
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

              renewalOf:
                true,
            },
          });

        if (existingRenewal) {
          return res
            .status(200)
            .json({
              success: true,

              reused: true,

              renewal: true,
              renewalStatus:
              existingRenewal.status === "ACTIVE"
                ? "SCHEDULED"
                : "PENDING_PAYMENT",

              paymentPending:
                existingRenewal
                  .payments
                  .some(
                    (payment) =>
                      payment.status ===
                      "PENDING"
                  ),

              message:
                `An existing ${plan.name} renewal was found and returned.`,

              subscription:
                existingRenewal,

              currentSubscription:
                activeSubscription,
            });
        }
      }

      /*
      * Not the duplicate-renewal race we know how to recover.
      *
      * Let the controller's outer catch handle it.
      */

      throw error;
    }

    /*
     * ======================================================
     * RESPONSE
     * ======================================================
     */

    return res
      .status(201)
      .json({
        success: true,

        reused: false,

        renewal:
          renew,

        paymentPending:
          false,

        message:
          renew
            ? `${plan.name} renewal created. Complete payment to add ${plan.durationDays} days to your subscription.`
            : `${plan.name} subscription created. Complete payment to activate it.`,

        subscription,

        currentSubscription:
          renew
            ? activeSubscription
            : null,
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

      /*
      * --------------------------------------------------------
      * PENDING NORMAL SUBSCRIPTION
      * --------------------------------------------------------
      *
      * A normal pending purchase has no renewal source.
      */

      const pendingSubscription =
        planSubscriptions.find(
          (subscription) =>
            subscription.status === "PENDING" &&
            !subscription.renewalOfId
        ) || null;

      /*
      * --------------------------------------------------------
      * PENDING RENEWAL
      * --------------------------------------------------------
      *
      * A renewal is explicitly linked to the subscription
      * that it is extending through renewalOfId.
      */

      const pendingRenewal = planSubscriptions.find(
          (subscription) =>
            subscription.status === "PENDING" &&
            Boolean(subscription.renewalOfId)
        ) || null;
        /*
        * --------------------------------------------------------
        * SCHEDULED RENEWAL
        * --------------------------------------------------------
        *
        * A successfully-paid early renewal may already have
        * status ACTIVE even though its entitlement period has
        * not started yet.
        *
        * Example:
        *
        * Current:
        * 6 Oct -> 5 Nov
        *
        * Scheduled renewal:
        * 5 Nov -> 5 Dec
        *
        * The scheduled renewal must NOT count as current
        * entitlement before 5 Nov.
        */

        const scheduledRenewal =
          planSubscriptions.find(
            (subscription) => {
              if (
                subscription.status !== "ACTIVE" ||
                !subscription.renewalOfId ||
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
                startsAt > now &&
                endsAt > startsAt
              );
            }
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
 * --------------------------------------------------------
    * RENEWAL ELIGIBILITY
    * --------------------------------------------------------
    *
    * Early renewal IS supported.
    *
    * The user may renew while the current subscription is
    * active.
    *
    * However, we should not offer another renewal when:
    *
    * 1. there is already a PENDING renewal waiting for
    *    payment, or
    *
    * 2. there is already a successfully-paid future
    *    renewal scheduled.
    */

    const canRenew =
      Boolean(activeSubscription) &&
      !pendingRenewal &&
      !scheduledRenewal;

      /*
      * Human/API-friendly renewal state.
      */

      const renewalStatus =
        pendingRenewal
          ? "PENDING_PAYMENT"
          : scheduledRenewal
            ? "SCHEDULED"
            : canRenew
              ? "AVAILABLE"
              : "UNAVAILABLE";

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

      renewalStatus,

      pendingRenewal,

      scheduledRenewal,

      renewalBlockedReason:
        pendingRenewal
          ? "A renewal is already waiting for payment."
          : scheduledRenewal
            ? "A paid renewal is already scheduled."
            : !activeSubscription
              ? "There is no active subscription to renew."
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

    const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },

        include: {
          payments: {
            where: {
              type: "SUBSCRIPTION",
            },

            orderBy: {
              createdAt: "desc",
            },
          },

          renewalOf: {
            select: {
              id: true,
              userId: true,
              plan: true,
              status: true,
              startsAt: true,
              endsAt: true,
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
    * DETERMINE WHETHER THIS IS A RENEWAL
    * ======================================================
    *
    * Normal subscription:
    *
    * renewalOfId = null
    *
    * Renewal:
    *
    * renewalOfId = previous subscription ID
    */

    const isRenewal =
      Boolean(
        subscription.renewalOfId
      );

      /*
    * ======================================================
    * VALIDATE RENEWAL SOURCE
    * ======================================================
    */

    if (isRenewal) {
      const renewalSource =
        subscription.renewalOf;

      /*
      * renewalOfId exists but Prisma could not find
      * the referenced subscription.
      */

      if (!renewalSource) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "INVALID_RENEWAL_SOURCE",

            message:
              "The subscription being renewed could not be verified.",
          });
      }

      /*
      * The previous subscription must belong
      * to the same authenticated user.
      */

      if (
        renewalSource.userId !==
        userId
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "INVALID_RENEWAL_SOURCE",

            message:
              "The renewal subscription does not belong to this account.",
          });
      }

      /*
      * BUSINESS_PRO may only renew BUSINESS_PRO.
      *
      * PREMIUM may only renew PREMIUM.
      */

      if (
        renewalSource.plan !==
        subscription.plan
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "INVALID_RENEWAL_PLAN",

            message:
              "A subscription can only renew the same plan.",
          });
      }

      /*
      * A legitimate previous subscription must
      * have had a real entitlement period.
      */

      if (
        !renewalSource.startsAt ||
        !renewalSource.endsAt
      ) {
        return res
          .status(409)
          .json({
            success: false,

            code:
              "INVALID_RENEWAL_SOURCE",

            message:
              "The subscription being renewed does not have a valid subscription period.",
          });
      }
    }

    /*
    * ======================================================
    * FIND CURRENT ACTIVE SAME-PLAN SUBSCRIPTION
    * ======================================================
    *
    * Premium and Business Pro remain independent.
    */

    const currentActiveSubscription =
      await getActiveSubscriptionByPlan(
        userId,
        subscription.plan
      );

    /*
    * ======================================================
    * NORMAL PURCHASE PROTECTION
    * ======================================================
    *
    * If this is NOT a renewal, another currently-active
    * subscription for the same plan must still block
    * payment.
    */

    if (
      !isRenewal &&
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
            `Your ${subscription.plan} subscription is already active. Use the renewal option if you want to extend it.`,

          subscription:
            currentActiveSubscription,
        });
    }

    /*
    * ======================================================
    * RENEWAL CONFLICT PROTECTION
    * ======================================================
    *
    * A renewal is allowed while its ORIGINAL subscription
    * remains active.
    *
    * Example:
    *
    * Active subscription A
    * Renewal B
    * B.renewalOfId === A.id
    *
    * This is valid.
    *
    * But if another unrelated subscription C is currently
    * active, B must not renew A over C.
    */

    if (
      isRenewal &&
      currentActiveSubscription &&
      currentActiveSubscription.id !==
        subscription.renewalOfId
    ) {
      return res
        .status(409)
        .json({
          success: false,

          code:
            "RENEWAL_SUBSCRIPTION_CONFLICT",

          message:
            `Another ${subscription.plan} subscription is currently active. This renewal can no longer be processed automatically.`,

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

              message: isRenewal
                ? "An M-Pesa renewal payment request is already pending."
                : "An M-Pesa payment request is already pending.",

              retryAfterSeconds,

              payment:
                pendingPayment,

              subscription,

              renewal:
                isRenewal,
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

            description: isRenewal
              ? `BarterConnekt ${subscription.plan} renewal`
              : `BarterConnekt ${subscription.plan} subscription`,
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
                ? isRenewal
                  ? "BarterConnekt Business Pro Renewal"
                  : "BarterConnekt Business Pro"
                : isRenewal
                  ? "BarterConnekt Premium Renewal"
                  : "BarterConnekt Premium",
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

          renewal:
            isRenewal,

          message:
            stkResponse
              ?.CustomerMessage ||
            (isRenewal
              ? "M-Pesa renewal request sent. Check your phone."
              : "M-Pesa payment request sent. Check your phone."),

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

            renewalOfId:
              subscription.renewalOfId,

            renewal:
              isRenewal,
          },

          renewalSource:
            isRenewal
              ? {
                  id:
                    subscription
                      .renewalOf.id,

                  startsAt:
                    subscription
                      .renewalOf
                      .startsAt,

                  endsAt:
                    subscription
                      .renewalOf
                      .endsAt,
                }
              : null,
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