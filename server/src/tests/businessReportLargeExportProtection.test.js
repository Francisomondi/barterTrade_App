// CREATE — server/src/tests/businessReportLargeExportProtection.test.js

import assert from "node:assert/strict";

import {
  BUSINESS_REPORT_EXPORT_LIMITS,
} from "../config/businessReportConfig.js";

import {
  generateBusinessReportCsvExport,
} from "../services/businessReportCsvService.js";

import {
  generateBusinessReportJsonExport,
} from "../services/businessReportJsonService.js";

import {
  generateBusinessReportPdfReadyData,
} from "../services/businessReportPdfReadyService.js";

/**
 * =========================================================
 * BUSINESS REPORT LARGE EXPORT PROTECTION TEST
 * =========================================================
 *
 * Roadmap:
 *
 * 9.11.19.19 — Large Export Protection
 *
 * This is an isolated verification script.
 *
 * It does NOT:
 *
 * - connect to Prisma
 * - query the database
 * - require authentication
 * - require Business Pro
 * - calculate analytics
 * - modify application data
 *
 * It only verifies serializer/export safety behavior.
 * =========================================================
 */


/**
 * =========================================================
 * TEST HELPERS
 * =========================================================
 */

const createReport = ({
  reportType = "BUSINESS_PERFORMANCE",
  sections = [],
  summary = null,
} = {}) => ({
  reportId:
    "large-export-test-report",

  reportType,

  version:
    "1.0",

  title:
    "Large Export Protection Test",

  generatedAt:
    new Date().toISOString(),

  business: {
    businessName:
      "Large Export Test Business",

    slug:
      "large-export-test-business",

    category:
      "TEST",

    status:
      "ACTIVE",

    verificationStatus:
      "UNVERIFIED",
  },

  period: {
    startDate:
      "2026-01-01T00:00:00.000Z",

    endDate:
      "2026-01-30T23:59:59.999Z",

    days:
      30,

    mode:
      "ROLLING",
  },

  summary,

  metadata: {
    reportId:
      "large-export-test-report",

    reportVersion:
      "1.0",

    analyticsTier:
      "BUSINESS_PRO",

    currency:
      "KES",

    timezone:
      "UTC",
  },

  sections,
});


const createRows = (
  count,
  {
    prefix = "row",
  } = {}
) =>
  Array.from(
    {
      length: count,
    },
    (_, index) => ({
      id:
        `${prefix}-${index + 1}`,

      name:
        `Test Item ${index + 1}`,

      views:
        index + 10,

      offers:
        index % 7,

      trades:
        index % 3,

      conversionRate:
        (index % 100) / 100,
    })
  );


const createSection = ({
  code,
  title,
  data,
  summary = null,
}) => ({
  code,

  title,

  available:
    true,

  summary,

  data,
});


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
 * CONFIGURATION TESTS
 * =========================================================
 */

const testCentralLimits = () => {
  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_ROWS,
    10000,
    "MAX_CSV_ROWS should be 10,000."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS,
    5000,
    "MAX_CSV_DATASET_ROWS should be 5,000."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_JSON_BYTES,
    5 * 1024 * 1024,
    "MAX_JSON_BYTES should be 5 MiB."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_JSON_DEPTH,
    30,
    "MAX_JSON_DEPTH should be 30."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTIONS,
    25,
    "MAX_PDF_READY_SECTIONS should be 25."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTION_ROWS,
    5000,
    "MAX_PDF_READY_SECTION_ROWS should be 5,000."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_ROWS,
    10000,
    "MAX_PDF_READY_ROWS should be 10,000."
  );
};


/**
 * =========================================================
 * CSV TESTS
 * =========================================================
 */

