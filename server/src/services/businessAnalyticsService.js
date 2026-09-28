

import prisma from "../config/prisma.js";


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const DEFAULT_ANALYTICS_DAYS = 30;

const MAX_ANALYTICS_DAYS = 365;

const DAY_MS =
  24 * 60 * 60 * 1000;

/**
 * ============================================================
 * CATEGORY BENCHMARK PRIVACY
 * ============================================================
 *
 * Marketplace/category benchmark information must never make
 * another business's private analytics inferable.
 *
 * A benchmark therefore requires multiple OTHER businesses
 * contributing to the category before aggregate metrics are
 * returned.
 *
 * IMPORTANT:
 *
 * The requesting business does not count toward this threshold.
 */

const CATEGORY_BENCHMARK_MIN_BUSINESSES =
  3;

const CATEGORY_BENCHMARK_MIN_LISTINGS =
  5;

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

export const getBusinessAnalyticsContext = async (
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

const getListingMetrics = async ({
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

/**
 * ============================================================
 * BASIC TRADE ANALYTICS
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

  const completedInPeriod =
    completedTrades.length;

  /**
   * ----------------------------------------------------------
   * Business-side trade value
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

      completed:
        completedInPeriod,

      cancelled,

      disputed,

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
 * LISTING CONVERSION ENGINE
 * ============================================================

 */

const buildListingConversionMetrics = ({
  views = 0,
  uniqueViewers = 0,
  engagementActions = 0,
  offersReceived = 0,
  acceptedOffers = 0,
  completedTrades = 0,
} = {}) => {
  /**
   * ----------------------------------------------------------
   * Normalize all incoming values
   * ----------------------------------------------------------
   */

  const normalizedViews =
    safeNumber(views);

  const normalizedUniqueViewers =
    safeNumber(uniqueViewers);

  const normalizedEngagementActions =
    safeNumber(
      engagementActions
    );

  const normalizedOffersReceived =
    safeNumber(
      offersReceived
    );

  const normalizedAcceptedOffers =
    safeNumber(
      acceptedOffers
    );

  const normalizedCompletedTrades =
    safeNumber(
      completedTrades
    );

  /**
   * ----------------------------------------------------------
   * Conversion rates
   * ----------------------------------------------------------
   */

  const engagementRate =
    percentage(
      normalizedEngagementActions,
      normalizedViews
    );

  const engagementToOfferRate =
    percentage(
      normalizedOffersReceived,
      normalizedEngagementActions
    );

  const viewToOfferRate =
    percentage(
      normalizedOffersReceived,
      normalizedViews
    );

  const offerAcceptanceRate =
    percentage(
      normalizedAcceptedOffers,
      normalizedOffersReceived
    );

  const acceptedOfferToTradeRate =
    percentage(
      normalizedCompletedTrades,
      normalizedAcceptedOffers
    );

  const offerToTradeRate =
    percentage(
      normalizedCompletedTrades,
      normalizedOffersReceived
    );

  const viewToTradeRate =
    percentage(
      normalizedCompletedTrades,
      normalizedViews
    );

  /**
   * ----------------------------------------------------------
   * Funnel stage helper
   * ----------------------------------------------------------
   
   */

  const buildStage = ({
    key,
    label,
    value,
    previousValue = null,
  }) => {
    if (
      previousValue === null
    ) {
      return {
        key,
        label,
        value,

        dropOffCount: 0,

        dropOffRate: 0,
      };
    }

    const rawDropOff =
      safeNumber(
        previousValue
      ) -
      safeNumber(value);

    const dropOffCount =
      Math.max(
        0,
        rawDropOff
      );

    return {
      key,
      label,
      value,

      dropOffCount,

      dropOffRate:
        percentage(
          dropOffCount,
          previousValue
        ),
    };
  };

  /**
   * ----------------------------------------------------------
   * Conversion funnel
   * ----------------------------------------------------------
   */

  const funnel = [
    buildStage({
      key: "VIEWS",
      label: "Views",
      value:
        normalizedViews,
    }),

    buildStage({
      key: "ENGAGEMENT",
      label:
        "Engagement Actions",
      value:
        normalizedEngagementActions,
      previousValue:
        normalizedViews,
    }),

    buildStage({
      key: "OFFERS",
      label:
        "Offers Received",
      value:
        normalizedOffersReceived,
      previousValue:
        normalizedEngagementActions,
    }),

    buildStage({
      key: "ACCEPTED_OFFERS",
      label:
        "Accepted Offers",
      value:
        normalizedAcceptedOffers,
      previousValue:
        normalizedOffersReceived,
    }),

    buildStage({
      key: "COMPLETED_TRADES",
      label:
        "Completed Trades",
      value:
        normalizedCompletedTrades,
      previousValue:
        normalizedAcceptedOffers,
    }),
  ];

  /**
   * ----------------------------------------------------------
   * Largest observable funnel drop
   * ----------------------------------------------------------
   *
   * We return the largest numerical drop as descriptive data.
   * Recommendations and business interpretation belong to
   * later Conversion Intelligence steps.
   * ----------------------------------------------------------
   */

  const comparableStages =
    funnel.slice(1);

  const largestDropOff =
    comparableStages.reduce(
      (largest, stage) => {
        if (!largest) {
          return stage;
        }

        if (
          stage.dropOffRate >
          largest.dropOffRate
        ) {
          return stage;
        }

        return largest;
      },
      null
    );

  /**
   * ----------------------------------------------------------
   * Final conversion result
   * ----------------------------------------------------------
   */

  return {
    counts: {
      views:
        normalizedViews,

      uniqueViewers:
        normalizedUniqueViewers,

      engagementActions:
        normalizedEngagementActions,

      offersReceived:
        normalizedOffersReceived,

      acceptedOffers:
        normalizedAcceptedOffers,

      completedTrades:
        normalizedCompletedTrades,
    },

    rates: {
      engagementRate,

      engagementToOfferRate,

      viewToOfferRate,

      offerAcceptanceRate,

      acceptedOfferToTradeRate,

      offerToTradeRate,

      viewToTradeRate,
    },

    funnel,

    largestDropOff:
      largestDropOff
        ? {
            stage:
              largestDropOff.key,

            label:
              largestDropOff.label,

            count:
              largestDropOff.dropOffCount,

            rate:
              largestDropOff.dropOffRate,
          }
        : null,
  };
};

/**
 * ============================================================
 * ENGAGEMENT -> OFFER CONVERSION
 * ============================================================


 */

const buildEngagementToOfferConversion = ({
  views = 0,
  uniqueViewers = 0,
  engagementActions = 0,
  offersReceived = 0,
} = {}) => {
  const normalizedViews =
    safeNumber(views);

  const normalizedUniqueViewers =
    safeNumber(uniqueViewers);

  const normalizedEngagementActions =
    safeNumber(
      engagementActions
    );

  const normalizedOffersReceived =
    safeNumber(
      offersReceived
    );

  /**
   * Core conversion rate.
   */
  const conversionRate =
    percentage(
      normalizedOffersReceived,
      normalizedEngagementActions
    );

  /**
   * Supporting rates help distinguish:
   *
   * - low visibility
   * - weak engagement
   * - weak offer conversion
   */
  const engagementRate =
    percentage(
      normalizedEngagementActions,
      normalizedViews
    );

  const viewToOfferRate =
    percentage(
      normalizedOffersReceived,
      normalizedViews
    );

  /**
   * ----------------------------------------------------------
   * Data availability
   * ----------------------------------------------------------
   *
   * Do not interpret a listing with no engagement as having
   * "poor conversion". There is simply no engagement -> offer
   * conversion opportunity to evaluate yet.
   */

  const hasTraffic =
    normalizedViews > 0;

  const hasEngagement =
    normalizedEngagementActions > 0;

  const hasOffers =
    normalizedOffersReceived > 0;

  /**
   * ----------------------------------------------------------
   * Conversion state
   * ----------------------------------------------------------
   *
   * This deliberately avoids arbitrary GOOD/BAD percentage
   * thresholds.
   *
   * Later benchmark intelligence can compare listings against
   * business/category/marketplace baselines using real data.
   */

  let state =
    "NO_TRAFFIC";

  if (
    hasTraffic &&
    !hasEngagement
  ) {
    state =
      "TRAFFIC_NO_ENGAGEMENT";
  }

  if (
    hasEngagement &&
    !hasOffers
  ) {
    state =
      "ENGAGEMENT_NO_OFFERS";
  }

  if (
    hasEngagement &&
    hasOffers
  ) {
    state =
      "ENGAGEMENT_CONVERTING";
  }

  /**
   * ----------------------------------------------------------
   * Opportunity signals
   * ----------------------------------------------------------
   *
   * These are descriptive signals only.
   *
   * We are not yet generating recommendations. That belongs
   * to 9.11.14.11.
   */

  const signals = [];

  if (
    hasTraffic &&
    !hasEngagement
  ) {
    signals.push(
      "TRAFFIC_WITHOUT_ENGAGEMENT"
    );
  }

  if (
    hasEngagement &&
    !hasOffers
  ) {
    signals.push(
      "ENGAGEMENT_WITHOUT_OFFERS"
    );
  }

  if (
    hasEngagement &&
    hasOffers
  ) {
    signals.push(
      "ENGAGEMENT_GENERATING_OFFERS"
    );
  }

  /**
   * ----------------------------------------------------------
   * Engagement -> Offer gap
   * ----------------------------------------------------------
   *
   * This is an event-count indicator only.
   *
   * We clamp at zero because offers and engagement events do
   * not represent a strict one-user-one-stage funnel.
   */

  const conversionGap =
    Math.max(
      0,
      normalizedEngagementActions -
        normalizedOffersReceived
    );

  return {
    engagementActions:
      normalizedEngagementActions,

    offersReceived:
      normalizedOffersReceived,

    conversionRate,

    conversionGap,

    supportingMetrics: {
      views:
        normalizedViews,

      uniqueViewers:
        normalizedUniqueViewers,

      engagementRate,

      viewToOfferRate,
    },

    dataAvailability: {
      hasTraffic,
      hasEngagement,
      hasOffers,
    },

    state,

    signals,
  };
};

/**
 * ============================================================
 * OFFER -> ACCEPTED OFFER CONVERSION
 * ============================================================
 
 */

const buildOfferToAcceptedOfferConversion = ({
  offersReceived = 0,
  acceptedOffers = 0,
} = {}) => {
  const normalizedOffersReceived =
    safeNumber(
      offersReceived
    );

  const normalizedAcceptedOffers =
    safeNumber(
      acceptedOffers
    );

  /**
   * ----------------------------------------------------------
   * Core conversion rate
   * ----------------------------------------------------------
   */

  const conversionRate =
    percentage(
      normalizedAcceptedOffers,
      normalizedOffersReceived
    );

  /**
   * ----------------------------------------------------------
   * Offer disposition
   * ----------------------------------------------------------

   */

  const notAcceptedCount =
    Math.max(
      0,
      normalizedOffersReceived -
        normalizedAcceptedOffers
    );

  const notAcceptedRate =
    percentage(
      notAcceptedCount,
      normalizedOffersReceived
    );

  /**
   * ----------------------------------------------------------
   * Data availability
   * ----------------------------------------------------------
   */

  const hasOffers =
    normalizedOffersReceived > 0;

  const hasAcceptedOffers =
    normalizedAcceptedOffers > 0;

  /**
   * ----------------------------------------------------------
   * Conversion state
   * ----------------------------------------------------------
   */

  let state =
    "NO_OFFERS";

  if (
    hasOffers &&
    !hasAcceptedOffers
  ) {
    state =
      "OFFERS_WITHOUT_ACCEPTANCE";
  }

  if (
    hasOffers &&
    hasAcceptedOffers
  ) {
    state =
      "OFFERS_CONVERTING";
  }

  /**
   * ----------------------------------------------------------
   * Descriptive signals
   * ----------------------------------------------------------

   */

  const signals = [];

  if (!hasOffers) {
    signals.push(
      "NO_RECEIVED_OFFERS"
    );
  }

  if (
    hasOffers &&
    !hasAcceptedOffers
  ) {
    signals.push(
      "OFFERS_WITHOUT_ACCEPTED_OFFERS"
    );
  }

  if (
    hasOffers &&
    hasAcceptedOffers
  ) {
    signals.push(
      "OFFERS_GENERATING_ACCEPTANCES"
    );
  }

  const allOffersAccepted =
    normalizedOffersReceived > 0 &&
    normalizedAcceptedOffers >=
      normalizedOffersReceived;

  if (allOffersAccepted) {
    signals.push(
      "ALL_RECEIVED_OFFERS_ACCEPTED"
    );
  }

  return {
    offersReceived:
      normalizedOffersReceived,

    acceptedOffers:
      normalizedAcceptedOffers,

    conversionRate,

    notAcceptedCount,

    notAcceptedRate,

    dataAvailability: {
      hasOffers,
      hasAcceptedOffers,
    },

    state,

    signals,
  };
};

/**
 * ============================================================
 * ACCEPTED OFFER -> COMPLETED TRADE CONVERSION
 * ============================================================
 */

const buildAcceptedOfferToTradeConversion = ({
  acceptedOffers = 0,
  completedTrades = 0,
} = {}) => {
  const normalizedAcceptedOffers =
    safeNumber(
      acceptedOffers
    );

  const normalizedCompletedTrades =
    safeNumber(
      completedTrades
    );

  /**
   * ----------------------------------------------------------
   * Core conversion rate
   * ----------------------------------------------------------
   */

  const conversionRate =
    percentage(
      normalizedCompletedTrades,
      normalizedAcceptedOffers
    );

  /**
   * ----------------------------------------------------------
   * Uncompleted accepted offers
   * ----------------------------------------------------------
   
   */

  const notCompletedCount =
    Math.max(
      0,
      normalizedAcceptedOffers -
        normalizedCompletedTrades
    );

  const notCompletedRate =
    percentage(
      notCompletedCount,
      normalizedAcceptedOffers
    );

  /**
   * ----------------------------------------------------------
   * Data availability
   * ----------------------------------------------------------
   */

  const hasAcceptedOffers =
    normalizedAcceptedOffers > 0;

  const hasCompletedTrades =
    normalizedCompletedTrades > 0;

  /**
   * ----------------------------------------------------------
   * Conversion state
   * ----------------------------------------------------------
   */

  let state =
    "NO_ACCEPTED_OFFERS";

  if (
    hasAcceptedOffers &&
    !hasCompletedTrades
  ) {
    state =
      "ACCEPTED_OFFERS_WITHOUT_COMPLETED_TRADES";
  }

  if (
    hasAcceptedOffers &&
    hasCompletedTrades
  ) {
    state =
      "ACCEPTED_OFFERS_CONVERTING";
  }

  /**
   * ----------------------------------------------------------
   * Descriptive signals
   * ----------------------------------------------------------
   */

  const signals = [];

  if (!hasAcceptedOffers) {
    signals.push(
      "NO_ACCEPTED_OFFERS"
    );
  }

  if (
    hasAcceptedOffers &&
    !hasCompletedTrades
  ) {
    signals.push(
      "ACCEPTED_OFFERS_WITHOUT_TRADE_COMPLETION"
    );
  }

  if (
    hasAcceptedOffers &&
    hasCompletedTrades
  ) {
    signals.push(
      "ACCEPTED_OFFERS_GENERATING_COMPLETED_TRADES"
    );
  }

  /**
   * ----------------------------------------------------------
   * Complete conversion
   * ----------------------------------------------------------
   *
   */

  const allAcceptedOffersCompleted =
    normalizedAcceptedOffers > 0 &&
    normalizedCompletedTrades >=
      normalizedAcceptedOffers;

  if (allAcceptedOffersCompleted) {
    signals.push(
      "ALL_ACCEPTED_OFFERS_COMPLETED"
    );
  }

  /**
   * ----------------------------------------------------------
   * Defensive data consistency signal
   * ----------------------------------------------------------

   */

  const attributionMismatch =
    normalizedCompletedTrades >
    normalizedAcceptedOffers;

  if (attributionMismatch) {
    signals.push(
      "TRADE_COUNT_EXCEEDS_ACCEPTED_OFFERS"
    );
  }

  return {
    acceptedOffers:
      normalizedAcceptedOffers,

    completedTrades:
      normalizedCompletedTrades,

    conversionRate,

    notCompletedCount,

    notCompletedRate,

    dataAvailability: {
      hasAcceptedOffers,
      hasCompletedTrades,
    },

    state,

    signals,

    dataQuality: {
      attributionMismatch,
    },
  };
};

/**
 * ============================================================
 * OVERALL LISTING -> TRADE CONVERSION
 * ============================================================
 
 */

const buildOverallListingToTradeConversion = ({
  views = 0,
  uniqueViewers = 0,
  engagementActions = 0,
  offersReceived = 0,
  acceptedOffers = 0,
  completedTrades = 0,
} = {}) => {
  /**
   * ----------------------------------------------------------
   * Normalize input
   * ----------------------------------------------------------
   */

  const normalizedViews =
    safeNumber(views);

  const normalizedUniqueViewers =
    safeNumber(
      uniqueViewers
    );

  const normalizedEngagementActions =
    safeNumber(
      engagementActions
    );

  const normalizedOffersReceived =
    safeNumber(
      offersReceived
    );

  const normalizedAcceptedOffers =
    safeNumber(
      acceptedOffers
    );

  const normalizedCompletedTrades =
    safeNumber(
      completedTrades
    );

  /**
   * ----------------------------------------------------------
   * Primary conversion
   * ----------------------------------------------------------
   */

  const conversionRate =
    percentage(
      normalizedCompletedTrades,
      normalizedViews
    );

  /**
   * ----------------------------------------------------------
   * Supporting conversion rates
   * ----------------------------------------------------------
   */

  const engagementRate =
    percentage(
      normalizedEngagementActions,
      normalizedViews
    );

  const viewToOfferRate =
    percentage(
      normalizedOffersReceived,
      normalizedViews
    );

  const offerAcceptanceRate =
    percentage(
      normalizedAcceptedOffers,
      normalizedOffersReceived
    );

  const acceptedOfferToTradeRate =
    percentage(
      normalizedCompletedTrades,
      normalizedAcceptedOffers
    );

  const offerToTradeRate =
    percentage(
      normalizedCompletedTrades,
      normalizedOffersReceived
    );

  /**
   * ----------------------------------------------------------
   * Data availability
   * ----------------------------------------------------------
   */

  const hasTraffic =
    normalizedViews > 0;

  const hasEngagement =
    normalizedEngagementActions > 0;

  const hasOffers =
    normalizedOffersReceived > 0;

  const hasAcceptedOffers =
    normalizedAcceptedOffers > 0;

  const hasCompletedTrades =
    normalizedCompletedTrades > 0;

  /**
   * ----------------------------------------------------------
   * Overall listing conversion state
   * ----------------------------------------------------------
   *
   * This identifies the furthest observable marketplace stage
   * reached by the listing.
   *
   * It does NOT rate the listing as good or bad.
   * ----------------------------------------------------------
   */

  let state =
    "NO_TRAFFIC";

  if (
    hasTraffic &&
    !hasEngagement &&
    !hasOffers &&
    !hasCompletedTrades
  ) {
    state =
      "TRAFFIC_ONLY";
  }

  if (
    hasEngagement &&
    !hasOffers &&
    !hasCompletedTrades
  ) {
    state =
      "ENGAGEMENT_REACHED";
  }

  if (
    hasOffers &&
    !hasAcceptedOffers &&
    !hasCompletedTrades
  ) {
    state =
      "OFFER_STAGE_REACHED";
  }

  if (
    hasAcceptedOffers &&
    !hasCompletedTrades
  ) {
    state =
      "ACCEPTANCE_STAGE_REACHED";
  }

  if (hasCompletedTrades) {
    state =
      "TRADE_CONVERSION_REACHED";
  }

  /**
   * ----------------------------------------------------------
   * Descriptive signals
   * ----------------------------------------------------------
   */

  const signals = [];

  if (!hasTraffic) {
    signals.push(
      "NO_LISTING_TRAFFIC"
    );
  }

  if (
    hasTraffic &&
    !hasEngagement
  ) {
    signals.push(
      "TRAFFIC_WITHOUT_TRACKED_ENGAGEMENT"
    );
  }

  if (
    hasEngagement &&
    !hasOffers
  ) {
    signals.push(
      "ENGAGEMENT_WITHOUT_OFFERS"
    );
  }

  if (
    hasOffers &&
    !hasAcceptedOffers
  ) {
    signals.push(
      "OFFERS_WITHOUT_ACCEPTANCE"
    );
  }

  if (
    hasAcceptedOffers &&
    !hasCompletedTrades
  ) {
    signals.push(
      "ACCEPTED_OFFERS_WITHOUT_TRADE_COMPLETION"
    );
  }

  if (hasCompletedTrades) {
    signals.push(
      "LISTING_GENERATING_COMPLETED_TRADES"
    );
  }

  /**
   * ----------------------------------------------------------
   * Traffic without completed-trade outcome
   * ----------------------------------------------------------
   *
   * This is a descriptive event-count gap.
   *
   * It must NOT be interpreted as the number of individual
   * users who failed to complete a trade.
   * ----------------------------------------------------------
   */

  const viewToTradeGap =
    Math.max(
      0,
      normalizedViews -
        normalizedCompletedTrades
    );

  /**
   * ----------------------------------------------------------
   * Attribution consistency
   * ----------------------------------------------------------
   *
   * Because analytics stages can use different timestamps,
   * historical windows can legitimately contain downstream
   * activity whose upstream event occurred before the selected
   * window.
   *
   * We surface these cases rather than silently changing data.
   * ----------------------------------------------------------
   */

  const tradeWithoutVisibleTraffic =
    normalizedCompletedTrades > 0 &&
    normalizedViews === 0;

  const tradesExceedAcceptedOffers =
    normalizedCompletedTrades >
    normalizedAcceptedOffers;

  const acceptedOffersExceedOffers =
    normalizedAcceptedOffers >
    normalizedOffersReceived;

  if (tradeWithoutVisibleTraffic) {
    signals.push(
      "TRADE_WITHOUT_IN_WINDOW_TRAFFIC"
    );
  }

  if (tradesExceedAcceptedOffers) {
    signals.push(
      "TRADE_COUNT_EXCEEDS_ACCEPTED_OFFERS"
    );
  }

  if (acceptedOffersExceedOffers) {
    signals.push(
      "ACCEPTED_OFFER_COUNT_EXCEEDS_RECEIVED_OFFERS"
    );
  }

  return {
    views:
      normalizedViews,

    uniqueViewers:
      normalizedUniqueViewers,

    completedTrades:
      normalizedCompletedTrades,

    /**
     * Primary listing -> trade KPI.
     */
    conversionRate,

    viewToTradeGap,

    supportingMetrics: {
      engagementActions:
        normalizedEngagementActions,

      offersReceived:
        normalizedOffersReceived,

      acceptedOffers:
        normalizedAcceptedOffers,

      engagementRate,

      viewToOfferRate,

      offerAcceptanceRate,

      acceptedOfferToTradeRate,

      offerToTradeRate,
    },

    dataAvailability: {
      hasTraffic,
      hasEngagement,
      hasOffers,
      hasAcceptedOffers,
      hasCompletedTrades,
    },

    state,

    signals,

    dataQuality: {
      tradeWithoutVisibleTraffic,
      tradesExceedAcceptedOffers,
      acceptedOffersExceedOffers,

      hasAttributionMismatch:
        tradeWithoutVisibleTraffic ||
        tradesExceedAcceptedOffers ||
        acceptedOffersExceedOffers,
    },
  };
};

/**
 * ============================================================
 * LISTING CONVERSION FUNNEL
 * ============================================================
 */

const buildListingConversionFunnel = ({
  conversion,
  engagementToOffer,
  offerToAcceptedOffer,
  acceptedOfferToTrade,
  overallListingToTrade,
} = {}) => {
  /**
   * ----------------------------------------------------------
   * Safely extract canonical counts
   * ----------------------------------------------------------
   */

  const views =
    safeNumber(
      conversion?.counts?.views
    );

  const uniqueViewers =
    safeNumber(
      conversion?.counts
        ?.uniqueViewers
    );

  const engagementActions =
    safeNumber(
      conversion?.counts
        ?.engagementActions
    );

  const offersReceived =
    safeNumber(
      conversion?.counts
        ?.offersReceived
    );

  const acceptedOffers =
    safeNumber(
      conversion?.counts
        ?.acceptedOffers
    );

  const completedTrades =
    safeNumber(
      conversion?.counts
        ?.completedTrades
    );

  /**
   * ----------------------------------------------------------
   * Stage builder
   * ----------------------------------------------------------
   */

  const buildStage = ({
    key,
    label,
    value,
    order,
  }) => ({
    key,
    label,
    order,
    value:
      safeNumber(value),
  });

  const stages = [
    buildStage({
      key: "VIEWS",
      label: "Views",
      order: 1,
      value: views,
    }),

    buildStage({
      key: "ENGAGEMENT",
      label: "Engagement Actions",
      order: 2,
      value:
        engagementActions,
    }),

    buildStage({
      key: "OFFERS",
      label: "Offers Received",
      order: 3,
      value:
        offersReceived,
    }),

    buildStage({
      key: "ACCEPTED_OFFERS",
      label: "Accepted Offers",
      order: 4,
      value:
        acceptedOffers,
    }),

    buildStage({
      key: "COMPLETED_TRADES",
      label: "Completed Trades",
      order: 5,
      value:
        completedTrades,
    }),
  ];

  /**
   * ----------------------------------------------------------
   * Transition builder
   * ----------------------------------------------------------
   *
   * A transition describes movement between two funnel stages.
   *
   * We use the specialized conversion engines as the source of
   * truth rather than recalculating their rates here.
   * ----------------------------------------------------------
   */

  const buildTransition = ({
    key,
    label,
    from,
    to,
    rate,
  }) => {
    const fromValue =
      safeNumber(from);

    const toValue =
      safeNumber(to);

    const dropOffCount =
      Math.max(
        0,
        fromValue -
          toValue
      );

    const dropOffRate =
      percentage(
        dropOffCount,
        fromValue
      );

    return {
      key,
      label,

      from:
        fromValue,

      to:
        toValue,

      conversionRate:
        safeNumber(rate),

      dropOffCount,

      dropOffRate,

      hasSourceActivity:
        fromValue > 0,

      hasDestinationActivity:
        toValue > 0,
    };
  };

  /**
   * ----------------------------------------------------------
   * Funnel transitions
   * ----------------------------------------------------------
   */

  const transitions = [
    buildTransition({
      key:
        "VIEW_TO_ENGAGEMENT",

      label:
        "View to Engagement",

      from:
        views,

      to:
        engagementActions,

      rate:
        conversion?.rates
          ?.engagementRate,
    }),

    buildTransition({
      key:
        "ENGAGEMENT_TO_OFFER",

      label:
        "Engagement to Offer",

      from:
        engagementActions,

      to:
        offersReceived,

      rate:
        engagementToOffer
          ?.conversionRate,
    }),

    buildTransition({
      key:
        "OFFER_TO_ACCEPTED_OFFER",

      label:
        "Offer to Accepted Offer",

      from:
        offersReceived,

      to:
        acceptedOffers,

      rate:
        offerToAcceptedOffer
          ?.conversionRate,
    }),

    buildTransition({
      key:
        "ACCEPTED_OFFER_TO_TRADE",

      label:
        "Accepted Offer to Completed Trade",

      from:
        acceptedOffers,

      to:
        completedTrades,

      rate:
        acceptedOfferToTrade
          ?.conversionRate,
    }),
  ];

  /**
   * ----------------------------------------------------------
   * Observable transitions
   * ----------------------------------------------------------
   *
   * A transition cannot meaningfully be compared for drop-off
   * if its source stage contains no activity.
   */

  const observableTransitions =
    transitions.filter(
      (transition) =>
        transition.hasSourceActivity
    );

  /**
   * ----------------------------------------------------------
   * Largest observable drop-off
   * ----------------------------------------------------------
   *
   * This is descriptive only.
   *
   * It does not claim why the drop occurred and does not yet
   * generate a recommendation.
   * ----------------------------------------------------------
   */

  const largestDropOff =
    observableTransitions.reduce(
      (
        largest,
        transition
      ) => {
        if (!largest) {
          return transition;
        }

        if (
          transition.dropOffRate >
          largest.dropOffRate
        ) {
          return transition;
        }

        return largest;
      },
      null
    );

  /**
   * ----------------------------------------------------------
   * Furthest stage reached
   * ----------------------------------------------------------
   */

  let furthestStageReached =
    "NONE";

  if (views > 0) {
    furthestStageReached =
      "VIEWS";
  }

  if (
    engagementActions > 0
  ) {
    furthestStageReached =
      "ENGAGEMENT";
  }

  if (
    offersReceived > 0
  ) {
    furthestStageReached =
      "OFFERS";
  }

  if (
    acceptedOffers > 0
  ) {
    furthestStageReached =
      "ACCEPTED_OFFERS";
  }

  if (
    completedTrades > 0
  ) {
    furthestStageReached =
      "COMPLETED_TRADES";
  }

  /**
   * ----------------------------------------------------------
   * Funnel completion
   * ----------------------------------------------------------
   */

  const reachedTradeStage =
    completedTrades > 0;

  /**
   * ----------------------------------------------------------
   * Attribution consistency
   * ----------------------------------------------------------
   *
   * Historical windows can legitimately contain downstream
   * events whose upstream event occurred before the selected
   * period.
   *
   * These are surfaced rather than silently corrected.
   * ----------------------------------------------------------
   */
const engagementExceedsViews =
  engagementActions >
  views;


  const offersExceedEngagement =
    offersReceived >
    engagementActions;

  const acceptedOffersExceedOffers =
    acceptedOffers >
    offersReceived;
    

  

  const tradesExceedAcceptedOffers =
    completedTrades >
    acceptedOffers;

    const tradeWithoutObservedTraffic =
    completedTrades > 0 &&
    views === 0;

    const hasAttributionMismatch =
    acceptedOffersExceedOffers ||
    tradesExceedAcceptedOffers ||
    tradeWithoutObservedTraffic;

  const dataQualitySignals = [];

  if (
  acceptedOffersExceedOffers
) {
  dataQualitySignals.push(
    "ACCEPTED_OFFERS_EXCEED_RECEIVED_OFFERS"
  );
}

if (
  tradesExceedAcceptedOffers
) {
  dataQualitySignals.push(
    "COMPLETED_TRADES_EXCEED_ACCEPTED_OFFERS"
  );
}

if (
  tradeWithoutObservedTraffic
) {
  dataQualitySignals.push(
    "TRADE_WITHOUT_IN_WINDOW_TRAFFIC"
  );
}

  /**
   * ----------------------------------------------------------
   * Final funnel
   * ----------------------------------------------------------
   */

  return {
    stages,

    transitions,

    summary: {
      views,

      uniqueViewers,

      engagementActions,

      offersReceived,

      acceptedOffers,

      completedTrades,

      overallConversionRate:
        safeNumber(
          overallListingToTrade
            ?.conversionRate
        ),

      furthestStageReached,

      reachedTradeStage,
    },

    largestDropOff:
      largestDropOff
        ? {
            transition:
              largestDropOff.key,

            label:
              largestDropOff.label,

            from:
              largestDropOff.from,

            to:
              largestDropOff.to,

            conversionRate:
              largestDropOff
                .conversionRate,

            dropOffCount:
              largestDropOff
                .dropOffCount,

            dropOffRate:
              largestDropOff
                .dropOffRate,
          }
        : null,

    // UPDATE — server/src/services/businessAnalyticsService.js

dataQuality: {
  /**
   * Descriptive observations.
   *
   * These do NOT by themselves make the funnel unreliable.
   */
  observations: {
    engagementExceedsViews,
    offersExceedEngagement,
  },

  /**
   * Actual attribution warnings.
   */
  acceptedOffersExceedOffers,

  tradesExceedAcceptedOffers,

  tradeWithoutObservedTraffic,

  hasAttributionMismatch,

  signals:
    dataQualitySignals,
},
  };
};

/**
 * ============================================================
 * UNDERPERFORMING LISTING DETECTION
 * ============================================================
 */

const detectHighOpportunityListing = ({
  conversion,
  engagementToOffer,
  offerToAcceptedOffer,
  acceptedOfferToTrade,
  overallListingToTrade,
  conversionFunnel,
  underperformance,
} = {}) => {
  /**
   * ----------------------------------------------------------
   * Canonical counts
   * ----------------------------------------------------------
   */

  const views =
    safeNumber(
      conversion?.counts?.views
    );

  const uniqueViewers =
    safeNumber(
      conversion?.counts
        ?.uniqueViewers
    );

  const engagementActions =
    safeNumber(
      conversion?.counts
        ?.engagementActions
    );

  const offersReceived =
    safeNumber(
      conversion?.counts
        ?.offersReceived
    );

  const acceptedOffers =
    safeNumber(
      conversion?.counts
        ?.acceptedOffers
    );

  const completedTrades =
    safeNumber(
      conversion?.counts
        ?.completedTrades
    );

  /**
   * ----------------------------------------------------------
   * Canonical rates
   * ----------------------------------------------------------
   */

  const engagementRate =
    safeNumber(
      conversion?.rates
        ?.engagementRate
    );

  const engagementToOfferRate =
    safeNumber(
      engagementToOffer
        ?.conversionRate
    );

  const viewToOfferRate =
    safeNumber(
      conversion?.rates
        ?.viewToOfferRate
    );

  const offerAcceptanceRate =
    safeNumber(
      offerToAcceptedOffer
        ?.conversionRate
    );

  const acceptedOfferToTradeRate =
    safeNumber(
      acceptedOfferToTrade
        ?.conversionRate
    );

  const offerToTradeRate =
    safeNumber(
      conversion?.rates
        ?.offerToTradeRate
    );

  const viewToTradeRate =
    safeNumber(
      overallListingToTrade
        ?.conversionRate
    );

  /**
   * ----------------------------------------------------------
   * Funnel state
   * ----------------------------------------------------------
   */

  const furthestStageReached =
    conversionFunnel
      ?.summary
      ?.furthestStageReached ||
    "NONE";

  const reachedTradeStage =
    Boolean(
      conversionFunnel
        ?.summary
        ?.reachedTradeStage
    );

  /**
   * ----------------------------------------------------------
   * Data-quality guard
   * ----------------------------------------------------------
   */

  const hasAttributionMismatch =
    Boolean(
      conversionFunnel
        ?.dataQuality
        ?.hasAttributionMismatch
    );

  /**
   * ----------------------------------------------------------
   * Opportunity signals
   * ----------------------------------------------------------
   */

  const signals = [];

  /**
   * SIGNAL 1:
   * Listing is generating demand.
   *
   * Receiving at least one offer is direct evidence that the
   * listing has generated marketplace intent.
   */

  if (offersReceived > 0) {
    signals.push({
      code:
        "GENERATING_OFFERS",

      stage:
        "OFFERS",

      title:
        "Listing is generating offers",

      description:
        "The listing has received one or more marketplace offers.",

      evidence: {
        offersReceived,

        viewToOfferRate,

        engagementToOfferRate,
      },
    });
  }

  /**
   * SIGNAL 2:
   * Listing is generating accepted offers.
   *
   * This is stronger than simple offer generation because
   * marketplace interest has progressed into owner acceptance.
   */

  if (acceptedOffers > 0) {
    signals.push({
      code:
        "GENERATING_ACCEPTED_OFFERS",

      stage:
        "ACCEPTED_OFFERS",

      title:
        "Listing is generating accepted offers",

      description:
        "Marketplace offers for this listing have progressed into accepted offers.",

      evidence: {
        offersReceived,

        acceptedOffers,

        offerAcceptanceRate,
      },
    });
  }

  /**
   * SIGNAL 3:
   * Listing is generating completed trades.
   *
   * This is the strongest absolute opportunity signal currently
   * available without marketplace benchmarks.
   */

  if (completedTrades > 0) {
    signals.push({
      code:
        "GENERATING_COMPLETED_TRADES",

      stage:
        "COMPLETED_TRADES",

      title:
        "Listing is generating completed trades",

      description:
        "The listing has produced one or more completed trades within the selected analytics period.",

      evidence: {
        completedTrades,

        viewToTradeRate,

        offerToTradeRate,

        acceptedOfferToTradeRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Efficient outcome signal
   * ----------------------------------------------------------
   *
   * We can detect a completed outcome with relatively little
   * observed upstream activity without defining what "low
   * traffic" means globally.
   *
   * This does NOT claim the listing performs above average.
   *
   * It only describes that a completed outcome exists despite
   * the amount of upstream activity observed in this window.
   *
   * Because proper comparison requires a baseline, this remains
   * a descriptive signal rather than a benchmark claim.
   * ----------------------------------------------------------
   */

  const completedTradeWithLimitedObservedTraffic =
    completedTrades > 0 &&
    views > 0 &&
    completedTrades >=
      uniqueViewers;

  if (
    completedTradeWithLimitedObservedTraffic
  ) {
    signals.push({
      code:
        "TRADE_WITH_LIMITED_OBSERVED_TRAFFIC",

      stage:
        "COMPLETED_TRADES",

      title:
        "Trade outcome with limited observed traffic",

      description:
        "The listing produced a completed trade despite a small amount of distinct observed traffic in the selected analytics window.",

      evidence: {
        views,

        uniqueViewers,

        completedTrades,

        viewToTradeRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Full offer acceptance
   * ----------------------------------------------------------
   *
   * This is factual rather than threshold-based.
   */

  const allObservedOffersAccepted =
    offersReceived > 0 &&
    acceptedOffers >=
      offersReceived;

  if (allObservedOffersAccepted) {
    signals.push({
      code:
        "ALL_OBSERVED_OFFERS_ACCEPTED",

      stage:
        "ACCEPTED_OFFERS",

      title:
        "All observed offers were accepted",

      description:
        "Every received offer represented in the selected analytics period is currently represented as accepted.",

      evidence: {
        offersReceived,

        acceptedOffers,

        offerAcceptanceRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Full accepted-offer completion
   * ----------------------------------------------------------
   */

  const allObservedAcceptedOffersCompleted =
    acceptedOffers > 0 &&
    completedTrades >=
      acceptedOffers;

  if (
    allObservedAcceptedOffersCompleted
  ) {
    signals.push({
      code:
        "ALL_OBSERVED_ACCEPTED_OFFERS_COMPLETED",

      stage:
        "COMPLETED_TRADES",

      title:
        "All observed accepted offers reached trade completion",

      description:
        "Completed trades equal or exceed the accepted offers represented in the selected analytics period.",

      evidence: {
        acceptedOffers,

        completedTrades,

        acceptedOfferToTradeRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Opportunity depth
   * ----------------------------------------------------------
   *
   * This describes how deeply the listing has progressed through
   * the marketplace funnel.
   *
   * It is NOT a quality score.
   * ----------------------------------------------------------
   */

  const stageDepth = {
    NONE: 0,
    VIEWS: 1,
    ENGAGEMENT: 2,
    OFFERS: 3,
    ACCEPTED_OFFERS: 4,
    COMPLETED_TRADES: 5,
  };

  const funnelDepth =
    stageDepth[
      furthestStageReached
    ] || 0;

  /**
   * ----------------------------------------------------------
   * Strongest observed opportunity
   * ----------------------------------------------------------
   *
   * We select the deepest positive marketplace outcome.
   *
   * No arbitrary numerical score is required.
   * ----------------------------------------------------------
   */

  const opportunityPriority = {
    OFFERS: 1,
    ACCEPTED_OFFERS: 2,
    COMPLETED_TRADES: 3,
  };

  const primaryOpportunity =
    signals.length > 0
      ? [...signals].sort(
          (a, b) =>
            (opportunityPriority[
              b.stage
            ] || 0) -
            (opportunityPriority[
              a.stage
            ] || 0)
        )[0]
      : null;

  /**
   * ----------------------------------------------------------
   * Underperformance relationship
   * ----------------------------------------------------------
   *
   * A listing can contain opportunity AND a conversion blocker.
   *
   * Example:
   *
   * 20 offers
   * 5 accepted offers
   * 0 completed trades
   *
   * There is clear demand opportunity, but there is also a
   * completion-stage blocker.
   *
   * These concepts therefore must remain independent.
   * ----------------------------------------------------------
   */

  const hasUnderperformance =
    Boolean(
      underperformance
        ?.isUnderperforming
    );

  /**
   * ----------------------------------------------------------
   * Opportunity state
   * ----------------------------------------------------------
   */

  const hasOpportunity =
    signals.length > 0;

  let status =
    "NO_OBSERVED_OPPORTUNITY";

  if (hasOpportunity) {
    status =
      "OPPORTUNITY_DETECTED";
  }

  if (
    hasOpportunity &&
    hasUnderperformance
  ) {
    status =
      "OPPORTUNITY_WITH_CONVERSION_BLOCKER";
  }

  if (
    reachedTradeStage &&
    !hasUnderperformance
  ) {
    status =
      "CONVERTING_OPPORTUNITY";
  }

  /**
   * ----------------------------------------------------------
   * Benchmark-dependent opportunities
   * ----------------------------------------------------------
   *
   * These cannot be activated until comparative marketplace
   * intelligence exists.
   * ----------------------------------------------------------
   */

  const benchmarkSignals = {
    highConversionLowVisibility:
      false,

    aboveCategoryConversion:
      false,

    aboveMarketplaceConversion:
      false,

    unusuallyHighDemand:
      false,

    benchmarkAvailable:
      false,
  };

  return {
    hasOpportunity,

    status,

    signalCount:
      signals.length,

    primaryOpportunity,

    signals,

    funnel: {
      furthestStageReached,

      funnelDepth,

      reachedTradeStage,
    },

    summary: {
      views,

      uniqueViewers,

      engagementActions,

      offersReceived,

      acceptedOffers,

      completedTrades,

      engagementRate,

      engagementToOfferRate,

      viewToOfferRate,

      offerAcceptanceRate,

      acceptedOfferToTradeRate,

      offerToTradeRate,

      viewToTradeRate,
    },

    relationship: {
      hasUnderperformance,

      hasOpportunityAndBlocker:
        hasOpportunity &&
        hasUnderperformance,
    },

    benchmarkSignals,

    dataQuality: {
      hasAttributionMismatch,

      reliableForOpportunityDetection:
        !hasAttributionMismatch,
    },
  };
};

/**
 * ============================================================
 * CONVERSION RECOMMENDATIONS
 * ============================================================
 
 */

const buildConversionRecommendations = ({
  conversion,
  conversionFunnel,
  underperformance,
  highOpportunity,
} = {}) => {
  const recommendations = [];

  /**
   * ----------------------------------------------------------
   * Canonical metrics
   * ----------------------------------------------------------
   */

  const views =
    safeNumber(
      conversion?.counts?.views
    );

  const uniqueViewers =
    safeNumber(
      conversion?.counts
        ?.uniqueViewers
    );

  const engagementActions =
    safeNumber(
      conversion?.counts
        ?.engagementActions
    );

  const offersReceived =
    safeNumber(
      conversion?.counts
        ?.offersReceived
    );

  const acceptedOffers =
    safeNumber(
      conversion?.counts
        ?.acceptedOffers
    );

  const completedTrades =
    safeNumber(
      conversion?.counts
        ?.completedTrades
    );

  const engagementRate =
    safeNumber(
      conversion?.rates
        ?.engagementRate
    );

  const viewToOfferRate =
    safeNumber(
      conversion?.rates
        ?.viewToOfferRate
    );

  const offerAcceptanceRate =
    safeNumber(
      conversion?.rates
        ?.offerAcceptanceRate
    );

  const acceptedOfferToTradeRate =
    safeNumber(
      conversion?.rates
        ?.acceptedOfferToTradeRate
    );

  const viewToTradeRate =
    safeNumber(
      conversion?.rates
        ?.viewToTradeRate
    );

  /**
   * ----------------------------------------------------------
   * Data-quality guard
   * ----------------------------------------------------------
   *
   * We should avoid strong diagnostic recommendations when
   * funnel attribution is inconsistent.
   */

  const hasAttributionMismatch =
    Boolean(
      conversionFunnel
        ?.dataQuality
        ?.hasAttributionMismatch
    );

  const reliableForDetection =
    underperformance
      ?.dataQuality
      ?.reliableForDetection !==
    false;

  const reliableForOpportunityDetection =
    highOpportunity
      ?.dataQuality
      ?.reliableForOpportunityDetection !==
    false;

  const reliableForRecommendations =
    !hasAttributionMismatch &&
    reliableForDetection &&
    reliableForOpportunityDetection;

  /**
   * ----------------------------------------------------------
   * Helper for adding recommendations
   * ----------------------------------------------------------
   */

  const addRecommendation = ({
    code,
    stage,
    priority,
    title,
    message,
    actions = [],
    reason,
    evidence = {},
  }) => {
    /**
     * Prevent accidental duplicate recommendations.
     */
    const alreadyExists =
      recommendations.some(
        (recommendation) =>
          recommendation.code ===
          code
      );

    if (alreadyExists) {
      return;
    }

    recommendations.push({
      code,
      stage,
      priority,
      title,
      message,
      actions,
      reason,
      evidence,
    });
  };

  /**
   * ----------------------------------------------------------
   * DATA QUALITY FIRST
   * ----------------------------------------------------------
   *
   * If the selected window contains attribution mismatches,
   * avoid generating strong conversion diagnoses.
   *
   * The business can still see its metrics, but we recommend
   * monitoring a broader period before acting on the funnel.
   */

  if (!reliableForRecommendations) {
    addRecommendation({
      code:
        "MONITOR_MORE_DATA",

      stage:
        "DATA_QUALITY",

      priority:
        "INFO",

      title:
        "Review a broader analytics period",

      message:
        "Some activity in this analytics window may belong to marketplace actions that started outside the selected period. Review a broader period before making conversion decisions from this funnel.",

      actions: [
        "Review a longer analytics period",
        "Compare the listing across multiple periods",
        "Avoid making major listing changes from this window alone",
      ],

      reason:
        "The selected analytics period contains an attribution mismatch between funnel stages.",

      evidence: {
        views,
        engagementActions,
        offersReceived,
        acceptedOffers,
        completedTrades,

        dataQualitySignals:
          conversionFunnel
            ?.dataQuality
            ?.signals || [],
      },
    });

    return {
      hasRecommendations:
        recommendations.length > 0,

      recommendationCount:
        recommendations.length,

      primaryRecommendation:
        recommendations[0] || null,

      recommendations,

      dataQuality: {
        reliableForRecommendations:
          false,

        hasAttributionMismatch:
          true,
      },
    };
  }

  /**
   * ----------------------------------------------------------
   * UNDERPERFORMANCE RECOMMENDATIONS
   * ----------------------------------------------------------
   */

  const issues =
    Array.isArray(
      underperformance?.issues
    )
      ? underperformance.issues
      : [];

  /**
   * 1. Traffic -> Engagement
   */

  if (
    issues.some(
      (issue) =>
        issue.code ===
        "TRAFFIC_NO_ENGAGEMENT"
    )
  ) {
    addRecommendation({
      code:
        "IMPROVE_LISTING_PRESENTATION",

      stage:
        "VIEW_TO_ENGAGEMENT",

      priority:
        "ACTION",

      title:
        "Review the listing presentation",

      message:
        "The listing is receiving views but no tracked engagement actions. Review whether the listing gives visitors enough useful information and clear reasons to interact.",

      actions: [
        "Review the listing title and description for clarity",
        "Check that listing images clearly show the item",
        "Confirm important item details are complete",
        "Make the desired barter or exchange expectations easy to understand",
      ],

      reason:
        "Traffic is reaching the listing without producing tracked engagement.",

      evidence: {
        views,
        uniqueViewers,
        engagementActions,
        engagementRate,
      },
    });
  }

  /**
   * 2. Engagement -> Offers
   */

  if (
    issues.some(
      (issue) =>
        issue.code ===
        "ENGAGEMENT_NO_OFFERS"
    )
  ) {
    addRecommendation({
      code:
        "STRENGTHEN_OFFER_CONVERSION",

      stage:
        "ENGAGEMENT_TO_OFFER",

      priority:
        "ACTION",

      title:
        "Review what may be preventing offers",

      message:
        "People are interacting with this listing, but that engagement has not produced offers in the selected period. Review whether the exchange information gives interested users a clear path to make a suitable offer.",

      actions: [
        "Clarify what items or value you are willing to exchange for",
        "Review whether the listing description answers likely buyer questions",
        "Make important item condition details clear",
        "Ensure the listing provides enough information for users to evaluate a barter offer",
      ],

      reason:
        "The listing has tracked engagement but no received offers.",

      evidence: {
        views,
        engagementActions,
        offersReceived,
        viewToOfferRate,
      },
    });
  }

  /**
   * 3. Offers -> Acceptance
   */

  if (
    issues.some(
      (issue) =>
        issue.code ===
        "OFFERS_NO_ACCEPTANCE"
    )
  ) {
    addRecommendation({
      code:
        "REVIEW_EXCHANGE_EXPECTATIONS",

      stage:
        "OFFER_TO_ACCEPTED_OFFER",

      priority:
        "ACTION",

      title:
        "Review received offers and exchange expectations",

      message:
        "This listing is generating offers, but none are represented as accepted in the selected period. Review whether the offers being received align with what you are willing to exchange for.",

      actions: [
        "Review the types of offers the listing is attracting",
        "Confirm your preferred exchange expectations are clearly described",
        "Consider whether acceptable alternatives should be stated more clearly",
        "Respond promptly to suitable offers where appropriate",
      ],

      reason:
        "Offers are being received without progressing into accepted offers.",

      evidence: {
        offersReceived,
        acceptedOffers,
        offerAcceptanceRate,
      },
    });
  }

  /**
   * 4. Accepted offers -> Completed trades
   */

  if (
    issues.some(
      (issue) =>
        issue.code ===
        "ACCEPTED_NO_COMPLETION"
    )
  ) {
    addRecommendation({
      code:
        "FOLLOW_UP_ACCEPTED_OFFERS",

      stage:
        "ACCEPTED_OFFER_TO_TRADE",

      priority:
        "ACTION",

      title:
        "Review accepted offers that have not reached completion",

      message:
        "The listing has accepted offers but no completed trade is represented in this analytics period. Review the current status of those exchanges and identify any next steps still required.",

      actions: [
        "Review active trades created from accepted offers",
        "Check whether either trader is waiting for a response",
        "Confirm exchange arrangements and next steps",
        "Close or update stale trade activity where appropriate",
      ],

      reason:
        "Accepted offers are present without a completed trade in the selected analytics period.",

      evidence: {
        acceptedOffers,
        completedTrades,
        acceptedOfferToTradeRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * POSITIVE OPPORTUNITY RECOMMENDATIONS
   * ----------------------------------------------------------
   */

  const opportunitySignals =
    Array.isArray(
      highOpportunity?.signals
    )
      ? highOpportunity.signals
      : [];

  const generatingCompletedTrades =
    opportunitySignals.some(
      (signal) =>
        signal.code ===
        "GENERATING_COMPLETED_TRADES"
    );

  /**
   * A listing producing completed trades has demonstrated an
   * observable successful outcome.
   *
   * We recommend preserving what works before making large
   * changes.
   */

  if (generatingCompletedTrades) {
    addRecommendation({
      code:
        "PRESERVE_CONVERTING_LISTING",

      stage:
        "COMPLETED_TRADES",

      priority:
        "OPPORTUNITY",

      title:
        "Preserve what is working on this listing",

      message:
        "This listing is producing completed trades. Avoid unnecessary major changes without comparing future performance against the current results.",

      actions: [
        "Keep successful listing information consistent",
        "Monitor whether trade conversion remains stable over time",
        "Use this listing as a reference when reviewing similar listings",
        "Compare future changes against the current performance period",
      ],

      reason:
        "The listing has generated completed marketplace trades.",

      evidence: {
        views,
        offersReceived,
        acceptedOffers,
        completedTrades,
        viewToTradeRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Visibility growth candidate
   * ----------------------------------------------------------
   *
   * We only surface this when:
   *
   * - completed trades already exist
   * - no underperformance blocker is present
   *
   * We do NOT claim traffic is objectively low.
   *
   * Actual HIGH_CONVERSION_LOW_VISIBILITY detection requires
   * benchmark intelligence later.
   */

  if (
    completedTrades > 0 &&
    !underperformance
      ?.isUnderperforming
  ) {
    addRecommendation({
      code:
        "EXPLORE_VISIBILITY_GROWTH",

      stage:
        "GROWTH",

      priority:
        "OPPORTUNITY",

      title:
        "Consider testing additional visibility",

      message:
        "This listing has already produced completed trades without an observed conversion blocker. It may be suitable for a controlled visibility test while you monitor whether conversion remains healthy.",

      actions: [
        "Consider promoting the listing for a limited period",
        "Compare promoted and non-promoted performance",
        "Monitor whether additional views produce additional offers",
        "Avoid assuming more traffic will automatically produce more trades",
      ],

      reason:
        "The listing has completed trades and no absolute conversion blocker is currently detected.",

      evidence: {
        views,
        uniqueViewers,
        offersReceived,
        completedTrades,
        viewToOfferRate,
        viewToTradeRate,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * No actionable recommendation
   * ----------------------------------------------------------
   */

  if (
    recommendations.length === 0
  ) {
    addRecommendation({
      code:
        "MONITOR_MORE_DATA",

      stage:
        "MONITORING",

      priority:
        "INFO",

      title:
        "Continue collecting conversion data",

      message:
        "There is not yet enough observable funnel evidence to generate a specific conversion recommendation for this listing.",

      actions: [
        "Continue monitoring listing activity",
        "Review performance again after more views, offers, or trade activity",
      ],

      reason:
        "No specific conversion blocker or completed-trade opportunity is currently observable.",

      evidence: {
        views,
        uniqueViewers,
        engagementActions,
        offersReceived,
        acceptedOffers,
        completedTrades,
      },
    });
  }

  /**
   * ----------------------------------------------------------
   * Primary recommendation
   * ----------------------------------------------------------
   *
   * Prefer actionable blocker recommendations first.
   *
   * This is workflow ordering, not a marketplace performance
   * score.
   */

  const priorityOrder = {
    ACTION: 3,
    OPPORTUNITY: 2,
    INFO: 1,
  };

  const stageOrder = {
    ACCEPTED_OFFER_TO_TRADE: 4,
    OFFER_TO_ACCEPTED_OFFER: 3,
    ENGAGEMENT_TO_OFFER: 2,
    VIEW_TO_ENGAGEMENT: 1,
    COMPLETED_TRADES: 0,
    GROWTH: 0,
    MONITORING: 0,
  };

  const orderedRecommendations =
    [...recommendations].sort(
      (a, b) => {
        const priorityDifference =
          (priorityOrder[
            b.priority
          ] || 0) -
          (priorityOrder[
            a.priority
          ] || 0);

        if (
          priorityDifference !== 0
        ) {
          return priorityDifference;
        }

        return (
          (stageOrder[
            b.stage
          ] || 0) -
          (stageOrder[
            a.stage
          ] || 0)
        );
      }
    );

  return {
    hasRecommendations:
      orderedRecommendations.length >
      0,

    recommendationCount:
      orderedRecommendations.length,

    primaryRecommendation:
      orderedRecommendations[0] ||
      null,

    recommendations:
      orderedRecommendations,

    context: {
      hasUnderperformance:
        Boolean(
          underperformance
            ?.isUnderperforming
        ),

      hasOpportunity:
        Boolean(
          highOpportunity
            ?.hasOpportunity
        ),

      hasOpportunityAndBlocker:
        Boolean(
          highOpportunity
            ?.relationship
            ?.hasOpportunityAndBlocker
        ),
    },

    dataQuality: {
      reliableForRecommendations:
        true,

      hasAttributionMismatch:
        false,
    },
  };
};


/**
 * ============================================================
 * HISTORICAL CONVERSION TRENDS
 * ============================================================
 
 */

const toAnalyticsDate = (value) => {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const startOfAnalyticsDay = (
  value
) => {
  const date =
    toAnalyticsDate(value);

  if (!date) {
    return null;
  }

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const startOfAnalyticsWeek = (
  value
) => {
  const date =
    startOfAnalyticsDay(
      value
    );

  if (!date) {
    return null;
  }

  /**
   * Monday-based analytics week.
   *
   * JS:
   * Sunday = 0
   * Monday = 1
   */

  const day =
    date.getUTCDay();

  const daysSinceMonday =
    (day + 6) % 7;

  date.setUTCDate(
    date.getUTCDate() -
      daysSinceMonday
  );

  return date;
};

const formatAnalyticsDateKey = (
  value
) => {
  const date =
    toAnalyticsDate(value);

  if (!date) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10);
};

const addAnalyticsDays = (
  value,
  days
) => {
  const date =
    toAnalyticsDate(value);

  if (!date) {
    return null;
  }

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date;
};

const getHistoricalTrendGranularity = ({
  startDate,
  endDate,
} = {}) => {
  const start =
    startOfAnalyticsDay(
      startDate
    );

  const end =
    startOfAnalyticsDay(
      endDate
    );

  if (
    !start ||
    !end
  ) {
    return "DAILY";
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  const days =
    Math.floor(
      (
        end.getTime() -
        start.getTime()
      ) /
        millisecondsPerDay
    ) + 1;

  return days <= 31
    ? "DAILY"
    : "WEEKLY";
};

const getHistoricalBucketStart = ({
  date,
  granularity,
} = {}) => {
  if (
    granularity ===
    "WEEKLY"
  ) {
    return startOfAnalyticsWeek(
      date
    );
  }

  return startOfAnalyticsDay(
    date
  );
};

const buildHistoricalConversionTrends = ({
  startDate,
  endDate,
  events = [],
  offers = [],
  trades = [],
} = {}) => {
  const normalizedStart =
    startOfAnalyticsDay(
      startDate
    );

  const normalizedEnd =
    startOfAnalyticsDay(
      endDate
    );

  if (
    !normalizedStart ||
    !normalizedEnd ||
    normalizedStart >
      normalizedEnd
  ) {
    return {
      granularity:
        "DAILY",

      points: [],

      summary: {
        pointCount: 0,

        activePointCount: 0,

        firstActivePoint:
          null,

        lastActivePoint:
          null,

        direction: {
          viewToOffer:
            "INSUFFICIENT_DATA",

          offerAcceptance:
            "INSUFFICIENT_DATA",

          acceptedOfferToTrade:
            "INSUFFICIENT_DATA",

          viewToTrade:
            "INSUFFICIENT_DATA",
        },
      },
    };
  }

  const granularity =
    getHistoricalTrendGranularity({
      startDate:
        normalizedStart,

      endDate:
        normalizedEnd,
    });

  /**
   * ----------------------------------------------------------
   * Create zero-filled buckets
   * ----------------------------------------------------------
   */

  const bucketMap =
    new Map();

  let cursor =
    getHistoricalBucketStart({
      date:
        normalizedStart,

      granularity,
    });

  const finalBucket =
    getHistoricalBucketStart({
      date:
        normalizedEnd,

      granularity,
    });

  while (
    cursor &&
    finalBucket &&
    cursor <=
      finalBucket
  ) {
    const key =
      formatAnalyticsDateKey(
        cursor
      );

    bucketMap.set(
      key,
      {
        key,

        startDate:
          key,

        views: 0,

        uniqueViewerKeys:
          new Set(),

        engagementActions:
          0,

        offersReceived:
          0,

        acceptedOffers:
          0,

        completedTrades:
          0,
      }
    );

    cursor =
      addAnalyticsDays(
        cursor,
        granularity ===
          "WEEKLY"
          ? 7
          : 1
      );
  }

  /**
   * ----------------------------------------------------------
   * Bucket resolver
   * ----------------------------------------------------------
   */

  const resolveBucket = (
    value
  ) => {
    const bucketStart =
      getHistoricalBucketStart({
        date:
          value,

        granularity,
      });

    if (!bucketStart) {
      return null;
    }

    const key =
      formatAnalyticsDateKey(
        bucketStart
      );

    return (
      bucketMap.get(key) ||
      null
    );
  };

  /**
   * ----------------------------------------------------------
   * Analytics events
   * ----------------------------------------------------------
   */

  for (
    const event of events
  ) {
    const bucket =
      resolveBucket(
        event.createdAt
      );

    if (!bucket) {
      continue;
    }

    switch (event.type) {
      case "LISTING_VIEW":
        bucket.views += 1;

        if (
          event.visitorKey
        ) {
          bucket
            .uniqueViewerKeys
            .add(
              event.visitorKey
            );
        }

        break;

      case "CONTACT_CLICK":
      case "WEBSITE_CLICK":
      case "PHONE_CLICK":
      case "LISTING_SHARE":
        bucket.engagementActions +=
          1;

        break;

      default:
        break;
    }
  }

  
  for (
    const offer of offers
  ) {
    const bucket =
      resolveBucket(
        offer.createdAt
      );

    if (!bucket) {
      continue;
    }

    bucket.offersReceived +=
      1;

    if (
      offer.status ===
      "ACCEPTED"
    ) {
      bucket.acceptedOffers +=
        1;
    }
  }

  /**
   * ----------------------------------------------------------
   * Completed trades
   * ----------------------------------------------------------
   */

  for (
    const trade of trades
  ) {
    if (
      !trade.completedAt
    ) {
      continue;
    }

    const bucket =
      resolveBucket(
        trade.completedAt
      );

    if (!bucket) {
      continue;
    }

    bucket.completedTrades +=
      1;
  }

  /**
   * ----------------------------------------------------------
   * Build public time-series points
   * ----------------------------------------------------------
   */

  const points =
    Array.from(
      bucketMap.values()
    ).map(
      (bucket) => {
        const uniqueViewers =
          bucket
            .uniqueViewerKeys
            .size;

        const engagementRate =
          percentage(
            bucket.engagementActions,
            bucket.views
          );

        const engagementToOfferRate =
          percentage(
            bucket.offersReceived,
            bucket.engagementActions
          );

        const viewToOfferRate =
          percentage(
            bucket.offersReceived,
            bucket.views
          );

        const offerAcceptanceRate =
          percentage(
            bucket.acceptedOffers,
            bucket.offersReceived
          );

        const acceptedOfferToTradeRate =
          percentage(
            bucket.completedTrades,
            bucket.acceptedOffers
          );

        const offerToTradeRate =
          percentage(
            bucket.completedTrades,
            bucket.offersReceived
          );

        const viewToTradeRate =
          percentage(
            bucket.completedTrades,
            bucket.views
          );

        const hasActivity =
          bucket.views > 0 ||
          bucket.engagementActions >
            0 ||
          bucket.offersReceived >
            0 ||
          bucket.acceptedOffers >
            0 ||
          bucket.completedTrades >
            0;

        return {
          period:
            bucket.key,

          granularity,

          hasActivity,

          counts: {
            views:
              bucket.views,

            uniqueViewers,

            engagementActions:
              bucket.engagementActions,

            offersReceived:
              bucket.offersReceived,

            acceptedOffers:
              bucket.acceptedOffers,

            completedTrades:
              bucket.completedTrades,
          },

          rates: {
            engagementRate,

            engagementToOfferRate,

            viewToOfferRate,

            offerAcceptanceRate,

            acceptedOfferToTradeRate,

            offerToTradeRate,

            viewToTradeRate,
          },
        };
      }
    );

  /**
   * ----------------------------------------------------------
   * Active periods
   * ----------------------------------------------------------
   */

  const activePoints =
    points.filter(
      (point) =>
        point.hasActivity
    );

  /**
   * ----------------------------------------------------------
   * Determine rate direction
   * ----------------------------------------------------------
   */
   

  const determineRateDirection = ({
    rateKey,
    denominatorKey,
  }) => {
    const comparablePoints =
      activePoints.filter(
        (point) =>
          safeNumber(
            point.counts?.[
              denominatorKey
            ]
          ) > 0
      );

    if (
      comparablePoints.length <
      2
    ) {
      return {
        direction:
          "INSUFFICIENT_DATA",

        firstRate:
          null,

        lastRate:
          null,

        change:
          null,

        firstPeriod:
          null,

        lastPeriod:
          null,
      };
    }

    const first =
      comparablePoints[0];

    const last =
      comparablePoints[
        comparablePoints.length -
          1
      ];

    const firstRate =
      safeNumber(
        first.rates?.[
          rateKey
        ]
      );

    const lastRate =
      safeNumber(
        last.rates?.[
          rateKey
        ]
      );

    const change =
      Number(
        (
          lastRate -
          firstRate
        ).toFixed(2)
      );

    let direction =
      "FLAT";

    if (change > 0) {
      direction =
        "UP";
    }

    if (change < 0) {
      direction =
        "DOWN";
    }

    return {
      direction,

      firstRate,

      lastRate,

      change,

      firstPeriod:
        first.period,

      lastPeriod:
        last.period,
    };
  };

  const viewToOffer =
    determineRateDirection({
      rateKey:
        "viewToOfferRate",

      denominatorKey:
        "views",
    });

  const offerAcceptance =
    determineRateDirection({
      rateKey:
        "offerAcceptanceRate",

      denominatorKey:
        "offersReceived",
    });

  const acceptedOfferToTrade =
    determineRateDirection({
      rateKey:
        "acceptedOfferToTradeRate",

      denominatorKey:
        "acceptedOffers",
    });

  const viewToTrade =
    determineRateDirection({
      rateKey:
        "viewToTradeRate",

      denominatorKey:
        "views",
    });

  return {
    granularity,

    points,

    summary: {
      pointCount:
        points.length,

      activePointCount:
        activePoints.length,

      firstActivePoint:
        activePoints[0]
          ?.period ||
        null,

      lastActivePoint:
        activePoints[
          activePoints.length -
            1
        ]?.period ||
        null,

      direction: {
        viewToOffer,

        offerAcceptance,

        acceptedOfferToTrade,

        viewToTrade,
      },
    },
  };
};
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
        createdAt: true,
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

      /**
       * ------------------------------------------------------
       * Centralized listing conversion calculation
       * ------------------------------------------------------
       */

      const conversion = buildListingConversionMetrics({
          views:
            metrics.views,

          uniqueViewers,

          engagementActions,

          offersReceived:
            metrics.offersReceived,

          acceptedOffers:
            metrics.acceptedOffers,

          completedTrades:
            metrics.completedTrades,
        });

        const engagementToOffer = buildEngagementToOfferConversion({
          views:
            metrics.views,

          uniqueViewers,

          engagementActions,

          offersReceived:
            metrics.offersReceived,
        });

        const offerToAcceptedOffer = buildOfferToAcceptedOfferConversion({
          offersReceived:
            metrics.offersReceived,

          acceptedOffers:
            metrics.acceptedOffers,
        });

        const acceptedOfferToTrade = buildAcceptedOfferToTradeConversion({
          acceptedOffers:
            metrics.acceptedOffers,

          completedTrades:
            metrics.completedTrades,
        });

        const overallListingToTrade = buildOverallListingToTradeConversion({
          views:
            metrics.views,

          uniqueViewers,

          engagementActions,

          offersReceived:
            metrics.offersReceived,

          acceptedOffers:
            metrics.acceptedOffers,

          completedTrades:
            metrics.completedTrades,
        });
         const conversionFunnel = buildListingConversionFunnel({
          conversion,

          engagementToOffer,

          offerToAcceptedOffer,

          acceptedOfferToTrade,

          overallListingToTrade,
        });
        const underperformance = detectUnderperformingListing({
          conversion,

          engagementToOffer,

          offerToAcceptedOffer,

          acceptedOfferToTrade,

          overallListingToTrade,

          conversionFunnel,
        });
          const highOpportunity = detectHighOpportunityListing({
          conversion,

          engagementToOffer,

          offerToAcceptedOffer,

          acceptedOfferToTrade,

          overallListingToTrade,

          conversionFunnel,

          underperformance,
        });
        const conversionRecommendations = buildConversionRecommendations({
          conversion,

          conversionFunnel,

          underperformance,

          highOpportunity,
        });

         const listingEvents =
        analyticsEvents.filter(
            (event) =>
            event.listingId ===
            listing.id
        );

        const listingOffers =
        offers.filter(
            (offer) =>
            offer.requestedListingId ===
            listing.id
        );

        const listingTrades =
        completedTrades.filter(
            (trade) =>
            trade.offer
                ?.requestedListingId ===
            listing.id
        );
       const historicalConversionTrends = buildHistoricalConversionTrends({
        startDate:
        start,

        endDate:
        end,

        events:
        listingEvents,

        offers:
        listingOffers,

        trades:
        listingTrades,
    });

          
       

      /**
       * ------------------------------------------------------
       * END: Centralized listing conversion calculation
       * ------------------------------------------------------
       */

      return {
        id:
          listing.id,

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

        /**
         * KEEP existing Business Free field.
         */
        engagementRate:
          conversion.rates
            .engagementRate,

        /**
         * Offers
         */

        offersReceived:
          metrics.offersReceived,

        acceptedOffers:
          metrics.acceptedOffers,

        /**
         * KEEP existing Business Free field.
         */
        offerAcceptanceRate:
          conversion.rates
            .offerAcceptanceRate,

        /**
         * Trades
         */

        completedTrades:
          metrics.completedTrades,

        /**
         * Existing conversion fields.
         *
         * These remain at the top level for backward
         * compatibility with the current API/frontend.
         */

        viewToOfferRate:
          conversion.rates
            .viewToOfferRate,

        offerToTradeRate:
          conversion.rates
            .offerToTradeRate,

        viewToTradeRate:
          conversion.rates
            .viewToTradeRate,

        /**
         * New conversion calculations.
         */

        engagementToOfferRate:
          conversion.rates
            .engagementToOfferRate,
            

        acceptedOfferToTradeRate:
          conversion.rates
            .acceptedOfferToTradeRate,

        /**
         * Full conversion engine result.
         *
         * Later Business Pro endpoints can expose/use this
         * intelligence according to entitlement.
         */

         engagementToOffer,
         offerToAcceptedOffer,
          acceptedOfferToTrade,
          overallListingToTrade,
          conversionFunnel,
          underperformance,
          highOpportunity,
          conversionRecommendations,
          historicalConversionTrends,
         conversion,

      };
    }
  );
};


/**
 * ============================================================
 * BUSINESS CONVERSION INTELLIGENCE
 * ============================================================
 *
 * Dedicated aggregation layer for advanced listing conversion
 * intelligence.
 *
 * This function DOES NOT:
 *
 * - decide whether the user is Business Pro
 * - read subscription state
 * - trust client-provided business IDs
 * - mutate analytics
 * - persist recommendations
 * - recalculate listing conversion engines
 *
 * Business Pro authorization belongs to the controller/access
 * layer.
 *
 * This service consumes getListingPerformance(), which remains
 * the canonical source for per-listing conversion calculations.
 *
 * ============================================================
 */

export const getBusinessConversionIntelligence =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
    startDate = null,
    endDate = null,
  } = {}) => {
    /**
     * --------------------------------------------------------
     * 1. Validate business
     * --------------------------------------------------------
     */

    if (!businessId) {
      throw new Error(
        "Business ID is required for conversion intelligence."
      );
    }

    /**
     * --------------------------------------------------------
     * 2. Resolve canonical business context
     * --------------------------------------------------------
     *
     * The caller provides only the business ID.
     *
     * userId is resolved from BusinessProfile rather than
     * trusted from request/query input.
     */

    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    /**
     * --------------------------------------------------------
     * 3. Resolve analytics window
     * --------------------------------------------------------
     */

    const window =
      buildAnalyticsWindow({
        days,
        startDate,
        endDate,
      });

    /**
     * --------------------------------------------------------
     * 4. Get canonical listing conversion intelligence
     * --------------------------------------------------------
     *
     * getListingPerformance() already calculates:
     *
     * - conversion
     * - engagement -> offer
     * - offer -> accepted offer
     * - accepted offer -> trade
     * - overall listing -> trade
     * - conversion funnel
     * - underperformance
     * - high opportunity
     * - recommendations
     * - historical conversion trends
     *
     * We reuse those calculations rather than rebuilding them.
     */

    const listings =
      await getListingPerformance({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,
      });

    /**
     * --------------------------------------------------------
     * 5. Business-level accumulators
     * --------------------------------------------------------
     */

    let totalViews = 0;

    /**
     * IMPORTANT:
     *
     * This is intentionally called summedListingUniqueViewers.
     *
     * A visitor may view more than one listing. Summing each
     * listing's unique viewers therefore does NOT produce a
     * true business-wide unique audience.
     */

    let summedListingUniqueViewers =
      0;

    let totalEngagementActions =
      0;

    let totalOffersReceived =
      0;

    let totalAcceptedOffers =
      0;

    let totalCompletedTrades =
      0;

    let underperformingListings =
      0;

    let opportunityListings =
      0;

    let convertingListings =
      0;

    let listingsWithRecommendations =
      0;

    let listingsWithDataQualityWarnings =
      0;

    /**
     * --------------------------------------------------------
     * 6. Distribution counters
     * --------------------------------------------------------
     */

    const blockerDistribution = {
      TRAFFIC_NO_ENGAGEMENT: 0,

      ENGAGEMENT_NO_OFFERS: 0,

      OFFERS_NO_ACCEPTANCE: 0,

      ACCEPTED_NO_COMPLETION: 0,
    };

    const opportunityDistribution = {
      GENERATING_OFFERS: 0,

      GENERATING_ACCEPTED_OFFERS: 0,

      GENERATING_COMPLETED_TRADES: 0,

      TRADE_WITH_LIMITED_OBSERVED_TRAFFIC:
        0,

      ALL_OBSERVED_OFFERS_ACCEPTED:
        0,

      ALL_OBSERVED_ACCEPTED_OFFERS_COMPLETED:
        0,
    };

    const recommendationDistribution = {
      IMPROVE_LISTING_PRESENTATION:
        0,

      STRENGTHEN_OFFER_CONVERSION:
        0,

      REVIEW_EXCHANGE_EXPECTATIONS:
        0,

      FOLLOW_UP_ACCEPTED_OFFERS:
        0,

      PRESERVE_CONVERTING_LISTING:
        0,

      EXPLORE_VISIBILITY_GROWTH:
        0,

      MONITOR_MORE_DATA:
        0,
    };

    /**
     * --------------------------------------------------------
     * 7. Build listing intelligence collection
     * --------------------------------------------------------
     */

    const intelligenceListings =
      listings.map(
        (listing) => {
          const conversion =
            listing.conversion || {};

          const counts =
            conversion.counts || {};

          /**
           * --------------------------------------------------
           * Canonical counts
           * --------------------------------------------------
           */

          const views =
            safeNumber(
              counts.views ??
                listing.views
            );

          const uniqueViewers =
            safeNumber(
              counts.uniqueViewers ??
                listing.uniqueViewers
            );

          const engagementActions =
            safeNumber(
              counts.engagementActions ??
                listing.engagementActions
            );

          const offersReceived =
            safeNumber(
              counts.offersReceived ??
                listing.offersReceived
            );

          const acceptedOffers =
            safeNumber(
              counts.acceptedOffers ??
                listing.acceptedOffers
            );

          const completedTrades =
            safeNumber(
              counts.completedTrades ??
                listing.completedTrades
            );

          /**
           * --------------------------------------------------
           * Business totals
           * --------------------------------------------------
           */

          totalViews +=
            views;

          summedListingUniqueViewers +=
            uniqueViewers;

          totalEngagementActions +=
            engagementActions;

          totalOffersReceived +=
            offersReceived;

          totalAcceptedOffers +=
            acceptedOffers;

          totalCompletedTrades +=
            completedTrades;

          /**
           * --------------------------------------------------
           * Underperformance
           * --------------------------------------------------
           */

          const underperformance =
            listing.underperformance || {
              isUnderperforming:
                false,

              issues: [],
            };

          const issues =
            Array.isArray(
              underperformance.issues
            )
              ? underperformance.issues
              : [];

          if (
            underperformance
              .isUnderperforming
          ) {
            underperformingListings +=
              1;
          }

          for (
            const issue of issues
          ) {
            const code =
              issue?.code;

            if (
              code &&
              Object.prototype.hasOwnProperty.call(
                blockerDistribution,
                code
              )
            ) {
              blockerDistribution[
                code
              ] += 1;
            }
          }

          /**
           * --------------------------------------------------
           * High opportunity
           * --------------------------------------------------
           */

          const highOpportunity =
            listing.highOpportunity || {
              hasOpportunity:
                false,

              signals: [],
            };

          const opportunitySignals =
            Array.isArray(
              highOpportunity.signals
            )
              ? highOpportunity.signals
              : [];

          if (
            highOpportunity
              .hasOpportunity
          ) {
            opportunityListings +=
              1;
          }

          for (
            const signal of
              opportunitySignals
          ) {
            const code =
              typeof signal ===
              "string"
                ? signal
                : signal?.code;

            if (
              code &&
              Object.prototype.hasOwnProperty.call(
                opportunityDistribution,
                code
              )
            ) {
              opportunityDistribution[
                code
              ] += 1;
            }
          }

          /**
           * --------------------------------------------------
           * Completed conversion
           * --------------------------------------------------
           */

          if (
            completedTrades > 0
          ) {
            convertingListings +=
              1;
          }

          /**
           * --------------------------------------------------
           * Recommendations
           * --------------------------------------------------
           */

          const conversionRecommendations =
            listing
              .conversionRecommendations ||
            {
              hasRecommendations:
                false,

              recommendations:
                [],
            };

          const recommendations =
            Array.isArray(
              conversionRecommendations
                .recommendations
            )
              ? conversionRecommendations
                  .recommendations
              : [];

          if (
            conversionRecommendations
              .hasRecommendations
          ) {
            listingsWithRecommendations +=
              1;
          }

          for (
            const recommendation of
              recommendations
          ) {
            const code =
              recommendation?.code;

            if (
              code &&
              Object.prototype.hasOwnProperty.call(
                recommendationDistribution,
                code
              )
            ) {
              recommendationDistribution[
                code
              ] += 1;
            }
          }

          /**
           * --------------------------------------------------
           * Data-quality warning
           * --------------------------------------------------
           *
           * Do NOT rely on the older broad
           * conversionFunnel.hasAttributionMismatch flag here.
           *
           * Engagement events may legitimately exceed views,
           * and offers may exist without a tracked engagement
           * event.
           *
           * The attribution conditions below are the ones that
           * matter for this conversion intelligence layer.
           */

          const acceptedOffersExceedOffers =
            acceptedOffers >
            offersReceived;

          const completedTradesExceedAcceptedOffers =
            completedTrades >
            acceptedOffers;

          const tradeWithoutObservedTraffic =
            completedTrades > 0 &&
            views === 0;

          const dataQualitySignals =
            [];

          if (
            acceptedOffersExceedOffers
          ) {
            dataQualitySignals.push(
              "ACCEPTED_OFFERS_EXCEED_RECEIVED_OFFERS"
            );
          }

          if (
            completedTradesExceedAcceptedOffers
          ) {
            dataQualitySignals.push(
              "COMPLETED_TRADES_EXCEED_ACCEPTED_OFFERS"
            );
          }

          if (
            tradeWithoutObservedTraffic
          ) {
            dataQualitySignals.push(
              "TRADE_WITHOUT_IN_WINDOW_TRAFFIC"
            );
          }

          const hasDataQualityWarning =
            dataQualitySignals.length >
            0;

          if (
            hasDataQualityWarning
          ) {
            listingsWithDataQualityWarnings +=
              1;
          }

          /**
           * --------------------------------------------------
           * Listing intelligence state
           * --------------------------------------------------
           *
           * Descriptive state only.
           *
           * This is NOT a score or arbitrary performance grade.
           */

          let intelligenceState =
            "MONITORING";

          if (
            hasDataQualityWarning
          ) {
            intelligenceState =
              "DATA_QUALITY_WARNING";
          } else if (
            underperformance
              .isUnderperforming &&
            highOpportunity
              .hasOpportunity
          ) {
            intelligenceState =
              "OPPORTUNITY_WITH_BLOCKER";
          } else if (
            underperformance
              .isUnderperforming
          ) {
            intelligenceState =
              "CONVERSION_BLOCKER";
          } else if (
            completedTrades > 0
          ) {
            intelligenceState =
              "CONVERTING";
          } else if (
            highOpportunity
              .hasOpportunity
          ) {
            intelligenceState =
              "OPPORTUNITY";
          }

          /**
           * --------------------------------------------------
           * Safe listing intelligence payload
           * --------------------------------------------------
           */

          return {
            listing: {
              id:
                listing.id,

              title:
                listing.title,

              status:
                listing.status,

              estimatedValue:
                listing.estimatedValue,

              location:
                listing.location,

              category:
                listing.category,

              image:
                listing.image,

              createdAt:
                listing.createdAt,

              updatedAt:
                listing.updatedAt,
            },

            intelligenceState,

            metrics: {
              views,

              uniqueViewers,

              engagementActions,

              offersReceived,

              acceptedOffers,

              completedTrades,
            },

            rates: {
              engagementRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.engagementRate
                ),

              engagementToOfferRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.engagementToOfferRate
                ),

              viewToOfferRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.viewToOfferRate
                ),

              offerAcceptanceRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.offerAcceptanceRate
                ),

              acceptedOfferToTradeRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.acceptedOfferToTradeRate
                ),

              offerToTradeRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.offerToTradeRate
                ),

              viewToTradeRate:
                safeNumber(
                  conversion
                    ?.rates
                    ?.viewToTradeRate
                ),
            },

            conversion:
              listing.conversion ||
              null,

            engagementToOffer:
              listing
                .engagementToOffer ||
              null,

            offerToAcceptedOffer:
              listing
                .offerToAcceptedOffer ||
              null,

            acceptedOfferToTrade:
              listing
                .acceptedOfferToTrade ||
              null,

            overallListingToTrade:
              listing
                .overallListingToTrade ||
              null,

            funnel:
              listing
                .conversionFunnel ||
              null,

            underperformance,

            highOpportunity,

            recommendations:
              conversionRecommendations,

            historicalTrends:
              listing
                .historicalConversionTrends ||
              null,

            dataQuality: {
              hasWarning:
                hasDataQualityWarning,

              signals:
                dataQualitySignals,
            },
          };
        }
      );

    /**
     * --------------------------------------------------------
     * 8. Business-level conversion metrics
     * --------------------------------------------------------
     *
     * These are calculated from aggregate raw counts.
     *
     * We never average listing percentages.
     */

    const businessConversion =
      buildListingConversionMetrics({
        views:
          totalViews,

        uniqueViewers:
          summedListingUniqueViewers,

        engagementActions:
          totalEngagementActions,

        offersReceived:
          totalOffersReceived,

        acceptedOffers:
          totalAcceptedOffers,

        completedTrades:
          totalCompletedTrades,
      });

    const businessEngagementToOffer =
      buildEngagementToOfferConversion({
        views:
          totalViews,

        uniqueViewers:
          summedListingUniqueViewers,

        engagementActions:
          totalEngagementActions,

        offersReceived:
          totalOffersReceived,
      });

    const businessOfferToAcceptedOffer =
      buildOfferToAcceptedOfferConversion({
        offersReceived:
          totalOffersReceived,

        acceptedOffers:
          totalAcceptedOffers,
      });

    const businessAcceptedOfferToTrade =
      buildAcceptedOfferToTradeConversion({
        acceptedOffers:
          totalAcceptedOffers,

        completedTrades:
          totalCompletedTrades,
      });

    const businessOverallListingToTrade =
      buildOverallListingToTradeConversion({
        views:
          totalViews,

        uniqueViewers:
          summedListingUniqueViewers,

        engagementActions:
          totalEngagementActions,

        offersReceived:
          totalOffersReceived,

        acceptedOffers:
          totalAcceptedOffers,

        completedTrades:
          totalCompletedTrades,
      });

    const businessFunnel =
      buildListingConversionFunnel({
        conversion:
          businessConversion,

        engagementToOffer:
          businessEngagementToOffer,

        offerToAcceptedOffer:
          businessOfferToAcceptedOffer,

        acceptedOfferToTrade:
          businessAcceptedOfferToTrade,

        overallListingToTrade:
          businessOverallListingToTrade,
      });

    /**
     * --------------------------------------------------------
     * 9. Distribution helper
     * --------------------------------------------------------
     */

    const distributionToArray = (
      distribution
    ) =>
      Object.entries(
        distribution
      )
        .map(
          ([code, count]) => ({
            code,
            count,
          })
        )
        .filter(
          ({ count }) =>
            count > 0
        )
        .sort(
          (a, b) =>
            b.count -
            a.count
        );

    const blockerDistributionArray =
      distributionToArray(
        blockerDistribution
      );

    const opportunityDistributionArray =
      distributionToArray(
        opportunityDistribution
      );

    const recommendationDistributionArray =
      distributionToArray(
        recommendationDistribution
      );

    /**
     * --------------------------------------------------------
     * 10. Most-observed signals
     * --------------------------------------------------------
     *
     * These are frequency summaries only.
     *
     * "Most observed" does not mean most damaging, most
     * important, or highest financial impact.
     */

    const mostObservedBlocker =
      blockerDistributionArray[0] ||
      null;

    const mostObservedOpportunity =
      opportunityDistributionArray[0] ||
      null;

    const mostObservedRecommendation =
      recommendationDistributionArray[0] ||
      null;

    /**
     * --------------------------------------------------------
     * 11. Final Conversion Intelligence contract
     * --------------------------------------------------------
     */

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
      },

      window: {
        start:
          window.start,

        end:
          window.end,

        days:
          window.days,
      },

      summary: {
        listingsAnalyzed:
          intelligenceListings.length,

        listingsWithTraffic:
          intelligenceListings.filter(
            (item) =>
              item.metrics.views >
              0
          ).length,

        listingsWithOffers:
          intelligenceListings.filter(
            (item) =>
              item.metrics
                .offersReceived >
              0
          ).length,

        listingsWithAcceptedOffers:
          intelligenceListings.filter(
            (item) =>
              item.metrics
                .acceptedOffers >
              0
          ).length,

        listingsWithCompletedTrades:
          intelligenceListings.filter(
            (item) =>
              item.metrics
                .completedTrades >
              0
          ).length,

        underperformingListings,

        opportunityListings,

        convertingListings,

        listingsWithRecommendations,

        listingsWithDataQualityWarnings,
      },

      totals: {
        views:
          totalViews,

        /**
         * This is intentionally NOT named uniqueViewers.
         */
        summedListingUniqueViewers,

        engagementActions:
          totalEngagementActions,

        offersReceived:
          totalOffersReceived,

        acceptedOffers:
          totalAcceptedOffers,

        completedTrades:
          totalCompletedTrades,
      },

      rates: {
        engagementRate:
          businessConversion
            .rates
            .engagementRate,

        engagementToOfferRate:
          businessConversion
            .rates
            .engagementToOfferRate,

        viewToOfferRate:
          businessConversion
            .rates
            .viewToOfferRate,

        offerAcceptanceRate:
          businessConversion
            .rates
            .offerAcceptanceRate,

        acceptedOfferToTradeRate:
          businessConversion
            .rates
            .acceptedOfferToTradeRate,

        offerToTradeRate:
          businessConversion
            .rates
            .offerToTradeRate,

        viewToTradeRate:
          businessConversion
            .rates
            .viewToTradeRate,
      },

      funnel:
        businessFunnel,

      blockers: {
        total:
          blockerDistributionArray.reduce(
            (
              total,
              item
            ) =>
              total +
              item.count,
            0
          ),

        mostObserved:
          mostObservedBlocker,

        distribution:
          blockerDistributionArray,
      },

      opportunities: {
        total:
          opportunityDistributionArray.reduce(
            (
              total,
              item
            ) =>
              total +
              item.count,
            0
          ),

        mostObserved:
          mostObservedOpportunity,

        distribution:
          opportunityDistributionArray,
      },

      recommendations: {
        total:
          recommendationDistributionArray.reduce(
            (
              total,
              item
            ) =>
              total +
              item.count,
            0
          ),

        mostObserved:
          mostObservedRecommendation,

        distribution:
          recommendationDistributionArray,
      },

      listings:
        intelligenceListings,

      dataQuality: {
        hasWarnings:
          listingsWithDataQualityWarnings >
          0,

        listingsWithWarnings:
          listingsWithDataQualityWarnings,

        notes: [
          "Summed listing unique viewers are not equivalent to business-wide unique visitors.",
          "Accepted offers are based on current offer status because the current analytics model does not provide an acceptedAt timestamp.",
          "Completed trades are attributed using Trade -> Offer -> requestedListingId.",
          "Conversion trend direction is descriptive and should not be interpreted as statistical significance.",
        ],
      },
    };
  };

/**
 * ============================================================
 * RANK LISTING PERFORMANCE
 * ============================================================
 *
 * Single source of truth for Business Free Top Listing ranking.
 *
 * Ranking priority:
 *
 * 1. Completed trades
 * 2. Offers received
 * 3. Engagement actions
 * 4. Views
 * 5. Unique viewers
 *
 * Business Free receives a maximum of 3 top listings.
 * ============================================================
 */

const rankListingPerformance = (
  listings,
  limit = 3
) => {
  const safeLimit =
    Math.min(
      3,
      Math.max(
        1,
        Number.parseInt(
          limit,
          10
        ) || 3
      )
    );

  return [...listings]
    .sort(
      (a, b) => {
        /**
         * 1. Completed trades
         */
        if (
          b.completedTrades !==
          a.completedTrades
        ) {
          return (
            b.completedTrades -
            a.completedTrades
          );
        }

        /**
         * 2. Offers received
         */
        if (
          b.offersReceived !==
          a.offersReceived
        ) {
          return (
            b.offersReceived -
            a.offersReceived
          );
        }

        /**
         * 3. Engagement actions
         */
        if (
          b.engagementActions !==
          a.engagementActions
        ) {
          return (
            b.engagementActions -
            a.engagementActions
          );
        }

        /**
         * 4. Views
         */
        if (
          b.views !==
          a.views
        ) {
          return (
            b.views -
            a.views
          );
        }

        /**
         * 5. Unique viewers
         */
        return (
          b.uniqueViewers -
          a.uniqueViewers
        );
      }
    )
    .slice(
      0,
      safeLimit
    )
    .map(
      (
        listing,
        index
      ) => ({
        rank:
          index + 1,

        ...listing,
      })
    );
};

/**
 * ============================================================
 * TOP LISTING PERFORMANCE
 * ============================================================
 *
 * Business Free:
 *
 * - Top 3 listings
 * - Maximum 30-day history enforced by controller
 * - Transparent ranking
 * - Descriptive metrics only
 *
 * Ranking priority:
 *
 * 1. Completed trades
 * 2. Offers received
 * 3. Engagement actions
 * 4. Views
 * 5. Unique viewers
 *
 * Why this order?
 *
 * A completed trade represents a stronger marketplace outcome
 * than an offer, an offer is stronger than engagement, and
 * engagement is stronger than a passive view.
 *
 * We deliberately avoid an arbitrary weighted performance score.
 * ============================================================
 */

/**
 * ============================================================
 * TOP LISTINGS
 * ============================================================
 *
 * Business Free:
 *
 * - Top 3 listings maximum
 * - Uses the centralized ranking algorithm
 * - Maximum history is enforced by the controller
 * ============================================================
 */

const getTopListings = async ({
  businessId,
  userId,
  start,
  end,
  limit = 3,
}) => {
  const listingPerformance =
    await getListingPerformance({
      businessId,
      userId,
      start,
      end,
    });

  return rankListingPerformance(
    listingPerformance,
    limit
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

const getDailyPerformance = async ({
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
 * 30-DAY BUSINESS PERFORMANCE
 * ============================================================
 *
 * Business Free receives a rolling performance view covering
 * up to 30 days.
 *
 * This combines:
 *
 * - listing views
 * - storefront views
 * - engagement actions
 * - offers received
 * - completed trades
 *
 * This is descriptive analytics.
 *
 * Growth recommendations, historical comparisons, forecasting,
 * benchmarks and advanced trend intelligence belong to
 * Business Pro later.
 * ============================================================
 */

const getThirtyDayPerformance = async ({
  businessId,
  userId,
  start,
  end,
}) => {
  const dailyPerformance =
    await getDailyPerformance({
      businessId,
      userId,
      start,
      end,
    });

  /**
   * ----------------------------------------------------------
   * Empty-state protection
   * ----------------------------------------------------------
   */

  if (
    dailyPerformance.length === 0
  ) {
    return {
      summary: {
        totalDays: 0,
        activeDays: 0,
        inactiveDays: 0,

        listingViews: 0,
        storefrontViews: 0,
        totalViews: 0,

        engagementActions: 0,

        offersReceived: 0,

        completedTrades: 0,

        averageListingViewsPerDay:
          0,

        averageStorefrontViewsPerDay:
          0,

        averageTotalViewsPerDay:
          0,

        averageEngagementActionsPerDay:
          0,

        averageOffersPerDay:
          0,

        averageCompletedTradesPerDay:
          0,

        engagementRate: 0,

        viewToOfferRate: 0,

        offerToTradeRate: 0,
      },

      bestDays: {
        listingViews: null,
        totalViews: null,
        engagement: null,
        offers: null,
        completedTrades: null,
      },

      dailyPerformance: [],
    };
  }

  /**
   * ----------------------------------------------------------
   * Totals
   * ----------------------------------------------------------
   */

  let listingViews = 0;

  let storefrontViews = 0;

  let engagementActions = 0;

  let offersReceived = 0;

  let completedTrades = 0;

  let activeDays = 0;

  for (
    const day of
    dailyPerformance
  ) {
    listingViews +=
      safeNumber(
        day.listingViews
      );

    storefrontViews +=
      safeNumber(
        day.storefrontViews
      );

    engagementActions +=
      safeNumber(
        day.engagementActions
      );

    offersReceived +=
      safeNumber(
        day.offersReceived
      );

    completedTrades +=
      safeNumber(
        day.completedTrades
      );

    /**
     * An active day is any day on which the business received
     * measurable marketplace activity.
     */

    const activity =
      safeNumber(
        day.listingViews
      ) +
      safeNumber(
        day.storefrontViews
      ) +
      safeNumber(
        day.engagementActions
      ) +
      safeNumber(
        day.offersReceived
      ) +
      safeNumber(
        day.completedTrades
      );

    if (activity > 0) {
      activeDays += 1;
    }
  }

  const totalDays =
    dailyPerformance.length;

  const inactiveDays =
    Math.max(
      0,
      totalDays -
        activeDays
    );

  const totalViews =
    listingViews +
    storefrontViews;

  /**
   * ----------------------------------------------------------
   * Best-day helper
   * ----------------------------------------------------------
   *
   * This is purely descriptive.
   *
   * We are not generating recommendations or forecasting future
   * performance.
   * ----------------------------------------------------------
   */

  const findBestDay = (
    selector
  ) => {
    if (
      dailyPerformance.length ===
      0
    ) {
      return null;
    }

    let bestDay =
      dailyPerformance[0];

    let bestValue =
      safeNumber(
        selector(
          bestDay
        )
      );

    for (
      const day of
      dailyPerformance
    ) {
      const value =
        safeNumber(
          selector(day)
        );

      if (
        value >
        bestValue
      ) {
        bestDay =
          day;

        bestValue =
          value;
      }
    }

    return {
      date:
        bestDay.date,

      value:
        bestValue,
    };
  };

  /**
   * ----------------------------------------------------------
   * Chart-ready daily output
   * ----------------------------------------------------------
   */

  const chart =
    dailyPerformance.map(
      (day) => ({
        date:
          day.date,

        listingViews:
          safeNumber(
            day.listingViews
          ),

        storefrontViews:
          safeNumber(
            day.storefrontViews
          ),

        totalViews:
          safeNumber(
            day.listingViews
          ) +
          safeNumber(
            day.storefrontViews
          ),

        engagementActions:
          safeNumber(
            day.engagementActions
          ),

        offersReceived:
          safeNumber(
            day.offersReceived
          ),

        completedTrades:
          safeNumber(
            day.completedTrades
          ),
      })
    );

  return {
    summary: {
      totalDays,

      activeDays,

      inactiveDays,

      listingViews,

      storefrontViews,

      totalViews,

      engagementActions,

      offersReceived,

      completedTrades,

      /**
       * Daily averages
       */

      averageListingViewsPerDay:
        round(
          listingViews /
            totalDays
        ),

      averageStorefrontViewsPerDay:
        round(
          storefrontViews /
            totalDays
        ),

      averageTotalViewsPerDay:
        round(
          totalViews /
            totalDays
        ),

      averageEngagementActionsPerDay:
        round(
          engagementActions /
            totalDays
        ),

      averageOffersPerDay:
        round(
          offersReceived /
            totalDays
        ),

      averageCompletedTradesPerDay:
        round(
          completedTrades /
            totalDays
        ),

      /**
       * Basic conversion indicators
       */

      engagementRate:
        percentage(
          engagementActions,
          totalViews
        ),

      viewToOfferRate:
        percentage(
          offersReceived,
          listingViews
        ),

      offerToTradeRate:
        percentage(
          completedTrades,
          offersReceived
        ),
    },

    bestDays: {
      listingViews:
        findBestDay(
          (day) =>
            day.listingViews
        ),

      totalViews:
        findBestDay(
          (day) =>
            safeNumber(
              day.listingViews
            ) +
            safeNumber(
              day.storefrontViews
            )
        ),

      engagement:
        findBestDay(
          (day) =>
            day.engagementActions
        ),

      offers:
        findBestDay(
          (day) =>
            day.offersReceived
        ),

      completedTrades:
        findBestDay(
          (day) =>
            day.completedTrades
        ),
    },

    dailyPerformance:
      chart,
  };
};

/**
 * ============================================================
 * BASIC PROMOTION PERFORMANCE
 * ============================================================
 *
 * Business Free promotion analytics.
 *
 * Provides:
 *
 * - Total promotions
 * - Active promotions
 * - Completed promotions
 * - Promotion views
 * - Promotion clicks
 * - CTR
 * - Total promotion spend
 * - Average spend
 * - Per-promotion performance
 * - Top 3 promotions
 *
 * IMPORTANT:
 *
 * This intentionally does NOT calculate:
 *
 * - Promotion uplift
 * - Organic vs promoted comparison
 * - ROI estimates
 * - Marketplace benchmarks
 * - Optimization recommendations
 * - Demand intelligence
 *
 * Those belong to Business Pro.
 * ============================================================
 */

const getPromotionMetrics = async ({
    userId,
    start,
    end,
  }) => {
    const now =
      new Date();

    /**
     * Load promotions belonging to this business owner that
     * overlap the requested analytics period.
     *
     * A promotion may have started before the analytics period
     * and still be active during part of the period, so we must
     * not filter using createdAt alone.
     */
    const promotions =
      await prisma.promotion.findMany(
        {
          where: {
            userId,

            startsAt: {
              lte: end,
            },

            endsAt: {
              gte: start,
            },
          },

          select: {
            id: true,
            listingId: true,

            type: true,
            status: true,

            amount: true,
            currency: true,

            durationDays:
              true,

            startsAt: true,
            endsAt: true,

            createdAt: true,

            listing: {
              select: {
                id: true,
                title: true,
                status: true,

                images: {
                  orderBy: [
                    {
                      isPrimary:
                        "desc",
                    },
                    {
                      sortOrder:
                        "asc",
                    },
                  ],

                  take: 1,

                  select: {
                    id: true,
                    url: true,
                    isPrimary:
                      true,
                  },
                },
              },
            },

            /**
             * Only promotion analytics events that occurred
             * inside the requested analytics window.
             */
            analyticsEvents: {
              where: {
                createdAt: {
                  gte: start,
                  lte: end,
                },
              },

              select: {
                type: true,
                createdAt: true,
              },
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },
        }
      );

    /**
     * ========================================================
     * EMPTY STATE
     * ========================================================
     */

    if (
      promotions.length ===
      0
    ) {
      return {
        summary: {
          totalPromotions: 0,

          activePromotions: 0,
          completedPromotions: 0,

          totalViews: 0,
          totalClicks: 0,

          clickThroughRate:
            0,

          totalSpend: 0,

          averageSpendPerPromotion:
            0,
        },

        topPromotions: [],

        promotions: [],
      };
    }

    let activePromotions =
      0;

    let completedPromotions =
      0;

    let totalViews =
      0;

    let totalClicks =
      0;

    let totalSpend =
      0;

    /**
     * ========================================================
     * PER-PROMOTION PERFORMANCE
     * ========================================================
     */

    const promotionPerformance =
      promotions.map(
        (promotion) => {
          let views =
            0;

          let clicks =
            0;

          for (
            const event of
            promotion.analyticsEvents
          ) {
            if (
              event.type ===
              "VIEW"
            ) {
              views +=
                1;
            }

            if (
              event.type ===
              "CLICK"
            ) {
              clicks +=
                1;
            }
          }

          const amount =
            safeNumber(
              promotion.amount
            );

          totalViews +=
            views;

          totalClicks +=
            clicks;

          totalSpend +=
            amount;

          /**
           * Determine whether the promotion is currently
           * active from both status and date range.
           *
           * We do not rely only on status because an ACTIVE
           * row whose end date has already passed should not
           * be displayed as currently active.
           */
          const isActive =
            promotion.status ===
              "ACTIVE" &&
            promotion.startsAt <=
              now &&
            promotion.endsAt >
              now;

          if (isActive) {
            activePromotions +=
              1;
          }

          /**
           * A promotion is considered completed for analytics
           * display when its configured end time has passed.
           *
           * This avoids depending on whether a background job
           * has already changed its database status.
           */
          const isCompleted =
            promotion.endsAt <=
            now;

          if (
            isCompleted
          ) {
            completedPromotions +=
              1;
          }

          return {
            id:
              promotion.id,

            /**
             * Listing
             */
            listing: {
              id:
                promotion.listing
                  ?.id ||
                promotion.listingId,

              title:
                promotion.listing
                  ?.title ||
                null,

              status:
                promotion.listing
                  ?.status ||
                null,

              image:
                promotion.listing
                  ?.images?.[0] ||
                null,
            },

            /**
             * Promotion
             */
            type:
              promotion.type,

            status:
              promotion.status,

            isActive,

            isCompleted,

            amount,

            currency:
              promotion.currency,

            durationDays:
              promotion.durationDays,

            startsAt:
              promotion.startsAt,

            endsAt:
              promotion.endsAt,

            createdAt:
              promotion.createdAt,

            /**
             * Performance
             */
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

    /**
     * ========================================================
     * TOP PROMOTIONS
     * ========================================================
     *
     * Business Free gets Top 3.
     *
     * Ranking:
     *
     * 1. Clicks
     * 2. Views
     * 3. CTR
     *
     * Clicks are ranked above passive impressions because
     * they represent stronger marketplace engagement.
     *
     * No artificial weighted performance score is used.
     * ========================================================
     */

    const topPromotions =
      [
        ...promotionPerformance,
      ]
        .sort(
          (a, b) => {
            if (
              b.clicks !==
              a.clicks
            ) {
              return (
                b.clicks -
                a.clicks
              );
            }

            if (
              b.views !==
              a.views
            ) {
              return (
                b.views -
                a.views
              );
            }

            return (
              b.clickThroughRate -
              a.clickThroughRate
            );
          }
        )
        .slice(
          0,
          3
        )
        .map(
          (
            promotion,
            index
          ) => ({
            rank:
              index + 1,

            ...promotion,
          })
        );

    /**
     * ========================================================
     * FINAL BUSINESS FREE PROMOTION ANALYTICS
     * ========================================================
     */

    return {
      summary: {
        totalPromotions:
          promotions.length,

        activePromotions,

        completedPromotions,

        totalViews,

        totalClicks,

        clickThroughRate:
          percentage(
            totalClicks,
            totalViews
          ),

        totalSpend:
          round(
            totalSpend
          ),

        averageSpendPerPromotion:
          promotions.length >
          0
            ? round(
                totalSpend /
                  promotions.length
              )
            : 0,
      },

      topPromotions,

      promotions:
        promotionPerformance,
    };
  };

  // UPDATE — server/src/services/businessAnalyticsService.js

/**
 * ============================================================
 * BUSINESS DEMAND INTELLIGENCE
 * ============================================================
 *
 * Business Pro intelligence layer answering:
 *
 * "Which of my listings are attracting the strongest observed
 * marketplace demand, and where are the opportunities?"
 *
 * IMPORTANT:
 *
 * - This service does NOT determine Business Pro entitlement.
 * - It does NOT read subscription state.
 * - It does NOT persist demand scores.
 * - It does NOT modify listings.
 * - It does NOT use arbitrary marketplace/category benchmarks.
 *
 * Category and marketplace comparisons belong to 9.11.16.
 *
 * Demand is derived from observed first-party signals:
 *
 * - listing views
 * - unique viewers
 * - engagement actions
 * - offers received
 * - accepted offers
 * - completed trades
 *
 * ============================================================
 */


/**
 * ============================================================
 * NORMALIZE DEMAND VALUE
 * ============================================================
 *
 * Converts a listing metric into a relative 0-100 score using
 * the strongest observed value inside the business's current
 * analytics window.
 *
 * This is NOT a marketplace benchmark.
 *
 * It simply answers:
 *
 * "How strong is this listing relative to my other listings
 * during the selected period?"
 * ============================================================
 */

const normalizeDemandValue = (
  value,
  maximum
) => {
  const normalizedValue =
    safeNumber(value);

  const normalizedMaximum =
    safeNumber(maximum);

  if (
    normalizedValue <= 0 ||
    normalizedMaximum <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    round(
      (
        normalizedValue /
        normalizedMaximum
      ) * 100
    )
  );
};


/**
 * ============================================================
 * BUILD LISTING DEMAND SCORE
 * ============================================================
 *
 * Demand Score: 0-100
 *
 * The score combines observed marketplace-interest signals.
 *
 * Weighting:
 *
 * Views              20%
 * Unique viewers     20%
 * Engagement         15%
 * Offers             25%
 * Accepted offers    10%
 * Completed trades   10%
 *
 * Offers receive the strongest weight because an offer is a
 * substantially stronger demand signal than a passive view.
 *
 * Completed trades are deliberately not dominant because
 * conversion performance and demand are different concepts.
 *
 * 9.11.16 Category Benchmarks will later provide external
 * marketplace-relative context.
 * ============================================================
 */

const buildListingDemandScore = ({
  listing,
  maxima,
} = {}) => {
  const views =
    safeNumber(
      listing?.views
    );

  const uniqueViewers =
    safeNumber(
      listing?.uniqueViewers
    );

  const engagementActions =
    safeNumber(
      listing?.engagementActions
    );

  const offersReceived =
    safeNumber(
      listing?.offersReceived
    );

  const acceptedOffers =
    safeNumber(
      listing?.acceptedOffers
    );

  const completedTrades =
    safeNumber(
      listing?.completedTrades
    );

  const components = {
    views:
      normalizeDemandValue(
        views,
        maxima.views
      ),

    uniqueViewers:
      normalizeDemandValue(
        uniqueViewers,
        maxima.uniqueViewers
      ),

    engagement:
      normalizeDemandValue(
        engagementActions,
        maxima.engagementActions
      ),

    offers:
      normalizeDemandValue(
        offersReceived,
        maxima.offersReceived
      ),

    acceptedOffers:
      normalizeDemandValue(
        acceptedOffers,
        maxima.acceptedOffers
      ),

    completedTrades:
      normalizeDemandValue(
        completedTrades,
        maxima.completedTrades
      ),
  };

  const weightedScore =
    (
      components.views *
      0.2
    ) +
    (
      components.uniqueViewers *
      0.2
    ) +
    (
      components.engagement *
      0.15
    ) +
    (
      components.offers *
      0.25
    ) +
    (
      components.acceptedOffers *
      0.1
    ) +
    (
      components.completedTrades *
      0.1
    );

  return {
    score:
      round(
        Math.min(
          100,
          weightedScore
        )
      ),

    components,

    weights: {
      views: 20,
      uniqueViewers: 20,
      engagement: 15,
      offers: 25,
      acceptedOffers: 10,
      completedTrades: 10,
    },
  };
};


/**
 * ============================================================
 * CLASSIFY LISTING DEMAND
 * ============================================================
 *
 * Classification is intentionally based on the relative demand
 * score generated within the business's own listings.
 *
 * These labels are product intelligence categories, not
 * marketplace benchmarks.
 * ============================================================
 */

const classifyListingDemand = ({
  demandScore = 0,
  views = 0,
  engagementActions = 0,
  offersReceived = 0,
  completedTrades = 0,
} = {}) => {
  const score =
    safeNumber(
      demandScore
    );

  const hasObservedDemand =
    safeNumber(views) > 0 ||
    safeNumber(
      engagementActions
    ) > 0 ||
    safeNumber(
      offersReceived
    ) > 0 ||
    safeNumber(
      completedTrades
    ) > 0;

  if (!hasObservedDemand) {
    return {
      level:
        "NO_OBSERVED_DEMAND",

      label:
        "No observed demand",
    };
  }

  if (score >= 75) {
    return {
      level:
        "VERY_HIGH",

      label:
        "Very high demand",
    };
  }

  if (score >= 50) {
    return {
      level:
        "HIGH",

      label:
        "High demand",
    };
  }

  if (score >= 25) {
    return {
      level:
        "MODERATE",

      label:
        "Moderate demand",
    };
  }

  return {
    level:
      "LOW",

    label:
      "Low observed demand",
  };
};


/**
 * ============================================================
 * BUILD LISTING DEMAND SIGNALS
 * ============================================================
 */

const buildListingDemandSignals = ({
  listing,
} = {}) => {
  const signals = [];

  const views =
    safeNumber(
      listing?.views
    );

  const uniqueViewers =
    safeNumber(
      listing?.uniqueViewers
    );

  const engagementActions =
    safeNumber(
      listing?.engagementActions
    );

  const offersReceived =
    safeNumber(
      listing?.offersReceived
    );

  const acceptedOffers =
    safeNumber(
      listing?.acceptedOffers
    );

  const completedTrades =
    safeNumber(
      listing?.completedTrades
    );

  if (views > 0) {
    signals.push(
      "GENERATING_TRAFFIC"
    );
  }

  if (uniqueViewers > 0) {
    signals.push(
      "ATTRACTING_UNIQUE_VIEWERS"
    );
  }

  if (engagementActions > 0) {
    signals.push(
      "GENERATING_ENGAGEMENT"
    );
  }

  if (offersReceived > 0) {
    signals.push(
      "GENERATING_OFFERS"
    );
  }

  if (acceptedOffers > 0) {
    signals.push(
      "GENERATING_ACCEPTED_OFFERS"
    );
  }

  if (completedTrades > 0) {
    signals.push(
      "GENERATING_COMPLETED_TRADES"
    );
  }

  if (
    views > 0 &&
    engagementActions > 0 &&
    offersReceived === 0
  ) {
    signals.push(
      "HIGH_INTEREST_NO_OFFERS"
    );
  }

  if (
    offersReceived > 0 &&
    acceptedOffers === 0
  ) {
    signals.push(
      "DEMAND_WITHOUT_ACCEPTANCE"
    );
  }

  if (
    acceptedOffers > 0 &&
    completedTrades === 0
  ) {
    signals.push(
      "ACCEPTED_DEMAND_WITHOUT_COMPLETION"
    );
  }

  if (
    offersReceived > 0 &&
    views === 0
  ) {
    signals.push(
      "DEMAND_WITH_LIMITED_OBSERVED_TRAFFIC"
    );
  }

  return signals;
};


/**
 * ============================================================
 * BUILD LISTING DEMAND RECOMMENDATIONS
 * ============================================================
 */

const buildListingDemandRecommendations = ({
  listing,
  demand,
  signals = [],
} = {}) => {
  const recommendations = [];

  const signalSet =
    new Set(
      signals
    );

  if (
    demand?.classification
      ?.level ===
    "NO_OBSERVED_DEMAND"
  ) {
    recommendations.push({
      code:
        "IMPROVE_DISCOVERABILITY",

      priority:
        "HIGH",

      title:
        "Improve listing discoverability",

      message:
        "This listing has no observed demand in the selected period. Review its title, images, description and marketplace visibility.",
    });
  }

  if (
    signalSet.has(
      "GENERATING_TRAFFIC"
    ) &&
    !signalSet.has(
      "GENERATING_ENGAGEMENT"
    )
  ) {
    recommendations.push({
      code:
        "IMPROVE_LISTING_APPEAL",

      priority:
        "HIGH",

      title:
        "Improve listing appeal",

      message:
        "The listing is receiving traffic but little observable engagement. Strengthen the presentation, images and item description.",
    });
  }

  if (
    signalSet.has(
      "HIGH_INTEREST_NO_OFFERS"
    )
  ) {
    recommendations.push({
      code:
        "TURN_INTEREST_INTO_OFFERS",

      priority:
        "HIGH",

      title:
        "Turn interest into offers",

      message:
        "People are interacting with this listing but are not sending offers. Review exchange expectations, item details and the value proposition.",
    });
  }

  if (
    signalSet.has(
      "DEMAND_WITHOUT_ACCEPTANCE"
    )
  ) {
    recommendations.push({
      code:
        "REVIEW_OFFER_FIT",

      priority:
        "MEDIUM",

      title:
        "Review incoming offer fit",

      message:
        "The listing is generating offers but none are currently accepted. Review desired exchanges and listing expectations.",
    });
  }

  if (
    signalSet.has(
      "ACCEPTED_DEMAND_WITHOUT_COMPLETION"
    )
  ) {
    recommendations.push({
      code:
        "IMPROVE_TRADE_COMPLETION",

      priority:
        "HIGH",

      title:
        "Improve trade completion",

      message:
        "Accepted demand exists, but it has not converted into completed trades during the selected period.",
    });
  }

  if (
    demand?.classification
      ?.level ===
      "VERY_HIGH" &&
    safeNumber(
      listing?.completedTrades
    ) > 0
  ) {
    recommendations.push({
      code:
        "PRESERVE_HIGH_DEMAND_LISTING",

      priority:
        "LOW",

      title:
        "Preserve what is working",

      message:
        "This is one of your strongest observed-demand listings. Preserve the presentation and exchange strategy that is producing results.",
    });
  }

  return recommendations;
};


/**
 * ============================================================
 * BUILD DEMAND DISTRIBUTION
 * ============================================================
 */

const buildDemandDistribution = (
  listings = []
) => {
  const distribution = {
    VERY_HIGH: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
    NO_OBSERVED_DEMAND: 0,
  };

  for (
    const listing of listings
  ) {
    const level =
      listing?.demand
        ?.classification
        ?.level;

    if (
      Object.prototype.hasOwnProperty.call(
        distribution,
        level
      )
    ) {
      distribution[level] += 1;
    }
  }

  return distribution;
};


/**
 * ============================================================
 * DEMAND TREND BUCKET KEY
 * ============================================================
 *
 * Demand Intelligence uses:
 *
 * <= 31 days  -> daily trend
 * > 31 days   -> weekly trend
 *
 * This prevents 90/365-day Business Pro responses from
 * returning hundreds of unnecessarily granular points.
 * ============================================================
 */

const getDemandTrendBucket = (
  date,
  granularity
) => {
  const normalized =
    startOfDay(
      new Date(date)
    );

  if (
    granularity === "DAILY"
  ) {
    return formatDateKey(
      normalized
    );
  }

  /**
   * Monday-based week.
   */

  const day =
    normalized.getDay();

  const offset =
    day === 0
      ? -6
      : 1 - day;

  normalized.setDate(
    normalized.getDate() +
      offset
  );

  return formatDateKey(
    normalized
  );
};


/**
 * ============================================================
 * BUILD DEMAND TRENDS
 * ============================================================
 *
 * Historical Business Pro demand trend.
 *
 * IMPORTANT:
 *
 * This trend intentionally uses RAW OBSERVED demand signals.
 *
 * It does NOT recalculate the relative 0-100 Demand Score for
 * every historical bucket because that would make each bucket
 * relative to a different denominator and therefore unsuitable
 * for direct historical comparison.
 *
 * Trend signals:
 *
 * - listing views
 * - unique viewers
 * - engagement actions
 * - offers received
 * - accepted offers
 * - completed trades
 *
 * ============================================================
 */

const buildDemandTrends =
  async ({
    businessId,
    userId,
    start,
    end,
    days,
  }) => {
    const granularity =
      safeNumber(days) <= 31
        ? "DAILY"
        : "WEEKLY";

    /**
     * --------------------------------------------------------
     * Fetch canonical historical signals
     * --------------------------------------------------------
     */

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
              visitorKey: true,
              visitorUserId:
                true,
              createdAt: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          }
        ),

        prisma.offer.findMany({
          where: {
            receiverId:
              userId,

            createdAt: {
              gte: start,
              lte: end,
            },
          },

          select: {
            status: true,
            createdAt: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        }),

        prisma.trade.findMany({
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

            offer: {
              select: {
                receiverId:
                  true,
              },
            },
          },

          orderBy: {
            completedAt:
              "asc",
          },
        }),
      ]);

    /**
     * --------------------------------------------------------
     * Initialize trend buckets
     * --------------------------------------------------------
     */

    const bucketMap =
      new Map();

    const cursor =
      startOfDay(start);

    const finalDay =
      startOfDay(end);

    while (
      cursor <= finalDay
    ) {
      const key =
        getDemandTrendBucket(
          cursor,
          granularity
        );

      if (
        !bucketMap.has(key)
      ) {
        bucketMap.set(
          key,
          {
            period: key,

            views: 0,

            uniqueViewers: 0,

            engagementActions:
              0,

            offersReceived: 0,

            acceptedOffers: 0,

            completedTrades: 0,

            /**
             * Internal only.
             *
             * Removed before returning.
             */
            _visitors:
              new Set(),
          }
        );
      }

      cursor.setDate(
        cursor.getDate() + 1
      );
    }

    /**
     * --------------------------------------------------------
     * Analytics events
     * --------------------------------------------------------
     */

    for (
      const event of events
    ) {
      const key =
        getDemandTrendBucket(
          event.createdAt,
          granularity
        );

      const bucket =
        bucketMap.get(key);

      if (!bucket) {
        continue;
      }

      if (
        event.type ===
        ANALYTICS_EVENT_TYPES
          .LISTING_VIEW
      ) {
        bucket.views += 1;
      }

      if (
        event.type ===
          ANALYTICS_EVENT_TYPES
            .CONTACT_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .WEBSITE_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .PHONE_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .LISTING_SHARE
      ) {
        bucket.engagementActions +=
          1;
      }

      const visitorIdentity =
        event.visitorKey ||
        (
          event.visitorUserId
            ? `user:${event.visitorUserId}`
            : null
        );

      if (visitorIdentity) {
        bucket._visitors.add(
          visitorIdentity
        );
      }
    }

    /**
     * --------------------------------------------------------
     * Offers
     * --------------------------------------------------------
     *
     * acceptedOffers follows the same current-status model
     * already used elsewhere in this analytics service.
     *
     * We do NOT invent an acceptedAt timestamp.
     */

    for (
      const offer of offers
    ) {
      const key =
        getDemandTrendBucket(
          offer.createdAt,
          granularity
        );

      const bucket =
        bucketMap.get(key);

      if (!bucket) {
        continue;
      }

      bucket.offersReceived +=
        1;

      if (
        offer.status ===
        "ACCEPTED"
      ) {
        bucket.acceptedOffers +=
          1;
      }
    }

    /**
     * --------------------------------------------------------
     * Completed trades
     * --------------------------------------------------------
     *
     * Count only trades attributable to listings for which the
     * business was the offer receiver.
     */

    for (
      const trade of
      completedTrades
    ) {
      if (
        trade.offer
          ?.receiverId !==
        userId
      ) {
        continue;
      }

      if (!trade.completedAt) {
        continue;
      }

      const key =
        getDemandTrendBucket(
          trade.completedAt,
          granularity
        );

      const bucket =
        bucketMap.get(key);

      if (!bucket) {
        continue;
      }

      bucket.completedTrades +=
        1;
    }

    /**
     * --------------------------------------------------------
     * Public trend output
     * --------------------------------------------------------
     */

    const points =
      Array.from(
        bucketMap.values()
      )
        .sort(
          (a, b) =>
            a.period.localeCompare(
              b.period
            )
        )
        .map(
          (bucket) => ({
            period:
              bucket.period,

            views:
              bucket.views,

            uniqueViewers:
              bucket._visitors.size,

            engagementActions:
              bucket
                .engagementActions,

            offersReceived:
              bucket
                .offersReceived,

            acceptedOffers:
              bucket
                .acceptedOffers,

            completedTrades:
              bucket
                .completedTrades,

            engagementRate:
              percentage(
                bucket
                  .engagementActions,
                bucket.views
              ),

            viewToOfferRate:
              percentage(
                bucket
                  .offersReceived,
                bucket.views
              ),

            offerAcceptanceRate:
              percentage(
                bucket
                  .acceptedOffers,
                bucket
                  .offersReceived
              ),

            viewToTradeRate:
              percentage(
                bucket
                  .completedTrades,
                bucket.views
              ),
          })
        );

    /**
     * --------------------------------------------------------
     * Overall trend direction
     * --------------------------------------------------------
     *
     * Compare the first half of the selected period against
     * the second half using raw demand activity.
     *
     * This is descriptive—not a marketplace benchmark.
     */

    const midpoint =
      Math.ceil(
        points.length / 2
      );

    const firstHalf =
      points.slice(
        0,
        midpoint
      );

    const secondHalf =
      points.slice(
        midpoint
      );

    const sumDemandActivity =
      (rows) =>
        rows.reduce(
          (
            total,
            row
          ) =>
            total +
            safeNumber(
              row.views
            ) +
            safeNumber(
              row
                .engagementActions
            ) +
            safeNumber(
              row.offersReceived
            ),
          0
        );

    const previousActivity =
      sumDemandActivity(
        firstHalf
      );

    const recentActivity =
      sumDemandActivity(
        secondHalf
      );

    let direction =
      "STABLE";

    if (
      previousActivity === 0 &&
      recentActivity > 0
    ) {
      direction =
        "EMERGING";
    } else if (
      previousActivity > 0
    ) {
      const changeRate =
        percentage(
          recentActivity -
            previousActivity,
          previousActivity
        );

      if (changeRate > 0) {
        direction =
          "INCREASING";
      } else if (
        changeRate < 0
      ) {
        direction =
          "DECREASING";
      }
    }

    const activityChangeRate =
      previousActivity > 0
        ? round(
            (
              (
                recentActivity -
                previousActivity
              ) /
              previousActivity
            ) *
              100
          )
        : recentActivity > 0
          ? 100
          : 0;

    return {
      granularity,

      direction,

      previousActivity,

      recentActivity,

      activityChangeRate,

      points,
    };
  };


/**
 * ============================================================
 * BUILD EMERGING DEMAND
 * ============================================================
 *
 * Identifies listings whose recent demand activity is stronger
 * than their earlier activity within the SAME selected window.
 *
 * We deliberately compare observed signals rather than using
 * arbitrary "good/bad" marketplace thresholds.
 *
 * ============================================================
 */

const buildEmergingDemand =
  async ({
    businessId,
    userId,
    start,
    end,
    demandListings = [],
  }) => {
    const totalDuration =
      end.getTime() -
      start.getTime();

    if (
      totalDuration <= 0 ||
      demandListings.length ===
        0
    ) {
      return [];
    }

    const midpoint =
      new Date(
        start.getTime() +
          totalDuration / 2
      );

    /**
     * --------------------------------------------------------
     * Fetch listing-level demand signals once
     * --------------------------------------------------------
     */

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

              listingId: {
                not: null,
              },

              createdAt: {
                gte: start,
                lte: end,
              },
            },

            select: {
              listingId: true,
              type: true,
              createdAt: true,
            },
          }
        ),

        prisma.offer.findMany({
          where: {
            receiverId:
              userId,

            createdAt: {
              gte: start,
              lte: end,
            },
          },

          select: {
            requestedListingId:
              true,
            createdAt: true,
          },
        }),

        prisma.trade.findMany({
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

            offer: {
              select: {
                receiverId:
                  true,

                requestedListingId:
                  true,
              },
            },
          },
        }),
      ]);

    /**
     * --------------------------------------------------------
     * Initialize listing activity
     * --------------------------------------------------------
     */

    const activityMap =
      new Map();

    for (
      const listing of
      demandListings
    ) {
      activityMap.set(
        listing.id,
        {
          previous: {
            views: 0,
            engagementActions:
              0,
            offersReceived: 0,
            completedTrades: 0,
          },

          recent: {
            views: 0,
            engagementActions:
              0,
            offersReceived: 0,
            completedTrades: 0,
          },
        }
      );
    }

    const resolvePeriod =
      (date) =>
        new Date(date) <
        midpoint
          ? "previous"
          : "recent";

    /**
     * --------------------------------------------------------
     * Events
     * --------------------------------------------------------
     */

    for (
      const event of events
    ) {
      const activity =
        activityMap.get(
          event.listingId
        );

      if (!activity) {
        continue;
      }

      const period =
        resolvePeriod(
          event.createdAt
        );

      if (
        event.type ===
        ANALYTICS_EVENT_TYPES
          .LISTING_VIEW
      ) {
        activity[
          period
        ].views += 1;
      }

      if (
        event.type ===
          ANALYTICS_EVENT_TYPES
            .CONTACT_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .WEBSITE_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .PHONE_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .LISTING_SHARE
      ) {
        activity[
          period
        ].engagementActions +=
          1;
      }
    }

    /**
     * --------------------------------------------------------
     * Offers
     * --------------------------------------------------------
     */

    for (
      const offer of offers
    ) {
      const activity =
        activityMap.get(
          offer
            .requestedListingId
        );

      if (!activity) {
        continue;
      }

      const period =
        resolvePeriod(
          offer.createdAt
        );

      activity[
        period
      ].offersReceived += 1;
    }

    /**
     * --------------------------------------------------------
     * Completed trades
     * --------------------------------------------------------
     */

    for (
      const trade of
      completedTrades
    ) {
      if (
        trade.offer
          ?.receiverId !==
        userId
      ) {
        continue;
      }

      const listingId =
        trade.offer
          ?.requestedListingId;

      const activity =
        activityMap.get(
          listingId
        );

      if (
        !activity ||
        !trade.completedAt
      ) {
        continue;
      }

      const period =
        resolvePeriod(
          trade.completedAt
        );

      activity[
        period
      ].completedTrades +=
        1;
    }

    /**
     * --------------------------------------------------------
     * Determine emerging listings
     * --------------------------------------------------------
     */

    const emerging = [];

    for (
      const listing of
      demandListings
    ) {
      const activity =
        activityMap.get(
          listing.id
        );

      if (!activity) {
        continue;
      }

      const previousActivity =
        safeNumber(
          activity.previous
            .views
        ) +
        safeNumber(
          activity.previous
            .engagementActions
        ) +
        safeNumber(
          activity.previous
            .offersReceived
        );

      const recentActivity =
        safeNumber(
          activity.recent.views
        ) +
        safeNumber(
          activity.recent
            .engagementActions
        ) +
        safeNumber(
          activity.recent
            .offersReceived
        );

      /**
       * No recent observed demand = not emerging.
       */

      if (
        recentActivity <= 0
      ) {
        continue;
      }

      /**
       * Emerging means:
       *
       * 1. New observed demand where there was none before, OR
       * 2. Recent demand activity exceeds earlier activity.
       */

      const isEmerging =
        (
          previousActivity ===
            0 &&
          recentActivity > 0
        ) ||
        recentActivity >
          previousActivity;

      if (!isEmerging) {
        continue;
      }

      const growthRate =
        previousActivity > 0
          ? round(
              (
                (
                  recentActivity -
                  previousActivity
                ) /
                previousActivity
              ) *
                100
            )
          : 100;

      emerging.push({
        id:
          listing.id,

        title:
          listing.title,

        category:
          listing.category,

        image:
          listing.image,

        demandScore:
          listing.demand
            .score,

        demandLevel:
          listing.demand
            .classification
            .level,

        previous: {
          ...activity.previous,

          activity:
            previousActivity,
        },

        recent: {
          ...activity.recent,

          activity:
            recentActivity,
        },

        growthRate,

        signal:
          previousActivity ===
            0
            ? "NEW_DEMAND"
            : "RISING_DEMAND",
      });
    }

    return emerging
      .sort(
        (a, b) => {
          if (
            b.growthRate !==
            a.growthRate
          ) {
            return (
              b.growthRate -
              a.growthRate
            );
          }

          return (
            b.recent.activity -
            a.recent.activity
          );
        }
      )
      .slice(
        0,
        5
      );
  };


/**
 * ============================================================
 * BUSINESS DEMAND INTELLIGENCE
 * ============================================================
 *
 * Main Business Pro demand-intelligence service.
 *
 * Entitlement enforcement remains in the controller.
 * ============================================================
 */

export const getBusinessDemandIntelligence = async ({
    businessId,
    days =
      DEFAULT_ANALYTICS_DAYS,
    startDate = null,
    endDate = null,
  } = {}) => {
    if (!businessId) {
      throw new Error(
        "Business ID is required for demand intelligence."
      );
    }

    /**
     * --------------------------------------------------------
     * Resolve canonical business
     * --------------------------------------------------------
     */

    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    /**
     * --------------------------------------------------------
     * Analytics window
     * --------------------------------------------------------
     */

    const window =
      buildAnalyticsWindow({
        days,
        startDate,
        endDate,
      });

    /**
     * --------------------------------------------------------
     * Reuse canonical listing analytics
     * --------------------------------------------------------
     */

    const listingPerformance =
      await getListingPerformance({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,
      });

    /**
     * --------------------------------------------------------
     * Empty business
     * --------------------------------------------------------
     */

    if (
      listingPerformance.length ===
      0
    ) {
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

        window: {
          start:
            window.start.toISOString(),

          end:
            window.end.toISOString(),

          days:
            window.days,
        },

        summary: {
          totalListings: 0,

          listingsWithDemand: 0,

          listingsWithoutDemand: 0,

          averageDemandScore: 0,

          strongestDemandScore: 0,

          totalViews: 0,

          totalUniqueViewers: 0,

          totalEngagementActions: 0,

          totalOffersReceived: 0,

          totalAcceptedOffers: 0,

          totalCompletedTrades: 0,
        },

        distribution: {
          VERY_HIGH: 0,
          HIGH: 0,
          MODERATE: 0,
          LOW: 0,
          NO_OBSERVED_DEMAND: 0,
        },

 demandOpportunities: [],

        demandTrends: {
          granularity:
            window.days <= 31
              ? "DAILY"
              : "WEEKLY",

          direction:
            "STABLE",

          previousActivity: 0,

          recentActivity: 0,

          activityChangeRate: 0,

          points: [],
        },

        listings: [],
      };
    }

    /**
     * --------------------------------------------------------
     * Determine strongest observed values
     * --------------------------------------------------------
     *
     * These maxima are business-relative only.
     */

    const maxima = {
      views:
        Math.max(
          0,
          ...listingPerformance.map(
            (listing) =>
              safeNumber(
                listing.views
              )
          )
        ),

      uniqueViewers:
        Math.max(
          0,
          ...listingPerformance.map(
            (listing) =>
              safeNumber(
                listing.uniqueViewers
              )
          )
        ),

      engagementActions:
        Math.max(
          0,
          ...listingPerformance.map(
            (listing) =>
              safeNumber(
                listing.engagementActions
              )
          )
        ),

      offersReceived:
        Math.max(
          0,
          ...listingPerformance.map(
            (listing) =>
              safeNumber(
                listing.offersReceived
              )
          )
        ),

      acceptedOffers:
        Math.max(
          0,
          ...listingPerformance.map(
            (listing) =>
              safeNumber(
                listing.acceptedOffers
              )
          )
        ),

      completedTrades:
        Math.max(
          0,
          ...listingPerformance.map(
            (listing) =>
              safeNumber(
                listing.completedTrades
              )
          )
        ),
    };

    /**
     * --------------------------------------------------------
     * Listing demand intelligence
     * --------------------------------------------------------
     */

    const demandListings =
      listingPerformance.map(
        (listing) => {
          const scoreResult =
            buildListingDemandScore({
              listing,
              maxima,
            });

          const classification =
            classifyListingDemand({
              demandScore:
                scoreResult.score,

              views:
                listing.views,

              engagementActions:
                listing.engagementActions,

              offersReceived:
                listing.offersReceived,

              completedTrades:
                listing.completedTrades,
            });

          const signals =
            buildListingDemandSignals({
              listing,
            });

          const demand = {
            score:
              scoreResult.score,

            classification,

            components:
              scoreResult.components,

            weights:
              scoreResult.weights,
          };

          const recommendations =
            buildListingDemandRecommendations({
              listing,
              demand,
              signals,
            });

          return {
            id:
              listing.id,

            title:
              listing.title,

            status:
              listing.status,

            estimatedValue:
              listing.estimatedValue,

            location:
              listing.location,

            category:
              listing.category,

            image:
              listing.image,

            createdAt:
              listing.createdAt,

            metrics: {
              views:
                safeNumber(
                  listing.views
                ),

              uniqueViewers:
                safeNumber(
                  listing.uniqueViewers
                ),

              engagementActions:
                safeNumber(
                  listing.engagementActions
                ),

              offersReceived:
                safeNumber(
                  listing.offersReceived
                ),

              acceptedOffers:
                safeNumber(
                  listing.acceptedOffers
                ),

              completedTrades:
                safeNumber(
                  listing.completedTrades
                ),

              engagementRate:
                safeNumber(
                  listing.engagementRate
                ),

              viewToOfferRate:
                safeNumber(
                  listing.viewToOfferRate
                ),

              offerAcceptanceRate:
                safeNumber(
                  listing.offerAcceptanceRate
                ),

              viewToTradeRate:
                safeNumber(
                  listing.viewToTradeRate
                ),
            },

            demand,

            signals,

            recommendations,
          };
        }
      );

    /**
     * --------------------------------------------------------
     * Totals
     * --------------------------------------------------------
     */

    const totals =
      demandListings.reduce(
        (
          result,
          listing
        ) => {
          result.views +=
            listing.metrics.views;

          result.uniqueViewers +=
            listing.metrics
              .uniqueViewers;

          result.engagementActions +=
            listing.metrics
              .engagementActions;

          result.offersReceived +=
            listing.metrics
              .offersReceived;

          result.acceptedOffers +=
            listing.metrics
              .acceptedOffers;

          result.completedTrades +=
            listing.metrics
              .completedTrades;

          return result;
        },
        {
          views: 0,
          uniqueViewers: 0,
          engagementActions: 0,
          offersReceived: 0,
          acceptedOffers: 0,
          completedTrades: 0,
        }
      );

    /**
     * --------------------------------------------------------
     * Demand distribution
     * --------------------------------------------------------
     */

    const distribution =
      buildDemandDistribution(
        demandListings
      );

    const listingsWithDemand =
      demandListings.filter(
        (listing) =>
          listing.demand
            .classification
            .level !==
          "NO_OBSERVED_DEMAND"
      ).length;

    const listingsWithoutDemand =
      demandListings.length -
      listingsWithDemand;

    const totalDemandScore =
      demandListings.reduce(
        (
          total,
          listing
        ) =>
          total +
          safeNumber(
            listing.demand.score
          ),
        0
      );

    const averageDemandScore =
      demandListings.length > 0
        ? round(
            totalDemandScore /
              demandListings.length
          )
        : 0;

    /**
     * --------------------------------------------------------
     * Strongest-demand listings
     * --------------------------------------------------------
     */

    const topDemandListings =
      [...demandListings]
        .filter(
          (listing) =>
            listing.demand
              .classification
              .level !==
            "NO_OBSERVED_DEMAND"
        )
        .sort(
          (a, b) => {
            if (
              b.demand.score !==
              a.demand.score
            ) {
              return (
                b.demand.score -
                a.demand.score
              );
            }

            if (
              b.metrics
                .offersReceived !==
              a.metrics
                .offersReceived
            ) {
              return (
                b.metrics
                  .offersReceived -
                a.metrics
                  .offersReceived
              );
            }

            return (
              b.metrics.views -
              a.metrics.views
            );
          }
        )
        .slice(
          0,
          5
        );

    /**
     * --------------------------------------------------------
     * High-interest / low-conversion listings
     * --------------------------------------------------------
     *
     * No arbitrary conversion-rate benchmark is used.
     *
     * These listings have observable interest but have not
     * progressed into completed trades.
     */

    const highInterestLowConversion =
      demandListings
        .filter(
          (listing) =>
            (
              listing.metrics
                .engagementActions >
                0 ||
              listing.metrics
                .offersReceived >
                0
            ) &&
            listing.metrics
              .completedTrades ===
              0
        )
        .sort(
          (a, b) =>
            b.demand.score -
            a.demand.score
        )
        .slice(
          0,
          5
        );

    /**
     * --------------------------------------------------------
     * Demand opportunities
     * --------------------------------------------------------
     *
     * Demand exists but the listing has not fully converted.
     */

 const demandOpportunities =
      demandListings
        .filter(
          (listing) =>
            listing.demand.score >
              0 &&
            listing.metrics
              .completedTrades ===
              0
        )
        .sort(
          (a, b) =>
            b.demand.score -
            a.demand.score
        )
        .slice(
          0,
          5
        );

    /**
     * --------------------------------------------------------
     * Emerging demand
     * --------------------------------------------------------
     */

    const emergingDemand =
      await buildEmergingDemand({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,

        demandListings,
      });

    /**
     * --------------------------------------------------------
     * Historical demand trends
     * --------------------------------------------------------
     */

    const demandTrends =
      await buildDemandTrends({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,

        days:
          window.days,
      });

    /**
     * --------------------------------------------------------
     * Final response
     * --------------------------------------------------------
     */

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

      window: {
        start:
          window.start.toISOString(),

        end:
          window.end.toISOString(),

        days:
          window.days,
      },

      summary: {
        totalListings:
          demandListings.length,

        listingsWithDemand,

        listingsWithoutDemand,

        averageDemandScore,

        strongestDemandScore:
          topDemandListings[0]
            ?.demand?.score ||
          0,

        totalViews:
          totals.views,

        /**
         * IMPORTANT:
         *
         * This is a sum of per-listing unique viewers.
         * The same visitor may appear on multiple listings.
         */
        summedListingUniqueViewers:
          totals.uniqueViewers,

        totalEngagementActions:
          totals.engagementActions,

        totalOffersReceived:
          totals.offersReceived,

        totalAcceptedOffers:
          totals.acceptedOffers,

        totalCompletedTrades:
          totals.completedTrades,
      },

      distribution,

  topDemandListings,

      emergingDemand,

      highInterestLowConversion,

      demandOpportunities,

      demandTrends,

      listings:
        [...demandListings].sort(
          (a, b) =>
            b.demand.score -
            a.demand.score
        ),
    };
  };

  /**
 * ============================================================
 * CATEGORY BENCHMARK MARKETPLACE AGGREGATION
 * ============================================================
 *
 * Builds privacy-safe aggregate marketplace statistics for one
 * category.
 *
 * IMPORTANT:
 *
 * - requestingBusinessId is excluded.
 * - requestingUserId is excluded.
 * - only ACTIVE businesses contribute.
 * - individual competitor analytics are never returned.
 * - benchmark output is suppressed when the sample is too small.
 *
 * ============================================================
 */

const getCategoryMarketplaceBenchmark = async ({
    categoryId,
    requestingBusinessId,
    requestingUserId,
    start,
    end,
  }) => {
    if (!categoryId) {
      return null;
    }

    /**
     * --------------------------------------------------------
     * 1. Find eligible external listings
     * --------------------------------------------------------
     */

   const listings =
  await prisma.listing.findMany({
    where: {
      categoryId,

      /**
       * Only listings currently visible/usable in the
       * marketplace should contribute to category benchmarks.
       */
      status: {
        in: [
          "ACTIVE",
          "RESERVED",
          "TRADED",
        ],
      },

      /**
       * Never benchmark the requesting business against itself.
       */
      userId: {
        not:
          requestingUserId,
      },

      /**
       * Only ACTIVE business accounts contribute.
       */
      user: {
        businessProfile: {
          is: {
            status:
              "ACTIVE",

            id: {
              not:
                requestingBusinessId,
            },
          },
        },
      },
    },

        select: {
          id: true,

          userId: true,

          category: {
            select: {
              id: true,
              name: true,
            },
          },

          user: {
            select: {
              businessProfile: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

    /**
     * --------------------------------------------------------
     * 2. Determine privacy sample size
     * --------------------------------------------------------
     */

    const contributingBusinessIds =
      new Set();

    for (
      const listing of listings
    ) {
      const externalBusinessId =
        listing.user
          ?.businessProfile
          ?.id;

      if (externalBusinessId) {
        contributingBusinessIds.add(
          externalBusinessId
        );
      }
    }

    const businessCount =
      contributingBusinessIds.size;

    const listingCount =
      listings.length;

    const category =
      listings[0]?.category ||
      null;

    /**
     * --------------------------------------------------------
     * 3. Suppress small samples
     * --------------------------------------------------------
     */

    if (
      businessCount <
        CATEGORY_BENCHMARK_MIN_BUSINESSES ||
      listingCount <
        CATEGORY_BENCHMARK_MIN_LISTINGS
    ) {
      return {
        available: false,

        reason:
          "INSUFFICIENT_SAMPLE",

        category,

        sample: {
          /**
           * Do not expose exact small-sample counts.
           *
           * Otherwise a business may infer competitor activity
           * from very small categories.
           */

          minimumBusinesses:
            CATEGORY_BENCHMARK_MIN_BUSINESSES,

          minimumListings:
            CATEGORY_BENCHMARK_MIN_LISTINGS,
        },

        benchmark: null,
      };
    }

    const listingIds =
      listings.map(
        (listing) =>
          listing.id
      );

    const externalUserIds =
      [
        ...new Set(
          listings.map(
            (listing) =>
              listing.userId
          )
        ),
      ];

    /**
     * --------------------------------------------------------
     * 4. Marketplace listing events
     * --------------------------------------------------------
     */

    const analyticsEvents =
      await prisma.businessAnalyticsEvent.findMany(
        {
          where: {
            listingId: {
              in:
                listingIds,
            },

            createdAt: {
              gte: start,
              lte: end,
            },
          },

          select: {
            listingId:
              true,

            type:
              true,

            visitorKey:
              true,

            visitorUserId:
              true,
          },
        }
      );

    /**
     * --------------------------------------------------------
     * 5. Offers received by eligible external listings
     * --------------------------------------------------------
     */

    const offers =
      await prisma.offer.findMany({
        where: {
          receiverId: {
            in:
              externalUserIds,
          },

          requestedListingId: {
            in:
              listingIds,
          },

          createdAt: {
            gte: start,
            lte: end,
          },
        },

        select: {
          id: true,

          status: true,

          receiverId:
            true,

          requestedListingId:
            true,
        },
      });

    /**
     * --------------------------------------------------------
     * 6. Completed trades attributable to those listings
     * --------------------------------------------------------
     */

    const completedTrades =
      await prisma.trade.findMany({
        where: {
          status:
            "COMPLETED",

          completedAt: {
            gte: start,
            lte: end,
          },

          offer: {
            requestedListingId: {
              in:
                listingIds,
            },

            receiverId: {
              in:
                externalUserIds,
            },
          },
        },

        select: {
          id: true,

          offer: {
            select: {
              receiverId:
                true,

              requestedListingId:
                true,
            },
          },
        },
      });

    /**
     * --------------------------------------------------------
     * 7. Aggregate traffic and engagement
     * --------------------------------------------------------
     */

    let views = 0;

    let engagementActions =
      0;

    const uniqueVisitors =
      new Set();

    for (
      const event of
      analyticsEvents
    ) {
      if (
        event.type ===
        ANALYTICS_EVENT_TYPES
          .LISTING_VIEW
      ) {
        views += 1;
      }

      if (
        event.type ===
          ANALYTICS_EVENT_TYPES
            .CONTACT_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .WEBSITE_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .PHONE_CLICK ||
        event.type ===
          ANALYTICS_EVENT_TYPES
            .LISTING_SHARE
      ) {
        engagementActions +=
          1;
      }

      const visitorIdentity =
        event.visitorKey ||
        (
          event.visitorUserId
            ? `user:${event.visitorUserId}`
            : null
        );

      if (visitorIdentity) {
        uniqueVisitors.add(
          visitorIdentity
        );
      }
    }

    /**
     * --------------------------------------------------------
     * 8. Aggregate offer metrics
     * --------------------------------------------------------
     */

    const offersReceived =
      offers.length;

    const acceptedOffers =
      offers.filter(
        (offer) =>
          offer.status ===
          "ACCEPTED"
      ).length;

    const completedTradeCount =
      completedTrades.length;

    /**
     * --------------------------------------------------------
     * 9. Per-listing benchmark averages
     * --------------------------------------------------------
     */

    const averageViewsPerListing =
      listingCount > 0
        ? round(
            views /
              listingCount
          )
        : 0;

    const averageUniqueViewersPerListing =
      listingCount > 0
        ? round(
            uniqueVisitors.size /
              listingCount
          )
        : 0;

    const averageEngagementActionsPerListing =
      listingCount > 0
        ? round(
            engagementActions /
              listingCount
          )
        : 0;

    const averageOffersPerListing =
      listingCount > 0
        ? round(
            offersReceived /
              listingCount
          )
        : 0;

    const averageCompletedTradesPerListing =
      listingCount > 0
        ? round(
            completedTradeCount /
              listingCount
          )
        : 0;

    /**
     * --------------------------------------------------------
     * 10. Category conversion benchmarks
     * --------------------------------------------------------
     */

    const engagementRate =
      percentage(
        engagementActions,
        views
      );

    const viewToOfferRate =
      percentage(
        offersReceived,
        views
      );

    const offerAcceptanceRate =
      percentage(
        acceptedOffers,
        offersReceived
      );

    const offerToTradeRate =
      percentage(
        completedTradeCount,
        offersReceived
      );

    const viewToTradeRate =
      percentage(
        completedTradeCount,
        views
      );

    /**
     * --------------------------------------------------------
     * 11. Privacy-safe aggregate response
     * --------------------------------------------------------
     */

    return {
      available: true,

      reason: null,

      category,

      sample: {
        /**
         * At this point the privacy threshold has been met, so
         * aggregate sample sizes may safely be returned.
         */

        businesses:
          businessCount,

        listings:
          listingCount,
      },

      benchmark: {
        traffic: {
          totalViews:
            views,

          averageViewsPerListing,

          averageUniqueViewersPerListing,
        },

        engagement: {
          totalActions:
            engagementActions,

          averageActionsPerListing:
            averageEngagementActionsPerListing,

          engagementRate,
        },

        offers: {
          totalReceived:
            offersReceived,

          averagePerListing:
            averageOffersPerListing,

          offerAcceptanceRate,
        },

        trades: {
          completed:
            completedTradeCount,

          averageCompletedPerListing:
            averageCompletedTradesPerListing,
        },

        conversions: {
          viewToOfferRate,

          offerAcceptanceRate,

          offerToTradeRate,

          viewToTradeRate,
        },
      },
    };
  };


  /**
 * ============================================================
 * CATEGORY BENCHMARK COMPARISON
 * ============================================================
 *
 * Compares one business/listing metric against the external
 * category benchmark.
 *
 * A tolerance band prevents tiny differences from being
 * presented as meaningful competitive advantages/disadvantages.
 *
 * ±10% of the category benchmark = NEAR_CATEGORY
 *
 * ============================================================
 */

const compareToCategoryBenchmark = (
  businessValue,
  categoryValue
) => {
  const own =
    safeNumber(
      businessValue
    );

  const benchmark =
    safeNumber(
      categoryValue
    );

  /**
   * No useful external baseline.
   */
  if (benchmark <= 0) {
    if (own > 0) {
      return {
        position:
          "ABOVE_CATEGORY",

        difference:
          round(own),

        percentageDifference:
          null,
      };
    }

    return {
      position:
        "INSUFFICIENT_DATA",

      difference: 0,

      percentageDifference:
        null,
    };
  }

  const difference =
    own - benchmark;

  const percentageDifference =
    round(
      (
        difference /
        benchmark
      ) * 100
    );

  /**
   * ±10% relative tolerance.
   */
  if (
    Math.abs(
      percentageDifference
    ) <= 10
  ) {
    return {
      position:
        "NEAR_CATEGORY",

      difference:
        round(
          difference
        ),

      percentageDifference,
    };
  }

  return {
    position:
      percentageDifference > 0
        ? "ABOVE_CATEGORY"
        : "BELOW_CATEGORY",

    difference:
      round(
        difference
      ),

    percentageDifference,
  };
};


/**
 * ============================================================
 * BUILD LISTING CATEGORY COMPARISON
 * ============================================================
 */

const buildListingCategoryComparison = ({
  listing,
  benchmark,
}) => {
  if (
    !benchmark?.available ||
    !benchmark?.benchmark
  ) {
    return {
      available: false,

      reason:
        benchmark?.reason ||
        "BENCHMARK_UNAVAILABLE",

      sample:
        benchmark?.sample ||
        null,

      metrics: null,

      overallPosition:
        "INSUFFICIENT_DATA",
    };
  }

  const metrics =
    listing?.metrics || {};

  const rates =
    listing?.rates || {};

  const external =
    benchmark.benchmark;

  const comparisons = {
    views: {
      business:
        safeNumber(
          metrics.views
        ),

      category:
        safeNumber(
          external.traffic
            .averageViewsPerListing
        ),

      ...compareToCategoryBenchmark(
        metrics.views,

        external.traffic
          .averageViewsPerListing
      ),
    },

    engagementActions: {
      business:
        safeNumber(
          metrics
            .engagementActions
        ),

      category:
        safeNumber(
          external.engagement
            .averageActionsPerListing
        ),

      ...compareToCategoryBenchmark(
        metrics
          .engagementActions,

        external.engagement
          .averageActionsPerListing
      ),
    },

    offersReceived: {
      business:
        safeNumber(
          metrics
            .offersReceived
        ),

      category:
        safeNumber(
          external.offers
            .averagePerListing
        ),

      ...compareToCategoryBenchmark(
        metrics
          .offersReceived,

        external.offers
          .averagePerListing
      ),
    },

    completedTrades: {
      business:
        safeNumber(
          metrics
            .completedTrades
        ),

      category:
        safeNumber(
          external.trades
            .averageCompletedPerListing
        ),

      ...compareToCategoryBenchmark(
        metrics
          .completedTrades,

        external.trades
          .averageCompletedPerListing
      ),
    },

    engagementRate: {
      business:
        safeNumber(
          rates.engagementRate
        ),

      category:
        safeNumber(
          external.engagement
            .engagementRate
        ),

      ...compareToCategoryBenchmark(
        rates.engagementRate,

        external.engagement
          .engagementRate
      ),
    },

    viewToOfferRate: {
      business:
        safeNumber(
          rates.viewToOfferRate
        ),

      category:
        safeNumber(
          external.conversions
            .viewToOfferRate
        ),

      ...compareToCategoryBenchmark(
        rates.viewToOfferRate,

        external.conversions
          .viewToOfferRate
      ),
    },

    offerAcceptanceRate: {
      business:
        safeNumber(
          rates.offerAcceptanceRate
        ),

      category:
        safeNumber(
          external.conversions
            .offerAcceptanceRate
        ),

      ...compareToCategoryBenchmark(
        rates.offerAcceptanceRate,

        external.conversions
          .offerAcceptanceRate
      ),
    },

    offerToTradeRate: {
      business:
        safeNumber(
          rates.offerToTradeRate
        ),

      category:
        safeNumber(
          external.conversions
            .offerToTradeRate
        ),

      ...compareToCategoryBenchmark(
        rates.offerToTradeRate,

        external.conversions
          .offerToTradeRate
      ),
    },

    viewToTradeRate: {
      business:
        safeNumber(
          rates.viewToTradeRate
        ),

      category:
        safeNumber(
          external.conversions
            .viewToTradeRate
        ),

      ...compareToCategoryBenchmark(
        rates.viewToTradeRate,

        external.conversions
          .viewToTradeRate
      ),
    },
  };

  /**
   * --------------------------------------------------------
   * Overall benchmark position
   * --------------------------------------------------------
   *
   * We use the most commercially useful conversion metrics,
   * rather than raw traffic alone.
   */

  const strategicPositions = [
    comparisons
      .viewToOfferRate
      .position,

    comparisons
      .offerAcceptanceRate
      .position,

    comparisons
      .offerToTradeRate
      .position,

    comparisons
      .viewToTradeRate
      .position,
  ];

  const above =
    strategicPositions.filter(
      (position) =>
        position ===
        "ABOVE_CATEGORY"
    ).length;

  const below =
    strategicPositions.filter(
      (position) =>
        position ===
        "BELOW_CATEGORY"
    ).length;

  let overallPosition =
    "NEAR_CATEGORY";

  if (above > below) {
    overallPosition =
      "ABOVE_CATEGORY";
  } else if (
    below > above
  ) {
    overallPosition =
      "BELOW_CATEGORY";
  }

  return {
    available: true,

    reason: null,

    sample:
      benchmark.sample,

    metrics:
      comparisons,

    overallPosition,
  };
};


/**
 * ============================================================
 * CATEGORY BENCHMARK OPPORTUNITIES
 * ============================================================
 */

const detectCategoryBenchmarkOpportunities = ({
  listing,
  comparison,
}) => {
  if (
    !comparison?.available
  ) {
    return [];
  }

  const opportunities = [];

  const metrics =
    comparison.metrics;

  /**
   * Strong conversion but weak visibility.
   */
  if (
    metrics.views.position ===
      "BELOW_CATEGORY" &&
    (
      metrics.viewToOfferRate
        .position ===
        "ABOVE_CATEGORY" ||
      metrics.viewToTradeRate
        .position ===
        "ABOVE_CATEGORY"
    )
  ) {
    opportunities.push({
      code:
        "STRONG_CONVERSION_LOW_VISIBILITY",

      title:
        "Strong conversion with low visibility",

      description:
        "This listing converts better than its category benchmark but receives less traffic than the category average.",

      action:
        "Consider increasing visibility through stronger presentation, sharing or promotion.",
    });
  }

  /**
   * Strong traffic but weak offer generation.
   */
  if (
    metrics.views.position ===
      "ABOVE_CATEGORY" &&
    metrics.viewToOfferRate
      .position ===
      "BELOW_CATEGORY"
  ) {
    opportunities.push({
      code:
        "HIGH_TRAFFIC_LOW_OFFER_CONVERSION",

      title:
        "Traffic is not becoming offers",

      description:
        "This listing receives stronger traffic than the category benchmark but converts fewer views into offers.",

      action:
        "Review the listing description, exchange expectations, value range and presentation.",
    });
  }

  /**
   * Offers are arriving but acceptance is weak.
   */
  if (
    metrics.offersReceived
      .position !==
      "BELOW_CATEGORY" &&
    metrics.offerAcceptanceRate
      .position ===
      "BELOW_CATEGORY"
  ) {
    opportunities.push({
      code:
        "OFFERS_BELOW_ACCEPTANCE_BENCHMARK",

      title:
        "Offer acceptance can improve",

      description:
        "The listing attracts offers but accepts them at a lower rate than comparable category activity.",

      action:
        "Review exchange expectations and whether received offers align with the listing's stated value.",
    });
  }

  /**
   * Strong interest but weak trade completion.
   */
  if (
    metrics.viewToOfferRate
      .position !==
      "BELOW_CATEGORY" &&
    metrics.offerToTradeRate
      .position ===
      "BELOW_CATEGORY"
  ) {
    opportunities.push({
      code:
        "INTEREST_NOT_REACHING_TRADE",

      title:
        "Interest is not reaching completed trades",

      description:
        "Offer generation is competitive, but completed-trade conversion is below the category benchmark.",

      action:
        "Review follow-up after offers are received and identify where trade completion is stalling.",
    });
  }

  /**
   * Strong listing.
   */
  if (
    comparison.overallPosition ===
      "ABOVE_CATEGORY"
  ) {
    opportunities.push({
      code:
        "CATEGORY_OUTPERFORMER",

      title:
        "Category outperformer",

      description:
        "This listing is outperforming its category benchmark across multiple conversion signals.",

      action:
        "Preserve what is working and consider increasing visibility while monitoring conversion quality.",
    });
  }

  return opportunities;
};


/**
 * ============================================================
 * CATEGORY BENCHMARK RECOMMENDATIONS
 * ============================================================
 */

const buildCategoryBenchmarkRecommendations = ({
  comparisons = [],
}) => {
  const recommendations =
    [];

  const allOpportunities =
    comparisons.flatMap(
      (item) =>
        item.opportunities ||
        []
    );

  const counts =
    new Map();

  for (
    const opportunity of
    allOpportunities
  ) {
    counts.set(
      opportunity.code,

      (
        counts.get(
          opportunity.code
        ) || 0
      ) + 1
    );
  }

  const addRecommendation =
    (
      code,
      title,
      description
    ) => {
      const affectedListings =
        counts.get(code) ||
        0;

      if (
        affectedListings <= 0
      ) {
        return;
      }

      recommendations.push({
        code,

        title,

        description,

        affectedListings,
      });
    };

  addRecommendation(
    "STRONG_CONVERSION_LOW_VISIBILITY",
    "Increase visibility on converting listings",
    "Some listings outperform their categories on conversion but receive below-category traffic. These may benefit from additional visibility."
  );

  addRecommendation(
    "HIGH_TRAFFIC_LOW_OFFER_CONVERSION",
    "Improve high-traffic listing conversion",
    "Some listings receive above-category traffic but generate offers below the category benchmark. Review presentation and exchange expectations."
  );

  addRecommendation(
    "OFFERS_BELOW_ACCEPTANCE_BENCHMARK",
    "Review offer acceptance patterns",
    "Some listings receive competitive offer activity but accept fewer offers than their category benchmark."
  );

  addRecommendation(
    "INTEREST_NOT_REACHING_TRADE",
    "Improve trade completion",
    "Some listings generate competitive marketplace interest but convert fewer offers into completed trades than their category benchmark."
  );

  addRecommendation(
    "CATEGORY_OUTPERFORMER",
    "Scale proven listings carefully",
    "Some listings outperform their category benchmarks. Consider increasing their visibility while monitoring whether conversion quality remains strong."
  );

  if (
    recommendations.length ===
      0
  ) {
    recommendations.push({
      code:
        "MONITOR_CATEGORY_PERFORMANCE",

      title:
        "Continue monitoring category performance",

      description:
        "No strong category benchmark opportunity is currently detected. Continue collecting marketplace activity before making major changes.",

      affectedListings:
        0,
    });
  }

  return recommendations;
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

export const getBusinessAnalytics = async ({
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
      thirtyDayPerformance,
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

        getThirtyDayPerformance({
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

      performance: thirtyDayPerformance,

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
    startDate = null,
    endDate = null,
  }) => {
    const analytics =
      await getBusinessAnalytics(
        {
          businessId,
          days,
          startDate,
          endDate,
          topListingLimit: 3,
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

/**
 * ============================================================
 * BUSINESS LISTING ANALYTICS
 * ============================================================
 */

export const getBusinessListingAnalytics = async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
    startDate = null,
    endDate = null,
     limit = 3,
}) => {
  const business =
    await getBusinessAnalyticsContext(
      businessId
    );

  const window =
  buildAnalyticsWindow({
    days,
    startDate,
    endDate,
  });

  const [
    summary,
    listingPerformance,
  ] =
    await Promise.all([
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
   * IMPORTANT:
   *
   * All Top Listing calculations use the same centralized
   * ranking algorithm.
   */
  const topListings =
    rankListingPerformance(
      listingPerformance,
      limit
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
 * BUSINESS TOP LISTING PERFORMANCE
 * ============================================================
 *
 * Dedicated Business Free Top Listing report.
 *
 * Used by:
 *
 * GET /api/business/me/analytics/top-listings
 *
 * Business Free:
 *
 * - Maximum 3 listings
 * - Maximum 30-day history enforced by controller
 * - Descriptive analytics only
 * ============================================================
 */

export const getBusinessTopListingPerformance =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
    startDate = null,
    endDate = null,
    limit = 3,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
    buildAnalyticsWindow({
        days,
        startDate,
        endDate,
    });

    const topListings =
      await getTopListings({
        businessId:
          business.id,

        userId:
          business.userId,

        start:
          window.start,

        end:
          window.end,

        limit,
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

      total:
        topListings.length,

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
    startDate = null,
    endDate = null,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
    buildAnalyticsWindow({
        days,
        startDate,
        endDate,
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
    startDate = null,
    endDate = null,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
    buildAnalyticsWindow({
        days,
        startDate,
        endDate,
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
/**
 * ============================================================
 * BUSINESS PROMOTION ANALYTICS
 * ============================================================
 *
 * Dedicated Business Free promotion analytics report.
 *
 * The controller remains responsible for enforcing the
 * Business Free maximum history of 30 days.
 * ============================================================
 */

export const getBusinessPromotionAnalytics =
  async ({
    businessId,
  days = DEFAULT_ANALYTICS_DAYS,
  startDate = null,
  endDate = null,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
    buildAnalyticsWindow({
        days,
        startDate,
        endDate,
    });

    const promotions =
      await getPromotionMetrics({
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



/**
 * ============================================================
 * BUSINESS 30-DAY PERFORMANCE
 * ============================================================
 */

export const getBusinessThirtyDayPerformance =
  async ({
    businessId,
    days = DEFAULT_ANALYTICS_DAYS,
    startDate = null,
    endDate = null,
  }) => {
    const business =
      await getBusinessAnalyticsContext(
        businessId
      );

    const window =
    buildAnalyticsWindow({
        days,
        startDate,
        endDate,
    });

    const performance =
      await getThirtyDayPerformance({
        businessId:
          business.id,

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

      performance,
    };
  };