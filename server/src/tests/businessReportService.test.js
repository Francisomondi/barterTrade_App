// CREATE — server/src/tests/businessReportService.test.js

import assert from "node:assert/strict";

import {
  BUSINESS_REPORT_VERSION,
  BUSINESS_REPORT_TYPES,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_HISTORY,
  BUSINESS_REPORT_SECTIONS,
  BUSINESS_REPORT_EXPORT_LIMITS,
  DEFAULT_BUSINESS_REPORT_FORMAT,
} from "../config/businessReportConfig.js";

import {
  buildBusinessReportPeriod,
  validateBusinessReportRequest,
  generateBusinessReport,
  getBusinessReportPreview,
  getBusinessReportCatalog,
  getBusinessReportServiceCapabilities,
} from "../services/businessReportService.js";


/**
 * =========================================================
 * BUSINESS REPORT SERVICE TESTS
 * =========================================================
 *
 * Roadmap:
 *
 * 9.11.19.20.4 — Canonical Report Service
 *
 * Unit-level verification only.
 *
 * Real analytics services / Prisma are NOT called.
 * =========================================================
 */


/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const BUSINESS_ID =
  "business-001";

const business = {
  id: BUSINESS_ID,

  businessName:
    "Francis Test Store",

  slug:
    "francis-test-store",

  category:
    "FURNITURE",

  status:
    "ACTIVE",

  verificationStatus:
    "VERIFIED",

  // Must not be copied into canonical business metadata.
  userId:
    "private-user-id",

  phone:
    "0700000000",

  internalSecret:
    "do-not-expose",
};


const fakeAnalytics = {
  businessPerformance: {
    overview: {
      activeListings: 12,
      offersReceived: 8,
      completedTrades: 3,
    },

    listings: {
      total: 12,
    },

    topListings: [
      {
        id: "listing-1",
        title: "Table",
      },
    ],

    offers: {
      received: 8,
    },

    trades: {
      completed: 3,
    },

    performance: {
      trend: "UP",
    },
  },
};


/**
 * The fake builder lets us exercise the canonical report
 * assembly without calling Prisma-backed analytics services.
 */
const canonicalTestBuilder =
  async ({
    businessId,
    period,
  }) => {
    assert.equal(
      businessId,
      BUSINESS_ID
    );

    assert.ok(
      period
    );

    return {
      analytics:
        fakeAnalytics,

      sections: [
        {
          code:
            BUSINESS_REPORT_SECTIONS
              .EXECUTIVE_SUMMARY,

          title:
            "Executive Summary",

          available:
            true,

          data: {
            overview:
              fakeAnalytics
                .businessPerformance
                .overview,
          },

          notes: [],
        },

        {
          code:
            BUSINESS_REPORT_SECTIONS
              .BUSINESS_PERFORMANCE,

          title:
            "Business Performance",

          available:
            true,

          data:
            fakeAnalytics
              .businessPerformance
              .overview,

          notes: [],
        },

        {
          code:
            BUSINESS_REPORT_SECTIONS
              .LISTING_PERFORMANCE,

          title:
            "Listing Performance",

          available:
            true,

          data: {
            listings:
              fakeAnalytics
                .businessPerformance
                .listings,

            topListings:
              fakeAnalytics
                .businessPerformance
                .topListings,
          },

          notes: [],
        },

        {
          code:
            BUSINESS_REPORT_SECTIONS
              .OFFER_PERFORMANCE,

          title:
            "Offer Performance",

          available:
            true,

          data:
            fakeAnalytics
              .businessPerformance
              .offers,

          notes: [],
        },

        {
          code:
            BUSINESS_REPORT_SECTIONS
              .TRADE_PERFORMANCE,

          title:
            "Trade Performance",

          available:
            true,

          data:
            fakeAnalytics
              .businessPerformance
              .trades,

          notes: [],
        },

        {
          code:
            BUSINESS_REPORT_SECTIONS
              .PERFORMANCE_TRENDS,

          title:
            "Performance Trends",

          available:
            true,

          data:
            fakeAnalytics
              .businessPerformance
              .performance,

          notes: [],
        },

        /**
         * This is deliberately not configured for the
         * Business Performance report.
         */
        {
          code:
            BUSINESS_REPORT_SECTIONS
              .CATEGORY_BENCHMARKS,

          title:
            "Should Be Removed",

          available:
            true,

          data: {
            leaked:
              true,
          },

          notes: [],
        },
      ],
    };
  };