const testCsvNormalExport = () => {
  const report =
    createReport({
      sections: [
        createSection({
          code:
            "LISTING_PERFORMANCE",

          title:
            "Listing Performance",

          data: {
            listings:
              createRows(
                100,
                {
                  prefix:
                    "listing",
                }
              ),
          },
        }),
      ],
    });

  const exported =
    generateBusinessReportCsvExport({
      report,
    });

  assert.equal(
    exported.format,
    "CSV"
  );

  assert.equal(
    exported.maxRows,
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_ROWS
  );

  assert.equal(
    exported.maxDatasetRows,
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS
  );

  assert.equal(
    exported.truncated,
    false,
    "Small CSV export should not be truncated."
  );

  assert.ok(
    exported.totalRows <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_CSV_ROWS,
    "CSV export exceeded global row limit."
  );
};


const testCsvDatasetLimit = () => {
  const sourceCount =
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS +
    250;

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "LISTING_PERFORMANCE",

          title:
            "Listing Performance",

          data: {
            listings:
              createRows(
                sourceCount,
                {
                  prefix:
                    "listing",
                }
              ),
          },
        }),
      ],
    });

  const exported =
    generateBusinessReportCsvExport({
      report,
    });

  assert.equal(
    exported.truncated,
    true,
    "Oversized CSV dataset should report truncation."
  );

  assert.ok(
    exported.totalRows <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_CSV_ROWS,
    "CSV exceeded its global row limit."
  );

  const truncatedDataset =
    exported.datasets.find(
      (dataset) =>
        dataset.truncated ===
        true
    );

  assert.ok(
    truncatedDataset,
    "Expected at least one truncated CSV dataset."
  );

  assert.ok(
    truncatedDataset
      .exportedRowCount <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_CSV_DATASET_ROWS,
    "CSV dataset exceeded its per-dataset row limit."
  );

  assert.ok(
    truncatedDataset
      .sourceRowCount >
      truncatedDataset
        .exportedRowCount,
    "CSV truncation metadata does not reflect source/exported counts."
  );
};


const testCsvGlobalLimit = () => {
  const perDataset =
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS;

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "DATASET_ONE",

          title:
            "Dataset One",

          data: {
            rows:
              createRows(
                perDataset,
                {
                  prefix:
                    "one",
                }
              ),
          },
        }),

        createSection({
          code:
            "DATASET_TWO",

          title:
            "Dataset Two",

          data: {
            rows:
              createRows(
                perDataset,
                {
                  prefix:
                    "two",
                }
              ),
          },
        }),

        createSection({
          code:
            "DATASET_THREE",

          title:
            "Dataset Three",

          data: {
            rows:
              createRows(
                1000,
                {
                  prefix:
                    "three",
                }
              ),
          },
        }),
      ],
    });

  const exported =
    generateBusinessReportCsvExport({
      report,
    });

  assert.ok(
    exported.totalRows <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_CSV_ROWS,
    "CSV global row ceiling was exceeded."
  );

  assert.equal(
    exported.truncated,
    true,
    "CSV should report global truncation."
  );
};


/**
 * =========================================================
 * JSON TESTS
 * =========================================================
 */

const testJsonNormalExport = () => {
  const report =
    createReport({
      sections: [
        createSection({
          code:
            "SUMMARY",

          title:
            "Summary",

          data: {
            totalListings:
              100,

            totalOffers:
              50,

            completedTrades:
              20,
          },
        }),
      ],
    });

  const exported =
    generateBusinessReportJsonExport({
      report,
    });

  assert.equal(
    exported.format,
    "JSON"
  );

  assert.ok(
    exported.byteLength <
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_JSON_BYTES,
    "Normal JSON export unexpectedly exceeded the byte limit."
  );
};


const testJsonOversizedExport = () => {
  /**
   * Use a string larger than the configured JSON limit.
   *
   * The serializer must reject it rather than silently
   * truncating the canonical report.
   */

  const oversizedString =
    "X".repeat(
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_JSON_BYTES +
      1024
    );

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "OVERSIZED_JSON",

          title:
            "Oversized JSON",

          data: {
            oversizedString,
          },
        }),
      ],
    });

  assert.throws(
    () =>
      generateBusinessReportJsonExport({
        report,
      }),

    (error) => {
      assert.equal(
        error.code,
        "BUSINESS_REPORT_JSON_TOO_LARGE"
      );

      assert.ok(
        error.details
          ?.byteLength >
          error.details
            ?.maxBytes,
        "Oversized JSON error should include valid byte metadata."
      );

      return true;
    }
  );
};


