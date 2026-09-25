import prisma from "../config/prisma.js";

/**
 * =====================================================
 * EXPIRE ALL FINISHED PROMOTIONS
 * =====================================================
 *
 * Finds every ACTIVE promotion whose end date/time
 * has passed and changes its status to EXPIRED.
 *
 * Safe to call repeatedly because only ACTIVE
 * promotions are updated.
 */
export const expirePromotions = async () => {
  try {
    const now = new Date();

    const result =
      await prisma.promotion.updateMany({
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
        `PROMOTION EXPIRY: ${result.count} promotion(s) expired.`
      );
    }

    return {
      success: true,
      expiredCount: result.count,
      checkedAt: now,
    };
  } catch (error) {
    console.error(
      "EXPIRE PROMOTIONS ERROR:",
      error
    );

    throw error;
  }
};

/**
 * =====================================================
 * EXPIRE ONE PROMOTION IF NECESSARY
 * =====================================================
 *
 * Used when loading:
 *
 * - promotion details
 * - promotion analytics
 * - individual promotion information
 *
 * If the promotion is ACTIVE and endsAt has passed,
 * its status becomes EXPIRED.
 */
export const expirePromotionIfNeeded = async (
  promotionId
) => {
  try {
    if (!promotionId) {
      return null;
    }

    const now = new Date();

    await prisma.promotion.updateMany({
      where: {
        id: promotionId,

        status: "ACTIVE",

        endsAt: {
          lte: now,
        },
      },

      data: {
        status: "EXPIRED",
      },
    });

    const promotion =
      await prisma.promotion.findUnique({
        where: {
          id: promotionId,
        },
      });

    return promotion;
  } catch (error) {
    console.error(
      "EXPIRE PROMOTION IF NEEDED ERROR:",
      error
    );

    throw error;
  }
};