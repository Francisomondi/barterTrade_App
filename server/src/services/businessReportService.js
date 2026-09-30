import crypto from "crypto";

import {
  BUSINESS_REPORT_VERSION,
  BUSINESS_REPORT_TYPES,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_HISTORY,
  BUSINESS_REPORT_EXPORT_LIMITS,
  BUSINESS_REPORT_SECTIONS,
  DEFAULT_BUSINESS_REPORT_FORMAT,
  getBusinessReportDefinition,
  normalizeBusinessReportType,
  normalizeBusinessReportFormat,
  isFormatSupportedForBusinessReport,
} from "../config/businessReportConfig.js";

import {
  getBusinessAnalyticsOverview,
  getBusinessListingAnalytics,
  getBusinessTopListingPerformance,
  getBusinessOfferAnalytics,
  getBusinessTradeAnalytics,
  getBusinessThirtyDayPerformance,
  getBusinessPromotionAnalytics,
  getBusinessConversionIntelligence,
  getBusinessDemandIntelligence,
  getBusinessCategoryBenchmarks,
  getBusinessGrowthRecommendations,
  getBusinessAdvancedPromotionAnalytics,
} from "./businessAnalyticsService.js";


/**
 * =========================================================
 * BUSINESS REPORT SERVICE
 * =========================================================
 *
 * Responsibilities:
 *
 * - Validate report type.
 * - Validate report format.
 * - Normalize reporting periods.
 * - Call existing analytics services.
 * - Assemble canonical report objects.
 * - Attach report metadata.
 * - Attach methodology / data coverage information.
 *
 * IMPORTANT:
 *
 * This service DOES NOT:
 *
 * - authenticate users
 * - authorize business ownership
 * - determine Business Pro entitlement
 * - calculate analytics formulas
 * - query another user's business
 * - generate CSV files
 * - generate PDF files
 *
 * Controllers must resolve ownership and entitlement before
 * calling this service.
 *
 * Analytics calculations remain inside:
 *
 * businessAnalyticsService.js
 * =========================================================
 */


/**
 * =========================================================
 * INTERNAL CONSTANTS
 * =========================================================
 */

const DAY_MS =
  24 * 60 * 60 * 1000;


/**
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

const toDate = (value) => {
  if (!value) {
    return null;
  }

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


const startOfDay = (value) => {
  const date =
    toDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};


const endOfDay = (value) => {
  const date =
    toDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};


const toIsoString = (value) => {
  const date =
    toDate(value);

  return date
    ? date.toISOString()
    : null;
};


const safeArray = (value) =>
  Array.isArray(value)
    ? value
    : [];


const safeObject = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value)
    ? value
    : {};


const hasOwn = (
  object,
  key
) =>
  Object.prototype.hasOwnProperty.call(
    object || {},
    key
  );


/**
 * =========================================================
 * REPORT ID
 * =========================================================
 *
 * Report IDs are generated at request time.
 *
 * They do NOT imply that a report has been persisted.
 */

const generateReportId = () =>
  `rpt_${crypto
    .randomUUID()
    .replaceAll("-", "")}`;


/**
 * =========================================================
 * REPORT PERIOD
 * =========================================================
 *
 * Reports support:
 *
 * 1. Relative period:
 *
 *    { days: 30 }
 *
 * 2. Custom period:
 *
 *    {
 *      startDate: "...",
 *      endDate: "..."
 *    }
 *
 * Business Pro authorization is NOT checked here.
 *
 * The controller will enforce the Business Pro boundary.
 */

