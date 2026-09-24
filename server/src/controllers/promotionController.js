import prisma from "../config/prisma.js";

import {
  getPromotionPlan,
  getPublicPromotionPlans,
} from "../config/promotionPlans.js";

import {
  initiateStkPush,
  normalizeMpesaPhone,
} from "../services/mpesaService.js";

/**
 * How long an initiated STK request is protected
 * from being replaced by another STK request.
 *
 * Frontend currently polls for roughly 60 seconds.
 * We give the backend a small extra margin.
 */
const MPESA_STK_RETRY_AFTER_MS = 65 * 1000;

/**
 * =========================================================
 * GET PROMOTION PLANS
 * GET /api/promotions/plans
 * =========================================================
 */
export const getPromotionPlans = async (req, res) => {
  try {
    const plans = getPublicPromotionPlans();

    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error(
      "GET PROMOTION PLANS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch promotion plans.",
    });
  }
};

/**
 * =========================================================
 * CREATE PROMOTION
 * POST /api/promotions
 * =========================================================
 *
 * Body:
 * {
 *   listingId: string,
 *   type: "BOOST" | "FEATURED" | "HOMEPAGE"
 * }
 *
 * Creating a promotion does NOT:
 * - create an M-PESA payment
 * - activate the promotion
 * - set startsAt
 * - set endsAt
 */
export const createPromotion = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const { listingId, type } = req.body;

    // -----------------------------------------------------
    // 1. Validate request
    // -----------------------------------------------------

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "Listing ID is required.",
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion type is required.",
      });
    }

    // -----------------------------------------------------
    // 2. Get trusted promotion plan
    // -----------------------------------------------------

    const plan = getPromotionPlan(type);

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Invalid promotion type.",
      });
    }

    // -----------------------------------------------------
    // 3. Find listing
    // -----------------------------------------------------

    const listing =
      await prisma.listing.findUnique({
        where: {
          id: listingId,
        },

        select: {
          id: true,
          userId: true,
          title: true,
          status: true,
        },
      });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found.",
      });
    }

    // -----------------------------------------------------
    // 4. Verify listing ownership
    // -----------------------------------------------------

    if (listing.userId !== userId) {
      return res.status(403).json({
        success: false,
        message:
          "You can only promote your own listings.",
      });
    }

    // -----------------------------------------------------
    // 5. Listing must be ACTIVE
    // -----------------------------------------------------

    if (listing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          "Only active listings can be promoted.",
      });
    }

    // -----------------------------------------------------
    // 6. Check ACTIVE promotion
    // -----------------------------------------------------

    const activePromotion =
      await prisma.promotion.findFirst({
        where: {
          userId,
          listingId,
          type: plan.type,
          status: "ACTIVE",
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (activePromotion) {
      return res.status(409).json({
        success: false,
        code: "PROMOTION_ALREADY_ACTIVE",
        message:
          `This listing already has an active ${plan.name} promotion.`,
        promotion: activePromotion,
      });
    }

    // -----------------------------------------------------
    // 7. Check existing PENDING promotion
    // -----------------------------------------------------

    const pendingPromotion =
      await prisma.promotion.findFirst({
        where: {
          userId,
          listingId,
          type: plan.type,
          status: "PENDING",
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    // -----------------------------------------------------
    // 8. Reuse PENDING promotion
    // -----------------------------------------------------

    if (pendingPromotion) {
      return res.status(200).json({
        success: true,
        reused: true,

        message:
          "A pending promotion already exists. Continue with payment.",

        promotion: pendingPromotion,

        plan: {
          type: plan.type,
          name: plan.name,
          description: plan.description,
          amount: plan.amount,
          currency: plan.currency,
          durationDays:
            plan.durationDays,
          features: plan.features,
        },
      });
    }

    // -----------------------------------------------------
    // 9. Create new PENDING promotion
    // -----------------------------------------------------

    const promotion =
      await prisma.promotion.create({
        data: {
          userId,
          listingId,

          type: plan.type,
          status: "PENDING",

          // Never trust frontend price/duration.
          amount: plan.amount,
          currency: plan.currency,
          durationDays:
            plan.durationDays,
        },

        include: {
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },

          payments: true,
        },
      });

    return res.status(201).json({
      success: true,
      reused: false,

      message:
        "Promotion created. Continue with payment.",

      promotion,

      plan: {
        type: plan.type,
        name: plan.name,
        description: plan.description,
        amount: plan.amount,
        currency: plan.currency,
        durationDays: plan.durationDays,
        features: plan.features,
      },
    });
  } catch (error) {
    console.error(
      "CREATE PROMOTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create promotion.",
    });
  }
};

/**
 * =========================================================
 * GET MY PROMOTIONS
 * GET /api/promotions/my
 * =========================================================
 */
export const getMyPromotions = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const promotions =
      await prisma.promotion.findMany({
        where: {
          userId,
        },

        include: {
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
              images: true,
            },
          },

          payments: {
            select: {
              id: true,
              status: true,
              receiptNumber: true,
              amount: true,
              currency: true,
              phoneNumber: true,
              checkoutRequestId: true,
              resultCode: true,
              resultDescription: true,
              createdAt: true,
              updatedAt: true,
            },

            orderBy: {
              createdAt: "desc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      success: true,
      promotions,
    });
  } catch (error) {
    console.error(
      "GET MY PROMOTIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load your promotions.",
    });
  }
};

