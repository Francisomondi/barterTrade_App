

import prisma from "../config/prisma.js";

/**
 * ============================================================
 * BUSINESS ANALYTICS SERVICE
 * ============================================================
 *
 * Central calculation layer for Business Analytics.
 *
 * IMPORTANT:
 *
 * 1. This service does NOT decide whether a business is Free
 *    or Business Pro.
 *
 * 2. This service does NOT mutate analytics data.
 *
 * 3. This service aggregates existing data from:
 *
 *    - BusinessAnalyticsEvent
 *    - Listing
 *    - Offer
 *    - Trade
 *    - Promotion
 *    - PromotionAnalyticsEvent
 *
 * 4. BusinessProfile remains the business identity.
 *
 * 5. Listings remain owned by User through Listing.userId.
 *
 * 6. Business Pro entitlement filtering belongs in later
 *    service/controller layers.
 *
 * ============================================================
 */


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const DEFAULT_ANALYTICS_DAYS = 30;

const MAX_ANALYTICS_DAYS = 365;

const DAY_MS =
  24 * 60 * 60 * 1000;

const ANALYTICS_EVENT_TYPES = {
  LISTING_VIEW:
    "LISTING_VIEW",

  STOREFRONT_VIEW:
    "STOREFRONT_VIEW",

  CONTACT_CLICK:
    "CONTACT_CLICK",

  WEBSITE_CLICK:
    "WEBSITE_CLICK",

  PHONE_CLICK:
    "PHONE_CLICK",

  LISTING_SHARE:
    "LISTING_SHARE",
};


/**
 * ============================================================
 * BASIC HELPERS
 * ============================================================
 */

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};


const round = (
  value,
  decimals = 2
) => {
  const number =
    safeNumber(value);

  const factor =
    10 ** decimals;

  return (
    Math.round(
      number * factor
    ) / factor
  );
};


const percentage = (
  numerator,
  denominator
) => {
  const top =
    safeNumber(numerator);

  const bottom =
    safeNumber(denominator);

  if (bottom <= 0) {
    return 0;
  }

  return round(
    (top / bottom) * 100
  );
};


const clampDays = (days) => {
  const parsed =
    Number.parseInt(
      days,
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return DEFAULT_ANALYTICS_DAYS;
  }

  return Math.min(
    parsed,
    MAX_ANALYTICS_DAYS
  );
};


const startOfDay = (date) => {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
};


const endOfDay = (date) => {
  const result =
    new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
};


const formatDateKey = (
  date
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


/**
 * ============================================================
 * ANALYTICS WINDOW
 * ============================================================
 *
 * If startDate/endDate are not supplied:
 *
 *     last 30 days
 *
 * Later Business Pro may request larger/custom windows.
 *
 * The calculation engine itself remains entitlement-neutral.
 * ============================================================
 */

export const buildAnalyticsWindow = ({
  days = DEFAULT_ANALYTICS_DAYS,
  startDate = null,
  endDate = null,
} = {}) => {
  if (
    startDate ||
    endDate
  ) {
    const end =
      endDate
        ? endOfDay(
            new Date(
              endDate
            )
          )
        : new Date();

    const start =
      startDate
        ? startOfDay(
            new Date(
              startDate
            )
          )
        : new Date(
            end.getTime() -
              (DEFAULT_ANALYTICS_DAYS -
                1) *
                DAY_MS
          );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new Error(
        "Invalid analytics date range."
      );
    }

    if (start > end) {
      throw new Error(
        "Analytics start date cannot be after end date."
      );
    }

    const difference =
      Math.floor(
        (end.getTime() -
          start.getTime()) /
          DAY_MS
      ) + 1;

    if (
      difference >
      MAX_ANALYTICS_DAYS
    ) {
      throw new Error(
        `Analytics range cannot exceed ${MAX_ANALYTICS_DAYS} days.`
      );
    }

    return {
      start,
      end,
      days:
        difference,
    };
  }

  const normalizedDays =
    clampDays(days);

  const end =
    new Date();

  const start =
    startOfDay(
      new Date(
        end.getTime() -
          (normalizedDays -
            1) *
            DAY_MS
      )
    );

  return {
    start,
    end,
    days:
      normalizedDays,
  };
};


/**
 * ============================================================
 * GET BUSINESS CONTEXT
 * ============================================================
 */

export const getBusinessAnalyticsContext =
  async (
    businessId
  ) => {
    if (!businessId) {
      throw new Error(
        "Business ID is required."
      );
    }

    const business =
      await prisma.businessProfile.findUnique(
        {
          where: {
            id: businessId,
          },

          select: {
            id: true,
            userId: true,
            businessName: true,
            slug: true,
            status: true,
            verificationStatus:
              true,
            createdAt: true,
          },
        }
      );

    if (!business) {
      throw new Error(
        "Business profile not found."
      );
    }

    return business;
  };


/**
 * ============================================================
 * ANALYTICS EVENT METRICS
 * ============================================================
 */

const getEventMetrics =
  async ({
    businessId,
    start,
    end,
  }) => {
    const where = {
      businessId,

      createdAt: {
        gte: start,
        lte: end,
      },
    };

    const [
      groupedEvents,
      visitorRows,
    ] =
      await Promise.all([
        prisma.businessAnalyticsEvent.groupBy(
          {
            by: [
              "type",
            ],

            where,

            _count: {
              _all: true,
            },
          }
        ),

        prisma.businessAnalyticsEvent.findMany(
          {
            where,

            select: {
              visitorKey:
                true,
              visitorUserId:
                true,
            },
          }
        ),
      ]);

    const counts = {
      LISTING_VIEW: 0,
      STOREFRONT_VIEW: 0,
      CONTACT_CLICK: 0,
      WEBSITE_CLICK: 0,
      PHONE_CLICK: 0,
      LISTING_SHARE: 0,
    };

    for (
      const row of
      groupedEvents
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          row.type
        )
      ) {
        counts[row.type] =
          row._count._all;
      }
    }

    /**
     * Unique visitors are calculated from the hashed
     * visitor key whenever available.
     *
     * No raw IP address is required.
     */

    const uniqueVisitors =
      new Set();

    for (
      const row of
      visitorRows
    ) {
      if (
        row.visitorKey
      ) {
        uniqueVisitors.add(
          row.visitorKey
        );

        continue;
      }

      if (
        row.visitorUserId
      ) {
        uniqueVisitors.add(
          `user:${row.visitorUserId}`
        );
      }
    }

    const engagementActions =
      counts.CONTACT_CLICK +
      counts.WEBSITE_CLICK +
      counts.PHONE_CLICK +
      counts.LISTING_SHARE;

    const totalViews =
      counts.LISTING_VIEW +
      counts.STOREFRONT_VIEW;

    return {
      listingViews:
        counts.LISTING_VIEW,

      storefrontViews:
        counts.STOREFRONT_VIEW,

      totalViews,

      contactClicks:
        counts.CONTACT_CLICK,

      websiteClicks:
        counts.WEBSITE_CLICK,

      phoneClicks:
        counts.PHONE_CLICK,

      listingShares:
        counts.LISTING_SHARE,

      engagementActions,

      uniqueVisitors:
        uniqueVisitors.size,

      engagementRate:
        percentage(
          engagementActions,
          totalViews
        ),
    };
  };


