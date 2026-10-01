// CREATE — server/src/tests/businessReportConfig.test.js

import assert from "node:assert/strict";

import {
  BUSINESS_REPORT_VERSION,

  BUSINESS_REPORT_TYPES,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_ACCESS,
  BUSINESS_REPORT_HISTORY,
  BUSINESS_REPORT_EXPORT_LIMITS,
  BUSINESS_REPORT_SECTIONS,
  BUSINESS_REPORT_DEFINITIONS,
  BUSINESS_REPORT_CAPABILITIES,

  DEFAULT_BUSINESS_REPORT_FORMAT,
  DEFAULT_BUSINESS_REPORT_TYPE,

  getSupportedBusinessReportTypes,
  isSupportedBusinessReportType,
  getBusinessReportDefinition,

  getSupportedBusinessReportFormats,
  isSupportedBusinessReportFormat,
  isFormatSupportedForBusinessReport,

  normalizeBusinessReportType,
  normalizeBusinessReportFormat,

  getBusinessReportPublicConfig,
} from "../config/businessReportConfig.js";


/**
 * =========================================================
 * BUSINESS REPORT CONFIGURATION TEST
 * =========================================================
 *
 * Roadmap:
 *
 * 9.11.19.20.1 — Configuration / Registry Testing
 *
 * This test verifies:
 *
 * - report registry integrity
 * - report type normalization
 * - export format normalization
 * - Business Pro requirements
 * - report definitions
 * - section references
 * - history constraints
 * - export limits
 * - capabilities
 * - public configuration
 * - default report / format
 *
 * No database access is required.
 * =========================================================
 */


/**
 * =========================================================
 * HELPERS
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


const EXPECTED_REPORT_TYPES = [
  "BUSINESS_PERFORMANCE",
  "LISTING_PERFORMANCE",
  "CONVERSION_INTELLIGENCE",
  "DEMAND_INTELLIGENCE",
  "CATEGORY_BENCHMARK",
  "GROWTH_RECOMMENDATIONS",
  "PROMOTION_INTELLIGENCE",
  "BUSINESS_INTELLIGENCE",
];


const EXPECTED_FORMATS = [
  "JSON",
  "CSV",
  "PDF_READY",
];


/**
 * =========================================================
 * VERSION
 * =========================================================
 */

const testReportVersion = () => {
  assert.equal(
    BUSINESS_REPORT_VERSION,
    "1.0",
    "Business report version should be 1.0."
  );
};


/**
 * =========================================================
 * REPORT TYPES
 * =========================================================
 */

const testReportTypeRegistry = () => {
  const reportTypes =
    Object.values(
      BUSINESS_REPORT_TYPES
    );

  assert.equal(
    reportTypes.length,
    8,
    "Exactly eight business report types should be registered."
  );

  assert.deepEqual(
    reportTypes,
    EXPECTED_REPORT_TYPES,
    "Business report type registry does not match the expected report types."
  );

  assert.equal(
    new Set(reportTypes).size,
    reportTypes.length,
    "Business report type codes must be unique."
  );
};


const testSupportedReportTypesHelper =
  () => {
    const supported =
      getSupportedBusinessReportTypes();

    assert.deepEqual(
      supported,
      EXPECTED_REPORT_TYPES
    );
  };


const testReportTypeSupport =
  () => {
    for (
      const reportType
      of EXPECTED_REPORT_TYPES
    ) {
      assert.equal(
        isSupportedBusinessReportType(
          reportType
        ),
        true,
        `${reportType} should be supported.`
      );

      assert.equal(
        isSupportedBusinessReportType(
          reportType.toLowerCase()
        ),
        true,
        `${reportType} should support case-insensitive lookup.`
      );
    }

    assert.equal(
      isSupportedBusinessReportType(
        "NOT_A_REAL_REPORT"
      ),
      false
    );

    assert.equal(
      isSupportedBusinessReportType(
        null
      ),
      false
    );

    assert.equal(
      isSupportedBusinessReportType(
        undefined
      ),
      false
    );

    assert.equal(
      isSupportedBusinessReportType(
        ""
      ),
      false
    );
  };


