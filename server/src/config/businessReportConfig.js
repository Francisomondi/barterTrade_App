/**
 * =========================================================
 * BUSINESS REPORT CONFIGURATION
 * =========================================================
 *
 * Central configuration for Business Analytics reports.
 *
 * Responsibilities:
 *
 * - Define supported report types.
 * - Define supported export formats.
 * - Define report versions.
 * - Define report history limits.
 * - Define report sections.
 * - Define report capabilities.
 * - Define export constraints.
 * - Define safe report metadata.
 *
 * IMPORTANT:
 *
 * This file DOES NOT:
 *
 * - calculate analytics
 * - query Prisma
 * - check subscriptions
 * - verify business ownership
 * - generate files
 * - generate PDFs
 *
 * Business ownership and Business Pro entitlement remain
 * server-side responsibilities of the controller/service
 * layers.
 */


/**
 * =========================================================
 * REPORT VERSION
 * =========================================================
 *
 * Increment this when the canonical report structure or
 * reporting methodology changes in a meaningful way.
 */

export const BUSINESS_REPORT_VERSION = "1.0";


/**
 * =========================================================
 * REPORT TYPES
 * =========================================================
 */

export const BUSINESS_REPORT_TYPES = Object.freeze({
  BUSINESS_PERFORMANCE:
    "BUSINESS_PERFORMANCE",

  LISTING_PERFORMANCE:
    "LISTING_PERFORMANCE",

  CONVERSION_INTELLIGENCE:
    "CONVERSION_INTELLIGENCE",

  DEMAND_INTELLIGENCE:
    "DEMAND_INTELLIGENCE",

  CATEGORY_BENCHMARK:
    "CATEGORY_BENCHMARK",

  GROWTH_RECOMMENDATIONS:
    "GROWTH_RECOMMENDATIONS",

  PROMOTION_INTELLIGENCE:
    "PROMOTION_INTELLIGENCE",

  BUSINESS_INTELLIGENCE:
    "BUSINESS_INTELLIGENCE",
});


/**
 * =========================================================
 * EXPORT FORMATS
 * =========================================================
 *
 * JSON
 *   Canonical structured report.
 *
 * CSV
 *   Dataset-oriented export.
 *
 * PDF_READY
 *   Structured representation suitable for later PDF
 *   rendering.
 *
 * Actual binary PDF generation is NOT implemented here.
 */

export const BUSINESS_REPORT_FORMATS =
  Object.freeze({
    JSON: "JSON",
    CSV: "CSV",
    PDF_READY: "PDF_READY",
  });


/**
 * =========================================================
 * REPORT ACCESS TIERS
 * =========================================================
 *
 * Reports are currently a Business Pro capability.
 *
 * Keeping access requirements in configuration makes it
 * possible to introduce selected Free reports later without
 * rewriting the reporting engine.
 */

export const BUSINESS_REPORT_ACCESS =
  Object.freeze({
    BUSINESS_PRO: "BUSINESS_PRO",
  });


/**
 * =========================================================
 * REPORT HISTORY
 * =========================================================
 */

export const BUSINESS_REPORT_HISTORY =
  Object.freeze({
    DEFAULT_DAYS: 30,

    MIN_DAYS: 1,

    MAX_DAYS: 365,

    CUSTOM_DATE_RANGE: true,
  });


/**
 * =========================================================
 * EXPORT LIMITS
 * =========================================================
 *
 * These limits protect the API from unexpectedly large
 * report/export requests.
 *
 * They are application-level safety limits and can be
 * adjusted later as production usage becomes clearer.
 */

