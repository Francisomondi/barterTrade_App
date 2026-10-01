import assert from "node:assert/strict";

import {
  BUSINESS_REPORT_EXPORT_LIMITS,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_TYPES,
  BUSINESS_REPORT_VERSION,
} from "../config/businessReportConfig.js";

import {
  generateBusinessReportJsonExport,
  getBusinessReportJsonExportSummary,
  getBusinessReportJsonCapabilities,
} from "../services/businessReportJsonService.js";

import {
  generateBusinessReportCsvExport,
  getBusinessReportCsvExportSummary,
  getBusinessReportCsvCapabilities,
} from "../services/businessReportCsvService.js";

import {
  generateBusinessReportPdfReadyData,
  getBusinessReportPdfReadySummary,
  getBusinessReportPdfReadyCapabilities,
} from "../services/businessReportPdfReadyService.js";


/**
 * =========================================================
 * BUSINESS REPORT SERIALIZER TESTS
 * =========================================================
 *
 * Roadmap:
 *
 * 9.11.19.20.5 — Serializers
 *
 * Covers:
 *
 * - JSON serializer
 * - CSV serializer
 * - PDF_READY serializer
 *
 * These tests:
 *
 * - do NOT query Prisma
 * - do NOT call analytics services
 * - do NOT test controllers/routes
 * - do NOT test Business Pro authorization
 *
 * They consume canonical report fixtures only.
 * =========================================================
 */


/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const GENERATED_AT =
  "2026-10-01T09:30:00.000Z";

const REPORT_ID =
  "rpt_serializer_test_001";


const createCanonicalReport = () => ({
  reportId:
    REPORT_ID,

  reportType:
    BUSINESS_REPORT_TYPES
      .BUSINESS_INTELLIGENCE,

  version:
    BUSINESS_REPORT_VERSION,

  title:
    "Business Intelligence Report",

  description:
    "Serializer verification report.",

  generatedAt:
    GENERATED_AT,

  business: {
    id:
      "internal-business-id",

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

    phone:
      "0700000000",

    internalSecret:
      "must-not-be-exported-by-safe-business-metadata",
  },

  period: {
    mode:
      "RELATIVE",

    startDate:
      "2026-09-01T00:00:00.000Z",

    endDate:
      GENERATED_AT,

    days:
      30,
  },

  metadata: {
    reportId:
      REPORT_ID,

    reportVersion:
      BUSINESS_REPORT_VERSION,

    reportType:
      BUSINESS_REPORT_TYPES
        .BUSINESS_INTELLIGENCE,

    requestedFormat:
      BUSINESS_REPORT_FORMATS.JSON,

    analyticsTier:
      "BUSINESS_PRO",

    timezone:
      "Africa/Nairobi",

    currency:
      "KES",
  },

  summary: {
    overview: {
      activeListings:
        12,

      offersReceived:
        8,

      completedTrades:
        3,

      conversionRate:
        37.5,

      negativeChange:
        -12.5,
    },

    conversion: {
      offerToTradeRate:
        37.5,
    },

    demand: {
      highDemandListings:
        2,
    },

    promotions: {
      activePromotions:
        1,
    },
  },

  sections: [
    {
      code:
        "EXECUTIVE_SUMMARY",

      title:
        "Executive Summary",

      available:
        true,

      data: {
        activeListings:
          12,

        offersReceived:
          8,

        completedTrades:
          3,

        negativeChange:
          -12.5,
      },

      notes: [],
    },

    {
      code:
        "LISTING_PERFORMANCE",

      title:
        "Listing Performance",

      available:
        true,

      data: {
        overview: {
          totalListings:
            3,

          activeListings:
            3,
        },

        topListings: [
          {
            id:
              "listing-1",

            title:
              "Dining Table",

            views:
              120,

            offers:
              8,

            score:
              10.5,
          },

          {
            id:
              "listing-2",

            title:
              "Chair, Premium",

            views:
              80,

            offers:
              4,

            score:
              -5,
          },

          {
            id:
              "listing-3",

            title:
              "=SUM(A1:A2)",

            views:
              50,

            offers:
              2,

            score:
              -12.5,
          },
        ],
      },

      notes: [
        "Listing metrics are sourced from approved analytics.",
      ],
    },

    {
      code:
        "PERFORMANCE_TRENDS",

      title:
        "Performance Trends",

      available:
        true,

      data: {
        trend: [
          {
            date:
              "2026-09-01",

            views:
              10,

            offers:
              2,
          },

          {
            date:
              "2026-09-02",

            views:
              15,

            offers:
              3,
          },

          {
            date:
              "2026-09-03",

            views:
              20,

            offers:
              4,
          },
        ],
      },

      notes: [],
    },

    {
      code:
        "GROWTH_RECOMMENDATIONS",

      title:
        "Growth Recommendations",

      available:
        true,

      data: {
        recommendations: [
          {
            id:
              "recommendation-1",

            title:
              "Improve listing photos",

            priority:
              "HIGH",

            reason:
              "Higher-quality listing presentation may improve engagement.",
          },

          {
            id:
              "recommendation-2",

            title:
              "Respond to offers",

            priority:
              "MEDIUM",

            reason:
              "Faster responses may improve offer progression.",
          },
        ],
      },

      notes: [],
    },

    {
      code:
        "DATA_COVERAGE",

      title:
        "Data Coverage",

      available:
        true,

      data: {
        complete:
          true,

        requestedPeriod: {
          startDate:
            "2026-09-01T00:00:00.000Z",

          endDate:
            GENERATED_AT,

          days:
            30,
        },
      },

      notes: [],
    },

    {
      code:
        "METHODOLOGY",

      title:
        "Methodology",

      available:
        true,

      data: {
        notes: [
          "Analytics values are consumed from existing analytics services.",
        ],
      },

      notes: [],
    },
  ],

  dataCoverage: {
    complete:
      true,

    requestedPeriod: {
      startDate:
        "2026-09-01T00:00:00.000Z",

      endDate:
        GENERATED_AT,

      days:
        30,
    },

    notes: [],
  },

  methodology: {
    notes: [
      "The report service does not independently recalculate analytics formulas.",
    ],
  },
});


