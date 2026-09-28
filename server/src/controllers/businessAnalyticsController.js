

import prisma from "../config/prisma.js";
import {
  getBusinessProEntitlement,
} from "../services/subscriptionService.js";

import {
  getBusinessAnalytics,
  getBusinessAnalyticsOverview,
  getBusinessListingAnalytics,
  getBusinessTopListingPerformance,

  getBusinessOfferAnalytics,
  getBusinessTradeAnalytics,
  getBusinessThirtyDayPerformance,
  getBusinessPromotionAnalytics,

  getBusinessConversionIntelligence,
  getBusinessDemandIntelligence,

  DEFAULT_ANALYTICS_DAYS,
} from "../services/businessAnalyticsService.js";


/**
 * ============================================================
 * BUSINESS ANALYTICS ACCESS LIMITS
 * ============================================================
 */

const BUSINESS_FREE_MAX_HISTORY_DAYS =
  DEFAULT_ANALYTICS_DAYS;

const BUSINESS_PRO_MAX_HISTORY_DAYS =
  365;

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
 * Business Free / Business Pro analytics access is resolved
 * server-side from the authenticated user's subscription.
 *
 * Individual endpoints determine which capabilities belong to
 * Business Free and which require Business Pro.
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
  value,
  {
    isBusinessPro = false,
  } = {}
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

  const maxHistoryDays =
    isBusinessPro
      ? BUSINESS_PRO_MAX_HISTORY_DAYS
      : BUSINESS_FREE_MAX_HISTORY_DAYS;

  if (days > maxHistoryDays) {
    return {
      valid: false,

      code:
        isBusinessPro
          ? "ANALYTICS_RANGE_TOO_LARGE"
          : "BUSINESS_PRO_REQUIRED",

      message:
        isBusinessPro
          ? `Business Pro analytics are limited to the last ${BUSINESS_PRO_MAX_HISTORY_DAYS} days.`
          : `Business Free analytics are limited to the last ${BUSINESS_FREE_MAX_HISTORY_DAYS} days. Upgrade to Business Pro for extended historical analytics.`,
    };
  }

  return {
    valid: true,

    value:
      days,

    maxHistoryDays,
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


const requireOwnerBusiness = async (
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
 * RESOLVE BUSINESS ANALYTICS ACCESS
 * ============================================================
 *
 * Server-side source of truth for Business Analytics access.
 *
 * Personal PREMIUM does not grant Business Pro analytics.
 */
const resolveBusinessAnalyticsAccess = async (
  userId,
  business
) => {
  const entitlement =
    await getBusinessProEntitlement(
      userId
    );

  const isBusinessPro =
    Boolean(
      entitlement?.isBusinessPro &&
      entitlement?.businessId ===
        business.id
    );

  return {
    isBusinessPro,

    analyticsTier:
      isBusinessPro
        ? "BUSINESS_PRO"
        : "BUSINESS_FREE",

    maxHistoryDays:
      isBusinessPro
        ? BUSINESS_PRO_MAX_HISTORY_DAYS
        : BUSINESS_FREE_MAX_HISTORY_DAYS,

    customDateRange:
      isBusinessPro,

    advancedHistoricalAnalytics:
      isBusinessPro,

    subscription:
      isBusinessPro
        ? {
            plan:
              entitlement.plan,

            status:
              entitlement.status,

            startedAt:
              entitlement.startedAt,

            expiresAt:
              entitlement.expiresAt,

            daysRemaining:
              entitlement.daysRemaining,
          }
        : null,
  };
};


/**
 * ============================================================
 * GET BUSINESS ANALYTICS ENTITLEMENT
 * ============================================================
 *
 * GET /api/business/me/analytics/entitlement
 *
 * Determines whether the authenticated business owner has:
 *
 * - BUSINESS_FREE
 * - BUSINESS_PRO
 *
 * Business Pro is determined from the Subscription table.
 * Personal Premium does not grant Business Pro.
 */
export const getMyBusinessAnalyticsEntitlement = async (
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

    const entitlement =
      await getBusinessProEntitlement(
        req.user.id
      );

    const isBusinessPro =
      Boolean(
        entitlement?.isBusinessPro &&
        entitlement?.businessId === business.id
      );

    return res.status(200).json({
      success: true,

      access: {
        tier:
          isBusinessPro
            ? "BUSINESS_PRO"
            : "BUSINESS_FREE",

        isBusinessPro,

        maxHistoryDays:
          DEFAULT_ANALYTICS_DAYS,

        customDateRange: false,

        advancedAnalytics:
          isBusinessPro,

        subscription:
          isBusinessPro
            ? {
                plan:
                  entitlement.plan,

                status:
                  entitlement.status,

                startedAt:
                  entitlement.startedAt,

                expiresAt:
                  entitlement.expiresAt,

                daysRemaining:
                  entitlement.daysRemaining,
              }
            : null,
      },
    });
  } catch (error) {
    console.error(
      "GET BUSINESS ANALYTICS ENTITLEMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to load business analytics entitlement.",
    });
  }
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

export const getMyBusinessAnalytics = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated owner's business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve server-side Business Free / Business Pro access
     * ----------------------------------------------------------
     *
     * Never trust tier information from query parameters.
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Detect custom date range
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    /**
     * ----------------------------------------------------------
     * 4. Validate requested analytics window
     * ----------------------------------------------------------
     */

    let analyticsOptions;

    if (hasCustomRange) {
      const rangeValidation =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeValidation.valid) {
        return res.status(403).json({
          success: false,

          code:
            rangeValidation.code ||
            "INVALID_ANALYTICS_RANGE",

          message:
            rangeValidation.message,
        });
      }

      analyticsOptions = {
        startDate:
          rangeValidation.startDate,

        endDate:
          rangeValidation.endDate,
      };
    } else {
      const daysValidation =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysValidation.valid) {
        const statusCode =
          daysValidation.code ===
          "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysValidation.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysValidation.message,
          });
      }

      analyticsOptions = {
        days:
          daysValidation.value,
      };
    }

    /**
     * ----------------------------------------------------------
     * 5. Calculate analytics
     * ----------------------------------------------------------
     *
     * businessAnalyticsService remains entitlement-neutral.
     */

    const analytics =
      await getBusinessAnalytics(
        business.id,
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 6. Return analytics + server-resolved access
     * ----------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

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

      access,

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

export const getMyBusinessAnalyticsOverview = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated owner's business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve Business Free / Business Pro entitlement
     * ----------------------------------------------------------
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Detect requested window
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * ----------------------------------------------------------
     * 4. Business Pro custom date range
     * ----------------------------------------------------------
     */

    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,
      };
    } else {
      /**
       * --------------------------------------------------------
       * 5. Standard day-based range
       * --------------------------------------------------------
       */

      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,
      };
    }

    /**
     * ----------------------------------------------------------
     * 6. Calculate overview
     * ----------------------------------------------------------
     */

    const analytics =
      await getBusinessAnalyticsOverview(
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 7. Return analytics + server-resolved entitlement
     * ----------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      access: {
        analyticsTier:
          access.analyticsTier,

        isBusinessPro:
          access.isBusinessPro,

        maxHistoryDays:
          access.maxHistoryDays,

        customDateRange:
          access.customDateRange,

        advancedHistoricalAnalytics:
          access.advancedHistoricalAnalytics,
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

export const getMyBusinessListingAnalytics = async (
  req,
  res
) => {
  try {
    /**
     * 1. Resolve authenticated business
     */
    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * 2. Resolve Business Free / Business Pro access
     */
    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * 3. Preserve existing listing limit validation
     */
    const limitResult =
      parseLimit(
        req.query.limit,
        3,
        20
      );

    if (!limitResult.valid) {
      return res
        .status(400)
        .json({
          success: false,
          code:
            "INVALID_ANALYTICS_LIMIT",
          message:
            limitResult.message,
        });
    }

    /**
     * 4. Check whether a custom date range was requested
     */
    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * 5. Custom historical range
     *
     * Business Free -> forbidden
     * Business Pro  -> allowed up to 365 days
     */
    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,
            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",
            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,

        limit:
          limitResult.value,
      };
    } else {
      /**
       * 6. Normal day-based historical range
       */
      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,
            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",
            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,

        limit:
          limitResult.value,
      };
    }

    /**
     * 7. Calculate listing analytics
     */
    const analytics =
      await getBusinessListingAnalytics(
        analyticsOptions
      );

    /**
     * 8. Return server-resolved access information
     */
    return res.status(200).json({
      success: true,

      access: {
        analyticsTier:
          access.analyticsTier,

        isBusinessPro:
          access.isBusinessPro,

        maxHistoryDays:
          access.maxHistoryDays,

        customDateRange:
          access.customDateRange,

        advancedHistoricalAnalytics:
          access.advancedHistoricalAnalytics,
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
 * GET BUSINESS PROMOTION ANALYTICS
 * ============================================================
 *
 * GET /api/business/me/analytics/promotions
 *
 * Business Free:
 *
 * - Maximum 30-day history
 * - Basic promotion performance
 * - Top 3 promotion performance
 *
 * Advanced promotion intelligence belongs to Business Pro.
 * ============================================================
 */

export const getMyBusinessPromotionAnalytics = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve Business Free / Business Pro entitlement
     * ----------------------------------------------------------
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Detect custom historical range
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * ----------------------------------------------------------
     * 4. Custom historical range
     * ----------------------------------------------------------
     *
     * Business Free:
     *   Not available.
     *
     * Business Pro:
     *   Available up to 365 days.
     */

    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,
      };
    } else {
      /**
       * --------------------------------------------------------
       * 5. Standard day-based range
       * --------------------------------------------------------
       */

      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,
      };
    }

    /**
     * ----------------------------------------------------------
     * 6. Calculate promotion analytics
     * ----------------------------------------------------------
     */

    const analytics =
      await getBusinessPromotionAnalytics(
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 7. Return promotion analytics
     * ----------------------------------------------------------
     */

    return res
      .status(200)
      .json({
        success: true,

        access: {
          analyticsTier:
            access.analyticsTier,

          isBusinessPro:
            access.isBusinessPro,

          maxHistoryDays:
            access.maxHistoryDays,

          customDateRange:
            access.customDateRange,

          advancedHistoricalAnalytics:
            access.advancedHistoricalAnalytics,

          // Preserve existing behaviour.
          topPromotionLimit:
            3,
        },

        analytics,
      });
  } catch (error) {
    console.error(
      "GET BUSINESS PROMOTION ANALYTICS ERROR:",
      error
    );

    return res
      .status(500)
      .json({
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


export const validateAnalyticsDateRange = (
  startDate,
  endDate,
  {
    isBusinessPro = false,
  } = {}
) => {
  const hasCustomRange =
    Boolean(
      startDate ||
      endDate
    );

  /*
   * No custom range supplied.
   */
  if (!hasCustomRange) {
    return {
      valid: true,

      startDate: null,
      endDate: null,

      isCustomRange: false,
    };
  }

  /*
   * Custom ranges are Business Pro only.
   */
  if (!isBusinessPro) {
    return {
      valid: false,

      code:
        "BUSINESS_PRO_REQUIRED",

      message:
        "Custom analytics date ranges require Business Pro.",
    };
  }

  /*
   * Require both dates.
   *
   * This prevents ambiguous queries such as:
   *
   * ?startDate=2026-01-01
   */
  if (
    !startDate ||
    !endDate
  ) {
    return {
      valid: false,

      code:
        "INCOMPLETE_DATE_RANGE",

      message:
        "Both startDate and endDate are required for a custom analytics range.",
    };
  }

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

  const startValue =
    new Date(
      start.value
    );

  const endValue =
    new Date(
      end.value
    );

  if (
    startValue >
    endValue
  ) {
    return {
      valid: false,

      code:
        "INVALID_DATE_RANGE",

      message:
        "startDate cannot be after endDate.",
    };
  }

  const now =
    new Date();

  if (
    startValue > now
  ) {
    return {
      valid: false,

      code:
        "FUTURE_DATE_RANGE",

      message:
        "startDate cannot be in the future.",
    };
  }

  /*
   * A future endDate would otherwise make analytics include
   * an artificial future period.
   */
  if (
    endValue > now
  ) {
    return {
      valid: false,

      code:
        "FUTURE_DATE_RANGE",

      message:
        "endDate cannot be in the future.",
    };
  }

  const DAY_MS =
    24 * 60 * 60 * 1000;

  const rangeDays =
    Math.floor(
      (
        endValue.getTime() -
        startValue.getTime()
      ) /
        DAY_MS
    ) + 1;

  if (
    rangeDays >
    BUSINESS_PRO_MAX_HISTORY_DAYS
  ) {
    return {
      valid: false,

      code:
        "ANALYTICS_RANGE_TOO_LARGE",

      message:
        `Custom analytics ranges cannot exceed ${BUSINESS_PRO_MAX_HISTORY_DAYS} days.`,
    };
  }

  return {
    valid: true,

    startDate:
      start.value,

    endDate:
      end.value,

    isCustomRange: true,

    days:
      rangeDays,
  };
};
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

export const getMyBusinessOfferAnalytics = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve Business Free / Business Pro entitlement
     * ----------------------------------------------------------
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Detect custom historical range
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * ----------------------------------------------------------
     * 4. Custom date range
     * ----------------------------------------------------------
     *
     * Business Free:
     *   Not allowed.
     *
     * Business Pro:
     *   Allowed up to 365 days.
     */

    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,
      };
    } else {
      /**
       * --------------------------------------------------------
       * 5. Standard day-based range
       * --------------------------------------------------------
       */

      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,
      };
    }

    /**
     * ----------------------------------------------------------
     * 6. Calculate offer analytics
     * ----------------------------------------------------------
     */

    const analytics =
      await getBusinessOfferAnalytics(
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 7. Return analytics + resolved access
     * ----------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      access: {
        analyticsTier:
          access.analyticsTier,

        isBusinessPro:
          access.isBusinessPro,

        maxHistoryDays:
          access.maxHistoryDays,

        customDateRange:
          access.customDateRange,

        advancedHistoricalAnalytics:
          access.advancedHistoricalAnalytics,
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

export const getMyBusinessTradeAnalytics = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve Business Free / Business Pro entitlement
     * ----------------------------------------------------------
     *
     * This is determined server-side from the authenticated user.
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Detect custom historical range
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * ----------------------------------------------------------
     * 4. Custom date range
     * ----------------------------------------------------------
     *
     * Business Free:
     *   Custom ranges are unavailable.
     *
     * Business Pro:
     *   Custom ranges are allowed up to 365 days.
     */

    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,
      };
    } else {
      /**
       * --------------------------------------------------------
       * 5. Standard day-based historical range
       * --------------------------------------------------------
       */

      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,
      };
    }

    /**
     * ----------------------------------------------------------
     * 6. Calculate trade analytics
     * ----------------------------------------------------------
     */

    const analytics =
      await getBusinessTradeAnalytics(
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 7. Return trade analytics + resolved access
     * ----------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      access: {
        analyticsTier:
          access.analyticsTier,

        isBusinessPro:
          access.isBusinessPro,

        maxHistoryDays:
          access.maxHistoryDays,

        customDateRange:
          access.customDateRange,

        advancedHistoricalAnalytics:
          access.advancedHistoricalAnalytics,
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

export const getMyBusinessThirtyDayPerformance = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve Business Free / Business Pro entitlement
     * ----------------------------------------------------------
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Detect custom historical range
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * ----------------------------------------------------------
     * 4. Custom historical range
     * ----------------------------------------------------------
     *
     * Business Free:
     *   Not available.
     *
     * Business Pro:
     *   Available up to 365 days.
     */

    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,
      };
    } else {
      /**
       * --------------------------------------------------------
       * 5. Standard day-based historical range
       * --------------------------------------------------------
       */

      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,
      };
    }

    /**
     * ----------------------------------------------------------
     * 6. Calculate performance trends
     * ----------------------------------------------------------
     *
     * We intentionally keep the existing service function name.
     * Renaming/refactoring the service is unnecessary here.
     */

    const analytics =
      await getBusinessThirtyDayPerformance(
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 7. Return performance analytics
     * ----------------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      access: {
        analyticsTier:
          access.analyticsTier,

        isBusinessPro:
          access.isBusinessPro,

        maxHistoryDays:
          access.maxHistoryDays,

        customDateRange:
          access.customDateRange,

        advancedHistoricalAnalytics:
          access.advancedHistoricalAnalytics,
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

/**
 * ============================================================
 * GET BUSINESS CONVERSION INTELLIGENCE
 * ============================================================
 *
 * 9.11.14.16 — FREE PREVIEW / UPGRADE BOUNDARY
 *
 * GET /api/business/me/analytics/conversions
 *
 * BUSINESS FREE:
 *
 * - Does NOT execute advanced Conversion Intelligence.
 * - Does NOT receive paid intelligence.
 * - Receives a safe feature preview.
 * - Keeps all existing basic business analytics.
 *
 * BUSINESS PRO:
 *
 * - Receives full Conversion Intelligence.
 *
 * SECURITY:
 *
 * - Authentication is enforced by `protect`.
 * - Business ownership comes from req.user.id.
 * - Business Pro entitlement is resolved server-side.
 * - Client-supplied tier/business flags are ignored.
 *
 * ============================================================
 */

export const getMyBusinessConversionIntelligence = async (req, res) => {
    try {
      /**
       * ------------------------------------------------------
       * 1. Resolve authenticated owner's business
       * ------------------------------------------------------
       */

      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      /**
       * ------------------------------------------------------
       * 2. Resolve server-side analytics entitlement
       * ------------------------------------------------------
       */

      const access =
        await resolveBusinessAnalyticsAccess(
          req.user.id,
          business
        );

      /**
       * ------------------------------------------------------
       * 3. BUSINESS FREE PREVIEW BOUNDARY
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * We return BEFORE calling
       * getBusinessConversionIntelligence().
       *
       * Therefore:
       *
       * - no Pro intelligence is calculated
       * - no Pro listing recommendations are exposed
       * - no Pro conversion funnel is exposed
       * - no Pro opportunity detection is exposed
       * - no Pro historical trends are exposed
       */

      if (!access.isBusinessPro) {
        return res
          .status(403)
          .json({
            success: false,

            code:
              "BUSINESS_PRO_REQUIRED",

            message:
              "Conversion Intelligence is available with Business Pro.",

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

            access: {
              analyticsTier:
                "BUSINESS_FREE",

              isBusinessPro:
                false,

              requiredPlan:
                "BUSINESS_PRO",

              conversionIntelligence:
                false,

              maxHistoryDays:
                access.maxHistoryDays,

              customDateRange:
                access.customDateRange,

              advancedHistoricalAnalytics:
                access
                  .advancedHistoricalAnalytics,
            },

            preview: {
              feature:
                "CONVERSION_INTELLIGENCE",

              title:
                "Conversion Intelligence",

              description:
                "Understand how listing activity moves from views and engagement to offers, accepted offers, and completed trades.",

              locked:
                true,

              requiresBusinessPro:
                true,

              capabilities: [
                {
                  code:
                    "CONVERSION_FUNNEL",

                  title:
                    "Conversion Funnel",

                  description:
                    "See how marketplace activity progresses from listing views to completed trades.",
                },

                {
                  code:
                    "LISTING_CONVERSION_ANALYSIS",

                  title:
                    "Listing Conversion Analysis",

                  description:
                    "Understand how individual listings convert attention into offers and completed trades.",
                },

                {
                  code:
                    "CONVERSION_BLOCKERS",

                  title:
                    "Conversion Blockers",

                  description:
                    "Identify stages where listings are losing potential conversions.",
                },

                {
                  code:
                    "HIGH_OPPORTUNITY_LISTINGS",

                  title:
                    "High-Opportunity Listings",

                  description:
                    "Identify listings showing promising marketplace activity and conversion signals.",
                },

                {
                  code:
                    "CONVERSION_RECOMMENDATIONS",

                  title:
                    "Conversion Recommendations",

                  description:
                    "Receive actionable recommendations based on observed listing conversion behaviour.",
                },

                {
                  code:
                    "HISTORICAL_CONVERSION_TRENDS",

                  title:
                    "Historical Conversion Trends",

                  description:
                    "Track how conversion performance changes across extended historical periods.",
                },

                {
                  code:
                    "EXTENDED_HISTORY",

                  title:
                    "Extended Analytics History",

                  description:
                    "Analyze business performance across longer historical periods.",
                },

                {
                  code:
                    "CUSTOM_DATE_RANGES",

                  title:
                    "Custom Date Ranges",

                  description:
                    "Analyze conversion performance across selected historical periods.",
                },
              ],

              /**
               * These are capability descriptions only.
               *
               * They MUST NOT contain:
               *
               * - actual listing IDs
               * - actual listing performance
               * - actual blockers
               * - actual opportunities
               * - actual recommendations
               * - actual Pro conversion rates
               */

              dataExposed:
                false,
            },

            upgrade: {
              required:
                true,

              plan:
                "BUSINESS_PRO",

              /**
               * Pricing intentionally remains absent.
               *
               * Business Pro pricing/payment has not yet
               * been finalized in the roadmap.
               */

              pricing:
                null,

              message:
                "Upgrade to Business Pro to unlock advanced conversion intelligence.",
            },
          });
      }

      /**
       * ------------------------------------------------------
       * 4. BUSINESS PRO — determine requested window
       * ------------------------------------------------------
       */

      const startDate =
        req.query.startDate;

      const endDate =
        req.query.endDate;

      const hasCustomRange =
        Boolean(
          startDate ||
          endDate
        );

      let analyticsOptions;

      /**
       * ------------------------------------------------------
       * 5. Validate custom date range
       * ------------------------------------------------------
       */

      if (hasCustomRange) {
        const rangeResult =
          validateAnalyticsDateRange(
            startDate,
            endDate,
            {
              isBusinessPro:
                access.isBusinessPro,
            }
          );

        if (!rangeResult.valid) {
          const statusCode =
            rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
              ? 403
              : 400;

          return res
            .status(statusCode)
            .json({
              success: false,

              code:
                rangeResult.code ||
                "INVALID_ANALYTICS_RANGE",

              message:
                rangeResult.message,
            });
        }

        analyticsOptions = {
          businessId:
            business.id,

          startDate:
            rangeResult.startDate,

          endDate:
            rangeResult.endDate,
        };
      } else {
        /**
         * ----------------------------------------------------
         * 6. Validate day-based range
         * ----------------------------------------------------
         */

        const daysResult =
          parseDays(
            req.query.days,
            {
              isBusinessPro:
                access.isBusinessPro,
            }
          );

        if (!daysResult.valid) {
          const statusCode =
            daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
              ? 403
              : 400;

          return res
            .status(statusCode)
            .json({
              success: false,

              code:
                daysResult.code ||
                "INVALID_ANALYTICS_RANGE",

              message:
                daysResult.message,
            });
        }

        analyticsOptions = {
          businessId:
            business.id,

          days:
            daysResult.value,
        };
      }

      /**
       * ------------------------------------------------------
       * 7. BUSINESS PRO — calculate intelligence
       * ------------------------------------------------------
       *
       * This line can only be reached after the server has
       * verified an active Business Pro entitlement.
       */

      const intelligence =
        await getBusinessConversionIntelligence(
          analyticsOptions
        );

      /**
       * ------------------------------------------------------
       * 8. Return Business Pro intelligence
       * ------------------------------------------------------
       */

      return res
        .status(200)
        .json({
          success: true,

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

          access: {
            analyticsTier:
              access.analyticsTier,

            isBusinessPro:
              true,

            conversionIntelligence:
              true,

            maxHistoryDays:
              access.maxHistoryDays,

            customDateRange:
              access.customDateRange,

            advancedHistoricalAnalytics:
              access
                .advancedHistoricalAnalytics,

            subscription:
              access.subscription,
          },

          intelligence,
        });
    } catch (error) {
      console.error(
        "GET BUSINESS CONVERSION INTELLIGENCE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          code:
            "CONVERSION_INTELLIGENCE_ERROR",

          message:
            "Failed to load business conversion intelligence.",
        });
    }
  };

  // UPDATE — server/src/controllers/businessAnalyticsController.js

/**
 * ============================================================
 * GET BUSINESS DEMAND INTELLIGENCE
 * ============================================================
 *
 * 9.11.15 — BUSINESS PRO DEMAND INTELLIGENCE
 *
 * GET /api/business/me/analytics/demand
 *
 * BUSINESS FREE:
 *
 * - Does NOT execute Demand Intelligence.
 * - Does NOT receive demand scores.
 * - Does NOT receive demand classifications.
 * - Does NOT receive listing demand opportunities.
 * - Does NOT receive demand recommendations.
 * - Receives only a safe feature preview.
 *
 * BUSINESS PRO:
 *
 * - Receives full Demand Intelligence.
 * - Supports extended historical analytics.
 * - Supports custom historical ranges.
 *
 * SECURITY:
 *
 * - Authentication is enforced by `protect`.
 * - Business ownership comes from req.user.id.
 * - Business Pro entitlement is resolved server-side.
 * - Client-supplied tier/business flags are ignored.
 *
 * ============================================================
 */

export const getMyBusinessDemandIntelligence =
  async (req, res) => {
    try {
      /**
       * ------------------------------------------------------
       * 1. Resolve authenticated owner's business
       * ------------------------------------------------------
       */

      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      /**
       * ------------------------------------------------------
       * 2. Resolve Business Pro entitlement server-side
       * ------------------------------------------------------
       */

      const access =
        await resolveBusinessAnalyticsAccess(
          req.user.id,
          business
        );

      /**
       * ------------------------------------------------------
       * 3. BUSINESS FREE PREVIEW BOUNDARY
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Return BEFORE calling getBusinessDemandIntelligence().
       *
       * This prevents Business Free accounts from receiving:
       *
       * - real demand scores
       * - listing demand classifications
       * - actual demand opportunities
       * - actual demand recommendations
       * - strongest-demand listing rankings
       */

      if (!access.isBusinessPro) {
        return res
          .status(403)
          .json({
            success: false,

            code:
              "BUSINESS_PRO_REQUIRED",

            message:
              "Demand Intelligence is available with Business Pro.",

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

            access: {
              analyticsTier:
                "BUSINESS_FREE",

              isBusinessPro:
                false,

              requiredPlan:
                "BUSINESS_PRO",

              demandIntelligence:
                false,

              maxHistoryDays:
                access.maxHistoryDays,

              customDateRange:
                access.customDateRange,

              advancedHistoricalAnalytics:
                access
                  .advancedHistoricalAnalytics,
            },

            preview: {
              feature:
                "DEMAND_INTELLIGENCE",

              title:
                "Demand Intelligence",

              description:
                "Understand which listings are attracting the strongest observed marketplace demand and where your business has opportunities to improve performance.",

              locked:
                true,

              requiresBusinessPro:
                true,

              capabilities: [
                {
                  code:
                    "DEMAND_SCORE",

                  title:
                    "Listing Demand Score",

                  description:
                    "Measure observed demand strength across your business listings using traffic, engagement, offers and trade signals.",
                },

                {
                  code:
                    "DEMAND_CLASSIFICATION",

                  title:
                    "Demand Classification",

                  description:
                    "Identify listings showing very high, high, moderate, low or no observed demand.",
                },

                {
                  code:
                    "HIGH_DEMAND_LISTINGS",

                  title:
                    "High-Demand Listings",

                  description:
                    "Discover which listings are generating your strongest observed demand signals.",
                },

                {
                  code:
                    "HIGH_INTEREST_LOW_CONVERSION",

                  title:
                    "High Interest, Low Conversion",

                  description:
                    "Identify listings attracting interest but failing to progress into completed trades.",
                },

                {
                  code:
                    "DEMAND_OPPORTUNITIES",

                  title:
                    "Demand Opportunities",

                  description:
                    "Find listings with meaningful demand signals that still have room to convert.",
                },

                {
                  code:
                    "DEMAND_RECOMMENDATIONS",

                  title:
                    "Demand Recommendations",

                  description:
                    "Receive actionable recommendations based on observed listing demand behaviour.",
                },

                {
                  code:
                    "EXTENDED_DEMAND_HISTORY",

                  title:
                    "Extended Demand History",

                  description:
                    "Analyze demand across longer historical periods with Business Pro.",
                },

                {
                  code:
                    "CUSTOM_DEMAND_RANGES",

                  title:
                    "Custom Date Ranges",

                  description:
                    "Analyze demand across selected historical periods.",
                },
              ],

              /**
               * IMPORTANT:
               *
               * No actual Business Pro analytics belong here.
               *
               * Do NOT expose:
               *
               * - listing IDs
               * - demand scores
               * - demand classifications
               * - actual opportunities
               * - actual recommendations
               * - real demand rankings
               */

              pricing:
                null,
            },
          });
      }

      /**
       * ------------------------------------------------------
       * 4. Detect requested analytics window
       * ------------------------------------------------------
       */

      const startDate =
        req.query.startDate;

      const endDate =
        req.query.endDate;

      const hasCustomRange =
        Boolean(
          startDate ||
          endDate
        );

      let analyticsOptions;

      /**
       * ------------------------------------------------------
       * 5. Custom historical range
       * ------------------------------------------------------
       */

      if (hasCustomRange) {
        const rangeResult =
          validateAnalyticsDateRange(
            startDate,
            endDate,
            {
              isBusinessPro:
                access.isBusinessPro,
            }
          );

        if (!rangeResult.valid) {
          const statusCode =
            rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
              ? 403
              : 400;

          return res
            .status(statusCode)
            .json({
              success: false,

              code:
                rangeResult.code ||
                "INVALID_ANALYTICS_RANGE",

              message:
                rangeResult.message,
            });
        }

        analyticsOptions = {
          businessId:
            business.id,

          startDate:
            rangeResult.startDate,

          endDate:
            rangeResult.endDate,
        };
      } else {
        /**
         * ----------------------------------------------------
         * 6. Day-based historical range
         * ----------------------------------------------------
         */

        const daysResult =
          parseDays(
            req.query.days,
            {
              isBusinessPro:
                access.isBusinessPro,
            }
          );

        if (!daysResult.valid) {
          const statusCode =
            daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
              ? 403
              : 400;

          return res
            .status(statusCode)
            .json({
              success: false,

              code:
                daysResult.code ||
                "INVALID_ANALYTICS_RANGE",

              message:
                daysResult.message,
            });
        }

        analyticsOptions = {
          businessId:
            business.id,

          days:
            daysResult.value,
        };
      }

      /**
       * ------------------------------------------------------
       * 7. Calculate Demand Intelligence
       * ------------------------------------------------------
       *
       * We reach this point ONLY when Business Pro entitlement
       * has been verified server-side.
       */

      const intelligence =
        await getBusinessDemandIntelligence(
          analyticsOptions
        );

      /**
       * ------------------------------------------------------
       * 8. Return Demand Intelligence
       * ------------------------------------------------------
       */

      return res
        .status(200)
        .json({
          success: true,

          access: {
            analyticsTier:
              access.analyticsTier,

            isBusinessPro:
              true,

            requiredPlan:
              "BUSINESS_PRO",

            demandIntelligence:
              true,

            maxHistoryDays:
              access.maxHistoryDays,

            customDateRange:
              access.customDateRange,

            advancedHistoricalAnalytics:
              access
                .advancedHistoricalAnalytics,

            subscription:
              access.subscription,
          },

          intelligence,
        });
    } catch (error) {
      console.error(
        "GET BUSINESS DEMAND INTELLIGENCE ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          code:
            "DEMAND_INTELLIGENCE_ERROR",

          message:
            "Failed to load business demand intelligence.",
        });
    }
  };