const promotionTestBuilder =
  async () => ({
    analytics: {
      promotionIntelligence: {
        summary: {
          promotions:
            1,
        },

        promotions: [
          {
            id:
              "promotion-1",

            currency:
              "KES",

            uplift: {
              available:
                false,

              baselineAvailable:
                false,
            },
          },
        ],
      },
    },

    sections: [
      {
        code:
          BUSINESS_REPORT_SECTIONS
            .EXECUTIVE_SUMMARY,

        title:
          "Executive Summary",

        available:
          true,

        data: {
          promotions:
            1,
        },

        notes: [],
      },

      {
        code:
          BUSINESS_REPORT_SECTIONS
            .PROMOTION_INTELLIGENCE,

        title:
          "Promotion Intelligence",

        available:
          true,

        data: {
          observed:
            true,
        },

        notes: [],
      },
    ],
  });


const singleCurrencyPromotionBuilder =
  async () => ({
    analytics: {
      basicPromotions: {
        promotions: [
          {
            id: "p1",
            currency: "kes",
          },

          {
            id: "p2",
            currency: "KES",
          },
        ],
      },

      promotionIntelligence: {
        promotions: [],
      },
    },

    sections: [
      {
        code:
          BUSINESS_REPORT_SECTIONS
            .EXECUTIVE_SUMMARY,

        title:
          "Executive Summary",

        available:
          true,

        data: {},

        notes: [],
      },

      {
        code:
          BUSINESS_REPORT_SECTIONS
            .PROMOTION_PERFORMANCE,

        title:
          "Promotion Performance",

        available:
          true,

        data: {},

        notes: [],
      },
    ],
  });


const mixedCurrencyPromotionBuilder =
  async () => ({
    analytics: {
      basicPromotions: {
        promotions: [
          {
            currency:
              "KES",
          },

          {
            currency:
              "USD",
          },
        ],
      },

      promotionIntelligence: {
        promotions: [],
      },
    },

    sections: [
      {
        code:
          BUSINESS_REPORT_SECTIONS
            .EXECUTIVE_SUMMARY,

        title:
          "Executive Summary",

        available:
          true,

        data: {},

        notes: [],
      },
    ],
  });


/**
 * =========================================================
 * TEST RUNNER
 * =========================================================
 */

const runTest = async (
  name,
  callback
) => {
  try {
    await callback();

    console.log(
      `✅ ${name}`
    );

    return {
      name,
      passed: true,
    };
  } catch (error) {
    console.error(
      `❌ ${name}`
    );

    console.error(
      error
    );

    return {
      name,
      passed: false,
      error,
    };
  }
};


/**
 * =========================================================
 * PERIOD TESTS
 * =========================================================
 */

const testDefaultRelativePeriod =
  () => {
    const period =
      buildBusinessReportPeriod();

    assert.equal(
      period.mode,
      "RELATIVE"
    );

    assert.equal(
      period.days,
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS
    );

    assert.ok(
      period.start instanceof Date
    );

    assert.ok(
      period.end instanceof Date
    );

    assert.equal(
      typeof period.startDate,
      "string"
    );

    assert.equal(
      typeof period.endDate,
      "string"
    );
  };


const testRelativePeriod =
  () => {
    const period =
      buildBusinessReportPeriod({
        days: 7,
      });

    assert.equal(
      period.mode,
      "RELATIVE"
    );

    assert.equal(
      period.days,
      7
    );

    assert.ok(
      period.start.getTime() <=
        period.end.getTime()
    );
  };


const testStringDaysNormalized =
  () => {
    const period =
      buildBusinessReportPeriod({
        days:
          "30",
      });

    assert.equal(
      period.days,
      30
    );
  };


const testInvalidRelativeDays =
  () => {
    for (
      const days
      of [
        0,
        -1,
        "abc",
      ]
    ) {
      assert.throws(
        () =>
          buildBusinessReportPeriod({
            days,
          })
      );
    }
  };