const cloneFixture = () =>
  createCanonicalReport();


const createInvalidReports = () => [
  {
    name:
      "missing report",

    value:
      null,

    code:
      "BUSINESS_REPORT_REQUIRED",
  },

  {
    name:
      "missing reportType",

    value: {
      sections: [],
    },

    code:
      "BUSINESS_REPORT_TYPE_REQUIRED",
  },

  {
    name:
      "missing sections",

    value: {
      reportType:
        BUSINESS_REPORT_TYPES
          .BUSINESS_INTELLIGENCE,
    },

    code:
      "BUSINESS_REPORT_SECTIONS_REQUIRED",
  },
];


/**
 * =========================================================
 * SHARED TEST HELPERS
 * =========================================================
 */

const getListingCsvDataset = (
  exported
) =>
  exported.datasets.find(
    (dataset) =>
      dataset.name ===
      "listing-performance-toplistings"
  );


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
 * JSON TESTS
 * =========================================================
 */

const testJsonBasicExport =
  () => {
    const report =
      cloneFixture();

    const exported =
      generateBusinessReportJsonExport({
        report,
      });

    assert.equal(
      exported.format,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.equal(
      exported.reportId,
      REPORT_ID
    );

    assert.equal(
      exported.reportType,
      report.reportType
    );

    assert.equal(
      exported.sourceGeneratedAt,
      GENERATED_AT
    );

    assert.equal(
      exported.mimeType,
      "application/json; charset=utf-8"
    );

    assert.equal(
      exported.extension,
      "json"
    );

    assert.match(
      exported.fileName,
      /\.json$/
    );

    assert.ok(
      exported.byteLength > 0
    );

    assert.equal(
      typeof exported.json,
      "string"
    );
  };


const testJsonPayloadShape =
  () => {
    const report =
      cloneFixture();

    const exported =
      generateBusinessReportJsonExport({
        report,
      });

    assert.equal(
      exported.payload.export.format,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.equal(
      exported.payload.export.reportId,
      REPORT_ID
    );

    assert.equal(
      exported.payload.export.reportType,
      report.reportType
    );

    assert.equal(
      exported.payload.export.analyticsTier,
      "BUSINESS_PRO"
    );

    assert.ok(
      exported.payload.report
    );

    assert.equal(
      exported.payload.report.reportId,
      REPORT_ID
    );
  };


const testJsonStringMatchesPayload =
  () => {
    const exported =
      generateBusinessReportJsonExport({
        report:
          cloneFixture(),
      });

    const parsed =
      JSON.parse(
        exported.json
      );

    assert.deepEqual(
      parsed,
      exported.payload
    );
  };


const testJsonPrettyPrinting =
  () => {
    const pretty =
      generateBusinessReportJsonExport({
        report:
          cloneFixture(),

        pretty:
          true,
      });

    const compact =
      generateBusinessReportJsonExport({
        report:
          cloneFixture(),

        pretty:
          false,
      });

    assert.equal(
      pretty.pretty,
      true
    );

    assert.equal(
      compact.pretty,
      false
    );

    assert.ok(
      pretty.json.includes(
        "\n"
      )
    );

    assert.ok(
      compact.byteLength <=
        pretty.byteLength
    );
  };


const testJsonBusinessMetadataFiltered =
  () => {
    const exported =
      generateBusinessReportJsonExport({
        report:
          cloneFixture(),
      });

    const business =
      exported.payload.report
        .business;

    assert.deepEqual(
      business,
      {
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
      "id" in business,
      false
    );

    assert.equal(
      "phone" in business,
      false
    );

    assert.equal(
      "internalSecret" in business,
      false
    );
  };


const testJsonSafeRuntimeValues =
  () => {
    const report =
      cloneFixture();

    report.sections[0].data.runtime = {
      date:
        new Date(
          "2026-10-01T10:00:00.000Z"
        ),

      bigint:
        12345678901234567890n,

      nan:
        Number.NaN,

      positiveInfinity:
        Number.POSITIVE_INFINITY,

      negativeInfinity:
        Number.NEGATIVE_INFINITY,

      undefinedValue:
        undefined,

      functionValue:
        () => "unsafe",

      symbolValue:
        Symbol("unsafe"),

      array: [
        undefined,
        Number.NaN,
        5n,
      ],
    };

    const exported =
      generateBusinessReportJsonExport({
        report,
      });

    const runtime =
      exported.payload.report
        .sections[0]
        .data.runtime;

    assert.equal(
      runtime.date,
      "2026-10-01T10:00:00.000Z"
    );

    assert.equal(
      runtime.bigint,
      "12345678901234567890"
    );

    assert.equal(
      runtime.nan,
      null
    );

    assert.equal(
      runtime.positiveInfinity,
      null
    );

    assert.equal(
      runtime.negativeInfinity,
      null
    );

    assert.equal(
      "undefinedValue" in runtime,
      false
    );

    assert.equal(
      "functionValue" in runtime,
      false
    );

    assert.equal(
      "symbolValue" in runtime,
      false
    );

    assert.deepEqual(
      runtime.array,
      [
        null,
        null,
        "5",
      ]
    );
  };


const testJsonCircularReferenceRejected =
  () => {
    const report =
      cloneFixture();

    const circular = {
      value:
        "test",
    };

    circular.self =
      circular;

    report.sections[0]
      .data.circular =
      circular;

    assert.throws(
      () =>
        generateBusinessReportJsonExport({
          report,
        }),

      (error) => {
        assert.equal(
          error.code,
          "BUSINESS_REPORT_JSON_CIRCULAR_REFERENCE"
        );

        return true;
      }
    );
  };


const testJsonDoesNotMutateCanonical =
  () => {
    const report =
      cloneFixture();

    const originalBusiness =
      structuredClone(
        report.business
      );

    const originalTitle =
      report.sections[1]
        .data.topListings[2]
        .title;

    generateBusinessReportJsonExport({
      report,
    });

    assert.deepEqual(
      report.business,
      originalBusiness
    );

    assert.equal(
      report.sections[1]
        .data.topListings[2]
        .title,
      originalTitle
    );
  };


const testJsonValidation =
  () => {
    for (
      const invalid
      of createInvalidReports()
    ) {
      assert.throws(
        () =>
          generateBusinessReportJsonExport({
            report:
              invalid.value,
          }),

        (error) => {
          assert.equal(
            error.code,
            invalid.code,
            invalid.name
          );

          return true;
        }
      );
    }
  };


const testJsonSummary =
  () => {
    const report =
      cloneFixture();

    const summary =
      getBusinessReportJsonExportSummary({
        report,
      });

    assert.equal(
      summary.format,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.equal(
      summary.reportId,
      REPORT_ID
    );

    assert.equal(
      summary.reportType,
      report.reportType
    );

    assert.equal(
      summary.mimeType,
      "application/json; charset=utf-8"
    );

    assert.equal(
      summary.extension,
      "json"
    );

    assert.ok(
      summary.byteLength > 0
    );

    assert.equal(
      "payload" in summary,
      false
    );

    assert.equal(
      "json" in summary,
      false
    );
  };


const testJsonCapabilities =
  () => {
    const capabilities =
      getBusinessReportJsonCapabilities();

    assert.equal(
      capabilities.format,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.equal(
      capabilities.mimeType,
      "application/json; charset=utf-8"
    );

    assert.equal(
      capabilities.extension,
      "json"
    );

    assert.equal(
      capabilities.maxBytes,
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_JSON_BYTES
    );

    assert.equal(
      capabilities.maxDepth,
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_JSON_DEPTH
    );

    assert.equal(
      capabilities.prettyPrinting,
      true
    );

    assert.equal(
      capabilities.queriesDatabase,
      false
    );

    assert.equal(
      capabilities.calculatesAnalytics,
      false
    );

    assert.equal(
      capabilities.requiresCanonicalReport,
      true
    );
  };


/**
 * =========================================================
 * CSV TESTS
 * =========================================================
 */

const testCsvBasicExport =
  () => {
    const report =
      cloneFixture();

    const exported =
      generateBusinessReportCsvExport({
        report,
      });

    assert.equal(
      exported.format,
      BUSINESS_REPORT_FORMATS.CSV
    );

    assert.equal(
      exported.reportId,
      REPORT_ID
    );

    assert.equal(
      exported.reportType,
      report.reportType
    );

    assert.equal(
      exported.sourceGeneratedAt,
      GENERATED_AT
    );

    assert.equal(
      exported.mimeType,
      "text/csv; charset=utf-8"
    );

    assert.ok(
      Array.isArray(
        exported.datasets
      )
    );

    assert.ok(
      exported.datasets.length >
        0
    );

    assert.equal(
      exported.datasetCount,
      exported.datasets.length
    );
  };


const testBusinessIntelligenceCsvIsMultiDataset =
  () => {
    const exported =
      generateBusinessReportCsvExport({
        report:
          cloneFixture(),
      });

    assert.equal(
      exported.mode,
      "MULTI_DATASET"
    );

    assert.ok(
      exported.datasetCount > 1
    );
  };


const testCsvMetadataDatasetExists =
  () => {
    const exported =
      generateBusinessReportCsvExport({
        report:
          cloneFixture(),
      });

    const metadata =
      exported.datasets.find(
        (dataset) =>
          dataset.name ===
          "report-metadata"
      );

    assert.ok(
      metadata,
      "Expected report-metadata CSV dataset."
    );

    assert.equal(
      metadata.mimeType,
      "text/csv; charset=utf-8"
    );

    assert.match(
      metadata.fileName,
      /\.csv$/
    );

    assert.ok(
      Array.isArray(
        metadata.rows
      )
    );

    assert.equal(
      metadata.rows.length,
      1
    );

    assert.equal(
      metadata.rows[0]
        .reportId,
      REPORT_ID
    );

    assert.equal(
      metadata.rows[0]
        .businessName,
      "Francis Test Store"
    );
  };


const testCsvDiscoversObjectArrays =
  () => {
    const exported =
      generateBusinessReportCsvExport({
        report:
          cloneFixture(),
      });

    const listingDataset =
      getListingCsvDataset(
        exported
      );

    assert.ok(
      listingDataset,
      "Expected listing-performance-toplistings CSV dataset."
    );

    assert.equal(
      listingDataset
        .sourceRowCount,
      3
    );

    assert.equal(
      listingDataset
        .exportedRowCount,
      3
    );

    assert.equal(
      listingDataset.truncated,
      false
    );
  };


const testCsvEscaping =
  () => {
    const exported =
      generateBusinessReportCsvExport({
        report:
          cloneFixture(),
      });

    const listingDataset =
      getListingCsvDataset(
        exported
      );

    assert.ok(
      listingDataset
    );

    assert.ok(
      listingDataset.csv.includes(
        '"Chair, Premium"'
      ),
      "CSV values containing commas must be quoted."
    );
  };


const testCsvFormulaInjectionProtection =
  () => {
    const exported =
      generateBusinessReportCsvExport({
        report:
          cloneFixture(),
      });

    const listingDataset =
      getListingCsvDataset(
        exported
      );

    assert.ok(
      listingDataset
    );

    assert.ok(
      listingDataset.csv.includes(
        "'=SUM(A1:A2)"
      ),
      "Dangerous textual formulas must be prefixed as text."
    );

    assert.equal(
      listingDataset.csv.includes(
        "\r\n=SUM(A1:A2)"
      ),
      false
    );
  };


const testCsvNegativeNumbersPreserved =
  () => {
    const exported =
      generateBusinessReportCsvExport({
        report:
          cloneFixture(),
      });

    const listingDataset =
      getListingCsvDataset(
        exported
      );

    assert.ok(
      listingDataset
    );

    const negativeIntegerRow =
      listingDataset.rows.find(
        (row) =>
          row.score === -5
      );

    const negativeDecimalRow =
      listingDataset.rows.find(
        (row) =>
          row.score === -12.5
      );

    assert.ok(
      negativeIntegerRow,
      "Numeric -5 must remain a number."
    );

    assert.ok(
      negativeDecimalRow,
      "Numeric -12.5 must remain a number."
    );

    assert.ok(
      listingDataset.csv.includes(
        "-5"
      )
    );

    assert.ok(
      listingDataset.csv.includes(
        "-12.5"
      )
    );

    assert.equal(
      listingDataset.csv.includes(
        "'-5"
      ),
      false,
      "Legitimate negative numbers must not receive formula protection."
    );

    assert.equal(
      listingDataset.csv.includes(
        "'-12.5"
      ),
      false,
      "Legitimate negative decimals must not receive formula protection."
    );
  };


const testCsvNestedObjectsFlatten =
  () => {
    const report =
      cloneFixture();

    report.sections.push({
      code:
        "NESTED_TEST",

      title:
        "Nested Test",

      available:
        true,

      data: {
        rows: [
          {
            listing: {
              title:
                "Desk",

              metrics: {
                views:
                  42,
              },
            },

            offers:
              3,
          },
        ],
      },

      notes: [],
    });

    const exported =
      generateBusinessReportCsvExport({
        report,
      });

    const nestedDataset =
      exported.datasets.find(
        (dataset) =>
          dataset.name.includes(
            "nested-test"
          ) &&
          dataset.name.includes(
            "rows"
          )
      );

    assert.ok(
      nestedDataset
    );

    assert.equal(
      nestedDataset.rows[0]
        ["listing.title"],
      "Desk"
    );

    assert.equal(
      nestedDataset.rows[0]
        ["listing.metrics.views"],
      42
    );

    assert.equal(
      nestedDataset.rows[0]
        .offers,
      3
    );
  };


const testCsvDoesNotMutateCanonical =
  () => {
    const report =
      cloneFixture();

    const before =
      structuredClone(
        report
      );

    generateBusinessReportCsvExport({
      report,
    });

    assert.deepEqual(
      report,
      before
    );
  };


const testCsvValidation =
  () => {
    for (
      const invalid
      of createInvalidReports()
    ) {
      assert.throws(
        () =>
          generateBusinessReportCsvExport({
            report:
              invalid.value,
          }),

        (error) => {
          assert.equal(
            error.code,
            invalid.code,
            invalid.name
          );

          return true;
        }
      );
    }
  };


const testCsvSummary =
  () => {
    const report =
      cloneFixture();

    const summary =
      getBusinessReportCsvExportSummary({
        report,
      });

    assert.equal(
      summary.format,
      BUSINESS_REPORT_FORMATS.CSV
    );

    assert.equal(
      summary.reportId,
      REPORT_ID
    );

    assert.equal(
      summary.datasetCount,
      summary.datasets.length
    );

    assert.ok(
      summary.totalRows > 0
    );

    for (
      const dataset
      of summary.datasets
    ) {
      assert.equal(
        "csv" in dataset,
        false
      );

      assert.equal(
        "rows" in dataset,
        false
      );

      assert.equal(
        typeof dataset.fileName,
        "string"
      );

      assert.equal(
        typeof dataset.sourceRowCount,
        "number"
      );

      assert.equal(
        typeof dataset.exportedRowCount,
        "number"
      );

      assert.equal(
        typeof dataset.truncated,
        "boolean"
      );
    }
  };


const testCsvCapabilities =
  () => {
    const capabilities =
      getBusinessReportCsvCapabilities();

    assert.equal(
      capabilities.format,
      BUSINESS_REPORT_FORMATS.CSV
    );

    assert.equal(
      capabilities.mimeType,
      "text/csv; charset=utf-8"
    );

    assert.equal(
      capabilities.extension,
      "csv"
    );

    assert.equal(
      capabilities.maxRows,
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_CSV_ROWS
    );

    assert.equal(
      capabilities.maxDatasetRows,
      Math.min(
        BUSINESS_REPORT_EXPORT_LIMITS
          .MAX_CSV_DATASET_ROWS ||
          BUSINESS_REPORT_EXPORT_LIMITS
            .MAX_LISTING_ROWS ||
          BUSINESS_REPORT_EXPORT_LIMITS
            .MAX_CSV_ROWS,

        BUSINESS_REPORT_EXPORT_LIMITS
          .MAX_CSV_ROWS
      )
    );

    assert.equal(
      capabilities.truncationSupported,
      true
    );

    assert.equal(
      capabilities.multipleDatasets,
      true
    );

    assert.equal(
      capabilities.combinedReportMode,
      "MULTI_DATASET"
    );

    assert.equal(
      capabilities.queriesDatabase,
      false
    );

    assert.equal(
      capabilities.calculatesAnalytics,
      false
    );

    assert.equal(
      capabilities.requiresCanonicalReport,
      true
    );
  };


/**
 * =========================================================
 * PDF_READY TESTS
 * =========================================================
 */

const testPdfReadyBasicExport =
  () => {
    const report =
      cloneFixture();

    const prepared =
      generateBusinessReportPdfReadyData({
        report,
      });

    assert.equal(
      prepared.format,
      BUSINESS_REPORT_FORMATS
        .PDF_READY
    );

    assert.equal(
      prepared.reportId,
      REPORT_ID
    );

    assert.equal(
      prepared.reportType,
      report.reportType
    );

    assert.equal(
      prepared.binaryPdf,
      false
    );

    assert.equal(
      Number.isNaN(
        Date.parse(
          prepared.preparedAt
        )
      ),
      false
    );
  };


const testPdfReadyCover =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    assert.equal(
      prepared.cover.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_INTELLIGENCE
    );

    assert.equal(
      prepared.cover.title,
      "Business Intelligence Report"
    );

    assert.equal(
      prepared.cover.reportVersion,
      BUSINESS_REPORT_VERSION
    );

    assert.equal(
      prepared.cover.business
        .businessName,
      "Francis Test Store"
    );

    assert.equal(
      prepared.cover.business
        .slug,
      "francis-test-store"
    );

    assert.equal(
      prepared.cover.period.days,
      30
    );

    assert.equal(
      prepared.cover.period.mode,
      "RELATIVE"
    );
  };


const testPdfReadyBusinessIdentityExcludesId =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    const business =
      prepared.cover.business;

    assert.equal(
      "id" in business,
      false
    );

    assert.equal(
      "phone" in business,
      false
    );

    assert.equal(
      "internalSecret" in business,
      false
    );
  };


const testPdfReadyMetadata =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    assert.equal(
      prepared.metadata.reportId,
      REPORT_ID
    );

    assert.equal(
      prepared.metadata.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_INTELLIGENCE
    );

    assert.equal(
      prepared.metadata.reportVersion,
      BUSINESS_REPORT_VERSION
    );

    assert.equal(
      prepared.metadata.analyticsTier,
      "BUSINESS_PRO"
    );

    assert.equal(
      prepared.metadata.currency,
      "KES"
    );

    assert.equal(
      prepared.metadata.timezone,
      "Africa/Nairobi"
    );
  };


const testPdfReadySections =
  () => {
    const report =
      cloneFixture();

    const prepared =
      generateBusinessReportPdfReadyData({
        report,
      });

    assert.equal(
      prepared.sections.length,
      report.sections.length
    );

    for (
      const section
      of prepared.sections
    ) {
      assert.equal(
        typeof section.code,
        "string"
      );

      assert.equal(
        typeof section.title,
        "string"
      );

      assert.ok(
        Array.isArray(
          section.kpis
        )
      );

      assert.ok(
        Array.isArray(
          section.tables
        )
      );

      assert.ok(
        Array.isArray(
          section.charts
        )
      );

      assert.ok(
        Array.isArray(
          section.recommendations
        )
      );
    }
  };


const testPdfReadyDoesNotExposeUnboundedSourceData =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    for (
      const section
      of prepared.sections
    ) {
      assert.equal(
        "data" in section,
        false,
        `Section ${section.code} must not expose the original unbounded data object.`
      );

      assert.equal(
        section.sourceDataIncluded,
        false
      );
    }
  };


const testPdfReadyDiscoversTables =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    const listingSection =
      prepared.sections.find(
        (section) =>
          section.code ===
          "LISTING_PERFORMANCE"
      );

    assert.ok(
      listingSection
    );

    const listingTable =
      listingSection.tables.find(
        (table) =>
          table.key.includes(
            "topListings"
          )
      );

    assert.ok(
      listingTable,
      "Expected topListings to become a PDF-ready table."
    );

    assert.equal(
      listingTable.sourceRowCount,
      3
    );

    assert.equal(
      listingTable.renderedRowCount,
      3
    );

    assert.ok(
      Array.isArray(
        listingTable.columns
      )
    );
  };