export const buildBusinessReportPeriod = ({
  days =
    BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

  startDate = null,

  endDate = null,
} = {}) => {
  const hasStart =
    startDate !== undefined &&
    startDate !== null &&
    startDate !== "";

  const hasEnd =
    endDate !== undefined &&
    endDate !== null &&
    endDate !== "";

  /**
   * -------------------------------------------------------
   * CUSTOM RANGE
   * -------------------------------------------------------
   */

  if (
    hasStart ||
    hasEnd
  ) {
    if (
      !hasStart ||
      !hasEnd
    ) {
      throw new Error(
        "Both startDate and endDate are required for a custom report range."
      );
    }

    const start =
      startOfDay(startDate);

    const end =
      endOfDay(endDate);

    if (
      !start ||
      !end
    ) {
      throw new Error(
        "Invalid report date range."
      );
    }

    if (
      start.getTime() >
      end.getTime()
    ) {
      throw new Error(
        "startDate cannot be after endDate."
      );
    }

    const calculatedDays =
      Math.floor(
        (
          startOfDay(end).getTime() -
          start.getTime()
        ) /
          DAY_MS
      ) + 1;

    if (
      calculatedDays <
      BUSINESS_REPORT_HISTORY.MIN_DAYS
    ) {
      throw new Error(
        `Report history must be at least ${BUSINESS_REPORT_HISTORY.MIN_DAYS} day.`
      );
    }

    if (
      calculatedDays >
      BUSINESS_REPORT_HISTORY.MAX_DAYS
    ) {
      throw new Error(
        `Reports are limited to ${BUSINESS_REPORT_HISTORY.MAX_DAYS} days.`
      );
    }

    return {
      mode: "CUSTOM",

      start,

      end,

      startDate:
        start.toISOString(),

      endDate:
        end.toISOString(),

      days:
        calculatedDays,
    };
  }

  /**
   * -------------------------------------------------------
   * RELATIVE DAYS
   * -------------------------------------------------------
   */

  const parsedDays =
    Number.parseInt(
      days,
      10
    );

  if (
    !Number.isFinite(
      parsedDays
    ) ||
    parsedDays <
      BUSINESS_REPORT_HISTORY.MIN_DAYS
  ) {
    throw new Error(
      "days must be a positive integer."
    );
  }

  if (
    parsedDays >
    BUSINESS_REPORT_HISTORY.MAX_DAYS
  ) {
    throw new Error(
      `Reports are limited to ${BUSINESS_REPORT_HISTORY.MAX_DAYS} days.`
    );
  }

  const end =
    new Date();

  const start =
    new Date(
      end.getTime() -
        (
          parsedDays - 1
        ) *
          DAY_MS
    );

  start.setHours(
    0,
    0,
    0,
    0
  );

  return {
    mode: "RELATIVE",

    start,

    end,

    startDate:
      start.toISOString(),

    endDate:
      end.toISOString(),

    days:
      parsedDays,
  };
};


/**
 * =========================================================
 * ANALYTICS OPTIONS
 * =========================================================
 *
 * Advanced analytics services support custom start/end
 * ranges.
 *
 * Existing basic analytics functions are currently
 * day-oriented, so they receive `days`.
 */

const buildAdvancedAnalyticsOptions = (
  businessId,
  period
) => {
  if (
    period.mode === "CUSTOM"
  ) {
    return {
      businessId,

      startDate:
        period.start,

      endDate:
        period.end,
    };
  }

  return {
    businessId,
    days: period.days,
  };
};


const buildBasicAnalyticsOptions = (
  businessId,
  period,
  additional = {}
) => ({
  businessId,
  days: period.days,
  ...additional,
});


/**
 * =========================================================
 * REPORT REQUEST VALIDATION
 * =========================================================
 */

export const validateBusinessReportRequest = ({
  reportType,
  format =
    DEFAULT_BUSINESS_REPORT_FORMAT,
} = {}) => {
  const normalizedType =
    normalizeBusinessReportType(
      reportType
    );

  if (!normalizedType) {
    return {
      valid: false,

      code:
        "UNSUPPORTED_REPORT_TYPE",

      message:
        "Unsupported business report type.",
    };
  }

  const normalizedFormat =
    normalizeBusinessReportFormat(
      format
    );

  if (!normalizedFormat) {
    return {
      valid: false,

      code:
        "UNSUPPORTED_REPORT_FORMAT",

      message:
        "Unsupported business report format.",
    };
  }

  if (
    !isFormatSupportedForBusinessReport(
      normalizedType,
      normalizedFormat
    )
  ) {
    return {
      valid: false,

      code:
        "REPORT_FORMAT_NOT_SUPPORTED",

      message:
        "The requested format is not supported for this report type.",
    };
  }

  return {
    valid: true,

    reportType:
      normalizedType,

    format:
      normalizedFormat,

    definition:
      getBusinessReportDefinition(
        normalizedType
      ),
  };
};


/**
 * =========================================================
 * BUSINESS METADATA
 * =========================================================
 *
 * The report intentionally exposes only safe business
 * identity fields.
 */

const buildBusinessMetadata = (
  business
) => {
  const source =
    safeObject(business);

  return {
    id:
      source.id || null,

    businessName:
      source.businessName ||
      null,

    slug:
      source.slug || null,

    category:
      source.category || null,

    status:
      source.status || null,

    verificationStatus:
      source.verificationStatus ||
      null,
  };
};


/**
 * =========================================================
 * REPORT METADATA
 * =========================================================
 */