const testJsonDepthLimit = () => {
  let deeplyNested = {
    value:
      "bottom",
  };

  for (
    let index = 0;
    index <
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_JSON_DEPTH +
      10;
    index += 1
  ) {
    deeplyNested = {
      nested:
        deeplyNested,
    };
  }

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "DEEP_JSON",

          title:
            "Deep JSON",

          data:
            deeplyNested,
        }),
      ],
    });

  assert.throws(
    () =>
      generateBusinessReportJsonExport({
        report,
      }),

    (error) => {
      assert.equal(
        error.code,
        "BUSINESS_REPORT_JSON_DEPTH_EXCEEDED"
      );

      return true;
    }
  );
};


const testJsonCircularReference = () => {
  const circular = {
    name:
      "Circular test",
  };

  circular.self =
    circular;

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "CIRCULAR_JSON",

          title:
            "Circular JSON",

          data:
            circular,
        }),
      ],
    });

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


/**
 * =========================================================
 * PDF-READY TESTS
 * =========================================================
 */

const testPdfReadyNormalExport = () => {
  const report =
    createReport({
      sections: [
        createSection({
          code:
            "LISTING_PERFORMANCE",

          title:
            "Listing Performance",

          data: {
            listings:
              createRows(
                100,
                {
                  prefix:
                    "listing",
                }
              ),
          },
        }),
      ],
    });

  const prepared =
    generateBusinessReportPdfReadyData({
      report,
    });

  assert.equal(
    prepared.format,
    "PDF_READY"
  );

  assert.equal(
    prepared.binaryPdf,
    false
  );

  assert.equal(
    prepared
      .largeExportProtection
      .truncated,
    false,
    "Small PDF_READY report should not be truncated."
  );

  assert.ok(
    prepared
      .largeExportProtection
      .renderedTableRowCount <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_PDF_READY_ROWS
  );
};


const testPdfReadyPerTableLimit = () => {
  const sourceCount =
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTION_ROWS +
    250;

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "LISTING_PERFORMANCE",

          title:
            "Listing Performance",

          data: {
            listings:
              createRows(
                sourceCount,
                {
                  prefix:
                    "listing",
                }
              ),
          },
        }),
      ],
    });

  const prepared =
    generateBusinessReportPdfReadyData({
      report,
    });

  const table =
    prepared.sections
      .flatMap(
        (section) =>
          section.tables
      )
      .find(
        (candidate) =>
          candidate
            .sourceRowCount >
          candidate
            .renderedRowCount
      );

  assert.ok(
    table,
    "Expected a truncated PDF-ready table."
  );

  assert.ok(
    table.renderedRowCount <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_PDF_READY_SECTION_ROWS,
    "PDF_READY table exceeded the per-table limit."
  );

  assert.equal(
    table.truncated,
    true
  );

  assert.equal(
    prepared
      .largeExportProtection
      .truncated,
    true
  );
};


const testPdfReadyGlobalLimit = () => {
  const perTable =
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTION_ROWS;

  const report =
    createReport({
      sections: [
        createSection({
          code:
            "TABLE_ONE",

          title:
            "Table One",

          data: {
            rows:
              createRows(
                perTable,
                {
                  prefix:
                    "pdf-one",
                }
              ),
          },
        }),

        createSection({
          code:
            "TABLE_TWO",

          title:
            "Table Two",

          data: {
            rows:
              createRows(
                perTable,
                {
                  prefix:
                    "pdf-two",
                }
              ),
          },
        }),

        createSection({
          code:
            "TABLE_THREE",

          title:
            "Table Three",

          data: {
            rows:
              createRows(
                1000,
                {
                  prefix:
                    "pdf-three",
                }
              ),
          },
        }),
      ],
    });

  const prepared =
    generateBusinessReportPdfReadyData({
      report,
    });

  assert.equal(
    prepared
      .largeExportProtection
      .truncated,
    true,
    "PDF_READY should report global truncation."
  );

  assert.ok(
    prepared
      .largeExportProtection
      .renderedTableRowCount <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_PDF_READY_ROWS,
    "PDF_READY exceeded the global table-row limit."
  );

  const actualRenderedRows =
    prepared.sections.reduce(
      (
        sectionTotal,
        section
      ) =>
        sectionTotal +
        section.tables.reduce(
          (
            tableTotal,
            table
          ) =>
            tableTotal +
            table.rows.length,

          0
        ),

      0
    );

  assert.equal(
    actualRenderedRows,
    prepared
      .largeExportProtection
      .renderedTableRowCount,
    "PDF_READY row metadata does not match actual rendered rows."
  );
};


