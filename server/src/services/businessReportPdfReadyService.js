import {
  BUSINESS_REPORT_EXPORT_LIMITS,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_VERSION,
} from "../config/businessReportConfig.js";

/**
 * =========================================================
 * BUSINESS REPORT PDF-READY SERVICE
 * =========================================================
 *
 * Converts an already-generated canonical business report
 * into presentation-oriented data suitable for a future
 * PDF renderer.
 *
 * IMPORTANT:
 *
 * This service does NOT:
 *
 * - generate a binary PDF
 * - query Prisma
 * - calculate analytics
 * - calculate benchmarks
 * - calculate conversion rates
 * - calculate promotion attribution
 * - generate growth recommendations
 * - authorize business ownership
 * - determine Business Pro entitlement
 *
 * It only transforms already-approved canonical report
 * data into a rendering-friendly structure.
 */


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const PDF_READY_FORMAT =
  BUSINESS_REPORT_FORMATS.PDF_READY;

// UPDATE — server/src/services/businessReportPdfReadyService.js

/**
 * =========================================================
 * PDF-READY LARGE EXPORT LIMITS
 * =========================================================
 *
 * PDF_READY remains structured rendering data.
 *
 * It is NOT a binary PDF.
 *
 * Limits are controlled centrally by
 * BUSINESS_REPORT_EXPORT_LIMITS.
 */

const MAX_TABLE_ROWS =
  Math.min(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_SECTION_ROWS ||
      5000,

    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_PDF_READY_ROWS ||
      10000
  );

const MAX_TOTAL_TABLE_ROWS =
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_PDF_READY_ROWS ||
  10000;

const MAX_RECOMMENDATIONS =
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_RECOMMENDATIONS ||
  100;

const MAX_CHART_POINTS =
  Math.min(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_EXPORT_DAYS ||
      365,

    366
  );

const MAX_SECTIONS =
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_PDF_READY_SECTIONS ||
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_REPORT_SECTIONS ||
  25;

/**
 * =========================================================
 * ERROR HELPER
 * =========================================================
 */

const createPdfReadyError = (
  code,
  message,
  details = null
) => {
  const error =
    new Error(message);

  error.code = code;

  if (details) {
    error.details =
      details;
  }

  return error;
};


/**
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

const isPlainObject = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
  );


const isPrimitive = (value) =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  typeof value === "bigint";


const normalizeValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    typeof value === "number" &&
    !Number.isFinite(value)
  ) {
    return null;
  }

  return value;
};


const humanizeKey = (value) =>
  String(value || "")
    .replace(
      /([a-z0-9])([A-Z])/g,
      "$1 $2"
    )
    .replace(
      /[_\-.]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );


/**
 * =========================================================
 * VALIDATE CANONICAL REPORT
 * =========================================================
 */

const validateCanonicalReport = (
  report
) => {
  if (
    !report ||
    typeof report !== "object" ||
    Array.isArray(report)
  ) {
    throw createPdfReadyError(
      "BUSINESS_REPORT_REQUIRED",
      "A canonical business report is required for PDF-ready transformation."
    );
  }

  if (!report.reportType) {
    throw createPdfReadyError(
      "BUSINESS_REPORT_TYPE_REQUIRED",
      "The canonical report is missing reportType."
    );
  }

  if (
    !Array.isArray(
      report.sections
    )
  ) {
    throw createPdfReadyError(
      "BUSINESS_REPORT_SECTIONS_REQUIRED",
      "The canonical report is missing report sections."
    );
  }

  if (
    report.sections.length >
    MAX_SECTIONS
  ) {
    throw createPdfReadyError(
      "BUSINESS_REPORT_TOO_MANY_SECTIONS",
      `The report exceeds the maximum supported section count of ${MAX_SECTIONS}.`
    );
  }
};


/**
 * =========================================================
 * SAFE BUSINESS IDENTITY
 * =========================================================
 *
 * Internal database IDs are intentionally excluded.
 */

const buildBusinessIdentity = (
  business
) => ({
  businessName:
    business?.businessName ||
    business?.name ||
    null,

  slug:
    business?.slug ||
    null,

  category:
    business?.category ||
    null,

  status:
    business?.status ||
    null,

  verificationStatus:
    business
      ?.verificationStatus ||
    null,

  logo:
    business?.logo ||
    business?.logoUrl ||
    null,
});