const buildReportMetadata = ({
  reportType,
  format,
  definition,
  period,
  analyticsTier =
    "BUSINESS_PRO",
  currency = null,
  timezone = "UTC",
}) => ({
  reportId:
    generateReportId(),

  reportVersion:
    BUSINESS_REPORT_VERSION,

  reportType,

  title:
    definition?.title ||
    reportType,

  description:
    definition?.description ||
    null,

  generatedAt:
    new Date().toISOString(),

  requestedFormat:
    format,

  analyticsTier,

  currency,

  timezone,

  period: {
    mode:
      period.mode,

    startDate:
      period.startDate,

    endDate:
      period.endDate,

    days:
      period.days,
  },
});


/**
 * =========================================================
 * SECTION BUILDER
 * =========================================================
 */

const createReportSection = ({
  code,
  title,
  data = null,
  available = true,
  notes = [],
}) => ({
  code,
  title,
  available:
    Boolean(available),

  data:
    available
      ? data
      : null,

  notes:
    safeArray(notes),
});


/**
 * =========================================================
 * DATA COVERAGE
 * =========================================================
 */

const buildDataCoverage = ({
  period,
  analytics = {},
}) => {
  const notes = [];

  const promotionIntelligence =
    analytics.promotionIntelligence;

  const promotions =
    safeArray(
      promotionIntelligence?.promotions
    );

  if (
    promotionIntelligence &&
    promotions.length === 0
  ) {
    notes.push(
      "No promotion activity was available for the selected reporting period."
    );
  }

  const unavailableBaselines =
    promotions.filter(
      (promotion) => {
        const uplift =
          promotion?.uplift ||
          promotion?.observedUplift ||
          promotion?.upliftAnalysis;

        if (!uplift) {
          return false;
        }

        return (
          uplift.available === false ||
          uplift.baselineAvailable ===
            false
        );
      }
    ).length;

  if (
    unavailableBaselines > 0
  ) {
    notes.push(
      `Observed promotion uplift was unavailable for ${unavailableBaselines} promotion${
        unavailableBaselines === 1
          ? ""
          : "s"
      } because sufficient comparison data was not available.`
    );
  }

  return {
    requestedPeriod: {
      startDate:
        period.startDate,

      endDate:
        period.endDate,

      days:
        period.days,
    },

    complete:
      unavailableBaselines === 0,

    unavailablePromotionBaselines:
      unavailableBaselines,

    notes,
  };
};


/**
 * =========================================================
 * METHODOLOGY
 * =========================================================
 */

const buildMethodology = ({
  reportType,
}) => {
  const notes = [
    "Report metrics are assembled from BarterTrade business analytics services.",
    "The reporting layer does not independently recalculate analytics formulas.",
    "Business identity and report entitlement must be resolved server-side before report generation.",
  ];

  if (
    reportType ===
      BUSINESS_REPORT_TYPES.PROMOTION_INTELLIGENCE ||
    reportType ===
      BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE
  ) {
    notes.push(
      "Promotion outcomes represent activity observed during promotion periods and do not establish causal attribution."
    );

    notes.push(
      "Promotion uplift compares observed activity during a promotion with an immediately preceding comparison period when sufficient data is available."
    );

    notes.push(
      "Barter trade outcomes are not treated as financial revenue, profit, or return on investment."
    );
  }

  if (
    reportType ===
      BUSINESS_REPORT_TYPES.CATEGORY_BENCHMARK ||
    reportType ===
      BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE
  ) {
    notes.push(
      "Category benchmarks use aggregated marketplace cohorts and do not expose individual competitor performance."
    );
  }

  return {
    reportType,
    notes,
  };
};


/**
 * =========================================================
 * ANALYTICS LOADERS
 * =========================================================
 *
 * These functions orchestrate existing analytics services.
 *
 * They DO NOT recalculate their metrics.
 */


/**
 * ---------------------------------------------------------
 * BUSINESS PERFORMANCE ANALYTICS
 * ---------------------------------------------------------
 */

const loadBusinessPerformanceAnalytics =
  async ({
    businessId,
    period,
  }) => {
    const basicOptions =
      buildBasicAnalyticsOptions(
        businessId,
        period,
        {
          limit: 20,
        }
      );

    const [
      overview,
      listings,
      topListings,
      offers,
      trades,
      performance,
    ] =
      await Promise.all([
        getBusinessAnalyticsOverview({
          businessId,
          days: period.days,
        }),

        getBusinessListingAnalytics(
          basicOptions
        ),

        getBusinessTopListingPerformance(
          basicOptions
        ),

        getBusinessOfferAnalytics({
          businessId,
          days: period.days,
        }),

        getBusinessTradeAnalytics({
          businessId,
          days: period.days,
        }),

        getBusinessThirtyDayPerformance({
          businessId,
          days: period.days,
        }),
      ]);

    return {
      overview,
      listings,
      topListings,
      offers,
      trades,
      performance,
    };
  };