const testRelativeHistoryLimit =
  () => {
    assert.throws(
      () =>
        buildBusinessReportPeriod({
          days:
            BUSINESS_REPORT_HISTORY
              .MAX_DAYS + 1,
        }),

      /limited/i
    );
  };


const testCustomPeriod =
  () => {
    const period =
      buildBusinessReportPeriod({
        startDate:
          "2026-09-01",

        endDate:
          "2026-09-30",
      });

    assert.equal(
      period.mode,
      "CUSTOM"
    );

    assert.equal(
      period.days,
      30
    );

    assert.ok(
      period.start instanceof Date
    );

    assert.ok(
      period.end instanceof Date
    );

    assert.equal(
      period.startDate,
      period.start.toISOString()
    );

    assert.equal(
      period.endDate,
      period.end.toISOString()
    );
  };


const testCustomRangeRequiresBothDates =
  () => {
    assert.throws(
      () =>
        buildBusinessReportPeriod({
          startDate:
            "2026-09-01",
        }),

      /both startDate and endDate/i
    );

    assert.throws(
      () =>
        buildBusinessReportPeriod({
          endDate:
            "2026-09-30",
        }),

      /both startDate and endDate/i
    );
  };


const testInvalidCustomDates =
  () => {
    assert.throws(
      () =>
        buildBusinessReportPeriod({
          startDate:
            "not-a-date",

          endDate:
            "2026-09-30",
        }),

      /invalid report date range/i
    );
  };


const testReversedCustomRange =
  () => {
    assert.throws(
      () =>
        buildBusinessReportPeriod({
          startDate:
            "2026-09-30",

          endDate:
            "2026-09-01",
        }),

      /cannot be after/i
    );
  };


const testCustomHistoryLimit =
  () => {
    assert.throws(
      () =>
        buildBusinessReportPeriod({
          startDate:
            "2025-01-01",

          endDate:
            "2026-09-01",
        }),

      /limited/i
    );
  };


/**
 * =========================================================
 * REQUEST VALIDATION
 * =========================================================
 */

const testValidRequest =
  () => {
    const result =
      validateBusinessReportRequest({
        reportType:
          " business_performance ",

        format:
          " json ",
      });

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_PERFORMANCE
    );

    assert.equal(
      result.format,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.ok(
      result.definition
    );
  };


const testDefaultFormat =
  () => {
    const result =
      validateBusinessReportRequest({
        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,
      });

    assert.equal(
      result.valid,
      true
    );

    assert.equal(
      result.format,
      DEFAULT_BUSINESS_REPORT_FORMAT
    );
  };


const testUnsupportedReportType =
  () => {
    const result =
      validateBusinessReportRequest({
        reportType:
          "NOT_A_REPORT",

        format:
          BUSINESS_REPORT_FORMATS.JSON,
      });

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.code,
      "UNSUPPORTED_REPORT_TYPE"
    );
  };


const testUnsupportedFormat =
  () => {
    const result =
      validateBusinessReportRequest({
        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        format:
          "XLSX",
      });

    assert.equal(
      result.valid,
      false
    );

    assert.equal(
      result.code,
      "UNSUPPORTED_REPORT_FORMAT"
    );
  };


/**
 * =========================================================
 * CANONICAL GENERATION
 * =========================================================
 */

const generateCanonicalFixture =
  () =>
    generateBusinessReport({
      business,

      reportType:
        BUSINESS_REPORT_TYPES
          .BUSINESS_PERFORMANCE,

      format:
        BUSINESS_REPORT_FORMATS.JSON,

      days:
        30,

      analyticsTier:
        "BUSINESS_PRO",

      timezone:
        "Africa/Nairobi",

      reportBuilder:
        canonicalTestBuilder,
    });


const testBusinessRequired =
  async () => {
    await assert.rejects(
      () =>
        generateBusinessReport({
          business:
            null,

          reportType:
            BUSINESS_REPORT_TYPES
              .BUSINESS_PERFORMANCE,

          reportBuilder:
            canonicalTestBuilder,
        }),

      (error) => {
        assert.equal(
          error.code,
          "BUSINESS_REQUIRED"
        );

        return true;
      }
    );
  };