export const BUSINESS_REPORT_EXPORT_LIMITS =
  Object.freeze({
    /**
     * -----------------------------------------------------
     * ANALYTICS / REPORT COLLECTION LIMITS
     * -----------------------------------------------------
     */

    MAX_LISTING_ROWS:
      5000,

    MAX_PROMOTION_ROWS:
      5000,

    MAX_RECOMMENDATIONS:
      100,

    MAX_REPORT_SECTIONS:
      25,

    /**
     * -----------------------------------------------------
     * REPORTING PERIOD
     * -----------------------------------------------------
     *
     * Business Pro reports currently support at most one
     * year of historical data.
     */

    MAX_EXPORT_DAYS:
      365,

    /**
     * -----------------------------------------------------
     * CSV EXPORT
     * -----------------------------------------------------
     *
     * MAX_CSV_ROWS:
     *
     * Absolute number of exported data rows across the
     * complete CSV export.
     *
     * MAX_CSV_DATASET_ROWS:
     *
     * Maximum rows allowed in any individual CSV dataset.
     *
     * A multi-dataset report must satisfy BOTH limits.
     *
     * Example:
     *
     * dataset A = 5,000
     * dataset B = 5,000
     *
     * total = 10,000
     *
     * Anything beyond the global limit must be truncated
     * explicitly by the CSV export service.
     */

    MAX_CSV_ROWS:
      10000,

    MAX_CSV_DATASET_ROWS:
      5000,

    /**
     * -----------------------------------------------------
     * JSON EXPORT
     * -----------------------------------------------------
     *
     * JSON exports are rejected when the final serialized
     * UTF-8 payload exceeds 5 MiB.
     *
     * Unlike CSV/PDF_READY, JSON should not silently truncate
     * the canonical report because doing so could make the
     * structured export semantically incomplete.
     */

    MAX_JSON_BYTES:
      5 * 1024 * 1024,

    /**
     * Maximum recursive serialization depth.
     *
     * Protects against pathological or unexpectedly deeply
     * nested report structures.
     */

    MAX_JSON_DEPTH:
      30,

    /**
     * -----------------------------------------------------
     * PDF-READY EXPORT
     * -----------------------------------------------------
     *
     * PDF_READY is structured rendering data.
     *
     * It is NOT a binary PDF.
     *
     * These limits keep future rendering payloads bounded.
     */

    MAX_PDF_READY_SECTIONS:
      25,

    /**
     * Maximum number of collection rows/items retained
     * within one PDF-ready section.
     */

    MAX_PDF_READY_SECTION_ROWS:
      5000,

    /**
     * Maximum number of collection rows/items retained
     * across the complete PDF-ready document.
     */

    MAX_PDF_READY_ROWS:
      10000,
  });

/**
 * =========================================================
 * REPORT SECTION CODES
 * =========================================================
 *
 * These codes provide a stable internal representation of
 * report sections.
 */

export const BUSINESS_REPORT_SECTIONS =
  Object.freeze({
    EXECUTIVE_SUMMARY:
      "EXECUTIVE_SUMMARY",

    BUSINESS_PERFORMANCE:
      "BUSINESS_PERFORMANCE",

    LISTING_PERFORMANCE:
      "LISTING_PERFORMANCE",

    OFFER_PERFORMANCE:
      "OFFER_PERFORMANCE",

    TRADE_PERFORMANCE:
      "TRADE_PERFORMANCE",

    CONVERSION_FUNNEL:
      "CONVERSION_FUNNEL",

    CONVERSION_INTELLIGENCE:
      "CONVERSION_INTELLIGENCE",

    DEMAND_INTELLIGENCE:
      "DEMAND_INTELLIGENCE",

    CATEGORY_BENCHMARKS:
      "CATEGORY_BENCHMARKS",

    GROWTH_RECOMMENDATIONS:
      "GROWTH_RECOMMENDATIONS",

    PROMOTION_PERFORMANCE:
      "PROMOTION_PERFORMANCE",

    PROMOTION_INTELLIGENCE:
      "PROMOTION_INTELLIGENCE",

    PERFORMANCE_TRENDS:
      "PERFORMANCE_TRENDS",

    METHODOLOGY:
      "METHODOLOGY",

    DATA_COVERAGE:
      "DATA_COVERAGE",
  });


/**
 * =========================================================
 * REPORT DEFINITIONS
 * =========================================================
 *
 * Each report definition describes:
 *
 * - code
 * - title
 * - description
 * - required access tier
 * - supported formats
 * - included sections
 *
 * Analytics calculations themselves remain inside the
 * analytics service.
 */

