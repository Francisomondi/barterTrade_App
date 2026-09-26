

import prisma from "../config/prisma.js";

import {
  getBusinessAnalytics,
  getBusinessAnalyticsOverview,
  getBusinessListingAnalytics,
  getBusinessOfferAnalytics,
  getBusinessTradeAnalytics,
  getBusinessThirtyDayPerformance,
  getBusinessPromotionAnalytics,
  DEFAULT_ANALYTICS_DAYS,
} from "../services/businessAnalyticsService.js";


/**
 * ============================================================
 * BUSINESS ANALYTICS CONTROLLER
 * ============================================================
 *
 * Security model:
 *
 * - All endpoints using this controller MUST be behind `protect`.
 * - The business is resolved from req.user.id.
 * - The client NEVER supplies a businessId.
 * - A user can only access analytics for their own business.
 * - Business analytics remain accessible to the owner when the
 *   business is ACTIVE, CLOSED, or SUSPENDED.
 *
 * Business status controls public storefront visibility.
 * It does not transfer analytics ownership.
 *
 * Business Free / Business Pro entitlement filtering is NOT
 * handled here yet. That comes in later Business Pro steps.
 * ============================================================
 */


/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

const parsePositiveInteger = (
  value,
  fallback
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};


const parseDays = (
  value
) => {
  const days =
    parsePositiveInteger(
      value,
      DEFAULT_ANALYTICS_DAYS
    );

  if (days === null) {
    return {
      valid: false,
      message:
        "days must be a positive integer.",
    };
  }

 if (
  days >
  DEFAULT_ANALYTICS_DAYS
) {
  return {
    valid: false,
    message:
      `Business Free analytics are limited to the last ${DEFAULT_ANALYTICS_DAYS} days.`,
  };
}

  return {
    valid: true,
    value: days,
  };
};


const parseLimit = (
  value,
  fallback = 3,
  maximum = 20
) => {
  const limit =
    parsePositiveInteger(
      value,
      fallback
    );

  if (limit === null) {
    return {
      valid: false,
      message:
        "limit must be a positive integer.",
    };
  }

  return {
    valid: true,
    value:
      Math.min(
        limit,
        maximum
      ),
  };
};


const parseOptionalDate = (
  value,
  fieldName
) => {
  if (!value) {
    return {
      valid: true,
      value: null,
    };
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return {
      valid: false,
      message:
        `${fieldName} must be a valid date.`,
    };
  }

  return {
    valid: true,
    value,
  };
};


/**
 * ============================================================
 * RESOLVE OWNER BUSINESS
 * ============================================================
 *
 * This is the key authorization boundary.
 *
 * We intentionally DO NOT accept:
 *
 *     req.params.businessId
 *     req.body.businessId
 *     req.query.businessId
 *
 * Analytics ownership always comes from the authenticated user.
 * ============================================================
 */

const getOwnerBusiness =
  async (userId) => {
    if (!userId) {
      return null;
    }

    return prisma.businessProfile.findUnique(
      {
        where: {
          userId,
        },

        select: {
          id: true,
          userId: true,
          businessName: true,
          slug: true,
          status: true,
          verificationStatus:
            true,
        },
      }
    );
  };


const requireOwnerBusiness =
  async (
    req,
    res
  ) => {
    const userId =
      req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });

      return null;
    }

    const business =
      await getOwnerBusiness(
        userId
      );

    if (!business) {
      res.status(404).json({
        success: false,
        message:
          "Business account not found.",
      });

      return null;
    }

    return business;
  };


/**
 * ============================================================
 * GET FULL BUSINESS ANALYTICS
 * ============================================================
 *
 * GET /api/business/me/analytics
 *
 * Query:
 *
 * ?days=30
 *
 * Later Business Pro:
 *
 * ?startDate=...
 * ?endDate=...
 *
 * For now the service supports custom windows internally,
 * but Free/Pro access policy will be added in later steps.
 * ============================================================
 */

export const getMyBusinessAnalytics =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      /**
       * We deliberately ignore custom startDate/endDate here
       * for the current Business Free API.
       *
       * Custom historical ranges will become a Business Pro
       * capability later.
       */

      const analytics =
        await getBusinessAnalytics(
          {
            businessId:
              business.id,

            days:
              daysResult.value,

            topListingLimit:
              3,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          customDateRange:
            false,

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS ANALYTICS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load business analytics.",
      });
    }
  };


/**
 * ============================================================
 * GET BUSINESS ANALYTICS OVERVIEW
 * ============================================================
 *
 * GET /api/business/me/analytics/overview
 *
 * Lightweight endpoint suitable for Business Dashboard.
 * ============================================================
 */

