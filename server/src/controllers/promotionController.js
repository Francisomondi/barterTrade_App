
import prisma from "../config/prisma.js";

import {
  getPromotionPackages,
  getPromotionPrice,
} from "../services/promotionService.js";

import {
  initiateStkPush,
  normalizeMpesaPhone,
} from "../services/mpesaService.js";

/**
 * GET PROMOTION PACKAGES
 * GET /api/promotions/packages
 *
 * Public endpoint.
 */
export const getPackages = async (
  req,
  res
) => {
  try {
    const packages =
      getPromotionPackages();

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error(
      "GET PROMOTION PACKAGES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load promotion packages.",
    });
  }
};

/**
 * CREATE PROMOTION
 * POST /api/promotions
 *
 * Creates a PENDING promotion and its
 * associated PENDING payment.
 *
 * The promotion does NOT become active here.
 */
export const createPromotion = async ( req,res) => {
  try {
    const userId = req.user.id;

    const {
      listingId,
      type,
      durationDays,
    } = req.body;

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

    if (!durationDays) {
      return res.status(400).json({
        success: false,
        message:
          "Promotion duration is required.",
      });
    }

    /*
     * Calculate price on the server.
     */
    let amount;

    try {
      amount = getPromotionPrice({
        type,
        durationDays:
          Number(durationDays),
      });
    } catch (error) {
      if (
        error.message ===
        "INVALID_PROMOTION_TYPE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid promotion type.",
        });
      }

      if (
        error.message ===
        "INVALID_PROMOTION_DURATION"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid promotion duration.",
        });
      }

      throw error;
    }

    /*
     * Make sure the listing belongs to
     * the authenticated user.
     */
    const listing = await prisma.listing.findUnique({
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

    if (listing.userId !== userId) {
      return res.status(403).json({
        success: false,
        message:
          "You can only promote your own listing.",
      });
    }

    /*
     * Promotions only make sense for
     * active listings.
     */
    if (listing.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message:
          "Only active listings can be promoted.",
      });
    }

    const now = new Date();
    
    const existingActivePromotion = await prisma.promotion.findFirst({
        where: {
          userId,
          listingId,

          status: "ACTIVE",

          endsAt: {
            gte: now,
          },
        },
    });

if (existingActivePromotion) {
  return res.status(409).json({
    success: false,
    message:
      "This listing already has an active promotion. Please wait until it expires before purchasing another promotion.",
  });
}

    /*
     * Prevent multiple simultaneously
     * pending promotions for the same listing.
     *
     * We can allow multiple ACTIVE promotions
     * later if the product requires stacking.
     */
    const existingPending =
      await prisma.promotion.findFirst({
        where: {
          listingId,
          userId,
          status: "PENDING",
        },
      });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message:
          "This listing already has a pending promotion payment.",
        promotion: existingPending,
      });
    }

    /*
     * Create promotion and payment together.
     */
    const result =
      await prisma.$transaction(
        async (tx) => {
          const promotion =
            await tx.promotion.create({
              data: {
                userId,
                listingId,

                type,
                status: "PENDING",

                amount,
                currency: "KES",

                durationDays:
                  Number(durationDays),
              },
            });

          const payment =
            await tx.payment.create({
              data: {
                userId,

                promotionId:
                  promotion.id,

                amount,
                currency: "KES",

                status: "PENDING",

                type: "PROMOTION",

                provider: "MPESA",

                description:
                  `${type} promotion for "${listing.title}"`,
              },
            });

          return {
            promotion,
            payment,
          };
        }
      );

    return res.status(201).json({
      success: true,

      message:
        "Promotion created. Complete the M-PESA payment to activate it.",

      promotion: result.promotion,

      payment: result.payment,
    });
  } catch (error) {
    console.error(
      "CREATE PROMOTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create promotion.",
    });
  }
};