/**
 * =========================================================
 * REPORT PERIOD
 * =========================================================
 */

const buildReportingPeriod = (
  report
) => {
  const source =
    report.period ||
    report.reportingPeriod ||
    {};

  return {
    startDate:
      normalizeValue(
        source.startDate
      ),

    endDate:
      normalizeValue(
        source.endDate
      ),

    days:
      normalizeValue(
        source.days
      ),

    mode:
      source.mode ||
      null,
  };
};


/**
 * =========================================================
 * COVER
 * =========================================================
 */

const buildCover = (
  report
) => ({
  reportType:
    report.reportType,

  title:
    report.title ||
    humanizeKey(
      report.reportType
    ),

  subtitle:
    "Business Analytics Report",

  reportVersion:
    report.version ||
    report.metadata
      ?.reportVersion ||
    BUSINESS_REPORT_VERSION,

  generatedAt:
    normalizeValue(
      report.generatedAt
    ),

  business:
    buildBusinessIdentity(
      report.business
    ),

  period:
    buildReportingPeriod(
      report
    ),
});


/**
 * =========================================================
 * METADATA
 * =========================================================
 */

const buildPdfMetadata = (
  report
) => ({
  reportId:
    report.reportId ||
    report.metadata
      ?.reportId ||
    null,

  reportType:
    report.reportType,

  reportVersion:
    report.version ||
    report.metadata
      ?.reportVersion ||
    BUSINESS_REPORT_VERSION,

  analyticsTier:
    report.metadata
      ?.analyticsTier ||
    null,

  currency:
    report.metadata
      ?.currency ||
    null,

  timezone:
    report.metadata
      ?.timezone ||
    "UTC",

  sourceGeneratedAt:
    normalizeValue(
      report.generatedAt
    ),

  preparedAt:
    new Date()
      .toISOString(),
});


/**
 * =========================================================
 * KPI DISCOVERY
 * =========================================================
 *
 * Extracts useful scalar values from shallow report summary
 * objects.
 *
 * This does NOT calculate KPIs.
 *
 * It only presents scalar metrics that already exist.
 */

const extractKpis = (
  source,
  {
    prefix = "",
    depth = 0,
    maxDepth = 2,
    output = [],
  } = {}
) => {
  if (
    !isPlainObject(source) ||
    depth > maxDepth
  ) {
    return output;
  }

  for (
    const [key, value]
    of Object.entries(source)
  ) {
    const path =
      prefix
        ? `${prefix}.${key}`
        : key;

    if (
      typeof value === "number" ||
      typeof value === "bigint"
    ) {
      output.push({
        key: path,

        label:
          humanizeKey(key),

        value:
          normalizeValue(value),
      });

      continue;
    }

    if (
      isPlainObject(value)
    ) {
      extractKpis(
        value,
        {
          prefix: path,
          depth:
            depth + 1,
          maxDepth,
          output,
        }
      );
    }
  }

  return output;
};


/**
 * =========================================================
 * TABLE HELPERS
 * =========================================================
 */

const flattenTableRow = (
  source,
  prefix = "",
  output = {}
) => {
  if (!isPlainObject(source)) {
    return output;
  }

  for (
    const [key, value]
    of Object.entries(source)
  ) {
    const column =
      prefix
        ? `${prefix}.${key}`
        : key;

    if (
      isPrimitive(value) ||
      value instanceof Date
    ) {
      output[column] =
        normalizeValue(value);

      continue;
    }

    if (Array.isArray(value)) {
      /*
       * Arrays are not exploded into table columns.
       */

      continue;
    }

    if (isPlainObject(value)) {
      flattenTableRow(
        value,
        column,
        output
      );
    }
  }

  return output;
};


const collectTableColumns = (
  rows
) => {
  const columns =
    new Set();

  for (const row of rows) {
    for (
      const key
      of Object.keys(row)
    ) {
      columns.add(key);
    }
  }

  return [
    ...columns,
  ].map((key) => ({
    key,

    label:
      humanizeKey(
        key.split(".").pop()
      ),
  }));
};