export const BUSINESS_REPORT_DEFINITIONS =
  Object.freeze({
    /**
     * -----------------------------------------------------
     * BUSINESS PERFORMANCE
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.BUSINESS_PERFORMANCE]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.BUSINESS_PERFORMANCE,

        title:
          "Business Performance Report",

        description:
          "A consolidated view of business activity, listing performance, offers, trades, and performance trends.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.BUSINESS_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.LISTING_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.OFFER_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.TRADE_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * LISTING PERFORMANCE
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.LISTING_PERFORMANCE]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.LISTING_PERFORMANCE,

        title:
          "Listing Performance Report",

        description:
          "Detailed performance analysis for business listings, including visibility, engagement, offers, and trade outcomes.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.LISTING_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * CONVERSION INTELLIGENCE
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.CONVERSION_INTELLIGENCE]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.CONVERSION_INTELLIGENCE,

        title:
          "Conversion Intelligence Report",

        description:
          "Analysis of the business conversion funnel from listing visibility and engagement through offers and completed trades.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.CONVERSION_FUNNEL,
          BUSINESS_REPORT_SECTIONS.CONVERSION_INTELLIGENCE,
          BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,
          BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * DEMAND INTELLIGENCE
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.DEMAND_INTELLIGENCE]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.DEMAND_INTELLIGENCE,

        title:
          "Demand Intelligence Report",

        description:
          "Business-relative analysis of demand signals, listing interest, marketplace engagement, and emerging opportunities.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.DEMAND_INTELLIGENCE,
          BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,
          BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * CATEGORY BENCHMARK
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.CATEGORY_BENCHMARK]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.CATEGORY_BENCHMARK,

        title:
          "Category Benchmark Report",

        description:
          "Privacy-safe comparison of business performance with aggregated marketplace category benchmarks.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.CATEGORY_BENCHMARKS,
          BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * GROWTH RECOMMENDATIONS
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.GROWTH_RECOMMENDATIONS]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.GROWTH_RECOMMENDATIONS,

        title:
          "Growth Recommendations Report",

        description:
          "Prioritized, deterministic business growth recommendations derived from existing analytics intelligence.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * PROMOTION INTELLIGENCE
     * -----------------------------------------------------
     */

    [BUSINESS_REPORT_TYPES.PROMOTION_INTELLIGENCE]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.PROMOTION_INTELLIGENCE,

        title:
          "Promotion Intelligence Report",

        description:
          "Advanced analysis of promotion traffic, engagement, observed uplift, cost efficiency, and marketplace outcomes observed during promotion periods.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.PROMOTION_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.PROMOTION_INTELLIGENCE,
          BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,
          BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),


    /**
     * -----------------------------------------------------
     * BUSINESS INTELLIGENCE
     * -----------------------------------------------------
     *
     * Flagship Business Pro report.
     */

    [BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE]:
      Object.freeze({
        code:
          BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE,

        title:
          "Business Intelligence Report",

        description:
          "A comprehensive Business Pro report combining performance, conversion, demand, category benchmarks, promotion intelligence, and growth recommendations.",

        requiredPlan:
          BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

        supportedFormats: Object.freeze([
          BUSINESS_REPORT_FORMATS.JSON,
          BUSINESS_REPORT_FORMATS.CSV,
          BUSINESS_REPORT_FORMATS.PDF_READY,
        ]),

        sections: Object.freeze([
          BUSINESS_REPORT_SECTIONS.EXECUTIVE_SUMMARY,
          BUSINESS_REPORT_SECTIONS.BUSINESS_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.LISTING_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.OFFER_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.TRADE_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.CONVERSION_FUNNEL,
          BUSINESS_REPORT_SECTIONS.CONVERSION_INTELLIGENCE,
          BUSINESS_REPORT_SECTIONS.DEMAND_INTELLIGENCE,
          BUSINESS_REPORT_SECTIONS.CATEGORY_BENCHMARKS,
          BUSINESS_REPORT_SECTIONS.PROMOTION_PERFORMANCE,
          BUSINESS_REPORT_SECTIONS.PROMOTION_INTELLIGENCE,
          BUSINESS_REPORT_SECTIONS.GROWTH_RECOMMENDATIONS,
          BUSINESS_REPORT_SECTIONS.PERFORMANCE_TRENDS,
          BUSINESS_REPORT_SECTIONS.DATA_COVERAGE,
          BUSINESS_REPORT_SECTIONS.METHODOLOGY,
        ]),
      }),
  });


