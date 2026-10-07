import api from "./axios";

/**
 * ============================================================
 * BUSINESS ANALYTICS API
 * ============================================================
 *
 * Authenticated business-owner analytics.
 *
 * IMPORTANT:
 *
 * The backend remains the authority for:
 *
 * - Business Free / Business Pro entitlement
 * - maximum history
 * - custom date ranges
 * - advanced analytics features
 *
 * The frontend must never grant Business Pro access itself.
 */

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

const buildAnalyticsParams = ({
  days,
  startDate,
  endDate,
  limit,
} = {}) => {
  const params = {};

  if (
    days !== undefined &&
    days !== null &&
    days !== ""
  ) {
    params.days = days;
  }

  if (startDate) {
    params.startDate =
      startDate;
  }

  if (endDate) {
    params.endDate =
      endDate;
  }

  if (
    limit !== undefined &&
    limit !== null
  ) {
    params.limit = limit;
  }

  return params;
};

/**
 * ============================================================
 * ENTITLEMENT
 * ============================================================
 *
 * Authoritative source for CURRENT analytics entitlement.
 *
 * This does NOT determine renewal state.
 *
 * Renewal lifecycle belongs to:
 *
 * GET /subscriptions/me
 */

export const getBusinessAnalyticsEntitlement =
  async () => {
    const response =
      await api.get(
        "/business/me/analytics/entitlement"
      );

    return response.data;
  };

/**
 * ============================================================
 * MAIN ANALYTICS
 * ============================================================
 */

export const getBusinessAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * OVERVIEW
 * ============================================================
 */

export const getBusinessAnalyticsOverview =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/overview",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * LISTINGS
 * ============================================================
 */

export const getBusinessListingAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/listings",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * PROMOTIONS — BASIC
 * ============================================================
 *
 * Available to Business Free and Business Pro.
 */

export const getBusinessPromotionAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/promotions",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * OFFERS
 * ============================================================
 */

export const getBusinessOfferAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/offers",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * TRADES
 * ============================================================
 */

export const getBusinessTradeAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/trades",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * PERFORMANCE
 * ============================================================
 */

export const getBusinessPerformanceAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/performance",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * TOP LISTINGS
 * ============================================================
 */

export const getBusinessTopListingAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/top-listings",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * BUSINESS PRO — CONVERSION INTELLIGENCE
 * ============================================================
 */

export const getBusinessConversionIntelligence =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/conversions",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * BUSINESS PRO — DEMAND INTELLIGENCE
 * ============================================================
 */

export const getBusinessDemandIntelligence =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/demand",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * BUSINESS PRO — CATEGORY BENCHMARKS
 * ============================================================
 */

export const getBusinessCategoryBenchmarks =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/category-benchmarks",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * BUSINESS PRO — GROWTH RECOMMENDATIONS
 * ============================================================
 */

export const getBusinessGrowthRecommendations =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/growth-recommendations",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };

/**
 * ============================================================
 * BUSINESS PRO — ADVANCED PROMOTION ANALYTICS
 * ============================================================
 */

export const getBusinessAdvancedPromotionAnalytics =
  async (options = {}) => {
    const response =
      await api.get(
        "/business/me/analytics/promotions/advanced",
        {
          params:
            buildAnalyticsParams(
              options
            ),
        }
      );

    return response.data;
  };