const createTable = ({
  key,
  title,
  rows,
}) => {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const limitedRows =
    safeRows
      .slice(
        0,
        MAX_TABLE_ROWS
      )
      .filter(
        isPlainObject
      )
      .map(
        (row) =>
          flattenTableRow(
            row
          )
      );

  return {
    key,

    title,

    columns:
      collectTableColumns(
        limitedRows
      ),

    rows:
      limitedRows,

    sourceRowCount:
      safeRows.length,

    renderedRowCount:
      limitedRows.length,

    truncated:
      safeRows.length >
      limitedRows.length,
  };
};

// UPDATE — server/src/services/businessReportPdfReadyService.js

/**
 * =========================================================
 * GLOBAL PDF-READY TABLE ROW LIMIT
 * =========================================================
 *
 * Individual tables are already bounded by MAX_TABLE_ROWS.
 *
 * This second layer protects the complete PDF-ready
 * document from containing an excessive number of table
 * rows across multiple sections.
 *
 * Truncation is explicit and never modifies the canonical
 * report.
 */

const enforcePdfReadyTableRowLimit = (
  sections
) => {
  let remaining =
    MAX_TOTAL_TABLE_ROWS;

  let truncated = false;

  let sourceRowCount = 0;

  let renderedRowCount = 0;

  const limitedSections =
    sections.map((section) => {
      const tables = [];

      for (
        const table
        of section.tables || []
      ) {
        sourceRowCount +=
          Number(
            table.sourceRowCount || 0
          );

        if (remaining <= 0) {
          truncated = true;
          continue;
        }

        const rows =
          Array.isArray(table.rows)
            ? table.rows
            : [];

        if (
          rows.length <= remaining
        ) {
          tables.push(table);

          renderedRowCount +=
            rows.length;

          remaining -=
            rows.length;

          if (table.truncated) {
            truncated = true;
          }

          continue;
        }

        const limitedRows =
          rows.slice(
            0,
            remaining
          );

        tables.push({
          ...table,

          rows:
            limitedRows,

          columns:
            collectTableColumns(
              limitedRows
            ),

          renderedRowCount:
            limitedRows.length,

          truncated:
            true,
        });

        renderedRowCount +=
          limitedRows.length;

        remaining = 0;

        truncated = true;
      }

      return {
        ...section,

        tables,
      };
    });

  return {
    sections:
      limitedSections,

    sourceRowCount,

    renderedRowCount,

    maxRows:
      MAX_TOTAL_TABLE_ROWS,

    truncated,
  };
};


/**
 * =========================================================
 * DISCOVER TABLES
 * =========================================================
 */

const discoverTables = (
  source,
  path = "",
  output = [],
  visited =
    new WeakSet()
) => {
  if (
    !source ||
    typeof source !== "object"
  ) {
    return output;
  }

  if (visited.has(source)) {
    return output;
  }

  visited.add(source);

  if (Array.isArray(source)) {
    const rows =
      source.filter(
        isPlainObject
      );

    if (
      rows.length > 0 &&
      rows.length ===
        source.length
    ) {
      output.push(
        createTable({
          key:
            path || "rows",

          title:
            humanizeKey(
              path
                .split(".")
                .pop() ||
                "Rows"
            ),

          rows,
        })
      );
    }

    return output;
  }

  if (!isPlainObject(source)) {
    return output;
  }

  for (
    const [key, value]
    of Object.entries(source)
  ) {
    const childPath =
      path
        ? `${path}.${key}`
        : key;

    discoverTables(
      value,
      childPath,
      output,
      visited
    );
  }

  return output;
};


/**
 * =========================================================
 * CHART DISCOVERY
 * =========================================================
 *
 * Chart-ready data is produced only when an existing array
 * already contains an obvious label/time field plus numeric
 * series.
 *
 * No analytics values are calculated here.
 */

const getChartLabelKey = (
  row
) => {
  const candidates = [
    "date",
    "day",
    "month",
    "week",
    "label",
    "name",
    "period",
    "category",
  ];

  return (
    candidates.find(
      (key) =>
        row?.[key] !==
        undefined &&
        row?.[key] !==
        null
    ) ||
    null
  );
};


const getNumericKeys = (
  rows,
  labelKey
) => {
  const keys =
    new Set();

  for (const row of rows) {
    for (
      const [key, value]
      of Object.entries(row)
    ) {
      if (
        key !== labelKey &&
        typeof value ===
          "number" &&
        Number.isFinite(value)
      ) {
        keys.add(key);
      }
    }
  }

  return [
    ...keys,
  ];
};