/**
 * ---------------------------------------------------------
 * CONVERSION INTELLIGENCE
 * ---------------------------------------------------------
 */

const loadConversionIntelligence =
  async ({
    businessId,
    period,
  }) =>
    getBusinessConversionIntelligence(
      buildAdvancedAnalyticsOptions(
        businessId,
        period
      )
    );


/**
 * ---------------------------------------------------------
 * DEMAND INTELLIGENCE
 * ---------------------------------------------------------
 */

const loadDemandIntelligence =
  async ({
    businessId,
    period,
  }) =>
    getBusinessDemandIntelligence(
      buildAdvancedAnalyticsOptions(
        businessId,
        period
      )
    );


/**
 * ---------------------------------------------------------
 * CATEGORY BENCHMARKS
 * ---------------------------------------------------------
 */

const loadCategoryBenchmarks =
  async ({
    businessId,
    period,
  }) =>
    getBusinessCategoryBenchmarks(
      buildAdvancedAnalyticsOptions(
        businessId,
        period
      )
    );


/**
 * ---------------------------------------------------------
 * GROWTH RECOMMENDATIONS
 * ---------------------------------------------------------
 */

const loadGrowthRecommendations =
  async ({
    businessId,
    period,
  }) =>
    getBusinessGrowthRecommendations(
      buildAdvancedAnalyticsOptions(
        businessId,
        period
      )
    );


/**
 * ---------------------------------------------------------
 * BASIC PROMOTION ANALYTICS
 * ---------------------------------------------------------
 */

const loadBasicPromotionAnalytics =
  async ({
    businessId,
    period,
  }) =>
    getBusinessPromotionAnalytics({
      businessId,
      days: period.days,
    });


/**
 * ---------------------------------------------------------
 * ADVANCED PROMOTION INTELLIGENCE
 * ---------------------------------------------------------
 */

const loadPromotionIntelligence =
  async ({
    businessId,
    period,
  }) =>
    getBusinessAdvancedPromotionAnalytics(
      buildAdvancedAnalyticsOptions(
        businessId,
        period
      )
    );


/**
 * =========================================================
 * EXECUTIVE SUMMARY
 * =========================================================
 *
 * We intentionally preserve analytics-service objects here
 * rather than rebuilding their formulas.
 *
 * A later presentation/export layer may choose which fields
 * to display.
 */

const buildExecutiveSummary = (
  analytics
) => {
  const source =
    safeObject(analytics);

  const overview =
    source.businessPerformance
      ?.overview || null;

  const conversion =
    source.conversionIntelligence ||
    null;

  const demand =
    source.demandIntelligence ||
    null;

  const promotions =
    source.promotionIntelligence ||
    source.basicPromotions ||
    null;

  return {
    overview,

    conversion:
      conversion?.summary ||
      conversion?.funnel ||
      null,

    demand:
      demand?.summary ||
      null,

    promotions:
      promotions?.summary ||
      null,
  };
};


/**
 * =========================================================
 * REPORT BUILDERS
 * =========================================================
 */


/**
 * ---------------------------------------------------------
 * BUSINESS PERFORMANCE REPORT
 * ---------------------------------------------------------
 */