const testReportTypeNormalization =
  () => {
    assert.equal(
      normalizeBusinessReportType(
        "business_performance"
      ),
      "BUSINESS_PERFORMANCE"
    );

    assert.equal(
      normalizeBusinessReportType(
        "  listing_performance  "
      ),
      "LISTING_PERFORMANCE"
    );

    assert.equal(
      normalizeBusinessReportType(
        "Business_Intelligence"
      ),
      "BUSINESS_INTELLIGENCE"
    );

    assert.equal(
      normalizeBusinessReportType(
        "not_real"
      ),
      null
    );

    assert.equal(
      normalizeBusinessReportType(
        ""
      ),
      null
    );

    assert.equal(
      normalizeBusinessReportType(
        null
      ),
      null
    );
  };


/**
 * =========================================================
 * FORMATS
 * =========================================================
 */

const testFormatRegistry = () => {
  const formats =
    Object.values(
      BUSINESS_REPORT_FORMATS
    );

  assert.deepEqual(
    formats,
    EXPECTED_FORMATS
  );

  assert.equal(
    new Set(formats).size,
    formats.length,
    "Business report formats must be unique."
  );
};


const testSupportedFormatsHelper =
  () => {
    assert.deepEqual(
      getSupportedBusinessReportFormats(),
      EXPECTED_FORMATS
    );
  };


const testFormatSupport = () => {
  for (
    const format
    of EXPECTED_FORMATS
  ) {
    assert.equal(
      isSupportedBusinessReportFormat(
        format
      ),
      true
    );

    assert.equal(
      isSupportedBusinessReportFormat(
        format.toLowerCase()
      ),
      true
    );
  }

  assert.equal(
    isSupportedBusinessReportFormat(
      "PDF"
    ),
    false,
    "Binary PDF must not be registered as a supported report format."
  );

  assert.equal(
    isSupportedBusinessReportFormat(
      "XLSX"
    ),
    false
  );

  assert.equal(
    isSupportedBusinessReportFormat(
      null
    ),
    false
  );
};


const testFormatNormalization =
  () => {
    assert.equal(
      normalizeBusinessReportFormat(
        "json"
      ),
      "JSON"
    );

    assert.equal(
      normalizeBusinessReportFormat(
        " csv "
      ),
      "CSV"
    );

    assert.equal(
      normalizeBusinessReportFormat(
        "pdf_ready"
      ),
      "PDF_READY"
    );

    assert.equal(
      normalizeBusinessReportFormat(
        "pdf"
      ),
      null
    );

    assert.equal(
      normalizeBusinessReportFormat(
        ""
      ),
      null
    );
  };


/**
 * =========================================================
 * ACCESS
 * =========================================================
 */

const testReportAccessTier = () => {
  assert.equal(
    BUSINESS_REPORT_ACCESS
      .BUSINESS_PRO,
    "BUSINESS_PRO"
  );

  assert.deepEqual(
    Object.values(
      BUSINESS_REPORT_ACCESS
    ),
    [
      "BUSINESS_PRO",
    ],
    "Reports should currently expose only the Business Pro access tier."
  );
};


/**
 * =========================================================
 * HISTORY
 * =========================================================
 */

const testHistoryConfiguration =
  () => {
    assert.equal(
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS,
      30
    );

    assert.equal(
      BUSINESS_REPORT_HISTORY
        .MIN_DAYS,
      1
    );

    assert.equal(
      BUSINESS_REPORT_HISTORY
        .MAX_DAYS,
      365
    );

    assert.equal(
      BUSINESS_REPORT_HISTORY
        .CUSTOM_DATE_RANGE,
      true
    );

    assert.ok(
      BUSINESS_REPORT_HISTORY
        .MIN_DAYS <=
        BUSINESS_REPORT_HISTORY
          .DEFAULT_DAYS
    );

    assert.ok(
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS <=
        BUSINESS_REPORT_HISTORY
          .MAX_DAYS
    );
  };


/**
 * =========================================================
 * LARGE EXPORT LIMITS
 * =========================================================
 */