const createChartFromRows = ({
  key,
  title,
  rows,
}) => {
  if (
    !Array.isArray(rows) ||
    rows.length < 2
  ) {
    return null;
  }

  const objectRows =
    rows.filter(
      isPlainObject
    );

  if (
    objectRows.length !==
    rows.length
  ) {
    return null;
  }

  const labelKey =
    getChartLabelKey(
      objectRows[0]
    );

  if (!labelKey) {
    return null;
  }

  const numericKeys =
    getNumericKeys(
      objectRows,
      labelKey
    );

  if (
    numericKeys.length === 0
  ) {
    return null;
  }

  const limitedRows =
    objectRows.slice(
      0,
      MAX_CHART_POINTS
    );

  return {
    key,

    title,

    type:
      "LINE",

    labelKey,

    labels:
      limitedRows.map(
        (row) =>
          normalizeValue(
            row[labelKey]
          )
      ),

    series:
      numericKeys.map(
        (numericKey) => ({
          key:
            numericKey,

          label:
            humanizeKey(
              numericKey
            ),

          values:
            limitedRows.map(
              (row) =>
                normalizeValue(
                  row[
                    numericKey
                  ]
                )
            ),
        })
      ),

    sourcePointCount:
      objectRows.length,

    renderedPointCount:
      limitedRows.length,

    truncated:
      objectRows.length >
      limitedRows.length,
  };
};


const discoverCharts = (
  source,
  path = "",
  output = [],
  visited =
    new WeakSet()
) => {
  if (
    !source ||
    typeof source !== "object"
  ) {
    return output;
  }

  if (visited.has(source)) {
    return output;
  }

  visited.add(source);

  if (Array.isArray(source)) {
    const chart =
      createChartFromRows({
        key:
          path || "chart",

        title:
          humanizeKey(
            path
              .split(".")
              .pop() ||
              "Performance"
          ),

        rows:
          source,
      });

    if (chart) {
      output.push(chart);
    }

    return output;
  }

  if (!isPlainObject(source)) {
    return output;
  }

  for (
    const [key, value]
    of Object.entries(source)
  ) {
    const childPath =
      path
        ? `${path}.${key}`
        : key;

    discoverCharts(
      value,
      childPath,
      output,
      visited
    );
  }

  return output;
};


/**
 * =========================================================
 * RECOMMENDATION DISCOVERY
 * =========================================================
 */

const discoverRecommendations = (
  source,
  output = [],
  visited =
    new WeakSet()
) => {
  if (
    !source ||
    typeof source !== "object"
  ) {
    return output;
  }

  if (visited.has(source)) {
    return output;
  }

  visited.add(source);

  if (Array.isArray(source)) {
    for (const item of source) {
      if (
        output.length >=
        MAX_RECOMMENDATIONS
      ) {
        break;
      }

      if (
        isPlainObject(item)
      ) {
        const looksLikeRecommendation =
          item.category ||
          item.recommendation ||
          item.message ||
          item.action ||
          item.title;

        if (
          looksLikeRecommendation
        ) {
          output.push({
            category:
              item.category ||
              null,

            title:
              item.title ||
              null,

            message:
              item.message ||
              item.recommendation ||
              null,

            action:
              item.action ||
              null,

            priority:
              item.priority ||
              null,

            signal:
              item.signal ||
              null,
          });

          continue;
        }
      }

      discoverRecommendations(
        item,
        output,
        visited
      );
    }

    return output;
  }

  if (!isPlainObject(source)) {
    return output;
  }

  for (
    const [key, value]
    of Object.entries(source)
  ) {
    if (
      output.length >=
      MAX_RECOMMENDATIONS
    ) {
      break;
    }

    if (
      key
        .toLowerCase()
        .includes(
          "recommend"
        )
    ) {
      discoverRecommendations(
        value,
        output,
        visited
      );

      continue;
    }

    discoverRecommendations(
      value,
      output,
      visited
    );
  }

  return output;
};


/**
 * =========================================================
 * SECTION TRANSFORMATION
 * =========================================================
 */

