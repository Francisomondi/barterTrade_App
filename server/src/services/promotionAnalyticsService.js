import prisma from "../config/prisma.js";

/**
 * Check whether a promotion is currently active.
 */
const getActivePromotion = async (promotionId) => {
  const now = new Date();

  return prisma.promotion.findFirst({
    where: {
      id: promotionId,

      status: "ACTIVE",

      startsAt: {
        lte: now,
      },

      endsAt: {
        gte: now,
      },
    },

    select: {
      id: true,
      userId: true,
      listingId: true,
      type: true,
      status: true,
      startsAt: true,
      endsAt: true,
    },
  });
};

/**
 * Record a promotion analytics event.
 *
 * Supported events:
 *
 * VIEW
 * CLICK
 *
 * The promotion owner is not counted.
 */
export const recordPromotionEvent = async ({
  promotionId,
  userId = null,
  type,
}) => {
  if (!["VIEW", "CLICK"].includes(type)) {
    throw new Error("Invalid promotion analytics event.");
  }

  const promotion =
    await getActivePromotion(promotionId);

  if (!promotion) {
    throw new Error(
      "Promotion is not currently active."
    );
  }

  /*
   * Do not count the listing owner viewing/clicking
   * their own promoted listing.
   */
  if (
    userId &&
    promotion.userId === userId
  ) {
    return null;
  }

  const event =
    await prisma.promotionAnalyticsEvent.create({
      data: {
        promotionId,
        userId,
        type,
      },
    });

  return event;
};

/**
 * Get analytics for one promotion.
 *
 * Only the promotion owner should call this service.
 */
export const getPromotionAnalytics = async ({
  promotionId,
  userId,
}) => {
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

            images: {
              orderBy: [
                {
                  isPrimary: "desc",
                },
                {
                  sortOrder: "asc",
                },
              ],

              take: 1,
            },
          },
        },
      },
    });

  if (!promotion) {
    const error = new Error(
      "Promotion not found."
    );

    error.statusCode = 404;

    throw error;
  }

  const [
    totalViews,
    totalClicks,
    uniqueViewers,
    uniqueClickers,
  ] = await Promise.all([
    prisma.promotionAnalyticsEvent.count({
      where: {
        promotionId,
        type: "VIEW",
      },
    }),

    prisma.promotionAnalyticsEvent.count({
      where: {
        promotionId,
        type: "CLICK",
      },
    }),

    prisma.promotionAnalyticsEvent.findMany({
      where: {
        promotionId,
        type: "VIEW",
        userId: {
          not: null,
        },
      },

      distinct: ["userId"],

      select: {
        userId: true,
      },
    }),

    prisma.promotionAnalyticsEvent.findMany({
      where: {
        promotionId,
        type: "CLICK",
        userId: {
          not: null,
        },
      },

      distinct: ["userId"],

      select: {
        userId: true,
      },
    }),
  ]);

  const uniqueViewerCount =
    uniqueViewers.length;

  const uniqueClickerCount =
    uniqueClickers.length;

  const clickThroughRate =
    totalViews > 0
      ? Number(
          (
            (totalClicks / totalViews) *
            100
          ).toFixed(2)
        )
      : 0;

  /*
   * Get daily performance.
   */
  const events =
    await prisma.promotionAnalyticsEvent.findMany({
      where: {
        promotionId,
      },

      select: {
        type: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  const dailyMap = new Map();

  for (const event of events) {
    const date =
      event.createdAt
        .toISOString()
        .slice(0, 10);

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        views: 0,
        clicks: 0,
      });
    }

    const day = dailyMap.get(date);

    if (event.type === "VIEW") {
      day.views += 1;
    }

    if (event.type === "CLICK") {
      day.clicks += 1;
    }
  }

  const daily = Array.from(
    dailyMap.values()
  ).map((day) => ({
    ...day,

    clickThroughRate:
      day.views > 0
        ? Number(
            (
              (day.clicks / day.views) *
              100
            ).toFixed(2)
          )
        : 0,
  }));

  return {
    promotion: {
      id: promotion.id,
      type: promotion.type,
      status: promotion.status,
      amount: promotion.amount,
      currency: promotion.currency,
      durationDays:
        promotion.durationDays,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      createdAt: promotion.createdAt,

      listing: promotion.listing,
    },

    analytics: {
      totalViews,
      totalClicks,

      uniqueViewers:
        uniqueViewerCount,

      uniqueClickers:
        uniqueClickerCount,

      clickThroughRate,

      daily,
    },
  };
};