const testExportLimits = () => {
  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_LISTING_ROWS,
    5000
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PROMOTION_ROWS,
    5000
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_RECOMMENDATIONS,
    100
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_REPORT_SECTIONS,
    25
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_EXPORT_DAYS,
    365
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_ROWS,
    10000
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS,
    5000
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_JSON_BYTES,
    5 * 1024 * 1024
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_JSON_DEPTH,
    30
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTIONS,
    25
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTION_ROWS,
    5000
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_ROWS,
    10000
  );

  assert.ok(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_CSV_ROWS,
    "Per-dataset CSV limit cannot exceed the global CSV limit."
  );

  assert.ok(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTION_ROWS <=
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_PDF_READY_ROWS,
    "Per-section PDF_READY limit cannot exceed the global PDF_READY limit."
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_EXPORT_DAYS,
    BUSINESS_REPORT_HISTORY
      .MAX_DAYS,
    "Export history ceiling should match the report history ceiling."
  );
};


/**
 * =========================================================
 * REPORT DEFINITIONS
 * =========================================================
 */

const testEveryReportHasDefinition =
  () => {
    const definitions =
      Object.values(
        BUSINESS_REPORT_DEFINITIONS
      );

    assert.equal(
      definitions.length,
      EXPECTED_REPORT_TYPES.length,
      "Every registered report type should have exactly one definition."
    );

    for (
      const reportType
      of EXPECTED_REPORT_TYPES
    ) {
      const definition =
        getBusinessReportDefinition(
          reportType
        );

      assert.ok(
        definition,
        `Missing definition for ${reportType}.`
      );

      assert.equal(
        definition.code,
        reportType,
        `Definition code mismatch for ${reportType}.`
      );
    }
  };


const testDefinitionLookup =
  () => {
    assert.equal(
      getBusinessReportDefinition(
        "business_performance"
      )?.code,
      "BUSINESS_PERFORMANCE"
    );

    assert.equal(
      getBusinessReportDefinition(
        "NOT_REAL"
      ),
      null
    );

    assert.equal(
      getBusinessReportDefinition(
        null
      ),
      null
    );
  };


const testDefinitionsRequireBusinessPro =
  () => {
    for (
      const definition
      of Object.values(
        BUSINESS_REPORT_DEFINITIONS
      )
    ) {
      assert.equal(
        definition.requiredPlan,
        BUSINESS_REPORT_ACCESS
          .BUSINESS_PRO,
        `${definition.code} must require Business Pro.`
      );
    }
  };


const testDefinitionsHaveMetadata =
  () => {
    for (
      const definition
      of Object.values(
        BUSINESS_REPORT_DEFINITIONS
      )
    ) {
      assert.equal(
        typeof definition.title,
        "string"
      );

      assert.ok(
        definition.title.trim()
          .length > 0,
        `${definition.code} must have a title.`
      );

      assert.equal(
        typeof definition.description,
        "string"
      );

      assert.ok(
        definition.description
          .trim().length > 0,
        `${definition.code} must have a description.`
      );
    }
  };


/**
 * =========================================================
 * DEFINITION FORMATS
 * =========================================================
 */

const testEveryDefinitionSupportsExpectedFormats =
  () => {
    for (
      const definition
      of Object.values(
        BUSINESS_REPORT_DEFINITIONS
      )
    ) {
      assert.deepEqual(
        [
          ...definition
            .supportedFormats,
        ],
        EXPECTED_FORMATS,
        `${definition.code} should support JSON, CSV and PDF_READY.`
      );

      for (
        const format
        of EXPECTED_FORMATS
      ) {
        assert.equal(
          isFormatSupportedForBusinessReport(
            definition.code,
            format
          ),
          true,
          `${definition.code} should support ${format}.`
        );
      }
    }
  };


const testInvalidReportFormatCombination =
  () => {
    assert.equal(
      isFormatSupportedForBusinessReport(
        "BUSINESS_PERFORMANCE",
        "PDF"
      ),
      false
    );

    assert.equal(
      isFormatSupportedForBusinessReport(
        "NOT_REAL",
        "JSON"
      ),
      false
    );

    assert.equal(
      isFormatSupportedForBusinessReport(
        null,
        "JSON"
      ),
      false
    );

    assert.equal(
      isFormatSupportedForBusinessReport(
        "BUSINESS_PERFORMANCE",
        null
      ),
      false
    );
  };