const buildPdfReadySection = (
  section,
  index
) => {
  const data =
    section?.data ??
    null;

  const tables =
    discoverTables(
      data
    );

  const charts =
    discoverCharts(
      data
    );

  const recommendations =
    discoverRecommendations(
      data
    );

  const kpis =
    extractKpis(
      data,
      {
        maxDepth: 2,
      }
    );

  return {
    order:
      index + 1,

    code:
      section.code,

    title:
      section.title ||
      humanizeKey(
        section.code
      ),

    available:
      section.available !==
      false,

    summary:
      section.summary ||
      null,

    kpis,

    tables,

    charts,

     recommendations,

    /**
     * IMPORTANT:
     *
     * Do not duplicate the complete canonical section data
     * inside PDF_READY.
     *
     * Large collections have already been transformed into
     * bounded tables/charts/recommendations above.
     *
     * Keeping the original unbounded data here would defeat
     * PDF-ready export limits.
     */
    sourceDataIncluded:
      false,
  };
};


/**
 * =========================================================
 * EXECUTIVE SUMMARY
 * =========================================================
 */

const buildExecutiveSummary = (
  report,
  sections
) => {
  const explicitSection =
    sections.find(
      (section) =>
        section.code ===
        "EXECUTIVE_SUMMARY"
    );

if (explicitSection) {
  return {
    source:
      "EXECUTIVE_SUMMARY",

    summary:
      explicitSection.summary ||
      null,

    kpis:
      explicitSection.kpis,

    sourceDataIncluded:
      false,
  };
}

  /*
   * Do not invent an executive narrative.
   *
   * If the canonical report has no explicit executive
   * summary, expose available top-level summary data.
   */

  return {
    source:
      "REPORT_SUMMARY",

    data:
      report.summary ||
      null,

    kpis:
      extractKpis(
        report.summary,
        {
          maxDepth: 2,
        }
      ),
  };
};


/**
 * =========================================================
 * GLOBAL RECOMMENDATIONS
 * =========================================================
 */

const buildGlobalRecommendations = (
  sections
) => {
  const output = [];

  for (
    const section
    of sections
  ) {
    for (
      const recommendation
      of section.recommendations
    ) {
      if (
        output.length >=
        MAX_RECOMMENDATIONS
      ) {
        return output;
      }

      output.push({
        sectionCode:
          section.code,

        ...recommendation,
      });
    }
  }

  return output;
};


/**
 * =========================================================
 * DATA COVERAGE
 * =========================================================
 */

const buildDataCoverage = (
  report,
  sections
) => ({
  reportingPeriod:
    buildReportingPeriod(
      report
    ),

  availableSections:
    sections
      .filter(
        (section) =>
          section.available
      )
      .map(
        (section) =>
          section.code
      ),

  unavailableSections:
    sections
      .filter(
        (section) =>
          !section.available
      )
      .map(
        (section) =>
          section.code
      ),

  notes:
    report.metadata
      ?.dataCoverage ||
    report.dataCoverage ||
    null,
});


/**
 * =========================================================
 * METHODOLOGY
 * =========================================================
 */

const buildMethodology = (
  report
) => {
  const methodologySection =
    report.sections.find(
      (section) =>
        section.code ===
        "METHODOLOGY"
    );

  return {
    data:
      methodologySection
        ?.data ||
      report.metadata
        ?.methodology ||
      report.methodology ||
      null,

    notes:
      report.metadata
        ?.methodologyNotes ||
      null,

    /*
     * Important interpretation boundaries already established
     * by the analytics architecture.
     */
    interpretationNotes: [
      "Promotion activity observed during a promotion period does not by itself prove causal attribution.",
      "Category benchmarks are aggregated and do not expose individual competitor performance.",
      "Growth recommendations are derived from existing analytics signals and are not independently recalculated by the PDF-ready layer.",
    ],
  };
};


/**
 * =========================================================
 * PAGE / RENDERING HINTS
 * =========================================================
 *
 * These are layout hints only.
 *
 * They do not generate pages or make analytics decisions.
 */

const buildRenderingHints = (
  sections
) => ({
  pageSize:
    "A4",

  orientation:
    "PORTRAIT",

  coverPage:
    true,

  repeatTableHeaders:
    true,

  avoidTableRowSplit:
    true,

  sectionCount:
    sections.length,

  sections:
    sections.map(
      (section) => ({
        code:
          section.code,

        preferredStart:
          section.code ===
            "EXECUTIVE_SUMMARY"
            ? "NEW_PAGE"
            : "AUTO",

        hasKpis:
          section.kpis
            .length > 0,

        hasTables:
          section.tables
            .length > 0,

        hasCharts:
          section.charts
            .length > 0,

        hasRecommendations:
          section
            .recommendations
            .length > 0,
      })
    ),
});


