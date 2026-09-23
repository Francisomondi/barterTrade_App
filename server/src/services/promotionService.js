
import prisma from "../config/prisma.js";

/**
 * Promotion pricing.
 *
 * IMPORTANT:
 * Prices are controlled by the backend.
 *
 * Never trust a price sent from React.
 */
const PROMOTION_PACKAGES = {
  FEATURED: {
    3: 100,
    7: 200,
  },

  BOOST: {
    3: 50,
    7: 100,
  },

  HOMEPAGE: {
    3: 300,
    7: 500,
  },
};

/**
 * Get the price of a promotion package.
 */
export const getPromotionPrice = ({
  type,
  durationDays,
}) => {
  const packagePrices =
    PROMOTION_PACKAGES[type];

  if (!packagePrices) {
    throw new Error(
      "INVALID_PROMOTION_TYPE"
    );
  }

  const price =
    packagePrices[durationDays];

  if (!price) {
    throw new Error(
      "INVALID_PROMOTION_DURATION"
    );
  }

  return price;
};

/**
 * Get available promotion packages.
 */
export const getPromotionPackages = () => {
  return Object.entries(
    PROMOTION_PACKAGES
  ).flatMap(([type, durations]) =>
    Object.entries(durations).map(
      ([durationDays, amount]) => ({
        type,
        durationDays: Number(
          durationDays
        ),
        amount,
        currency: "KES",
      })
    )
  );
};

/**
 * Activate a promotion after successful payment.
 *
 * IMPORTANT:
 * This function should only be called after
 * the Payment has been confirmed as COMPLETED.
 */
export const activatePromotion = async (
  paymentId
) => {
  return prisma.$transaction(
    async (tx) => {
      /*
       * Find the payment and promotion.
       */
      const payment =
        await tx.payment.findUnique({
          where: {
            id: paymentId,
          },

          include: {
            promotion: true,
          },
        });

      if (!payment) {
        throw new Error(
          "PAYMENT_NOT_FOUND"
        );
      }

      /*
       * Only completed payments can
       * activate promotions.
       */
      if (payment.status !== "COMPLETED") {
        throw new Error(
          "PAYMENT_NOT_COMPLETED"
        );
      }

      /*
       * This payment must belong to
       * a promotion.
       */
      if (!payment.promotion) {
        throw new Error(
          "PROMOTION_NOT_FOUND"
        );
      }

      const promotion =
        payment.promotion;

      /*
       * Idempotency protection.
       *
       * If already active, return it instead
       * of activating it again.
       */
      if (
        promotion.status === "ACTIVE"
      ) {
        return promotion;
      }

      /*
       * Don't reactivate cancelled
       * promotions.
       */
      if (
        promotion.status === "CANCELLED"
      ) {
        throw new Error(
          "PROMOTION_CANCELLED"
        );
      }

      /*
       * Verify the promotion amount matches
       * the payment amount.
       */
      if (
        Number(promotion.amount) !==
        Number(payment.amount)
      ) {
        throw new Error(
          "PROMOTION_PAYMENT_AMOUNT_MISMATCH"
        );
      }

      const startsAt = new Date();

      const endsAt = new Date(
        startsAt
      );

      endsAt.setDate(
        endsAt.getDate() +
          promotion.durationDays
      );

      /*
       * Activate the promotion.
       */
      const activatedPromotion =
        await tx.promotion.update({
          where: {
            id: promotion.id,
          },

          data: {
            status: "ACTIVE",
            startsAt,
            endsAt,
          },

          include: {
            listing: true,
          },
        });

      /*
       * If this is the first active promotion
       * for the listing, make sure the listing
       * itself remains ACTIVE.
       *
       * Promotion does not change the listing's
       * ListingStatus.
       */
      if (
        activatedPromotion.listing.status !==
        "ACTIVE"
      ) {
        throw new Error(
          "LISTING_NOT_ACTIVE"
        );
      }

      return activatedPromotion;
    }
  );
};

/**
 * EXPIRE PROMOTIONS
 *
 * Changes all expired ACTIVE promotions to EXPIRED.
 *
 * A promotion is expired when:
 *
 * status = ACTIVE
 *
 * AND
 *
 * endsAt <= now
 *
 * This function is intentionally idempotent.
 *
 * Running it multiple times is safe because already-expired
 * promotions are not selected again.
 */
export const expirePromotions = async () => {
  const now = new Date();

  const result = await prisma.promotion.updateMany({
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
      `[PROMOTIONS] Expired ${result.count} promotion(s).`
    );
  }

  return result.count;
};


/**
 * EXPIRE ABANDONED PENDING PROMOTIONS
 *
 * A promotion that remains PENDING for more than 24 hours
 * is considered abandoned.
 *
 * The promotion is cancelled rather than expired because
 * it never actually became active.
 */
export const cleanupPendingPromotions = async () => {
  const cutoff = new Date(
    Date.now() -
      24 * 60 * 60 * 1000
  );

  const result =
    await prisma.promotion.updateMany({
      where: {
        status: "PENDING",

        createdAt: {
          lte: cutoff,
        },
      },

      data: {
        status: "CANCELLED",
      },
    });

  if (result.count > 0) {
    console.log(
      `[PROMOTIONS] Cancelled ${result.count} abandoned pending promotion(s).`
    );
  }

  return result.count;
};