const testGenerationRejectsUnsupportedReport =
  async () => {
    await assert.rejects(
      () =>
        generateBusinessReport({
          business,

          reportType:
            "NOT_A_REPORT",

          reportBuilder:
            canonicalTestBuilder,
        }),

      (error) => {
        assert.equal(
          error.code,
          "UNSUPPORTED_REPORT_TYPE"
        );

        return true;
      }
    );
  };


const testGenerationRejectsUnsupportedFormat =
  async () => {
    await assert.rejects(
      () =>
        generateBusinessReport({
          business,

          reportType:
            BUSINESS_REPORT_TYPES
              .BUSINESS_PERFORMANCE,

          format:
            "XLSX",

          reportBuilder:
            canonicalTestBuilder,
        }),

      (error) => {
        assert.equal(
          error.code,
          "UNSUPPORTED_REPORT_FORMAT"
        );

        return true;
      }
    );
  };


const testGenerationMapsPeriodErrors =
  async () => {
    await assert.rejects(
      () =>
        generateBusinessReport({
          business,

          reportType:
            BUSINESS_REPORT_TYPES
              .BUSINESS_PERFORMANCE,

          days:
            0,

          reportBuilder:
            canonicalTestBuilder,
        }),

      (error) => {
        assert.equal(
          error.code,
          "INVALID_REPORT_RANGE"
        );

        return true;
      }
    );
  };


const testCanonicalIdentity =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.match(
      report.reportId,
      /^rpt_[a-f0-9]{32}$/i
    );

    assert.equal(
      report.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_PERFORMANCE
    );

    assert.equal(
      report.version,
      BUSINESS_REPORT_VERSION
    );

    assert.equal(
      typeof report.title,
      "string"
    );

    assert.equal(
      typeof report.description,
      "string"
    );

    assert.equal(
      Number.isNaN(
        Date.parse(
          report.generatedAt
        )
      ),
      false
    );
  };


const testCanonicalBusinessMetadata =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.deepEqual(
      report.business,
      {
        id:
          BUSINESS_ID,

        businessName:
          "Francis Test Store",

        slug:
          "francis-test-store",

        category:
          "FURNITURE",

        status:
          "ACTIVE",

        verificationStatus:
          "VERIFIED",
      }
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          report.business,
          "userId"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          report.business,
          "phone"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          report.business,
          "internalSecret"
        ),
      false
    );
  };


const testCanonicalPeriod =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.equal(
      report.period.mode,
      "RELATIVE"
    );

    assert.equal(
      report.period.days,
      30
    );

    assert.equal(
      Number.isNaN(
        Date.parse(
          report.period.startDate
        )
      ),
      false
    );

    assert.equal(
      Number.isNaN(
        Date.parse(
          report.period.endDate
        )
      ),
      false
    );
  };


const testCanonicalMetadata =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.equal(
      report.metadata.reportId,
      report.reportId
    );

    assert.equal(
      report.metadata.reportVersion,
      BUSINESS_REPORT_VERSION
    );

    assert.equal(
      report.metadata.reportType,
      report.reportType
    );

    assert.equal(
      report.metadata.requestedFormat,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.equal(
      report.metadata.analyticsTier,
      "BUSINESS_PRO"
    );

    assert.equal(
      report.metadata.timezone,
      "Africa/Nairobi"
    );

    assert.deepEqual(
      report.metadata.period,
      report.period
    );
  };


const testSummaryPreservesAnalyticsObjects =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.deepEqual(
      report.summary.overview,
      fakeAnalytics
        .businessPerformance
        .overview
    );

    assert.equal(
      report.summary.conversion,
      null
    );

    assert.equal(
      report.summary.demand,
      null
    );

    assert.equal(
      report.summary.promotions,
      null
    );
  };


/**
 * =========================================================
 * SECTION POLICY
 * =========================================================
 */