/**
 * =========================================================
 * GENERATE PDF-READY REPORT DATA
 * =========================================================
 */

export const generateBusinessReportPdfReadyData =
  ({
    report,
  } = {}) => {
    validateCanonicalReport(
      report
    );

const transformedSections =
  report.sections
    .slice(
      0,
      MAX_SECTIONS
    )
    .map(
      (
        section,
        index
      ) =>
        buildPdfReadySection(
          section,
          index
        )
    );

const limited =
  enforcePdfReadyTableRowLimit(
    transformedSections
  );

const sections =
  limited.sections;

    const preparedAt =
      new Date()
        .toISOString();

    return {
      format:
        PDF_READY_FORMAT,

      preparedAt,

      /*
       * This is explicitly structured data.
       * It is NOT a generated PDF file.
       */
      binaryPdf:
        false,

         largeExportProtection: {
        maxSections:
          MAX_SECTIONS,

        maxRowsPerTable:
          MAX_TABLE_ROWS,

        maxTotalTableRows:
          MAX_TOTAL_TABLE_ROWS,

        sourceTableRowCount:
          limited.sourceRowCount,

        renderedTableRowCount:
          limited.renderedRowCount,

        truncated:
          limited.truncated,
      },

      reportId:
        report.reportId ||
        report.metadata
          ?.reportId ||
        null,

      reportType:
        report.reportType,

      cover:
        buildCover(
          report
        ),

      metadata:
        buildPdfMetadata(
          report
        ),

      executiveSummary:
        buildExecutiveSummary(
          report,
          sections
        ),

      sections,

      recommendations:
        buildGlobalRecommendations(
          sections
        ),

      dataCoverage:
        buildDataCoverage(
          report,
          sections
        ),

      methodology:
        buildMethodology(
          report
        ),

      renderingHints:
        buildRenderingHints(
          sections
        ),
    };
  };


/**
 * =========================================================
 * GET PDF-READY SUMMARY
 * =========================================================
 */

export const getBusinessReportPdfReadySummary =
  ({
    report,
  } = {}) => {
    const prepared =
      generateBusinessReportPdfReadyData({
        report,
      });

    return {
      format:
        prepared.format,

      reportId:
        prepared.reportId,

      reportType:
        prepared.reportType,

      preparedAt:
        prepared.preparedAt,

      binaryPdf:
        prepared.binaryPdf,

      largeExportProtection: {
        ...prepared
          .largeExportProtection,
      },

      sectionCount:
        prepared.sections
          .length,

      recommendationCount:
        prepared
          .recommendations
          .length,

      tableCount:
        prepared.sections.reduce(
          (
            total,
            section
          ) =>
            total +
            section.tables
              .length,

          0
        ),

      chartCount:
        prepared.sections.reduce(
          (
            total,
            section
          ) =>
            total +
            section.charts
              .length,

          0
        ),
    };
  };


/**
 * =========================================================
 * PDF-READY CAPABILITIES
 * =========================================================
 */

export const getBusinessReportPdfReadyCapabilities =
  () => ({
    format:
      PDF_READY_FORMAT,

    binaryPdf:
      false,

    coverData:
      true,

    executiveSummary:
      true,

    kpiCards:
      true,

    tables:
      true,

    chartReadySeries:
      true,

    recommendations:
      true,

    methodology:
      true,

    dataCoverage:
      true,

    renderingHints:
      true,

maxSections:
        MAX_SECTIONS,

      maxTableRows:
        MAX_TABLE_ROWS,

      maxTotalTableRows:
        MAX_TOTAL_TABLE_ROWS,

      truncationSupported:
        true,

      includesUnboundedSourceData:
        false,

      maxChartPoints:
        MAX_CHART_POINTS,

    maxRecommendations:
      MAX_RECOMMENDATIONS,

    queriesDatabase:
      false,

    calculatesAnalytics:
      false,

    requiresCanonicalReport:
      true,
  });