/**
 * =========================================================
 * DEFINITION SECTIONS
 * =========================================================
 */

const testDefinitionSections = () => {
  const registeredSections =
    new Set(
      Object.values(
        BUSINESS_REPORT_SECTIONS
      )
    );

  for (
    const definition
    of Object.values(
      BUSINESS_REPORT_DEFINITIONS
    )
  ) {
    assert.ok(
      Array.isArray(
        definition.sections
      ),
      `${definition.code} sections must be an array.`
    );

    assert.ok(
      definition.sections.length >
        0,
      `${definition.code} must contain at least one section.`
    );

    assert.ok(
      definition.sections.length <=
        BUSINESS_REPORT_EXPORT_LIMITS
          .MAX_REPORT_SECTIONS,
      `${definition.code} exceeds the maximum report section limit.`
    );

    assert.equal(
      new Set(
        definition.sections
      ).size,
      definition.sections.length,
      `${definition.code} contains duplicate sections.`
    );

    for (
      const section
      of definition.sections
    ) {
      assert.equal(
        registeredSections.has(
          section
        ),
        true,
        `${definition.code} references unknown section ${section}.`
      );
    }
  }
};


const testStandardBoundarySections =
  () => {
    for (
      const definition
      of Object.values(
        BUSINESS_REPORT_DEFINITIONS
      )
    ) {
      assert.equal(
        definition.sections[0],
        BUSINESS_REPORT_SECTIONS
          .EXECUTIVE_SUMMARY,
        `${definition.code} should begin with EXECUTIVE_SUMMARY.`
      );

      assert.equal(
        definition.sections.includes(
          BUSINESS_REPORT_SECTIONS
            .DATA_COVERAGE
        ),
        true,
        `${definition.code} should include DATA_COVERAGE.`
      );

      assert.equal(
        definition.sections.at(-1),
        BUSINESS_REPORT_SECTIONS
          .METHODOLOGY,
        `${definition.code} should end with METHODOLOGY.`
      );
    }
  };


const testBusinessIntelligenceCoverage =
  () => {
    const definition =
      getBusinessReportDefinition(
        BUSINESS_REPORT_TYPES
          .BUSINESS_INTELLIGENCE
      );

    const requiredSections = [
      BUSINESS_REPORT_SECTIONS
        .BUSINESS_PERFORMANCE,

      BUSINESS_REPORT_SECTIONS
        .LISTING_PERFORMANCE,

      BUSINESS_REPORT_SECTIONS
        .OFFER_PERFORMANCE,

      BUSINESS_REPORT_SECTIONS
        .TRADE_PERFORMANCE,

      BUSINESS_REPORT_SECTIONS
        .CONVERSION_FUNNEL,

      BUSINESS_REPORT_SECTIONS
        .CONVERSION_INTELLIGENCE,

      BUSINESS_REPORT_SECTIONS
        .DEMAND_INTELLIGENCE,

      BUSINESS_REPORT_SECTIONS
        .CATEGORY_BENCHMARKS,

      BUSINESS_REPORT_SECTIONS
        .PROMOTION_PERFORMANCE,

      BUSINESS_REPORT_SECTIONS
        .PROMOTION_INTELLIGENCE,

      BUSINESS_REPORT_SECTIONS
        .GROWTH_RECOMMENDATIONS,

      BUSINESS_REPORT_SECTIONS
        .PERFORMANCE_TRENDS,
    ];

    for (
      const section
      of requiredSections
    ) {
      assert.equal(
        definition.sections.includes(
          section
        ),
        true,
        `BUSINESS_INTELLIGENCE is missing ${section}.`
      );
    }
  };


/**
 * =========================================================
 * PROMOTION / BENCHMARK ARCHITECTURE
 * =========================================================
 */