const testPdfReadyDiscoversCharts =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    const trendSection =
      prepared.sections.find(
        (section) =>
          section.code ===
          "PERFORMANCE_TRENDS"
      );

    assert.ok(
      trendSection
    );

    assert.ok(
      trendSection.charts.length >
        0,
      "Expected dated numeric trend data to produce chart-ready series."
    );
  };


const testPdfReadyRecommendations =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    assert.ok(
      Array.isArray(
        prepared.recommendations
      )
    );

    assert.ok(
      prepared.recommendations.length >
        0
    );

    assert.ok(
      prepared.recommendations.length <=
        BUSINESS_REPORT_EXPORT_LIMITS
          .MAX_RECOMMENDATIONS
    );
  };


const testPdfReadyDataCoverageAndMethodology =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    assert.ok(
      prepared.dataCoverage
    );

    assert.ok(
      prepared.methodology
    );

    assert.ok(
      prepared.renderingHints
    );

    assert.equal(
      prepared.renderingHints
        .pageSize,
      "A4"
    );

    assert.equal(
      prepared.renderingHints
        .orientation,
      "PORTRAIT"
    );
  };


const testPdfReadyLargeExportMetadata =
  () => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report:
          cloneFixture(),
      });

    const protection =
      prepared
        .largeExportProtection;

    assert.equal(
      protection.maxSections,
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_PDF_READY_SECTIONS ||
        BUSINESS_REPORT_EXPORT_LIMITS
          .MAX_REPORT_SECTIONS ||
        25
    );

    assert.equal(
      protection.maxTotalTableRows,
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_PDF_READY_ROWS ||
        10000
    );

    assert.ok(
      protection.renderedTableRowCount <=
        protection.maxTotalTableRows
    );

    assert.equal(
      typeof protection.truncated,
      "boolean"
    );
  };