const testSectionsFilteredByDefinition =
  async () => {
    const report =
      await generateCanonicalFixture();

    const codes =
      report.sections.map(
        (section) =>
          section.code
      );

    assert.equal(
      codes.includes(
        BUSINESS_REPORT_SECTIONS
          .CATEGORY_BENCHMARKS
      ),
      false,
      "Unconfigured sections must not survive canonical assembly."
    );

    assert.equal(
      codes.includes(
        BUSINESS_REPORT_SECTIONS
          .BUSINESS_PERFORMANCE
      ),
      true
    );
  };


const testSharedSectionsAdded =
  async () => {
    const report =
      await generateCanonicalFixture();

    const codes =
      report.sections.map(
        (section) =>
          section.code
      );

    assert.equal(
      codes.includes(
        BUSINESS_REPORT_SECTIONS
          .DATA_COVERAGE
      ),
      true
    );

    assert.equal(
      codes.includes(
        BUSINESS_REPORT_SECTIONS
          .METHODOLOGY
      ),
      true
    );
  };


const testSectionLimit =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.ok(
      report.sections.length <=
        BUSINESS_REPORT_EXPORT_LIMITS
          .MAX_REPORT_SECTIONS
    );
  };


const testSectionsHaveCanonicalShape =
  async () => {
    const report =
      await generateCanonicalFixture();

    for (
      const section
      of report.sections
    ) {
      assert.equal(
        typeof section.code,
        "string"
      );

      assert.equal(
        typeof section.title,
        "string"
      );

      assert.equal(
        typeof section.available,
        "boolean"
      );

      assert.ok(
        Array.isArray(
          section.notes
        )
      );

      assert.equal(
        Object.prototype
          .hasOwnProperty.call(
            section,
            "data"
          ),
        true
      );
    }
  };


/**
 * =========================================================
 * DATA COVERAGE / METHODOLOGY
 * =========================================================
 */

const testNormalDataCoverage =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.equal(
      report.dataCoverage.complete,
      true
    );

    assert.equal(
      report.dataCoverage
        .unavailablePromotionBaselines,
      0
    );

assert.deepEqual(
  report.dataCoverage
    .requestedPeriod,
  {
    startDate:
      report.period
        .startDate,

    endDate:
      report.period
        .endDate,

    days:
      report.period
        .days,
  }
);

    assert.ok(
      Array.isArray(
        report.dataCoverage.notes
      )
    );
  };


const testPromotionCoverageDetectsMissingBaseline =
  async () => {
    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .PROMOTION_INTELLIGENCE,

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        days:
          30,

        reportBuilder:
          promotionTestBuilder,
      });

    assert.equal(
      report.dataCoverage.complete,
      false
    );

    assert.equal(
      report.dataCoverage
        .unavailablePromotionBaselines,
      1
    );

    assert.equal(
      report.dataCoverage.notes.some(
        (note) =>
          /comparison data/i.test(
            note
          )
      ),
      true
    );
  };


const testMethodologyStatesNoFormulaRecalculation =
  async () => {
    const report =
      await generateCanonicalFixture();

    assert.equal(
      report.methodology.notes.some(
        (note) =>
          /does not independently recalculate analytics formulas/i.test(
            note
          )
      ),
      true
    );
  };


const testPromotionMethodologyNonCausal =
  async () => {
    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .PROMOTION_INTELLIGENCE,

        reportBuilder:
          promotionTestBuilder,
      });

    const methodologyText =
      report.methodology.notes.join(
        " "
      );

    assert.match(
      methodologyText,
      /do not establish causal attribution/i
    );

    assert.match(
      methodologyText,
      /not treated as financial revenue, profit, or return on investment/i
    );
  };


const testBenchmarkMethodologyPrivacy =
  async () => {
    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .CATEGORY_BENCHMARK,

        reportBuilder:
          async () => ({
            analytics: {
              categoryBenchmarks: {
                summary: {},
              },
            },

            sections: [
              {
                code:
                  BUSINESS_REPORT_SECTIONS
                    .EXECUTIVE_SUMMARY,

                title:
                  "Executive Summary",

                available:
                  true,

                data: {},

                notes: [],
              },

              {
                code:
                  BUSINESS_REPORT_SECTIONS
                    .CATEGORY_BENCHMARKS,

                title:
                  "Category Benchmarks",

                available:
                  true,

                data: {},

                notes: [],
              },
            ],
          }),
      });

    assert.equal(
      report.methodology.notes.some(
        (note) =>
          /aggregated marketplace cohorts/i.test(
            note
          ) &&
          /do not expose individual competitor performance/i.test(
            note
          )
      ),
      true
    );
  };