/**
 * ============================================================
 * GET TOP LISTING PERFORMANCE
 * ============================================================
 *
 * GET /api/business/me/analytics/top-listings
 *
 * Business Free:
 *
 * - Top 3 listings
 * - maximum 30-day history
 * - views
 * - engagement
 * - offers
 * - completed trades
 * - basic conversion rates
 * ============================================================
 */

export const getMyBusinessTopListingPerformance = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * 1. Resolve authenticated business
     * ----------------------------------------------------------
     */

    const business =
      await requireOwnerBusiness(
        req,
        res
      );

    if (!business) {
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. Resolve Business Free / Business Pro entitlement
     * ----------------------------------------------------------
     */

    const access =
      await resolveBusinessAnalyticsAccess(
        req.user.id,
        business
      );

    /**
     * ----------------------------------------------------------
     * 3. Top-listing limit
     * ----------------------------------------------------------
     *
     * Preserve the existing Top 3 behaviour.
     *
     * Business Pro gets extended historical access in this step,
     * not an increased ranking limit.
     */
    const topListingLimit = 3;

    /**
     * ----------------------------------------------------------
     * 4. Detect custom historical range
     * ----------------------------------------------------------
     */

    const startDate =
      req.query.startDate;

    const endDate =
      req.query.endDate;

    const hasCustomRange =
      Boolean(
        startDate ||
        endDate
      );

    let analyticsOptions;

    /**
     * ----------------------------------------------------------
     * 5. Custom historical range
     * ----------------------------------------------------------
     *
     * Business Free:
     *   Not available.
     *
     * Business Pro:
     *   Available up to 365 days.
     */

    if (hasCustomRange) {
      const rangeResult =
        validateAnalyticsDateRange(
          startDate,
          endDate,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!rangeResult.valid) {
        const statusCode =
          rangeResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              rangeResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              rangeResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        startDate:
          rangeResult.startDate,

        endDate:
          rangeResult.endDate,

        limit:
          topListingLimit,
      };
    } else {
      /**
       * --------------------------------------------------------
       * 6. Standard day-based historical range
       * --------------------------------------------------------
       */

      const daysResult =
        parseDays(
          req.query.days,
          {
            isBusinessPro:
              access.isBusinessPro,
          }
        );

      if (!daysResult.valid) {
        const statusCode =
          daysResult.code ===
            "BUSINESS_PRO_REQUIRED"
            ? 403
            : 400;

        return res
          .status(statusCode)
          .json({
            success: false,

            code:
              daysResult.code ||
              "INVALID_ANALYTICS_RANGE",

            message:
              daysResult.message,
          });
      }

      analyticsOptions = {
        businessId:
          business.id,

        days:
          daysResult.value,

        limit:
          topListingLimit,
      };
    }

    /**
     * ----------------------------------------------------------
     * 7. Calculate top-listing performance
     * ----------------------------------------------------------
     */

    const analytics =
      await getBusinessTopListingPerformance(
        analyticsOptions
      );

    /**
     * ----------------------------------------------------------
     * 8. Return ranking + access information
     * ----------------------------------------------------------
     */

    return res
      .status(200)
      .json({
        success: true,

        access: {
          analyticsTier:
            access.analyticsTier,

          isBusinessPro:
            access.isBusinessPro,

          maxHistoryDays:
            access.maxHistoryDays,

          customDateRange:
            access.customDateRange,

          advancedHistoricalAnalytics:
            access.advancedHistoricalAnalytics,

          topListingLimit:
            topListingLimit,
        },

        analytics,
      });
  } catch (error) {
    console.error(
      "GET TOP LISTING PERFORMANCE ERROR:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Failed to load top listing performance.",
      });
  }
};