const testPdfReadyDoesNotMutateCanonical =
  () => {
    const report =
      cloneFixture();

    const before =
      structuredClone(
        report
      );

    generateBusinessReportPdfReadyData({
      report,
    });

    assert.deepEqual(
      report,
      before
    );
  };


const testPdfReadyValidation =
  () => {
    for (
      const invalid
      of createInvalidReports()
    ) {
      assert.throws(
        () =>
          generateBusinessReportPdfReadyData({
            report:
              invalid.value,
          }),

        (error) => {
          assert.equal(
            error.code,
            invalid.code,
            invalid.name
          );

          return true;
        }
      );
    }
  };


const testPdfReadySectionLimit =
  () => {
    const report =
      cloneFixture();

    report.sections =
      Array.from(
        {
          length:
            (
              BUSINESS_REPORT_EXPORT_LIMITS
                .MAX_PDF_READY_SECTIONS ||
              BUSINESS_REPORT_EXPORT_LIMITS
                .MAX_REPORT_SECTIONS ||
              25
            ) + 1,
        },

        (_, index) => ({
          code:
            `SECTION_${index + 1}`,

          title:
            `Section ${index + 1}`,

          available:
            true,

          data: {},

          notes: [],
        })
      );

    assert.throws(
      () =>
        generateBusinessReportPdfReadyData({
          report,
        }),

      (error) => {
        assert.equal(
          error.code,
          "BUSINESS_REPORT_TOO_MANY_SECTIONS"
        );

        return true;
      }
    );
  };