/**
 * ============================================================
 * LISTING METRICS
 * ============================================================
 */

const getListingMetrics =
  async ({
    businessId,
    userId,
    start,
    end,
  }) => {
    const [
      totalListings,
      activeListings,
      createdInPeriod,
      listingViews,
    ] =
      await Promise.all([
        prisma.listing.count(
          {
            where: {
              userId,
            },
          }
        ),

        prisma.listing.count(
          {
            where: {
              userId,

              status:
                "ACTIVE",
            },
          }
        ),

        prisma.listing.count(
          {
            where: {
              userId,

              createdAt: {
                gte: start,
                lte: end,
              },
            },
          }
        ),

        prisma.businessAnalyticsEvent.count(
          {
            where: {
              businessId,

              type:
                ANALYTICS_EVENT_TYPES.LISTING_VIEW,

              createdAt: {
                gte: start,
                lte: end,
              },
            },
          }
        ),
      ]);

    return {
      totalListings,

      activeListings,

      createdInPeriod,

      listingViews,

      averageViewsPerActiveListing:
        activeListings > 0
          ? round(
              listingViews /
                activeListings
            )
          : 0,
    };
  };


/**
 * ============================================================
 * OFFER METRICS
 * ============================================================
 *
 * An offer received by the business is identified through:
 *
 *     Offer.receiverId === BusinessProfile.userId
 *
 * We do NOT infer business offers from a businessId column.
 * ============================================================
 */

const getOfferMetrics = async ({
    userId,
    start,
    end,
  }) => {
    const where = {
      receiverId:
        userId,

      createdAt: {
        gte: start,
        lte: end,
      },
    };

    const grouped =
      await prisma.offer.groupBy(
        {
          by: [
            "status",
          ],

          where,

          _count: {
            _all: true,
          },
        }
      );

    const counts = {
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      COUNTERED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };

    for (
      const row of grouped
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          counts,
          row.status
        )
      ) {
        counts[row.status] =
          row._count._all;
      }
    }

    const totalReceived =
      Object.values(
        counts
      ).reduce(
        (
          total,
          count
        ) =>
          total +
          safeNumber(
            count
          ),
        0
      );

    return {
      totalReceived,

      pending:
        counts.PENDING,

      accepted:
        counts.ACCEPTED,

      rejected:
        counts.REJECTED,

      countered:
        counts.COUNTERED,

      cancelled:
        counts.CANCELLED,

      expired:
        counts.EXPIRED,

      acceptanceRate:
        percentage(
          counts.ACCEPTED,
          totalReceived
        ),
    };
  };

/**
 * ============================================================
 * BASIC OFFER ANALYTICS
 * ============================================================
 *
 * Business Free offer analytics.
 *
 * Source of truth:
 *
 *     Offer.receiverId === BusinessProfile.userId
 *
 * The business receives the requested listing side of an offer:
 *
 *     Offer.requestedListingId
 *
 * This layer provides descriptive analytics only.
 *
 * Advanced demand intelligence, recommendations, marketplace
 * comparisons and forecasting belong to Business Pro later.
 * ============================================================
 */