const buildBusinessPerformanceReport =
  async ({
    businessId,
    period,
  }) => {
    const businessPerformance =
      await loadBusinessPerformanceAnalytics({
        businessId,
        period,
      });

    return {
      analytics: {
        businessPerformance,
      },

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            buildExecutiveSummary({
              businessPerformance,
            }),
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.BUSINESS_PERFORMANCE,

          title:
            "Business Performance",

          data:
            businessPerformance.overview,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.LISTING_PERFORMANCE,

          title:
            "Listing Performance",

          data: {
            listings:
              businessPerformance.listings,

            topListings:
              businessPerformance.topListings,
          },
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.OFFER_PERFORMANCE,

          title:
            "Offer Performance",

          data:
            businessPerformance.offers,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.TRADE_PERFORMANCE,

          title:
            "Trade Performance",

          data:
            businessPerformance.trades,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,

          title:
            "Performance Trends",

          data:
            businessPerformance.performance,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * LISTING PERFORMANCE REPORT
 * ---------------------------------------------------------
 */

const buildListingPerformanceReport =
  async ({
    businessId,
    period,
  }) => {
    const [
      listings,
      topListings,
      performance,
    ] =
      await Promise.all([
        getBusinessListingAnalytics({
          businessId,
          days: period.days,
          limit:
            BUSINESS_REPORT_EXPORT_LIMITS.MAX_LISTING_ROWS,
        }),

        getBusinessTopListingPerformance({
          businessId,
          days: period.days,
          limit: 20,
        }),

        getBusinessThirtyDayPerformance({
          businessId,
          days: period.days,
        }),
      ]);

    const analytics = {
      listings,
      topListings,
      performance,
    };

    return {
      analytics,

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data: {
            topListings,
          },
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.LISTING_PERFORMANCE,

          title:
            "Listing Performance",

          data: {
            listings,
            topListings,
          },
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,

          title:
            "Performance Trends",

          data:
            performance,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * CONVERSION INTELLIGENCE REPORT
 * ---------------------------------------------------------
 */

const buildConversionReport =
  async ({
    businessId,
    period,
  }) => {
    const [
      conversion,
      growthRecommendations,
    ] =
      await Promise.all([
        loadConversionIntelligence({
          businessId,
          period,
        }),

        loadGrowthRecommendations({
          businessId,
          period,
        }),
      ]);

    return {
      analytics: {
        conversionIntelligence:
          conversion,

        growthRecommendations,
      },

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            conversion?.summary ||
            conversion?.funnel ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.CONVERSION_FUNNEL,

          title:
            "Conversion Funnel",

          data:
            conversion?.funnel ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.CONVERSION_INTELLIGENCE,

          title:
            "Conversion Intelligence",

          data:
            conversion,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,

          title:
            "Performance Trends",

          data:
            conversion?.trends ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,

          title:
            "Growth Recommendations",

          data:
            growthRecommendations,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * DEMAND INTELLIGENCE REPORT
 * ---------------------------------------------------------
 */

const buildDemandReport =
  async ({
    businessId,
    period,
  }) => {
    const [
      demand,
      growthRecommendations,
    ] =
      await Promise.all([
        loadDemandIntelligence({
          businessId,
          period,
        }),

        loadGrowthRecommendations({
          businessId,
          period,
        }),
      ]);

    return {
      analytics: {
        demandIntelligence:
          demand,

        growthRecommendations,
      },

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            demand?.summary ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.DEMAND_INTELLIGENCE,

          title:
            "Demand Intelligence",

          data:
            demand,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,

          title:
            "Performance Trends",

          data:
            demand?.trends ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,

          title:
            "Growth Recommendations",

          data:
            growthRecommendations,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * CATEGORY BENCHMARK REPORT
 * ---------------------------------------------------------
 */

const buildCategoryBenchmarkReport =
  async ({
    businessId,
    period,
  }) => {
    const [
      benchmarks,
      growthRecommendations,
    ] =
      await Promise.all([
        loadCategoryBenchmarks({
          businessId,
          period,
        }),

        loadGrowthRecommendations({
          businessId,
          period,
        }),
      ]);

    return {
      analytics: {
        categoryBenchmarks:
          benchmarks,

        growthRecommendations,
      },

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            benchmarks?.summary ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.CATEGORY_BENCHMARKS,

          title:
            "Category Benchmarks",

          data:
            benchmarks,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,

          title:
            "Growth Recommendations",

          data:
            growthRecommendations,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * GROWTH RECOMMENDATIONS REPORT
 * ---------------------------------------------------------
 */

const buildGrowthRecommendationsReport =
  async ({
    businessId,
    period,
  }) => {
    const growthRecommendations =
      await loadGrowthRecommendations({
        businessId,
        period,
      });

    return {
      analytics: {
        growthRecommendations,
      },

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            growthRecommendations
              ?.summary ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,

          title:
            "Growth Recommendations",

          data:
            growthRecommendations,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * PROMOTION INTELLIGENCE REPORT
 * ---------------------------------------------------------
 */

const buildPromotionIntelligenceReport =
  async ({
    businessId,
    period,
  }) => {
    const [
      basicPromotions,
      promotionIntelligence,
    ] =
      await Promise.all([
        loadBasicPromotionAnalytics({
          businessId,
          period,
        }),

        loadPromotionIntelligence({
          businessId,
          period,
        }),
      ]);

    return {
      analytics: {
        basicPromotions,
        promotionIntelligence,
      },

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            promotionIntelligence
              ?.summary ||
            basicPromotions?.summary ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PROMOTION_PERFORMANCE,

          title:
            "Promotion Performance",

          data:
            basicPromotions,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PROMOTION_INTELLIGENCE,

          title:
            "Promotion Intelligence",

          data:
            promotionIntelligence,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,

          title:
            "Promotion Trends",

          data:
            promotionIntelligence
              ?.trends ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,

          title:
            "Promotion Recommendations",

          data:
            promotionIntelligence
              ?.recommendations ||
            null,
        }),
      ],
    };
  };


/**
 * ---------------------------------------------------------
 * FLAGSHIP BUSINESS INTELLIGENCE REPORT
 * ---------------------------------------------------------
 */

const buildBusinessIntelligenceReport =
  async ({
    businessId,
    period,
  }) => {
    /**
     * Load the main analytics domains concurrently.
     *
     * We intentionally do not calculate any analytics here.
     */

    const [
      businessPerformance,
      conversionIntelligence,
      demandIntelligence,
      categoryBenchmarks,
      growthRecommendations,
      basicPromotions,
      promotionIntelligence,
    ] =
      await Promise.all([
        loadBusinessPerformanceAnalytics({
          businessId,
          period,
        }),

        loadConversionIntelligence({
          businessId,
          period,
        }),

        loadDemandIntelligence({
          businessId,
          period,
        }),

        loadCategoryBenchmarks({
          businessId,
          period,
        }),

        loadGrowthRecommendations({
          businessId,
          period,
        }),

        loadBasicPromotionAnalytics({
          businessId,
          period,
        }),

        loadPromotionIntelligence({
          businessId,
          period,
        }),
      ]);

    const analytics = {
      businessPerformance,
      conversionIntelligence,
      demandIntelligence,
      categoryBenchmarks,
      growthRecommendations,
      basicPromotions,
      promotionIntelligence,
    };

    return {
      analytics,

      sections: [
        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          data:
            buildExecutiveSummary(
              analytics
            ),
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.BUSINESS_PERFORMANCE,

          title:
            "Business Performance",

          data:
            businessPerformance.overview,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.LISTING_PERFORMANCE,

          title:
            "Listing Performance",

          data: {
            listings:
              businessPerformance.listings,

            topListings:
              businessPerformance.topListings,
          },
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.OFFER_PERFORMANCE,

          title:
            "Offer Performance",

          data:
            businessPerformance.offers,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.TRADE_PERFORMANCE,

          title:
            "Trade Performance",

          data:
            businessPerformance.trades,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.CONVERSION_FUNNEL,

          title:
            "Conversion Funnel",

          data:
            conversionIntelligence
              ?.funnel ||
            null,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.CONVERSION_INTELLIGENCE,

          title:
            "Conversion Intelligence",

          data:
            conversionIntelligence,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.DEMAND_INTELLIGENCE,

          title:
            "Demand Intelligence",

          data:
            demandIntelligence,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.CATEGORY_BENCHMARKS,

          title:
            "Category Benchmarks",

          data:
            categoryBenchmarks,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PROMOTION_PERFORMANCE,

          title:
            "Promotion Performance",

          data:
            basicPromotions,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PROMOTION_INTELLIGENCE,

          title:
            "Promotion Intelligence",

          data:
            promotionIntelligence,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,

          title:
            "Growth Recommendations",

          data:
            growthRecommendations,
        }),

        createReportSection({
          code:
            BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,

          title:
            "Performance Trends",

          data: {
            business:
              businessPerformance
                ?.performance ||
              null,

            conversion:
              conversionIntelligence
                ?.trends ||
              null,

            demand:
              demandIntelligence
                ?.trends ||
              null,

            promotions:
              promotionIntelligence
                ?.trends ||
              null,
          },
        }),
      ],
    };
  };


/**
 * =========================================================
 * REPORT BUILDER MAP
 * =========================================================
 */

const REPORT_BUILDERS =
  Object.freeze({
    [BUSINESS_REPORT_TYPES.BUSINESS_PERFORMANCE]:
      buildBusinessPerformanceReport,

    [BUSINESS_REPORT_TYPES.LISTING_PERFORMANCE]:
      buildListingPerformanceReport,

    [BUSINESS_REPORT_TYPES.CONVERSION_INTELLIGENCE]:
      buildConversionReport,

    [BUSINESS_REPORT_TYPES.DEMAND_INTELLIGENCE]:
      buildDemandReport,

    [BUSINESS_REPORT_TYPES.CATEGORY_BENCHMARK]:
      buildCategoryBenchmarkReport,

    [BUSINESS_REPORT_TYPES.GROWTH_RECOMMENDATIONS]:
      buildGrowthRecommendationsReport,

    [BUSINESS_REPORT_TYPES.PROMOTION_INTELLIGENCE]:
      buildPromotionIntelligenceReport,

    [BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE]:
      buildBusinessIntelligenceReport,
  });


/**
 * =========================================================
 * SECTION FILTERING
 * =========================================================
 *
 * Report definitions remain the source of truth for which
 * sections belong to a report.
 */

const filterConfiguredSections = (
  sections,
  definition
) => {
  const allowed =
    new Set(
      safeArray(
        definition?.sections
      )
    );

  return safeArray(sections)
    .filter(
      (section) =>
        section &&
        allowed.has(
          section.code
        )
    )
    .slice(
      0,
      BUSINESS_REPORT_EXPORT_LIMITS.MAX_REPORT_SECTIONS
    );
};


/**
 * =========================================================
 * CURRENCY DETECTION
 * =========================================================
 *
 * We do not combine unlike currencies into a fake financial
 * total.
 *
 * This helper only reports a single currency when the
 * available promotion data clearly uses one currency.
 */

const detectReportCurrency = (
  analytics
) => {
  const currencies =
    new Set();

  const inspectPromotionCollection = (
    collection
  ) => {
    for (
      const promotion of
      safeArray(collection)
    ) {
      if (
        promotion?.currency
      ) {
        currencies.add(
          String(
            promotion.currency
          ).toUpperCase()
        );
      }
    }
  };

  const basic =
    analytics?.basicPromotions;

  const advanced =
    analytics?.promotionIntelligence;

  inspectPromotionCollection(
    basic?.promotions
  );

  inspectPromotionCollection(
    advanced?.promotions
  );

  if (
    currencies.size === 1
  ) {
    return [
      ...currencies,
    ][0];
  }

  return null;
};


/**
 * =========================================================
 * FINAL REPORT ASSEMBLY
 * =========================================================
 */

const assembleCanonicalReport = ({
  reportType,
  format,
  definition,
  business,
  period,
  analytics,
  sections,
  analyticsTier,
  timezone,
}) => {
  const dataCoverage =
    buildDataCoverage({
      period,
      analytics,
    });

  const methodology =
    buildMethodology({
      reportType,
    });

  const configuredSections =
    filterConfiguredSections(
      sections,
      definition
    );

  /**
   * Add shared sections only when the report definition
   * allows them.
   */

  const withSharedSections = [
    ...configuredSections,
  ];

  if (
    definition.sections.includes(
      BUSINESS_REPORT_SECTIONS.DATA_COVERAGE
    )
  ) {
    withSharedSections.push(
      createReportSection({
        code:
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,

        title:
          "Data Coverage",

        data:
          dataCoverage,
      })
    );
  }

  if (
    definition.sections.includes(
      BUSINESS_REPORT_SECTIONS.METHODOLOGY
    )
  ) {
    withSharedSections.push(
      createReportSection({
        code:
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,

        title:
          "Methodology",

        data:
          methodology,
      })
    );
  }

  const finalSections =
    withSharedSections.slice(
      0,
      BUSINESS_REPORT_EXPORT_LIMITS.MAX_REPORT_SECTIONS
    );

  const currency =
    detectReportCurrency(
      analytics
    );

  const metadata =
    buildReportMetadata({
      reportType,
      format,
      definition,
      period,
      analyticsTier,
      currency,
      timezone,
    });

  return {
    reportId:
      metadata.reportId,

    reportType,

    title:
      definition.title,

    description:
      definition.description,

    generatedAt:
      metadata.generatedAt,

    version:
      BUSINESS_REPORT_VERSION,

    business:
      buildBusinessMetadata(
        business
      ),

    period: {
      mode:
        period.mode,

      startDate:
        period.startDate,

      endDate:
        period.endDate,

      days:
        period.days,
    },

    metadata,

    summary:
      buildExecutiveSummary(
        analytics
      ),

    sections:
      finalSections,

    dataCoverage,

    methodology,
  };
};


/**
 * =========================================================
 * GENERATE BUSINESS REPORT
 * =========================================================
 *
 * Main public entry point for the reporting service.
 *
 * Expected caller:
 *
 * businessReportController.js
 *
 * SECURITY:
 *
 * `business` MUST already belong to the authenticated user.
 *
 * Business Pro entitlement MUST already have been verified
 * by the controller.
 *
 * This service intentionally does not accept userId or an
 * arbitrary client-supplied businessId as authorization
 * evidence.
 */

export const generateBusinessReport =
  async ({
    business,

    reportType =
      BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE,

    format =
      DEFAULT_BUSINESS_REPORT_FORMAT,

    days =
      BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

    startDate = null,

    endDate = null,

    analyticsTier =
      "BUSINESS_PRO",

    timezone = "UTC",
  } = {}) => {
    /**
     * -----------------------------------------------------
     * BUSINESS
     * -----------------------------------------------------
     */

    if (
      !business ||
      !business.id
    ) {
      const error =
        new Error(
          "A valid business is required to generate a report."
        );

      error.code =
        "BUSINESS_REQUIRED";

      throw error;
    }

    /**
     * -----------------------------------------------------
     * REPORT TYPE / FORMAT
     * -----------------------------------------------------
     */

    const validation =
      validateBusinessReportRequest({
        reportType,
        format,
      });

    if (!validation.valid) {
      const error =
        new Error(
          validation.message
        );

      error.code =
        validation.code;

      throw error;
    }

    /**
     * -----------------------------------------------------
     * REPORT PERIOD
     * -----------------------------------------------------
     */

    let period;

    try {
      period =
        buildBusinessReportPeriod({
          days,
          startDate,
          endDate,
        });
    } catch (error) {
      error.code =
        error.code ||
        "INVALID_REPORT_RANGE";

      throw error;
    }

    /**
     * -----------------------------------------------------
     * BUILDER
     * -----------------------------------------------------
     */

    const builder =
      REPORT_BUILDERS[
        validation.reportType
      ];

    if (!builder) {
      const error =
        new Error(
          "No report builder is registered for this report type."
        );

      error.code =
        "REPORT_BUILDER_NOT_FOUND";

      throw error;
    }

    /**
     * -----------------------------------------------------
     * ANALYTICS
     * -----------------------------------------------------
     */

    const result =
      await builder({
        businessId:
          business.id,

        period,
      });

    /**
     * -----------------------------------------------------
     * CANONICAL REPORT
     * -----------------------------------------------------
     */

    return assembleCanonicalReport({
      reportType:
        validation.reportType,

      format:
        validation.format,

      definition:
        validation.definition,

      business,

      period,

      analytics:
        result.analytics,

      sections:
        result.sections,

      analyticsTier,

      timezone,
    });
  };


/**
 * =========================================================
 * REPORT PREVIEW
 * =========================================================
 *
 * Safe configuration-level preview.
 *
 * This does not load business analytics.
 */

export const getBusinessReportPreview = (
  reportType
) => {
  const normalizedType =
    normalizeBusinessReportType(
      reportType
    );

  if (!normalizedType) {
    return null;
  }

  const definition =
    getBusinessReportDefinition(
      normalizedType
    );

  if (!definition) {
    return null;
  }

  return {
    reportType:
      definition.code,

    title:
      definition.title,

    description:
      definition.description,

    requiredPlan:
      definition.requiredPlan,

    supportedFormats: [
      ...definition.supportedFormats,
    ],

    sections: [
      ...definition.sections,
    ],

    version:
      BUSINESS_REPORT_VERSION,

    history: {
      defaultDays:
        BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

      minDays:
        BUSINESS_REPORT_HISTORY.MIN_DAYS,

      maxDays:
        BUSINESS_REPORT_HISTORY.MAX_DAYS,

      customDateRange:
        BUSINESS_REPORT_HISTORY.CUSTOM_DATE_RANGE,
    },
  };
};


/**
 * =========================================================
 * REPORT CATALOG
 * =========================================================
 */

export const getBusinessReportCatalog =
  () =>
    Object.values(
      BUSINESS_REPORT_TYPES
    )
      .map(
        (
          reportType
        ) =>
          getBusinessReportPreview(
            reportType
          )
      )
      .filter(Boolean);


/**
 * =========================================================
 * REPORT SERVICE CAPABILITIES
 * =========================================================
 */

export const getBusinessReportServiceCapabilities =
  () => ({
    reportVersion:
      BUSINESS_REPORT_VERSION,

    defaultFormat:
      DEFAULT_BUSINESS_REPORT_FORMAT,

    supportedFormats:
      Object.values(
        BUSINESS_REPORT_FORMATS
      ),

    defaultDays:
      BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

    maxHistoryDays:
      BUSINESS_REPORT_HISTORY.MAX_DAYS,

    customDateRange:
      BUSINESS_REPORT_HISTORY.CUSTOM_DATE_RANGE,

    generatedOnDemand: true,

    persistedReports: false,

    scheduledReports: false,
  });