const testPdfReadySummary =
  () => {
    const summary =
      getBusinessReportPdfReadySummary({
        report:
          cloneFixture(),
      });

    assert.equal(
      summary.format,
      BUSINESS_REPORT_FORMATS
        .PDF_READY
    );

    assert.equal(
      summary.reportId,
      REPORT_ID
    );

    assert.equal(
      summary.binaryPdf,
      false
    );

    assert.ok(
      summary.sectionCount > 0
    );

    assert.ok(
      summary.tableCount >= 0
    );

    assert.ok(
      summary.chartCount >= 0
    );

    assert.ok(
      summary.recommendationCount >=
        0
    );

    assert.ok(
      summary.largeExportProtection
    );

    assert.equal(
      "sections" in summary,
      false
    );
  };


const testPdfReadyCapabilities =
  () => {
    const capabilities =
      getBusinessReportPdfReadyCapabilities();

    assert.equal(
      capabilities.format,
      BUSINESS_REPORT_FORMATS
        .PDF_READY
    );

    assert.equal(
      capabilities.binaryPdf,
      false
    );

    assert.equal(
      capabilities.coverData,
      true
    );

    assert.equal(
      capabilities.executiveSummary,
      true
    );

    assert.equal(
      capabilities.kpiCards,
      true
    );

    assert.equal(
      capabilities.tables,
      true
    );

    assert.equal(
      capabilities.chartReadySeries,
      true
    );

    assert.equal(
      capabilities.recommendations,
      true
    );

    assert.equal(
      capabilities.methodology,
      true
    );

    assert.equal(
      capabilities.dataCoverage,
      true
    );

    assert.equal(
      capabilities.renderingHints,
      true
    );

    assert.equal(
      capabilities.truncationSupported,
      true
    );

    assert.equal(
      capabilities.includesUnboundedSourceData,
      false
    );

    assert.equal(
      capabilities.queriesDatabase,
      false
    );

    assert.equal(
      capabilities.calculatesAnalytics,
      false
    );

    assert.equal(
      capabilities.requiresCanonicalReport,
      true
    );
  };