/**
 * GET MY PROMOTIONS
 * GET /api/promotions/my
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

          payment: {
            select: {
              id: true,
              status: true,
              receiptNumber: true,
              amount: true,
              currency: true,
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
 * GET SINGLE PROMOTION
 * GET /api/promotions/:id
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

          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              receiptNumber: true,
              checkoutRequestId: true,
              createdAt: true,
            },
          },
        },
      });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found.",
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
 * PAY FOR PROMOTION
 * POST /api/promotions/:id/pay
 *
 * Sends an M-PESA STK Push for an existing
 * PENDING promotion.
 */
export const payForPromotion = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const {
      phoneNumber,
    } = req.body;

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
        normalizeMpesaPhone(
          phoneNumber
        );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    /*
     * Find the user's promotion.
     */
    const promotion =
      await prisma.promotion.findFirst({
        where: {
          id,
          userId,
        },

        include: {
          payment: true,
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message:
          "Promotion not found.",
      });
    }

    /*
     * Only pending promotions can be paid.
     */
    if (
      promotion.status !== "PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This promotion is no longer pending payment.",
      });
    }

    /*
     * Make sure the listing is still active.
     */
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

    /*
     * The promotion must have an associated
     * Payment record.
     */
    if (!promotion.payment) {
      return res.status(500).json({
        success: false,
        message:
          "Promotion payment record was not found.",
      });
    }

    /*
     * Only pending payments can initiate
     * a new STK Push.
     */
    if (
      promotion.payment.status !==
      "PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This promotion payment has already been processed.",
      });
    }

    /*
     * Generate a short account reference.
     */
    const accountReference =
      `PROMO-${promotion.id
        .replace(/-/g, "")
        .substring(0, 12)
        .toUpperCase()}`;

    /*
     * Send STK Push.
     */
    let stkResponse;

    try {
      stkResponse =
        await initiateStkPush({
          amount: promotion.amount,

          phoneNumber:
            normalizedPhone,

          accountReference,

          transactionDesc:
            `${promotion.type} promotion`,
        });
    } catch (error) {
      await prisma.payment.update({
        where: {
          id: promotion.payment.id,
        },

        data: {
          status: "FAILED",

          phoneNumber:
            normalizedPhone,

          resultDescription:
            error.message,
        },
      });

      return res.status(502).json({
        success: false,
        message: error.message,
      });
    }

    const {
      ResponseCode,
      ResponseDescription,
      MerchantRequestID,
      CheckoutRequestID,
      CustomerMessage,
    } = stkResponse || {};

    /*
     * STK request rejected.
     */
    if (
      String(ResponseCode) !== "0" ||
      !CheckoutRequestID
    ) {
      await prisma.payment.update({
        where: {
          id: promotion.payment.id,
        },

        data: {
          status: "FAILED",

          phoneNumber:
            normalizedPhone,

          merchantRequestId:
            MerchantRequestID || null,

          checkoutRequestId:
            CheckoutRequestID || null,

          resultCode:
            ResponseCode !== undefined
              ? String(ResponseCode)
              : null,

          resultDescription:
            ResponseDescription ||
            CustomerMessage ||
            "M-PESA STK Push failed.",
        },
      });

      return res.status(400).json({
        success: false,
        message:
          ResponseDescription ||
          CustomerMessage ||
          "Unable to initiate M-PESA payment.",
      });
    }

    /*
     * Store Safaricom identifiers.
     */
    const payment =
      await prisma.payment.update({
        where: {
          id: promotion.payment.id,
        },

        data: {
          phoneNumber:
            normalizedPhone,

          merchantRequestId:
            MerchantRequestID || null,

          checkoutRequestId:
            CheckoutRequestID,

          resultCode:
            ResponseCode !== undefined
              ? String(ResponseCode)
              : null,

          resultDescription:
            ResponseDescription || null,
        },
      });

    return res.status(200).json({
      success: true,

      message:
        CustomerMessage ||
        "STK Push sent. Check your phone and enter your M-PESA PIN.",

      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        checkoutRequestId:
          payment.checkoutRequestId,
      },

      promotion: {
        id: promotion.id,
        type: promotion.type,
        durationDays:
          promotion.durationDays,
        status: promotion.status,
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