const getOfferAnalytics = async ({
  userId,
  start,
  end,
}) => {
  const offers =
    await prisma.offer.findMany({
      where: {
        receiverId: userId,

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        requestedListingId:
          true,

        requestedListing: {
          select: {
            id: true,
            title: true,
            status: true,
            estimatedValue: true,

            category: {
              select: {
                id: true,
                name: true,
              },
            },

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

              select: {
                id: true,
                url: true,
                isPrimary: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  /**
   * ----------------------------------------------------------
   * Status counters
   * ----------------------------------------------------------
   */

  const statusCounts = {
    PENDING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    COUNTERED: 0,
    CANCELLED: 0,
    EXPIRED: 0,
  };

  /**
   * ----------------------------------------------------------
   * Listing-level offer map
   * ----------------------------------------------------------
   */

  const listingMap =
    new Map();

  /**
   * ----------------------------------------------------------
   * Daily activity map
   * ----------------------------------------------------------
   */

  const dailyMap =
    new Map();

  const cursor =
    startOfDay(start);

  const finalDay =
    startOfDay(end);

  while (
    cursor <= finalDay
  ) {
    const key =
      formatDateKey(
        cursor
      );

    dailyMap.set(
      key,
      {
        date: key,

        total: 0,

        pending: 0,
        accepted: 0,
        rejected: 0,
        countered: 0,
        cancelled: 0,
        expired: 0,
      }
    );

    cursor.setDate(
      cursor.getDate() + 1
    );
  }

  /**
   * ----------------------------------------------------------
   * Aggregate offers
   * ----------------------------------------------------------
   */

  for (const offer of offers) {
    /**
     * Business-wide status.
     */

    if (
      Object.prototype.hasOwnProperty.call(
        statusCounts,
        offer.status
      )
    ) {
      statusCounts[
        offer.status
      ] += 1;
    }

    /**
     * Listing-level metrics.
     */

    const listing =
      offer.requestedListing;

    if (listing) {
      if (
        !listingMap.has(
          listing.id
        )
      ) {
        listingMap.set(
          listing.id,
          {
            id:
              listing.id,

            title:
              listing.title,

            status:
              listing.status,

            estimatedValue:
              listing.estimatedValue,

            category:
              listing.category,

            image:
              listing.images?.[0] ||
              null,

            totalOffers: 0,

            pending: 0,
            accepted: 0,
            rejected: 0,
            countered: 0,
            cancelled: 0,
            expired: 0,
          }
        );
      }

      const listingMetrics =
        listingMap.get(
          listing.id
        );

      listingMetrics.totalOffers +=
        1;

      switch (
        offer.status
      ) {
        case "PENDING":
          listingMetrics.pending +=
            1;
          break;

        case "ACCEPTED":
          listingMetrics.accepted +=
            1;
          break;

        case "REJECTED":
          listingMetrics.rejected +=
            1;
          break;

        case "COUNTERED":
          listingMetrics.countered +=
            1;
          break;

        case "CANCELLED":
          listingMetrics.cancelled +=
            1;
          break;

        case "EXPIRED":
          listingMetrics.expired +=
            1;
          break;

        default:
          break;
      }
    }

    /**
     * Daily activity.
     */

    const dateKey =
      formatDateKey(
        offer.createdAt
      );

    const day =
      dailyMap.get(
        dateKey
      );

    if (day) {
      day.total += 1;

      switch (
        offer.status
      ) {
        case "PENDING":
          day.pending += 1;
          break;

        case "ACCEPTED":
          day.accepted += 1;
          break;

        case "REJECTED":
          day.rejected += 1;
          break;

        case "COUNTERED":
          day.countered += 1;
          break;

        case "CANCELLED":
          day.cancelled += 1;
          break;

        case "EXPIRED":
          day.expired += 1;
          break;

        default:
          break;
      }
    }
  }

  /**
   * ----------------------------------------------------------
   * Totals
   * ----------------------------------------------------------
   */

  const totalReceived =
    offers.length;

  const accepted =
    statusCounts.ACCEPTED;

  const rejected =
    statusCounts.REJECTED;

  const countered =
    statusCounts.COUNTERED;

  const pending =
    statusCounts.PENDING;

  const cancelled =
    statusCounts.CANCELLED;

  const expired =
    statusCounts.EXPIRED;

  /**
   * ----------------------------------------------------------
   * Actioned offers
   * ----------------------------------------------------------
   *
   * Pending offers have not yet received a final/current action.
   *
   * We include accepted, rejected and countered as business
   * response states.
   */

  const actioned =
    accepted +
    rejected +
    countered;

  /**
   * ----------------------------------------------------------
   * Listing performance
   * ----------------------------------------------------------
   */

  const listingPerformance =
    Array.from(
      listingMap.values()
    ).map(
      (listing) => ({
        ...listing,

        acceptanceRate:
          percentage(
            listing.accepted,
            listing.totalOffers
          ),

        rejectionRate:
          percentage(
            listing.rejected,
            listing.totalOffers
          ),

        counterRate:
          percentage(
            listing.countered,
            listing.totalOffers
          ),
      })
    );

  /**
   * Most-offered listings.
   *
   * This is descriptive ranking only.
   * It is not marketplace demand intelligence.
   */

  const mostOfferedListings =
    [...listingPerformance]
      .sort(
        (a, b) => {
          if (
            b.totalOffers !==
            a.totalOffers
          ) {
            return (
              b.totalOffers -
              a.totalOffers
            );
          }

          return (
            b.accepted -
            a.accepted
          );
        }
      )
      .slice(
        0,
        3
      );

  return {
    summary: {
      totalReceived,

      pending,
      accepted,
      rejected,
      countered,
      cancelled,
      expired,

      actioned,

      acceptanceRate:
        percentage(
          accepted,
          totalReceived
        ),

      rejectionRate:
        percentage(
          rejected,
          totalReceived
        ),

      counterRate:
        percentage(
          countered,
          totalReceived
        ),

      pendingRate:
        percentage(
          pending,
          totalReceived
        ),

      actionRate:
        percentage(
          actioned,
          totalReceived
        ),
    },

    listingPerformance,

    mostOfferedListings,

    dailyActivity:
      Array.from(
        dailyMap.values()
      ),
  };
};
/**
 * ============================================================
 * TRADE METRICS
 * ============================================================
 *
 * Business trades are identified by the underlying user:
 *
 *     traderAId === userId
 *        OR
 *     traderBId === userId
 *
 * ============================================================
 */

const getTradeMetrics = async ({
    userId,
    start,
    end,
  }) => {
    const businessParty = {
      OR: [
        {
          traderAId:
            userId,
        },
        {
          traderBId:
            userId,
        },
      ],
    };

    const [
      createdTrades,
      completedTrades,
      cancelledTrades,
      disputedTrades,
    ] =
      await Promise.all([
        prisma.trade.count(
          {
            where: {
              ...businessParty,

              createdAt: {
                gte: start,
                lte: end,
              },
            },
          }
        ),

        /**
         * Completed trade performance belongs to the date
         * on which the trade actually completed.
         */
        prisma.trade.count(
          {
            where: {
              ...businessParty,

              status:
                "COMPLETED",

              completedAt: {
                gte: start,
                lte: end,
              },
            },
          }
        ),

        prisma.trade.count(
          {
            where: {
              ...businessParty,

              status:
                "CANCELLED",

              updatedAt: {
                gte: start,
                lte: end,
              },
            },
          }
        ),

        prisma.trade.count(
          {
            where: {
              ...businessParty,

              status:
                "DISPUTED",

              updatedAt: {
                gte: start,
                lte: end,
              },
            },
          }
        ),
      ]);

    return {
      created:
        createdTrades,

      completed:
        completedTrades,

      cancelled:
        cancelledTrades,

      disputed:
        disputedTrades,

      completionRate:
        percentage(
          completedTrades,
          createdTrades
        ),
    };
  };

// UPDATE — server/src/services/businessAnalyticsService.js

/**
 * ============================================================
 * BASIC TRADE ANALYTICS
 * ============================================================
 *
 * Business Free trade analytics.
 *
 * A business participates in a trade when:
 *
 *     Trade.traderAId === BusinessProfile.userId
 *
 * or:
 *
 *     Trade.traderBId === BusinessProfile.userId
 *
 * The accepted Offer lets us determine which requested listing
 * belonged to the business.
 *
 * This remains descriptive analytics.
 *
 * Advanced value intelligence, marketplace comparisons,
 * recommendations and forecasting belong to Business Pro.
 * ============================================================
 */

const getTradeAnalytics = async ({
  userId,
  start,
  end,
}) => {
  /**
   * ----------------------------------------------------------
   * Trades created during the analytics period
   * ----------------------------------------------------------
   */

  const createdTrades =
    await prisma.trade.findMany({
      where: {
        OR: [
          {
            traderAId: userId,
          },
          {
            traderBId: userId,
          },
        ],

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      select: {
        id: true,
        tradeNumber: true,
        status: true,

        traderAId: true,
        traderBId: true,

        agreedValueA: true,
        agreedValueB: true,

        handoverLocation: true,

        completedAt: true,
        createdAt: true,
        updatedAt: true,

        offer: {
          select: {
            id: true,
            receiverId: true,
            requestedListingId: true,

            requestedListing: {
              select: {
                id: true,
                title: true,
                status: true,
                estimatedValue: true,

                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

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

                  select: {
                    id: true,
                    url: true,
                    isPrimary: true,
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  /**
   * ----------------------------------------------------------
   * Completed trades
   * ----------------------------------------------------------
   *
   * Completion analytics belong to completedAt rather than
   * createdAt.
   *
   * A trade created before this period but completed during the
   * period must therefore still appear in completion metrics.
   * ----------------------------------------------------------
   */

  const completedTrades =
    await prisma.trade.findMany({
      where: {
        OR: [
          {
            traderAId: userId,
          },
          {
            traderBId: userId,
          },
        ],

        status: "COMPLETED",

        completedAt: {
          gte: start,
          lte: end,
        },
      },

      select: {
        id: true,
        tradeNumber: true,

        traderAId: true,
        traderBId: true,

        agreedValueA: true,
        agreedValueB: true,

        handoverLocation: true,

        completedAt: true,
        createdAt: true,

        offer: {
          select: {
            id: true,
            receiverId: true,
            requestedListingId: true,

            requestedListing: {
              select: {
                id: true,
                title: true,
                status: true,
                estimatedValue: true,

                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },

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

                  select: {
                    id: true,
                    url: true,
                    isPrimary: true,
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        completedAt: "desc",
      },
    });

  /**
   * ----------------------------------------------------------
   * Status counts
   * ----------------------------------------------------------
   */

  const statusCounts = {
    PENDING: 0,
    AGREED: 0,
    VERIFICATION: 0,
    READY_FOR_HANDOVER: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    DISPUTED: 0,
  };

  for (const trade of createdTrades) {
    if (
      Object.prototype.hasOwnProperty.call(
        statusCounts,
        trade.status
      )
    ) {
      statusCounts[
        trade.status
      ] += 1;
    }
  }

  /**
   * completedAt is the authoritative completion metric.
   *
   * Therefore this value can differ from the number of trades
   * created during the same period whose current status happens
   * to be COMPLETED.
   */

  const completedInPeriod =
    completedTrades.length;

  /**
   * ----------------------------------------------------------
   * Business-side trade value
   * ----------------------------------------------------------
   *
   * traderA -> agreedValueA
   * traderB -> agreedValueB
   *
   * This represents the agreed value of the business owner's
   * side of completed trades.
   * ----------------------------------------------------------
   */

  let completedBusinessValue = 0;

  let totalExchangeValue = 0;

  for (const trade of completedTrades) {
    const businessValue =
      trade.traderAId === userId
        ? safeNumber(
            trade.agreedValueA
          )
        : safeNumber(
            trade.agreedValueB
          );

    completedBusinessValue +=
      businessValue;

    totalExchangeValue +=
      safeNumber(
        trade.agreedValueA
      ) +
      safeNumber(
        trade.agreedValueB
      );
  }

  /**
   * ----------------------------------------------------------
   * Listing-level completed trade performance
   * ----------------------------------------------------------
   */

  const listingMap =
    new Map();

  for (const trade of completedTrades) {
    /**
     * The business normally owns requestedListing when it was
     * the offer receiver.
     *
     * We verify receiverId before attributing the requested
     * listing to the business.
     */

    if (
      trade.offer?.receiverId !==
      userId
    ) {
      continue;
    }

    const listing =
      trade.offer
        ?.requestedListing;

    if (!listing) {
      continue;
    }

    if (
      !listingMap.has(
        listing.id
      )
    ) {
      listingMap.set(
        listing.id,
        {
          id: listing.id,

          title:
            listing.title,

          status:
            listing.status,

          estimatedValue:
            listing.estimatedValue,

          category:
            listing.category,

          image:
            listing.images?.[0] ||
            null,

          completedTrades: 0,

          businessTradeValue: 0,

          totalExchangeValue: 0,
        }
      );
    }

    const listingMetrics =
      listingMap.get(
        listing.id
      );

    listingMetrics.completedTrades +=
      1;

    const businessValue =
      trade.traderAId === userId
        ? safeNumber(
            trade.agreedValueA
          )
        : safeNumber(
            trade.agreedValueB
          );

    listingMetrics.businessTradeValue +=
      businessValue;

    listingMetrics.totalExchangeValue +=
      safeNumber(
        trade.agreedValueA
      ) +
      safeNumber(
        trade.agreedValueB
      );
  }

  const listingPerformance =
    Array.from(
      listingMap.values()
    )
      .map(
        (listing) => ({
          ...listing,

          businessTradeValue:
            round(
              listing.businessTradeValue
            ),

          totalExchangeValue:
            round(
              listing.totalExchangeValue
            ),
        })
      )
      .sort(
        (a, b) => {
          if (
            b.completedTrades !==
            a.completedTrades
          ) {
            return (
              b.completedTrades -
              a.completedTrades
            );
          }

          return (
            b.businessTradeValue -
            a.businessTradeValue
          );
        }
      );

  /**
   * ----------------------------------------------------------
   * Daily completed trade activity
   * ----------------------------------------------------------
   */

  const dailyMap =
    new Map();

  const cursor =
    startOfDay(start);

  const finalDay =
    startOfDay(end);

  while (
    cursor <= finalDay
  ) {
    const key =
      formatDateKey(
        cursor
      );

    dailyMap.set(
      key,
      {
        date: key,

        completedTrades: 0,

        businessTradeValue: 0,

        totalExchangeValue: 0,
      }
    );

    cursor.setDate(
      cursor.getDate() + 1
    );
  }

  for (const trade of completedTrades) {
    if (!trade.completedAt) {
      continue;
    }

    const key =
      formatDateKey(
        trade.completedAt
      );

    const day =
      dailyMap.get(key);

    if (!day) {
      continue;
    }

    const businessValue =
      trade.traderAId === userId
        ? safeNumber(
            trade.agreedValueA
          )
        : safeNumber(
            trade.agreedValueB
          );

    day.completedTrades +=
      1;

    day.businessTradeValue +=
      businessValue;

    day.totalExchangeValue +=
      safeNumber(
        trade.agreedValueA
      ) +
      safeNumber(
        trade.agreedValueB
      );
  }

  const dailyActivity =
    Array.from(
      dailyMap.values()
    ).map(
      (day) => ({
        ...day,

        businessTradeValue:
          round(
            day.businessTradeValue
          ),

        totalExchangeValue:
          round(
            day.totalExchangeValue
          ),
      })
    );

  /**
   * ----------------------------------------------------------
   * Recent completed trades
   * ----------------------------------------------------------
   *
   * No counterparty personal information is exposed here.
   * ----------------------------------------------------------
   */

  const recentCompletedTrades =
    completedTrades
      .slice(0, 5)
      .map(
        (trade) => {
          const listing =
            trade.offer
              ?.receiverId ===
            userId
              ? trade.offer
                  ?.requestedListing
              : null;

          const businessValue =
            trade.traderAId ===
            userId
              ? safeNumber(
                  trade.agreedValueA
                )
              : safeNumber(
                  trade.agreedValueB
                );

          return {
            id:
              trade.id,

            tradeNumber:
              trade.tradeNumber,

            completedAt:
              trade.completedAt,

            handoverLocation:
              trade.handoverLocation,

            businessTradeValue:
              round(
                businessValue
              ),

            totalExchangeValue:
              round(
                safeNumber(
                  trade.agreedValueA
                ) +
                  safeNumber(
                    trade.agreedValueB
                  )
              ),

            listing:
              listing
                ? {
                    id:
                      listing.id,

                    title:
                      listing.title,

                    image:
                      listing
                        .images?.[0] ||
                      null,
                  }
                : null,
          };
        }
      );

  /**
   * ----------------------------------------------------------
   * Summary
   * ----------------------------------------------------------
   */

  const created =
    createdTrades.length;

  const cancelled =
    statusCounts.CANCELLED;

  const disputed =
    statusCounts.DISPUTED;

  return {
    summary: {
      created,

      pending:
        statusCounts.PENDING,

      agreed:
        statusCounts.AGREED,

      verification:
        statusCounts.VERIFICATION,

      readyForHandover:
        statusCounts.READY_FOR_HANDOVER,

      inProgress:
        statusCounts.IN_PROGRESS,

      /**
       * Completed during the selected period.
       */
      completed:
        completedInPeriod,

      cancelled,

      disputed,

      /**
       * Basic descriptive rates.
       *
       * These compare outcomes with trades created during the
       * period and should not be treated as cohort analysis.
       */
      completionRate:
        percentage(
          completedInPeriod,
          created
        ),

      cancellationRate:
        percentage(
          cancelled,
          created
        ),

      disputeRate:
        percentage(
          disputed,
          created
        ),

      completedBusinessValue:
        round(
          completedBusinessValue
        ),

      totalExchangeValue:
        round(
          totalExchangeValue
        ),

      averageBusinessTradeValue:
        completedInPeriod > 0
          ? round(
              completedBusinessValue /
                completedInPeriod
            )
          : 0,
    },

    listingPerformance,

    recentCompletedTrades,

    dailyActivity,
  };
};


/**
 * ============================================================
 * TOP LISTINGS
 * ============================================================
 *
 * Ranking for the basic analytics layer:
 *
 *     1. Listing views
 *     2. Engagement actions
 *     3. Offers received
 *
 * No artificial composite "business score" is persisted.
 * ============================================================
 */

/**
 * ============================================================
 * BASIC PER-LISTING ANALYTICS
 * ============================================================
 *
 * Business Free receives useful analytics for every listing
 * within the allowed analytics window.
 *
 * Metrics:
 *
 * - listing views
 * - unique viewers
 * - contact clicks
 * - phone clicks
 * - website clicks
 * - shares
 * - engagement actions
 * - engagement rate
 * - offers received
 * - accepted offers
 * - completed trades
 * - view -> offer conversion
 * - offer -> trade conversion
 *
 * Listings remain owned by User through Listing.userId.
 * No businessId is added to Listing.
 * ============================================================
 */

const getListingPerformance = async ({
  businessId,
  userId,
  start,
  end,
}) => {
  const listings = await prisma.listing.findMany({
    where: {
      userId,
    },

    select: {
      id: true,
      title: true,
      status: true,
      estimatedValue: true,
      location: true,
      createdAt: true,
      updatedAt: true,

      category: {
        select: {
          id: true,
          name: true,
        },
      },

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

        select: {
          id: true,
          url: true,
          isPrimary: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  if (listings.length === 0) {
    return [];
  }

  const listingIds = listings.map(
    (listing) => listing.id
  );

  /**
   * ----------------------------------------------------------
   * Load analytics sources concurrently.
   * ----------------------------------------------------------
   */

  const [
    analyticsEvents,
    offers,
    completedTrades,
  ] = await Promise.all([
    /**
     * Business analytics events.
     *
     * We fetch the visitor identifiers because unique viewers
     * cannot be calculated correctly using groupBy(type) alone.
     */
    prisma.businessAnalyticsEvent.findMany({
      where: {
        businessId,

        listingId: {
          in: listingIds,
        },

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      select: {
        listingId: true,
        type: true,
        visitorKey: true,
        visitorUserId: true,
      },
    }),

    /**
     * Offers received on business listings.
     *
     * receiverId ensures the offer was actually received by
     * this business owner.
     */
    prisma.offer.findMany({
      where: {
        receiverId: userId,

        requestedListingId: {
          in: listingIds,
        },

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      select: {
        id: true,
        requestedListingId: true,
        status: true,
        createdAt: true,
      },
    }),

    /**
     * Completed trades attributed to the listing requested
     * from this business.
     *
     * Trade -> Offer -> requestedListingId gives us the listing
     * that belonged to the business.
     */
    prisma.trade.findMany({
      where: {
        status: "COMPLETED",

        completedAt: {
          gte: start,
          lte: end,
        },

        OR: [
          {
            traderAId: userId,
          },
          {
            traderBId: userId,
          },
        ],

        offer: {
          receiverId: userId,

          requestedListingId: {
            in: listingIds,
          },
        },
      },

      select: {
        id: true,
        completedAt: true,

        offer: {
          select: {
            requestedListingId: true,
          },
        },
      },
    }),
  ]);

  /**
   * ----------------------------------------------------------
   * Initialize every listing with zero-value metrics.
   *
   * This ensures listings with no activity are still returned.
   * ----------------------------------------------------------
   */

  const metricsByListing = new Map();

  for (const listing of listings) {
    metricsByListing.set(
      listing.id,
      {
        views: 0,

        uniqueViewerKeys:
          new Set(),

        contactClicks: 0,
        phoneClicks: 0,
        websiteClicks: 0,
        shares: 0,

        engagementActions: 0,

        offersReceived: 0,
        acceptedOffers: 0,

        completedTrades: 0,
      }
    );
  }

  /**
   * ----------------------------------------------------------
   * Analytics events
   * ----------------------------------------------------------
   */

  for (const event of analyticsEvents) {
    if (!event.listingId) {
      continue;
    }

    const metrics =
      metricsByListing.get(
        event.listingId
      );

    if (!metrics) {
      continue;
    }

    switch (event.type) {
      case "LISTING_VIEW": {
        metrics.views += 1;

        /**
         * visitorKey is already hashed by our tracking layer.
         *
         * Fall back to visitorUserId only if visitorKey is
         * unavailable.
         */
        if (event.visitorKey) {
          metrics.uniqueViewerKeys.add(
            event.visitorKey
          );
        } else if (
          event.visitorUserId
        ) {
          metrics.uniqueViewerKeys.add(
            `user:${event.visitorUserId}`
          );
        }

        break;
      }

      case "CONTACT_CLICK":
        metrics.contactClicks += 1;
        break;

      case "PHONE_CLICK":
        metrics.phoneClicks += 1;
        break;

      case "WEBSITE_CLICK":
        metrics.websiteClicks += 1;
        break;

      case "LISTING_SHARE":
        metrics.shares += 1;
        break;

      default:
        break;
    }
  }

  /**
   * ----------------------------------------------------------
   * Offers
   * ----------------------------------------------------------
   */

  for (const offer of offers) {
    const metrics =
      metricsByListing.get(
        offer.requestedListingId
      );

    if (!metrics) {
      continue;
    }

    metrics.offersReceived += 1;

    if (
      offer.status ===
      "ACCEPTED"
    ) {
      metrics.acceptedOffers += 1;
    }
  }

  /**
   * ----------------------------------------------------------
   * Completed trades
   * ----------------------------------------------------------
   */

  for (const trade of completedTrades) {
    const listingId =
      trade.offer
        ?.requestedListingId;

    if (!listingId) {
      continue;
    }

    const metrics =
      metricsByListing.get(
        listingId
      );

    if (!metrics) {
      continue;
    }

    metrics.completedTrades += 1;
  }

  /**
   * ----------------------------------------------------------
   * Build safe API result
   * ----------------------------------------------------------
   */

  return listings.map(
    (listing) => {
      const metrics =
        metricsByListing.get(
          listing.id
        );

      const engagementActions =
        metrics.contactClicks +
        metrics.phoneClicks +
        metrics.websiteClicks +
        metrics.shares;

      const uniqueViewers =
        metrics.uniqueViewerKeys.size;

      return {
        id: listing.id,

        title:
          listing.title,

        status:
          listing.status,

        estimatedValue:
          listing.estimatedValue,

        location:
          listing.location,

        createdAt:
          listing.createdAt,

        updatedAt:
          listing.updatedAt,

        category:
          listing.category,

        image:
          listing.images?.[0] ||
          null,

        /**
         * Traffic
         */
        views:
          metrics.views,

        uniqueViewers,

        /**
         * Engagement
         */
        contactClicks:
          metrics.contactClicks,

        phoneClicks:
          metrics.phoneClicks,

        websiteClicks:
          metrics.websiteClicks,

        shares:
          metrics.shares,

        engagementActions,

        engagementRate:
          percentage(
            engagementActions,
            metrics.views
          ),

        /**
         * Offers
         */
        offersReceived:
          metrics.offersReceived,

        acceptedOffers:
          metrics.acceptedOffers,

        offerAcceptanceRate:
          percentage(
            metrics.acceptedOffers,
            metrics.offersReceived
          ),

        /**
         * Trades
         */
        completedTrades:
          metrics.completedTrades,

        /**
         * Conversion
         */
        viewToOfferRate:
          percentage(
            metrics.offersReceived,
            metrics.views
          ),

        offerToTradeRate:
          percentage(
            metrics.completedTrades,
            metrics.offersReceived
          ),

        viewToTradeRate:
          percentage(
            metrics.completedTrades,
            metrics.views
          ),
      };
    }
  );
};


/**
 * ============================================================
 * TOP LISTINGS
 * ============================================================
 *
 * Basic Business Free ranking:
 *
 * 1. Views
 * 2. Engagement
 * 3. Offers
 * 4. Completed trades
 *
 * Uses the same listing analytics engine so calculations stay
 * consistent throughout the platform.
 * ============================================================
 */

const getTopListings = async ({
  businessId,
  userId,
  start,
  end,
  limit = 3,
}) => {
  const listings =
    await getListingPerformance({
      businessId,
      userId,
      start,
      end,
    });

  const sorted =
    [...listings].sort(
      (a, b) => {
        if (
          b.views !==
          a.views
        ) {
          return (
            b.views -
            a.views
          );
        }

        if (
          b.engagementActions !==
          a.engagementActions
        ) {
          return (
            b.engagementActions -
            a.engagementActions
          );
        }

        if (
          b.offersReceived !==
          a.offersReceived
        ) {
          return (
            b.offersReceived -
            a.offersReceived
          );
        }

        return (
          b.completedTrades -
          a.completedTrades
        );
      }
    );

  return sorted.slice(
    0,
    Math.max(
      1,
      limit
    )
  );
};


/**
 * ============================================================
 * DAILY PERFORMANCE TREND
 * ============================================================
 *
 * Generates a complete daily series, including days with zero
 * activity. This is useful for frontend charts.
 * ============================================================
 */

const getDailyPerformance =
  async ({
    businessId,
    userId,
    start,
    end,
  }) => {
    const [
      events,
      offers,
      completedTrades,
    ] =
      await Promise.all([
        prisma.businessAnalyticsEvent.findMany(
          {
            where: {
              businessId,

              createdAt: {
                gte: start,
                lte: end,
              },
            },

            select: {
              type: true,
              createdAt: true,
            },

            orderBy: {
              createdAt:
                "asc",
            },
          }
        ),

        prisma.offer.findMany(
          {
            where: {
              receiverId:
                userId,

              createdAt: {
                gte: start,
                lte: end,
              },
            },

            select: {
              createdAt:
                true,
            },

            orderBy: {
              createdAt:
                "asc",
            },
          }
        ),

        prisma.trade.findMany(
          {
            where: {
              OR: [
                {
                  traderAId:
                    userId,
                },
                {
                  traderBId:
                    userId,
                },
              ],

              status:
                "COMPLETED",

              completedAt: {
                gte: start,
                lte: end,
              },
            },

            select: {
              completedAt:
                true,
            },

            orderBy: {
              completedAt:
                "asc",
            },
          }
        ),
      ]);

    const days =
      new Map();

    const cursor =
      startOfDay(start);

    const finalDay =
      startOfDay(end);

    while (
      cursor <= finalDay
    ) {
      const key =
        formatDateKey(
          cursor
        );

      days.set(
        key,
        {
          date: key,

          listingViews: 0,

          storefrontViews:
            0,

          engagementActions:
            0,

          offersReceived:
            0,

          completedTrades:
            0,
        }
      );

      cursor.setDate(
        cursor.getDate() +
          1
      );
    }

    for (
      const event of
      events
    ) {
      const key =
        formatDateKey(
          event.createdAt
        );

      const day =
        days.get(key);

      if (!day) {
        continue;
      }

      switch (
        event.type
      ) {
        case "LISTING_VIEW":
          day.listingViews +=
            1;
          break;

        case "STOREFRONT_VIEW":
          day.storefrontViews +=
            1;
          break;

        case "CONTACT_CLICK":
        case "WEBSITE_CLICK":
        case "PHONE_CLICK":
        case "LISTING_SHARE":
          day.engagementActions +=
            1;
          break;

        default:
          break;
      }
    }

    for (
      const offer of
      offers
    ) {
      const key =
        formatDateKey(
          offer.createdAt
        );

      const day =
        days.get(key);

      if (day) {
        day.offersReceived +=
          1;
      }
    }

    for (
      const trade of
      completedTrades
    ) {
      if (
        !trade.completedAt
      ) {
        continue;
      }

      const key =
        formatDateKey(
          trade.completedAt
        );

      const day =
        days.get(key);

      if (day) {
        day.completedTrades +=
          1;
      }
    }

    return Array.from(
      days.values()
    );
  };


/**
 * ============================================================
 * BASIC PROMOTION PERFORMANCE
 * ============================================================
 *
 * PromotionAnalyticsEvent remains the source of truth for
 * promotion-specific VIEW / CLICK events.
 *
 * This is intentionally basic. Advanced promotion uplift and
 * comparative intelligence belong to Business Pro later.
 * ============================================================
 */

const getPromotionMetrics =
  async ({
    userId,
    start,
    end,
  }) => {
    const promotions =
      await prisma.promotion.findMany(
        {
          where: {
            userId,

            createdAt: {
              lte: end,
            },

            OR: [
              {
                endsAt: null,
              },
              {
                endsAt: {
                  gte: start,
                },
              },
            ],
          },

          select: {
            id: true,
            listingId: true,
            type: true,
            status: true,
            amount: true,
            currency: true,
            startsAt: true,
            endsAt: true,
            createdAt: true,

            listing: {
              select: {
                id: true,
                title: true,
              },
            },

            analyticsEvents: {
              where: {
                createdAt: {
                  gte: start,
                  lte: end,
                },
              },

              select: {
                type: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        }
      );

    let totalViews = 0;
    let totalClicks = 0;
    let totalSpend = 0;

    const items =
      promotions.map(
        (promotion) => {
          let views = 0;
          let clicks = 0;

          for (
            const event of
            promotion.analyticsEvents
          ) {
            if (
              event.type ===
              "VIEW"
            ) {
              views += 1;
            }

            if (
              event.type ===
              "CLICK"
            ) {
              clicks += 1;
            }
          }

          totalViews +=
            views;

          totalClicks +=
            clicks;

          totalSpend +=
            safeNumber(
              promotion.amount
            );

          return {
            id:
              promotion.id,

            listingId:
              promotion.listingId,

            listingTitle:
              promotion.listing
                ?.title ||
              null,

            type:
              promotion.type,

            status:
              promotion.status,

            amount:
              safeNumber(
                promotion.amount
              ),

            currency:
              promotion.currency,

            startsAt:
              promotion.startsAt,

            endsAt:
              promotion.endsAt,

            views,

            clicks,

            clickThroughRate:
              percentage(
                clicks,
                views
              ),
          };
        }
      );

    return {
      totalPromotions:
        promotions.length,

      totalViews,

      totalClicks,

      totalSpend:
        round(
          totalSpend
        ),

      clickThroughRate:
        percentage(
          totalClicks,
          totalViews
        ),

      promotions:
        items,
    };
  };


/**
 * ============================================================
 * BUSINESS CONVERSION METRICS
 * ============================================================
 */

const buildConversionMetrics =
  ({
    eventMetrics,
    offerMetrics,
    tradeMetrics,
  }) => {
    const listingViews =
      eventMetrics.listingViews;

    const offers =
      offerMetrics.totalReceived;

    const completedTrades =
      tradeMetrics.completed;

    return {
      /**
       * How often listing views result in an offer.
       */
      viewToOfferRate:
        percentage(
          offers,
          listingViews
        ),

      /**
       * How often received offers result in a completed trade.
       *
       * This is a basic business KPI, not advanced attribution.
       */
      offerToTradeRate:
        percentage(
          completedTrades,
          offers
        ),

      /**
       * Overall listing-view to completed-trade conversion.
       */
      viewToTradeRate:
        percentage(
          completedTrades,
          listingViews
        ),

      engagementRate:
        eventMetrics.engagementRate,
    };
  };


/**
 * ============================================================
 * BUSINESS ANALYTICS OVERVIEW
 * ============================================================
 *
 * Main service entry point.
 *
 * Used later by:
 *
 *     GET /api/business/analytics
 *
 * and dashboard integrations.
 * ============================================================
 */

export const getBusinessAnalytics =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
    startDate = null,
    endDate = null,
    topListingLimit = 3,
  }) => {
    if (!businessId) {
      throw new Error(
        "Business ID is required."
      );
    }

    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
      buildAnalyticsWindow(
        {
          days,
          startDate,
          endDate,
        }
      );

    const {
      start,
      end,
    } = window;

    /**
     * Independent aggregations run concurrently.
     */

    const [
      eventMetrics,
      listingMetrics,
      offerMetrics,
      tradeMetrics,
      topListings,
      dailyPerformance,
      promotionMetrics,
    ] =
      await Promise.all([
        getEventMetrics({
          businessId:
            business.id,
          start,
          end,
        }),

        getListingMetrics({
          businessId:
            business.id,
          userId:
            business.userId,
          start,
          end,
        }),

        getOfferMetrics({
          userId:
            business.userId,
          start,
          end,
        }),

        getTradeMetrics({
          userId:
            business.userId,
          start,
          end,
        }),

        getTopListings({
          businessId:
            business.id,
          userId:
            business.userId,
          start,
          end,
          limit:
            topListingLimit,
        }),

        getDailyPerformance({
          businessId:
            business.id,
          userId:
            business.userId,
          start,
          end,
        }),

        getPromotionMetrics({
          userId:
            business.userId,
          start,
          end,
        }),
      ]);

    const conversions =
      buildConversionMetrics(
        {
          eventMetrics,
          offerMetrics,
          tradeMetrics,
        }
      );

    return {
      business: {
        id:
          business.id,

        businessName:
          business.businessName,

        slug:
          business.slug,

        status:
          business.status,

        verificationStatus:
          business.verificationStatus,
      },

      period: {
        start:
          start.toISOString(),

        end:
          end.toISOString(),

        days:
          window.days,
      },

      overview: {
        listingViews:
          eventMetrics.listingViews,

        storefrontViews:
          eventMetrics.storefrontViews,

        totalViews:
          eventMetrics.totalViews,

        uniqueVisitors:
          eventMetrics.uniqueVisitors,

        engagementActions:
          eventMetrics.engagementActions,

        offersReceived:
          offerMetrics.totalReceived,

        completedTrades:
          tradeMetrics.completed,

        activeListings:
          listingMetrics.activeListings,
      },

      engagement: {
        contactClicks:
          eventMetrics.contactClicks,

        phoneClicks:
          eventMetrics.phoneClicks,

        websiteClicks:
          eventMetrics.websiteClicks,

        listingShares:
          eventMetrics.listingShares,

        total:
          eventMetrics.engagementActions,

        engagementRate:
          eventMetrics.engagementRate,
      },

      listings:
        listingMetrics,

      offers:
        offerMetrics,

      trades:
        tradeMetrics,

      conversions,

      topListings,

      dailyPerformance,

      promotions:
        promotionMetrics,
    };
  };


/**
 * ============================================================
 * SMALLER SERVICE METHODS
 * ============================================================
 *
 * These allow later controllers/dashboard endpoints to request
 * specific analytics without always loading the full report.
 * ============================================================
 */

export const getBusinessAnalyticsOverview =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
  }) => {
    const analytics =
      await getBusinessAnalytics(
        {
          businessId,
          days,
          topListingLimit:
            3,
        }
      );

    return {
      business:
        analytics.business,

      period:
        analytics.period,

      overview:
        analytics.overview,

      conversions:
        analytics.conversions,
    };
  };


export const getBusinessListingAnalytics = async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
    limit = 3,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
      buildAnalyticsWindow({
        days,
      });

    const [
      summary,
      listingPerformance,
    ] = await Promise.all([
      getListingMetrics({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,
      }),

      getListingPerformance({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,
      }),
    ]);

    /**
     * Top listings are derived from the already calculated
     * performance array.
     *
     * This avoids querying all listing analytics twice.
     */

    const topListings =
      [...listingPerformance]
        .sort(
          (a, b) => {
            if (
              b.views !==
              a.views
            ) {
              return (
                b.views -
                a.views
              );
            }

            if (
              b.engagementActions !==
              a.engagementActions
            ) {
              return (
                b.engagementActions -
                a.engagementActions
              );
            }

            if (
              b.offersReceived !==
              a.offersReceived
            ) {
              return (
                b.offersReceived -
                a.offersReceived
              );
            }

            return (
              b.completedTrades -
              a.completedTrades
            );
          }
        )
        .slice(
          0,
          Math.max(
            1,
            limit
          )
        );

    return {
      period: {
        start:
          window.start.toISOString(),

        end:
          window.end.toISOString(),

        days:
          window.days,
      },

      summary,

      listings:
        listingPerformance,

      topListings,
    };
  };
  

/**
 * ============================================================
 * BUSINESS OFFER ANALYTICS
 * ============================================================
 */

export const getBusinessOfferAnalytics = async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
      buildAnalyticsWindow({
        days,
      });

    const offers =
      await getOfferAnalytics({
        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,
      });

    return {
      period: {
        start:
          window.start.toISOString(),

        end:
          window.end.toISOString(),

        days:
          window.days,
      },

      offers,
    };
};

/**
 * ============================================================
 * BUSINESS TRADE ANALYTICS
 * ============================================================
 */

export const getBusinessTradeAnalytics =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
      buildAnalyticsWindow({
        days,
      });

    const trades =
      await getTradeAnalytics({
        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,
      });

    return {
      period: {
        start:
          window.start.toISOString(),

        end:
          window.end.toISOString(),

        days:
          window.days,
      },

      trades,
    };
  };
export const getBusinessPromotionAnalytics =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
      buildAnalyticsWindow(
        {
          days,
        }
      );

    const promotions =
      await getPromotionMetrics(
        {
          userId:
            business.userId,

          start:
            window.start,

          end:
            window.end,
        }
      );

    return {
      period: {
        start:
          window.start.toISOString(),

        end:
          window.end.toISOString(),

        days:
          window.days,
      },

      promotions,
    };
  };


/**
 * ============================================================
 * EXPORT CONSTANTS
 * ============================================================
 */

export {
  DEFAULT_ANALYTICS_DAYS,
  MAX_ANALYTICS_DAYS,
};