/**
 * =========================================================
 * REPORT TYPE HELPERS
 * =========================================================
 */

export const getSupportedBusinessReportTypes = () =>
  Object.values(BUSINESS_REPORT_TYPES);


/**
 * Return true when a report type is registered.
 */

export const isSupportedBusinessReportType = (
  reportType
) => {
  if (!reportType) {
    return false;
  }

  return Boolean(
    BUSINESS_REPORT_DEFINITIONS[
      String(reportType).toUpperCase()
    ]
  );
};


/**
 * Return a report definition.
 */

export const getBusinessReportDefinition = (
  reportType
) => {
  if (!reportType) {
    return null;
  }

  return (
    BUSINESS_REPORT_DEFINITIONS[
      String(reportType).toUpperCase()
    ] || null
  );
};


/**
 * =========================================================
 * FORMAT HELPERS
 * =========================================================
 */

export const getSupportedBusinessReportFormats =
  () =>
    Object.values(
      BUSINESS_REPORT_FORMATS
    );


export const isSupportedBusinessReportFormat = (
  format
) => {
  if (!format) {
    return false;
  }

  const normalized =
    String(format).toUpperCase();

  return getSupportedBusinessReportFormats().includes(
    normalized
  );
};


/**
 * Determine whether a particular report supports a
 * requested export format.
 */

export const isFormatSupportedForBusinessReport = (
  reportType,
  format
) => {
  const definition =
    getBusinessReportDefinition(reportType);

  if (!definition || !format) {
    return false;
  }

  const normalizedFormat =
    String(format).toUpperCase();

  return definition.supportedFormats.includes(
    normalizedFormat
  );
};


/**
 * =========================================================
 * REPORT NORMALIZATION
 * =========================================================
 */

export const normalizeBusinessReportType = (
  reportType
) => {
  if (!reportType) {
    return null;
  }

  const normalized =
    String(reportType)
      .trim()
      .toUpperCase();

  return isSupportedBusinessReportType(
    normalized
  )
    ? normalized
    : null;
};


export const normalizeBusinessReportFormat = (
  format
) => {
  if (!format) {
    return null;
  }

  const normalized =
    String(format)
      .trim()
      .toUpperCase();

  return isSupportedBusinessReportFormat(
    normalized
  )
    ? normalized
    : null;
};


/**
 * =========================================================
 * REPORT CAPABILITIES
 * =========================================================
 *
 * Useful later for the frontend upgrade/report UI.
 */

export const BUSINESS_REPORT_CAPABILITIES =
  Object.freeze({
    REPORT_GENERATION: true,

    JSON_EXPORT: true,

    CSV_EXPORT: true,

    PDF_READY_EXPORT: true,

    CUSTOM_DATE_RANGE: true,

    EXTENDED_HISTORY: true,

    SAVED_REPORTS: false,

    SCHEDULED_REPORTS: false,

    EMAIL_DELIVERY: false,

    REPORT_HISTORY: false,
  });


/**
 * =========================================================
 * SAFE PUBLIC CONFIGURATION
 * =========================================================
 *
 * Returns information that can safely be exposed to an
 * authenticated frontend.
 *
 * It intentionally contains no internal implementation
 * details or subscription state.
 */

export const getBusinessReportPublicConfig =
  () => ({
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

    formats:
      getSupportedBusinessReportFormats(),

    reportTypes:
      Object.values(
        BUSINESS_REPORT_DEFINITIONS
      ).map((definition) => ({
        code: definition.code,
        title: definition.title,
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
      })),

    capabilities: {
      ...BUSINESS_REPORT_CAPABILITIES,
    },
  });


/**
 * =========================================================
 * DEFAULT EXPORT FORMAT
 * =========================================================
 */

export const DEFAULT_BUSINESS_REPORT_FORMAT =
  BUSINESS_REPORT_FORMATS.JSON;


/**
 * =========================================================
 * DEFAULT REPORT TYPE
 * =========================================================
 *
 * Business Intelligence is the flagship Business Pro
 * reporting experience.
 */

export const DEFAULT_BUSINESS_REPORT_TYPE =
  BUSINESS_REPORT_TYPES.BUSINESS_INTELLIGENCE;