/**
 * =========================================================
 * CURRENCY
 * =========================================================
 */

const testSingleCurrencyDetected =
  async () => {
    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .PROMOTION_INTELLIGENCE,

        reportBuilder:
          singleCurrencyPromotionBuilder,
      });

    assert.equal(
      report.metadata.currency,
      "KES"
    );
  };


const testMixedCurrencyNotCollapsed =
  async () => {
    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .PROMOTION_INTELLIGENCE,

        reportBuilder:
          mixedCurrencyPromotionBuilder,
      });

    assert.equal(
      report.metadata.currency,
      null,
      "Mixed currencies must not be collapsed into a fake single currency."
    );
  };


/**
 * =========================================================
 * PREVIEW
 * =========================================================
 */

const testValidPreview =
  () => {
    const preview =
      getBusinessReportPreview(
        " business_intelligence "
      );

    assert.ok(
      preview
    );

    assert.equal(
      preview.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_INTELLIGENCE
    );

    assert.equal(
      preview.version,
      BUSINESS_REPORT_VERSION
    );

    assert.equal(
      preview.requiredPlan,
      "BUSINESS_PRO"
    );

    assert.ok(
      Array.isArray(
        preview.supportedFormats
      )
    );

    assert.ok(
      Array.isArray(
        preview.sections
      )
    );

    assert.equal(
      preview.history.maxDays,
      BUSINESS_REPORT_HISTORY
        .MAX_DAYS
    );
  };


const testInvalidPreview =
  () => {
    assert.equal(
      getBusinessReportPreview(
        "NOT_A_REPORT"
      ),
      null
    );
  };


/**
 * =========================================================
 * CATALOG
 * =========================================================
 */

const testReportCatalog =
  () => {
    const catalog =
      getBusinessReportCatalog();

    assert.equal(
      catalog.length,
      Object.values(
        BUSINESS_REPORT_TYPES
      ).length
    );

    const catalogTypes =
      catalog.map(
        (report) =>
          report.reportType
      );

    assert.deepEqual(
      new Set(
        catalogTypes
      ),
      new Set(
        Object.values(
          BUSINESS_REPORT_TYPES
        )
      )
    );
  };


const testCatalogContainsNoAnalytics =
  () => {
    const catalog =
      getBusinessReportCatalog();

    for (
      const report
      of catalog
    ) {
      assert.equal(
        Object.prototype
          .hasOwnProperty.call(
            report,
            "analytics"
          ),
        false
      );

      assert.equal(
        Object.prototype
          .hasOwnProperty.call(
            report,
            "data"
          ),
        false
      );
    }
  };


/**
 * =========================================================
 * CAPABILITIES
 * =========================================================
 */

const testServiceCapabilities =
  () => {
    const capabilities =
      getBusinessReportServiceCapabilities();

    assert.equal(
      capabilities.reportVersion,
      BUSINESS_REPORT_VERSION
    );

    assert.equal(
      capabilities.defaultFormat,
      DEFAULT_BUSINESS_REPORT_FORMAT
    );

    assert.deepEqual(
      new Set(
        capabilities.supportedFormats
      ),
      new Set(
        Object.values(
          BUSINESS_REPORT_FORMATS
        )
      )
    );

    assert.equal(
      capabilities.defaultDays,
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS
    );

    assert.equal(
      capabilities.maxHistoryDays,
      BUSINESS_REPORT_HISTORY
        .MAX_DAYS
    );

    assert.equal(
      capabilities.customDateRange,
      BUSINESS_REPORT_HISTORY
        .CUSTOM_DATE_RANGE
    );

    assert.equal(
      capabilities.generatedOnDemand,
      true
    );

    assert.equal(
      capabilities.persistedReports,
      false
    );

    assert.equal(
      capabilities.scheduledReports,
      false
    );
  };