const testPdfReadyDoesNotDuplicateSourceData =
  () => {
    const report =
      createReport({
        sections: [
          createSection({
            code:
              "LISTING_PERFORMANCE",

            title:
              "Listing Performance",

            data: {
              listings:
                createRows(
                  100,
                  {
                    prefix:
                      "listing",
                  }
                ),
            },
          }),
        ],
      });

    const prepared =
      generateBusinessReportPdfReadyData({
        report,
      });

    for (
      const section
      of prepared.sections
    ) {
      assert.equal(
        Object.prototype
          .hasOwnProperty.call(
            section,
            "data"
          ),
        false,
        "PDF_READY section must not duplicate unbounded canonical section.data."
      );

      assert.equal(
        section
          .sourceDataIncluded,
        false
      );
    }
  };


const testPdfReadySectionLimit = () => {
  const sectionCount =
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTIONS +
    1;

  const sections =
    Array.from(
      {
        length:
          sectionCount,
      },
      (_, index) =>
        createSection({
          code:
            `SECTION_${index + 1}`,

          title:
            `Section ${index + 1}`,

          data: {
            value:
              index + 1,
          },
        })
    );

  const report =
    createReport({
      sections,
    });

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
    " Business Report Large Export Protection"
  );
  console.log(
    " 9.11.19.19"
  );
  console.log(
    "============================================"
  );
  console.log("");

  const results = [];

  results.push(
    await runTest(
      "Central export limits are configured",
      testCentralLimits
    )
  );

  results.push(
    await runTest(
      "CSV normal export remains untruncated",
      testCsvNormalExport
    )
  );

  results.push(
    await runTest(
      "CSV enforces per-dataset row limit",
      testCsvDatasetLimit
    )
  );

  results.push(
    await runTest(
      "CSV enforces global row limit",
      testCsvGlobalLimit
    )
  );

  results.push(
    await runTest(
      "JSON normal export remains within limit",
      testJsonNormalExport
    )
  );

  results.push(
    await runTest(
      "JSON rejects oversized payload",
      testJsonOversizedExport
    )
  );

  results.push(
    await runTest(
      "JSON rejects excessive nesting",
      testJsonDepthLimit
    )
  );

  results.push(
    await runTest(
      "JSON rejects circular references",
      testJsonCircularReference
    )
  );

  results.push(
    await runTest(
      "PDF_READY normal export remains untruncated",
      testPdfReadyNormalExport
    )
  );

  results.push(
    await runTest(
      "PDF_READY enforces per-table row limit",
      testPdfReadyPerTableLimit
    )
  );

  results.push(
    await runTest(
      "PDF_READY enforces global table-row limit",
      testPdfReadyGlobalLimit
    )
  );

  results.push(
    await runTest(
      "PDF_READY does not duplicate canonical section.data",
      testPdfReadyDoesNotDuplicateSourceData
    )
  );

  results.push(
    await runTest(
      "PDF_READY rejects excessive section count",
      testPdfReadySectionLimit
    )
  );

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
      `${failed} large export protection test(s) failed.`
    );
  }

  console.log(
    "✅ 9.11.19.19 Large Export Protection verification passed."
  );
};


run().catch((error) => {
  console.error("");
  console.error(
    "Large export protection verification failed."
  );

  console.error(
    error
  );

  process.exitCode = 1;
});