const testPromotionDefinition =
  () => {
    const definition =
      getBusinessReportDefinition(
        BUSINESS_REPORT_TYPES
          .PROMOTION_INTELLIGENCE
      );

    assert.ok(
      definition.description.includes(
        "observed"
      ),
      "Promotion report description should use non-causal observed wording."
    );

    assert.equal(
      definition.sections.includes(
        BUSINESS_REPORT_SECTIONS
          .PROMOTION_PERFORMANCE
      ),
      true
    );

    assert.equal(
      definition.sections.includes(
        BUSINESS_REPORT_SECTIONS
          .PROMOTION_INTELLIGENCE
      ),
      true
    );
  };


const testCategoryBenchmarkDefinition =
  () => {
    const definition =
      getBusinessReportDefinition(
        BUSINESS_REPORT_TYPES
          .CATEGORY_BENCHMARK
      );

    assert.ok(
      definition.description
        .toLowerCase()
        .includes(
          "privacy-safe"
        ),
      "Category benchmark definition should preserve privacy-safe framing."
    );

    assert.equal(
      definition.sections.includes(
        BUSINESS_REPORT_SECTIONS
          .CATEGORY_BENCHMARKS
      ),
      true
    );
  };


/**
 * =========================================================
 * CAPABILITIES
 * =========================================================
 */

const testCapabilities = () => {
  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .REPORT_GENERATION,
    true
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .JSON_EXPORT,
    true
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .CSV_EXPORT,
    true
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .PDF_READY_EXPORT,
    true
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .CUSTOM_DATE_RANGE,
    true
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .EXTENDED_HISTORY,
    true
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .SAVED_REPORTS,
    false
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .SCHEDULED_REPORTS,
    false
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .EMAIL_DELIVERY,
    false
  );

  assert.equal(
    BUSINESS_REPORT_CAPABILITIES
      .REPORT_HISTORY,
    false
  );
};


/**
 * =========================================================
 * DEFAULTS
 * =========================================================
 */

const testDefaults = () => {
  assert.equal(
    DEFAULT_BUSINESS_REPORT_FORMAT,
    BUSINESS_REPORT_FORMATS
      .JSON
  );

  assert.equal(
    DEFAULT_BUSINESS_REPORT_TYPE,
    BUSINESS_REPORT_TYPES
      .BUSINESS_INTELLIGENCE
  );

  assert.equal(
    isSupportedBusinessReportFormat(
      DEFAULT_BUSINESS_REPORT_FORMAT
    ),
    true
  );

  assert.equal(
    isSupportedBusinessReportType(
      DEFAULT_BUSINESS_REPORT_TYPE
    ),
    true
  );
};


/**
 * =========================================================
 * PUBLIC CONFIG
 * =========================================================
 */

const testPublicConfiguration =
  () => {
    const config =
      getBusinessReportPublicConfig();

    assert.equal(
      config.version,
      BUSINESS_REPORT_VERSION
    );

    assert.deepEqual(
      config.formats,
      EXPECTED_FORMATS
    );

    assert.equal(
      config.history.defaultDays,
      30
    );

    assert.equal(
      config.history.minDays,
      1
    );

    assert.equal(
      config.history.maxDays,
      365
    );

    assert.equal(
      config.history
        .customDateRange,
      true
    );

    assert.equal(
      config.reportTypes.length,
      8
    );

    assert.deepEqual(
      config.capabilities,
      BUSINESS_REPORT_CAPABILITIES
    );

    /**
     * Public config must describe access requirements,
     * but must not contain user-specific subscription
     * state.
     */

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          config,
          "subscription"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          config,
          "isBusinessPro"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          config,
          "userId"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          config,
          "businessId"
        ),
      false
    );
  };


const testPublicReportDefinitions =
  () => {
    const config =
      getBusinessReportPublicConfig();

    for (
      const report
      of config.reportTypes
    ) {
      assert.ok(
        EXPECTED_REPORT_TYPES
          .includes(
            report.code
          )
      );

      assert.equal(
        report.requiredPlan,
        BUSINESS_REPORT_ACCESS
          .BUSINESS_PRO
      );

      assert.deepEqual(
        report.supportedFormats,
        EXPECTED_FORMATS
      );

      assert.ok(
        Array.isArray(
          report.sections
        )
      );

      assert.ok(
        report.sections.length >
          0
      );
    }
  };