/**
 * =========================================================
 * GET SINGLE PROMOTION
 * GET /api/promotions/:id
 * =========================================================
 */
export const getPromotion = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const promotion =
      await prisma.promotion.findFirst({
        where: {
          id,
          userId,
        },

        include: {
          listing: {
            include: {
              images: true,
              category: true,
            },
          },

          payments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              phoneNumber: true,
              receiptNumber: true,
              checkoutRequestId: true,
              merchantRequestId: true,
              resultCode: true,
              resultDescription: true,
              createdAt: true,
              updatedAt: true,
            },

            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found.",
      });
    }

    return res.status(200).json({
      success: true,
      promotion,
    });
  } catch (error) {
    console.error(
      "GET PROMOTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve promotion.",
    });
  }
};

/**
 * =========================================================
 * PAY FOR PROMOTION
 * POST /api/promotions/:id/pay
 * =========================================================
 *
 * Body:
 * {
 *   phoneNumber: string
 * }
 *
 * Every STK Push attempt creates a NEW Payment record.
 *
 * A recent pending payment prevents duplicate STK prompts.
 *
 * A stale pending payment is cancelled locally and a
 * completely new STK request is sent.
 */
export const payForPromotion = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const {
      id: promotionId,
    } = req.params;

    const {
      phoneNumber,
    } = req.body;

    // -----------------------------------------------------
    // 1. Validate phone number
    // -----------------------------------------------------

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "M-PESA phone number is required.",
      });
    }

    let normalizedPhone;

    try {
      normalizedPhone =
        normalizeMpesaPhone(phoneNumber);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Invalid M-PESA phone number.",
      });
    }

    // -----------------------------------------------------
    // 2. Find promotion + latest payment
    // -----------------------------------------------------

    const promotion =
      await prisma.promotion.findFirst({
        where: {
          id: promotionId,
          userId,
        },

        include: {
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },

          payments: {
            orderBy: {
              createdAt: "desc",
            },

            take: 1,
          },
        },
      });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: "Promotion not found.",
      });
    }

    // -----------------------------------------------------
    // 3. Promotion must be PENDING
    // -----------------------------------------------------

    if (promotion.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        code:
          "PROMOTION_NOT_PENDING",

        message:
          "This promotion is no longer pending payment.",
      });
    }

    // -----------------------------------------------------
    // 4. Listing must still be ACTIVE
    // -----------------------------------------------------

    if (
      promotion.listing.status !==
      "ACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The listing is no longer active.",
      });
    }

    // -----------------------------------------------------
    // 5. Handle previous pending STK attempt
    // -----------------------------------------------------

    const latestPayment =
      promotion.payments[0];

    if (
      latestPayment &&
      latestPayment.status ===
        "PENDING"
    ) {
      /**
       * If no CheckoutRequestID exists, the previous
       * request never reached the accepted STK stage.
       *
       * Mark it failed so it cannot block retries.
       */
      if (
        !latestPayment.checkoutRequestId
      ) {
        await prisma.payment.update({
          where: {
            id: latestPayment.id,
          },

          data: {
            status: "FAILED",

            resultDescription:
              "Previous M-PESA request did not complete initialization. A new payment attempt was requested.",
          },
        });
      } else {
        const createdAt =
          new Date(
            latestPayment.createdAt
          ).getTime();

        const paymentAge =
          Date.now() - createdAt;

        /**
         * Previous STK is still fresh.
         *
         * Do not send multiple prompts to the
         * user's phone.
         */
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
                ) / 1000
              )
            );

          return res
            .status(409)
            .json({
              success: false,

              code:
                "PAYMENT_ALREADY_PENDING",

              message:
                "An M-PESA payment request is already pending. Please complete it or wait before requesting another prompt.",

              retryAfterSeconds,

              payment: {
                id:
                  latestPayment.id,

                status:
                  latestPayment.status,

                checkoutRequestId:
                  latestPayment.checkoutRequestId,

                createdAt:
                  latestPayment.createdAt,
              },
            });
        }

        /**
         * Previous STK has been pending too long.
         *
         * Cancel the PAYMENT attempt only.
         *
         * The Promotion remains PENDING.
         */
        await prisma.payment.update({
          where: {
            id: latestPayment.id,
          },

          data: {
            status: "CANCELLED",

            resultDescription:
              "Previous M-PESA request timed out. A new payment attempt was requested.",
          },
        });

        console.log(
          `Stale promotion payment ${latestPayment.id} cancelled. Creating a new STK request.`
        );
      }
    }

    // -----------------------------------------------------
    // 6. Create NEW payment attempt
    // -----------------------------------------------------

    let payment =
      await prisma.payment.create({
        data: {
          userId,

          promotionId:
            promotion.id,

          amount:
            promotion.amount,

          currency:
            promotion.currency,

          status: "PENDING",

          type: "PROMOTION",

          provider: "MPESA",

          phoneNumber:
            normalizedPhone,

          description:
            `${promotion.type} promotion for "${promotion.listing.title}"`,
        },
      });

    // -----------------------------------------------------
    // 7. Account reference
    // -----------------------------------------------------

    const accountReference =
      `PROMO-${promotion.id
        .replace(/-/g, "")
        .substring(0, 12)
        .toUpperCase()}`;

    // -----------------------------------------------------
    // 8. Initiate STK Push
    // -----------------------------------------------------

    let stkResponse;

    try {
      stkResponse =
        await initiateStkPush({
          amount:
            promotion.amount,

          phoneNumber:
            normalizedPhone,

          accountReference,

          transactionDesc:
            `${promotion.type} promotion`,
        });
    } catch (error) {
      console.error(
        "M-PESA STK PUSH ERROR:",
        error
      );

      payment =
        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: "FAILED",

            resultDescription:
              error.message ||
              "Failed to initiate M-PESA STK Push.",
          },
        });

      return res.status(502).json({
        success: false,

        message:
          error.message ||
          "Failed to initiate M-PESA payment.",

        payment: {
          id: payment.id,
          status: payment.status,
        },
      });
    }

    // -----------------------------------------------------
    // 9. Extract Safaricom response
    // -----------------------------------------------------

    const {
      ResponseCode,
      ResponseDescription,
      MerchantRequestID,
      CheckoutRequestID,
      CustomerMessage,
    } = stkResponse || {};

    // -----------------------------------------------------
    // 10. STK rejected immediately
    // -----------------------------------------------------

    if (
      String(ResponseCode) !== "0" ||
      !CheckoutRequestID
    ) {
      payment =
        await prisma.payment.update({
          where: {
            id: payment.id,
          },

          data: {
            status: "FAILED",

            merchantRequestId:
              MerchantRequestID ||
              null,

            checkoutRequestId:
              CheckoutRequestID ||
              null,

            resultCode:
              ResponseCode !==
              undefined
                ? String(
                    ResponseCode
                  )
                : null,

            resultDescription:
              ResponseDescription ||
              CustomerMessage ||
              "M-PESA rejected the STK Push request.",
          },
        });

      return res.status(400).json({
        success: false,

        message:
          ResponseDescription ||
          CustomerMessage ||
          "Unable to initiate M-PESA payment.",

        payment: {
          id: payment.id,
          status:
            payment.status,
        },
      });
    }

    // -----------------------------------------------------
    // 11. STK accepted
    // -----------------------------------------------------

    payment =
      await prisma.payment.update({
        where: {
          id: payment.id,
        },

        data: {
          merchantRequestId:
            MerchantRequestID ||
            null,

          checkoutRequestId:
            CheckoutRequestID,

          resultCode:
            ResponseCode !==
            undefined
              ? String(
                  ResponseCode
                )
              : null,

          resultDescription:
            ResponseDescription ||
            CustomerMessage ||
            null,
        },
      });

    // -----------------------------------------------------
    // 12. Return new payment
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        CustomerMessage ||
        "STK Push sent. Check your phone and enter your M-PESA PIN.",

      payment: {
        id: payment.id,

        status:
          payment.status,

        amount:
          payment.amount,

        currency:
          payment.currency,

        phoneNumber:
          payment.phoneNumber,

        checkoutRequestId:
          payment.checkoutRequestId,
      },

      promotion: {
        id: promotion.id,

        type:
          promotion.type,

        status:
          promotion.status,

        amount:
          promotion.amount,

        currency:
          promotion.currency,

        durationDays:
          promotion.durationDays,
      },
    });
  } catch (error) {
    console.error(
      "PAY PROMOTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process promotion payment.",
    });
  }
};