export const getMyBusinessAnalyticsOverview =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      const analytics =
        await getBusinessAnalyticsOverview(
          {
            businessId:
              business.id,

            days:
              daysResult.value,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS ANALYTICS OVERVIEW ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load business analytics overview.",
      });
    }
  };


/**
 * ============================================================
 * GET LISTING ANALYTICS
 * ============================================================
 *
 * GET /api/business/me/analytics/listings
 *
 * Query:
 *
 * ?days=30
 * ?limit=3
 * ============================================================
 */

export const getMyBusinessListingAnalytics =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      const limitResult =
        parseLimit(
          req.query.limit,
          3,
          20
        );

      if (
        !limitResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              limitResult.message,
          });
      }

      const analytics =
        await getBusinessListingAnalytics(
          {
            businessId:
              business.id,

            days:
              daysResult.value,

            limit:
              limitResult.value,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS LISTING ANALYTICS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load business listing analytics.",
      });
    }
  };


/**
 * ============================================================
 * GET PROMOTION ANALYTICS
 * ============================================================
 *
 * GET /api/business/me/analytics/promotions
 *
 * Basic promotion analytics remain available to Business Free.
 *
 * Advanced uplift / comparisons / recommendations are reserved
 * for later Business Pro analytics.
 * ============================================================
 */

export const getMyBusinessPromotionAnalytics =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      const analytics =
        await getBusinessPromotionAnalytics(
          {
            businessId:
              business.id,

            days:
              daysResult.value,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS PROMOTION ANALYTICS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load business promotion analytics.",
      });
    }
  };


/**
 * ============================================================
 * FUTURE CUSTOM RANGE VALIDATION
 * ============================================================
 *
 * Not exposed to Business Free yet.
 *
 * We keep this helper ready for Business Pro implementation
 * without enabling the feature prematurely.
 * ============================================================
 */

export const validateAnalyticsDateRange =
  (
    startDate,
    endDate
  ) => {
    const start =
      parseOptionalDate(
        startDate,
        "startDate"
      );

    if (!start.valid) {
      return start;
    }

    const end =
      parseOptionalDate(
        endDate,
        "endDate"
      );

    if (!end.valid) {
      return end;
    }

    return {
      valid: true,
      startDate:
        start.value,
      endDate:
        end.value,
    };
  };

  // UPDATE — server/src/controllers/businessAnalyticsController.js

/**
 * ============================================================
 * GET BASIC OFFER ANALYTICS
 * ============================================================
 *
 * GET /api/business/me/analytics/offers
 *
 * Business Free:
 * - maximum 30-day history
 * - offer status breakdown
 * - offer conversion rates
 * - listing-level offer performance
 * - most-offered listings
 * - daily offer activity
 * ============================================================
 */

export const getMyBusinessOfferAnalytics =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      const analytics =
        await getBusinessOfferAnalytics(
          {
            businessId:
              business.id,

            days:
              daysResult.value,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS OFFER ANALYTICS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load business offer analytics.",
      });
    }
  };

  // UPDATE — server/src/controllers/businessAnalyticsController.js

/**
 * ============================================================
 * GET BASIC TRADE ANALYTICS
 * ============================================================
 *
 * GET /api/business/me/analytics/trades
 *
 * Business Free:
 *
 * - maximum 30-day history
 * - trade status overview
 * - completed trades
 * - cancellation/dispute metrics
 * - basic trade values
 * - listing-level trade performance
 * - daily completed trade activity
 * - recent completed trades
 * ============================================================
 */

export const getMyBusinessTradeAnalytics =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      const analytics =
        await getBusinessTradeAnalytics(
          {
            businessId:
              business.id,

            days:
              daysResult.value,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS TRADE ANALYTICS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load business trade analytics.",
      });
    }
  };

  // UPDATE — server/src/controllers/businessAnalyticsController.js

/**
 * ============================================================
 * GET 30-DAY BUSINESS PERFORMANCE
 * ============================================================
 *
 * GET /api/business/me/analytics/performance
 *
 * Business Free:
 *
 * - maximum 30 days
 * - daily marketplace activity
 * - daily averages
 * - basic conversion indicators
 * - best-performing days
 * - chart-ready time series
 * ============================================================
 */

export const getMyBusinessThirtyDayPerformance =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const daysResult =
        parseDays(
          req.query.days
        );

      if (
        !daysResult.valid
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              daysResult.message,
          });
      }

      const analytics =
        await getBusinessThirtyDayPerformance(
          {
            businessId:
              business.id,

            days:
              daysResult.value,
          }
        );

      return res.status(200).json({
        success: true,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          maxHistoryDays:
            DEFAULT_ANALYTICS_DAYS,
        },

        analytics,
      });
    } catch (error) {
      console.error(
        "GET BUSINESS PERFORMANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to load business performance.",
      });
    }
  };