/**
 * =========================================================
 * IMMUTABILITY
 * =========================================================
 */

const testTopLevelConfigurationFrozen =
  () => {
    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_TYPES
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_FORMATS
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_ACCESS
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_HISTORY
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_EXPORT_LIMITS
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_SECTIONS
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_DEFINITIONS
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_CAPABILITIES
      ),
      true
    );
  };


const testDefinitionConfigurationFrozen =
  () => {
    for (
      const definition
      of Object.values(
        BUSINESS_REPORT_DEFINITIONS
      )
    ) {
      assert.equal(
        Object.isFrozen(
          definition
        ),
        true,
        `${definition.code} definition should be frozen.`
      );

      assert.equal(
        Object.isFrozen(
          definition
            .supportedFormats
        ),
        true,
        `${definition.code} supportedFormats should be frozen.`
      );

      assert.equal(
        Object.isFrozen(
          definition.sections
        ),
        true,
        `${definition.code} sections should be frozen.`
      );
    }
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
    " Business Report Configuration Tests"
  );
  console.log(
    " 9.11.19.20.1"
  );
  console.log(
    "============================================"
  );
  console.log("");

  const tests = [
    [
      "Report version is 1.0",
      testReportVersion,
    ],

    [
      "Exactly eight report types are registered",
      testReportTypeRegistry,
    ],

    [
      "Supported report types helper is correct",
      testSupportedReportTypesHelper,
    ],

    [
      "Report type support fails closed",
      testReportTypeSupport,
    ],

    [
      "Report type normalization is correct",
      testReportTypeNormalization,
    ],

    [
      "Exactly three export formats are registered",
      testFormatRegistry,
    ],

    [
      "Supported formats helper is correct",
      testSupportedFormatsHelper,
    ],

    [
      "Export format support fails closed",
      testFormatSupport,
    ],

    [
      "Export format normalization is correct",
      testFormatNormalization,
    ],

    [
      "Reports use Business Pro access tier",
      testReportAccessTier,
    ],

    [
      "Report history configuration is valid",
      testHistoryConfiguration,
    ],

    [
      "Large export limits are internally consistent",
      testExportLimits,
    ],

    [
      "Every report type has one definition",
      testEveryReportHasDefinition,
    ],

    [
      "Report definition lookup fails closed",
      testDefinitionLookup,
    ],

    [
      "Every report requires Business Pro",
      testDefinitionsRequireBusinessPro,
    ],

    [
      "Every report definition has metadata",
      testDefinitionsHaveMetadata,
    ],

    [
      "Every report supports configured export formats",
      testEveryDefinitionSupportsExpectedFormats,
    ],

    [
      "Invalid report/format combinations fail closed",
      testInvalidReportFormatCombination,
    ],

    [
      "All report section references are valid",
      testDefinitionSections,
    ],

    [
      "Reports preserve summary/data-coverage/methodology boundaries",
      testStandardBoundarySections,
    ],

    [
      "Business Intelligence contains full intelligence coverage",
      testBusinessIntelligenceCoverage,
    ],

    [
      "Promotion report preserves non-causal wording",
      testPromotionDefinition,
    ],

    [
      "Category benchmark preserves privacy-safe framing",
      testCategoryBenchmarkDefinition,
    ],

    [
      "Report capabilities match implemented scope",
      testCapabilities,
    ],

    [
      "Default report type and format are valid",
      testDefaults,
    ],

    [
      "Public configuration is safe",
      testPublicConfiguration,
    ],

    [
      "Public report definitions are valid",
      testPublicReportDefinitions,
    ],

    [
      "Top-level report configuration is frozen",
      testTopLevelConfigurationFrozen,
    ],

    [
      "Individual report definitions are frozen",
      testDefinitionConfigurationFrozen,
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
      `${failed} business report configuration test(s) failed.`
    );
  }

  console.log(
    "✅ 9.11.19.20.1 Business Report Configuration verification passed."
  );
};


run().catch((error) => {
  console.error("");
  console.error(
    "Business report configuration verification failed."
  );

  console.error(
    error
  );

  process.exitCode = 1;
});