/**
 * =========================================================
 * GET PROMOTION PAYMENT STATUS
 * GET /api/promotions/payments/:paymentId/status
 * =========================================================
 */
export const getPromotionPaymentStatus =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const {
        paymentId,
      } = req.params;

      if (!paymentId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Payment ID is required.",
          });
      }

      const payment =
        await prisma.payment.findFirst({
          where: {
            id: paymentId,
            userId,
            type: "PROMOTION",
          },

          include: {
            promotion: {
              select: {
                id: true,
                type: true,
                status: true,
                amount: true,
                currency: true,
                durationDays: true,
                startsAt: true,
                endsAt: true,

                listing: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                  },
                },
              },
            },
          },
        });

      if (!payment) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Promotion payment not found.",
          });
      }

      return res.status(200).json({
        success: true,

        payment: {
          id: payment.id,

          status:
            payment.status,

          amount:
            payment.amount,

          currency:
            payment.currency,

          phoneNumber:
            payment.phoneNumber,

          receiptNumber:
            payment.receiptNumber,

          checkoutRequestId:
            payment.checkoutRequestId,

          resultCode:
            payment.resultCode,

          resultDescription:
            payment.resultDescription,

          createdAt:
            payment.createdAt,

          updatedAt:
            payment.updatedAt,
        },

        promotion:
          payment.promotion,
      });
    } catch (error) {
      console.error(
        "GET PROMOTION PAYMENT STATUS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to retrieve promotion payment status.",
        });
    }
  };