/**
 * =========================================================
 * REPORT BUILDER CONTRACT
 * =========================================================
 */

const testInjectedBuilderReceivesBusinessAndPeriod =
  async () => {
    let received =
      null;

    const builder =
      async (options) => {
        received =
          options;

        return {
          analytics: {},

          sections: [],
        };
      };

    await generateBusinessReport({
      business,

      reportType:
        BUSINESS_REPORT_TYPES
          .BUSINESS_PERFORMANCE,

      days:
        14,

      reportBuilder:
        builder,
    });

    assert.equal(
      received.businessId,
      BUSINESS_ID
    );

    assert.equal(
      received.period.days,
      14
    );

    assert.equal(
      received.period.mode,
      "RELATIVE"
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          received,
          "userId"
        ),
      false,
      "Canonical service must not pass user identity as analytics authorization evidence."
    );
  };


const testBuilderAnalyticsNotRecalculated =
  async () => {
    const analyticsObject = {
      businessPerformance: {
        overview: {
          exactMetric:
            37.125,
        },
      },
    };

    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        reportBuilder:
          async () => ({
            analytics:
              analyticsObject,

            sections: [
              {
                code:
                  BUSINESS_REPORT_SECTIONS
                    .EXECUTIVE_SUMMARY,

                title:
                  "Executive Summary",

                available:
                  true,

                data: {
                  exactMetric:
                    37.125,
                },

                notes: [],
              },

              {
                code:
                  BUSINESS_REPORT_SECTIONS
                    .BUSINESS_PERFORMANCE,

                title:
                  "Business Performance",

                available:
                  true,

                data:
                  analyticsObject
                    .businessPerformance
                    .overview,

                notes: [],
              },
            ],
          }),
      });

    assert.equal(
      report.summary
        .overview
        .exactMetric,
      37.125
    );

    const section =
      report.sections.find(
        (item) =>
          item.code ===
          BUSINESS_REPORT_SECTIONS
            .BUSINESS_PERFORMANCE
      );

    assert.equal(
      section.data.exactMetric,
      37.125
    );
  };


/**
 * =========================================================
 * CUSTOM RANGE THROUGH GENERATOR
 * =========================================================
 */

const testGeneratorCustomRange =
  async () => {
    let receivedPeriod =
      null;

    const report =
      await generateBusinessReport({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        startDate:
          "2026-09-01",

        endDate:
          "2026-09-10",

        reportBuilder:
          async ({
            period,
          }) => {
            receivedPeriod =
              period;

            return {
              analytics: {},

              sections: [],
            };
          },
      });

    assert.equal(
      receivedPeriod.mode,
      "CUSTOM"
    );

    assert.equal(
      receivedPeriod.days,
      10
    );

    assert.equal(
      report.period.mode,
      "CUSTOM"
    );

    assert.equal(
      report.period.days,
      10
    );
  };


/**
 * =========================================================
 * RUN
 * =========================================================
 */