/**
 * =========================================================
 * CROSS-SERIALIZER CONTRACT TESTS
 * =========================================================
 */

const testAllSerializersPreserveIdentity =
  () => {
    const report =
      cloneFixture();

    const json =
      generateBusinessReportJsonExport({
        report,
      });

    const csv =
      generateBusinessReportCsvExport({
        report,
      });

    const pdf =
      generateBusinessReportPdfReadyData({
        report,
      });

    for (
      const exported
      of [
        json,
        csv,
        pdf,
      ]
    ) {
      assert.equal(
        exported.reportId,
        REPORT_ID
      );

      assert.equal(
        exported.reportType,
        BUSINESS_REPORT_TYPES
          .BUSINESS_INTELLIGENCE
      );
    }
  };


const testSerializerFormatsRemainDistinct =
  () => {
    const report =
      cloneFixture();

    const json =
      generateBusinessReportJsonExport({
        report,
      });

    const csv =
      generateBusinessReportCsvExport({
        report,
      });

    const pdf =
      generateBusinessReportPdfReadyData({
        report,
      });

    assert.equal(
      json.format,
      BUSINESS_REPORT_FORMATS.JSON
    );

    assert.equal(
      csv.format,
      BUSINESS_REPORT_FORMATS.CSV
    );

    assert.equal(
      pdf.format,
      BUSINESS_REPORT_FORMATS
        .PDF_READY
    );

    assert.equal(
      pdf.binaryPdf,
      false
    );
  };


const testSerializersDoNotMutateSharedCanonicalReport =
  () => {
    const report =
      cloneFixture();

    const before =
      structuredClone(
        report
      );

    generateBusinessReportJsonExport({
      report,
    });

    generateBusinessReportCsvExport({
      report,
    });

    generateBusinessReportPdfReadyData({
      report,
    });

    assert.deepEqual(
      report,
      before
    );
  };


/**
 * =========================================================
 * RUN TESTS
 * =========================================================
 */

const run = async () => {
  console.log("");
  console.log(
    "============================================"
  );
  console.log(
    " Business Report Serializer Tests"
  );
  console.log(
    " 9.11.19.20.5"
  );
  console.log(
    "============================================"
  );
  console.log("");

  const tests = [
    /**
     * JSON
     */
    [
      "JSON basic export contract",
      testJsonBasicExport,
    ],

    [
      "JSON payload preserves export/report separation",
      testJsonPayloadShape,
    ],

    [
      "JSON serialized string matches payload",
      testJsonStringMatchesPayload,
    ],

    [
      "JSON pretty-printing can be controlled",
      testJsonPrettyPrinting,
    ],

    [
      "JSON business metadata is safely filtered",
      testJsonBusinessMetadataFiltered,
    ],

    [
      "JSON runtime values are normalized safely",
      testJsonSafeRuntimeValues,
    ],

    [
      "JSON circular references are rejected",
      testJsonCircularReferenceRejected,
    ],

    [
      "JSON serializer does not mutate canonical report",
      testJsonDoesNotMutateCanonical,
    ],

    [
      "JSON canonical validation fails closed",
      testJsonValidation,
    ],

    [
      "JSON summary excludes full body",
      testJsonSummary,
    ],

    [
      "JSON capabilities match implementation",
      testJsonCapabilities,
    ],

    /**
     * CSV
     */
    [
      "CSV basic export contract",
      testCsvBasicExport,
    ],

    [
      "Business Intelligence CSV uses multi-dataset mode",
      testBusinessIntelligenceCsvIsMultiDataset,
    ],

    [
      "CSV metadata dataset is present",
      testCsvMetadataDatasetExists,
    ],

    [
      "CSV discovers object-array datasets",
      testCsvDiscoversObjectArrays,
    ],

    [
      "CSV escapes commas correctly",
      testCsvEscaping,
    ],

    [
      "CSV neutralizes spreadsheet formula injection",
      testCsvFormulaInjectionProtection,
    ],

    [
      "CSV preserves legitimate negative numbers",
      testCsvNegativeNumbersPreserved,
    ],

    [
      "CSV flattens nested object rows",
      testCsvNestedObjectsFlatten,
    ],

    [
      "CSV serializer does not mutate canonical report",
      testCsvDoesNotMutateCanonical,
    ],

    [
      "CSV canonical validation fails closed",
      testCsvValidation,
    ],

    [
      "CSV summary excludes CSV bodies",
      testCsvSummary,
    ],

    [
      "CSV capabilities match implementation",
      testCsvCapabilities,
    ],

    /**
     * PDF_READY
     */
    [
      "PDF_READY basic export contract",
      testPdfReadyBasicExport,
    ],

    [
      "PDF_READY cover is generated from canonical metadata",
      testPdfReadyCover,
    ],

    [
      "PDF_READY business identity excludes internal ID",
      testPdfReadyBusinessIdentityExcludesId,
    ],

    [
      "PDF_READY metadata matches canonical report",
      testPdfReadyMetadata,
    ],

    [
      "PDF_READY sections have rendering shape",
      testPdfReadySections,
    ],

    [
      "PDF_READY excludes unbounded source data",
      testPdfReadyDoesNotExposeUnboundedSourceData,
    ],

    [
      "PDF_READY discovers tables",
      testPdfReadyDiscoversTables,
    ],

    [
      "PDF_READY discovers chart-ready series",
      testPdfReadyDiscoversCharts,
    ],

    [
      "PDF_READY exposes bounded recommendations",
      testPdfReadyRecommendations,
    ],

    [
      "PDF_READY exposes data coverage, methodology and rendering hints",
      testPdfReadyDataCoverageAndMethodology,
    ],

    [
      "PDF_READY exposes large-export protection metadata",
      testPdfReadyLargeExportMetadata,
    ],

    [
      "PDF_READY serializer does not mutate canonical report",
      testPdfReadyDoesNotMutateCanonical,
    ],

    [
      "PDF_READY canonical validation fails closed",
      testPdfReadyValidation,
    ],

    [
      "PDF_READY rejects excessive section counts",
      testPdfReadySectionLimit,
    ],

    [
      "PDF_READY summary excludes full sections",
      testPdfReadySummary,
    ],

    [
      "PDF_READY capabilities match implementation",
      testPdfReadyCapabilities,
    ],

    /**
     * Cross-serializer
     */
    [
      "All serializers preserve canonical report identity",
      testAllSerializersPreserveIdentity,
    ],

    [
      "Serializer formats remain distinct",
      testSerializerFormatsRemainDistinct,
    ],

    [
      "All serializers leave shared canonical report unchanged",
      testSerializersDoNotMutateSharedCanonicalReport,
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
      `${failed} serializer test(s) failed.`
    );
  }

  console.log(
    "✅ 9.11.19.20.5 Serializer verification passed."
  );
};


run().catch((error) => {
  console.error("");
  console.error(
    "Business report serializer verification failed."
  );

  console.error(
    error
  );

  process.exitCode = 1;
});