const run = async () => {
  console.log("");
  console.log(
    "============================================"
  );
  console.log(
    " Business Report Canonical Service Tests"
  );
  console.log(
    " 9.11.19.20.4"
  );
  console.log(
    "============================================"
  );
  console.log("");

  const tests = [
    [
      "Default report period is relative",
      testDefaultRelativePeriod,
    ],

    [
      "Relative report period is normalized",
      testRelativePeriod,
    ],

    [
      "String days are normalized",
      testStringDaysNormalized,
    ],

    [
      "Invalid relative days are rejected",
      testInvalidRelativeDays,
    ],

    [
      "Relative history limit is enforced",
      testRelativeHistoryLimit,
    ],

    [
      "Custom report period is normalized",
      testCustomPeriod,
    ],

    [
      "Custom range requires both dates",
      testCustomRangeRequiresBothDates,
    ],

    [
      "Invalid custom dates are rejected",
      testInvalidCustomDates,
    ],

    [
      "Reversed custom range is rejected",
      testReversedCustomRange,
    ],

    [
      "Custom history limit is enforced",
      testCustomHistoryLimit,
    ],

    [
      "Valid report request is normalized",
      testValidRequest,
    ],

    [
      "Default report format is applied",
      testDefaultFormat,
    ],

    [
      "Unsupported report type fails closed",
      testUnsupportedReportType,
    ],

    [
      "Unsupported report format fails closed",
      testUnsupportedFormat,
    ],

    [
      "Report generation requires a business",
      testBusinessRequired,
    ],

    [
      "Generator rejects unsupported report type",
      testGenerationRejectsUnsupportedReport,
    ],

    [
      "Generator rejects unsupported format",
      testGenerationRejectsUnsupportedFormat,
    ],

    [
      "Generator maps period errors",
      testGenerationMapsPeriodErrors,
    ],

    [
      "Canonical report identity is valid",
      testCanonicalIdentity,
    ],

    [
      "Canonical business metadata is safely filtered",
      testCanonicalBusinessMetadata,
    ],

    [
      "Canonical report period is valid",
      testCanonicalPeriod,
    ],

    [
      "Canonical metadata is internally consistent",
      testCanonicalMetadata,
    ],

    [
      "Executive summary preserves analytics objects",
      testSummaryPreservesAnalyticsObjects,
    ],

    [
      "Sections are filtered by report definition",
      testSectionsFilteredByDefinition,
    ],

    [
      "Shared Data Coverage and Methodology sections are added",
      testSharedSectionsAdded,
    ],

    [
      "Canonical section limit is enforced",
      testSectionLimit,
    ],

    [
      "Canonical sections preserve expected shape",
      testSectionsHaveCanonicalShape,
    ],

    [
      "Normal report data coverage is complete",
      testNormalDataCoverage,
    ],

    [
      "Promotion coverage detects missing baseline",
      testPromotionCoverageDetectsMissingBaseline,
    ],

    [
      "Methodology states formulas are not recalculated",
      testMethodologyStatesNoFormulaRecalculation,
    ],

    [
      "Promotion methodology preserves non-causal wording",
      testPromotionMethodologyNonCausal,
    ],

    [
      "Benchmark methodology preserves cohort privacy",
      testBenchmarkMethodologyPrivacy,
    ],

    [
      "Single promotion currency is detected",
      testSingleCurrencyDetected,
    ],

    [
      "Mixed currencies are not collapsed",
      testMixedCurrencyNotCollapsed,
    ],

    [
      "Valid report preview is safe",
      testValidPreview,
    ],

    [
      "Invalid report preview returns null",
      testInvalidPreview,
    ],

    [
      "Report catalog contains every registered report",
      testReportCatalog,
    ],

    [
      "Report catalog exposes no analytics",
      testCatalogContainsNoAnalytics,
    ],

    [
      "Report service capabilities match implementation",
      testServiceCapabilities,
    ],

    [
      "Injected builder receives business ID and period only",
      testInjectedBuilderReceivesBusinessAndPeriod,
    ],

    [
      "Analytics values are preserved rather than recalculated",
      testBuilderAnalyticsNotRecalculated,
    ],

    [
      "Generator supports canonical custom date ranges",
      testGeneratorCustomRange,
    ],
  ];

  const results = [];

  for (
    const [
      name,
      callback,
    ]
    of tests
  ) {
    results.push(
      await runTest(
        name,
        callback
      )
    );
  }

  const passed =
    results.filter(
      (result) =>
        result.passed
    ).length;

  const failed =
    results.length -
    passed;

  console.log("");
  console.log(
    "============================================"
  );
  console.log(
    " TEST SUMMARY"
  );
  console.log(
    "============================================"
  );

  console.log(
    `Passed: ${passed}`
  );

  console.log(
    `Failed: ${failed}`
  );

  console.log(
    `Total:  ${results.length}`
  );

  console.log(
    "============================================"
  );
  console.log("");

  if (failed > 0) {
    process.exitCode = 1;

    throw new Error(
      `${failed} canonical report service test(s) failed.`
    );
  }

  console.log(
    "✅ 9.11.19.20.4 Canonical Report Service verification passed."
  );
};


run().catch((error) => {
  console.error("");
  console.error(
    "Canonical report service verification failed."
  );

  console.error(
    error
  );

  process.exitCode = 1;
});