import {
  BUSINESS_REPORT_EXPORT_LIMITS,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_TYPES,
} from "../config/businessReportConfig.js";

/**
 * =========================================================
 * BUSINESS REPORT CSV SERVICE
 * =========================================================
 *
 * Converts an already-generated canonical business report
 * into one or more CSV datasets.
 *
 * IMPORTANT:
 *
 * This service does NOT:
 *
 * - query Prisma
 * - calculate analytics
 * - calculate benchmarks
 * - generate recommendations
 * - determine Business Pro entitlement
 * - authorize business ownership
 * - inspect competitor records
 *
 * It only serializes data already approved for inclusion in
 * the canonical report.
 *
 * This means privacy/security boundaries established by the
 * analytics layer remain intact.
 */


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const CSV_MIME_TYPE =
  "text/csv; charset=utf-8";

const CSV_EXTENSION =
  "csv";

// UPDATE — server/src/services/businessReportCsvService.js

/**
 * =========================================================
 * CSV LARGE EXPORT LIMITS
 * =========================================================
 *
 * MAX_CSV_ROWS:
 *
 * Maximum number of exported rows across the complete
 * multi-dataset CSV export.
 *
 * MAX_CSV_DATASET_ROWS:
 *
 * Maximum number of exported rows allowed in any single
 * CSV dataset.
 *
 * Both values come from the central report configuration.
 */

const MAX_CSV_ROWS =
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_CSV_ROWS;

const MAX_CSV_DATASET_ROWS =
  Math.min(
    BUSINESS_REPORT_EXPORT_LIMITS
      .MAX_CSV_DATASET_ROWS ||
      BUSINESS_REPORT_EXPORT_LIMITS
        .MAX_LISTING_ROWS ||
      MAX_CSV_ROWS,

    MAX_CSV_ROWS
  );

/**
 * Existing dataset builders use MAX_SECTION_ROWS.
 *
 * Keep the alias so we do not unnecessarily rewrite the
 * serializer architecture.
 */

const MAX_SECTION_ROWS =
  MAX_CSV_DATASET_ROWS;


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


const normalizePrimitive = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
};


/**
 * =========================================================
 * CSV FORMULA INJECTION PROTECTION
 * =========================================================
 *
 * Spreadsheet applications may interpret cells beginning
 * with certain characters as formulas.
 *
 * Dangerous examples:
 *
 * =SUM(A1:A2)
 * +CMD(...)
 * -10+20
 * @SUM(...)
 *
 * Leading spaces/control characters can also be used to
 * hide the formula prefix.
 *
 * We prefix dangerous text values with a single quote.
 *
 * Example:
 *
 * =SUM(A1:A2)
 *
 * becomes:
 *
 * '=SUM(A1:A2)
 *
 * The exported value remains readable while spreadsheet
 * software treats it as text.
 *
 * IMPORTANT:
 *
 * This is export sanitization only.
 *
 * We do NOT modify the canonical report or database value.
 */

const CSV_FORMULA_PREFIX_PATTERN =
  /^[=+\-@]/;

const CSV_LEADING_CONTROL_PATTERN =
  /^[\u0000-\u0020]+/;


const sanitizeCsvSpreadsheetValue = (
  value
) => {
  if (
    typeof value !== "string"
  ) {
    return value;
  }

  if (!value) {
    return value;
  }

  const withoutLeadingControls =
    value.replace(
      CSV_LEADING_CONTROL_PATTERN,
      ""
    );

  if (
    CSV_FORMULA_PREFIX_PATTERN.test(
      withoutLeadingControls
    )
  ) {
    return `'${value}`;
  }

  return value;
};


/**
 * =========================================================
 * CSV ESCAPING
 * =========================================================
 
 *
 * RFC-style escaping:
 *
 * - values containing commas are quoted
 * - values containing quotes are quoted
 * - quotes inside values are doubled
 * - values containing new lines are quoted
 */

// UPDATE — server/src/services/businessReportCsvService.js

const escapeCsvValue = (value) => {
  const normalized =
    normalizePrimitive(value);

  /**
   * =========================================================
   * CSV FORMULA-INJECTION SECURITY
   * =========================================================
   *
   * IMPORTANT:
   *
   * Only values that were actually textual after primitive
   * normalization are eligible for spreadsheet formula
   * sanitization.
   *
   * This distinction is required because legitimate numeric
   * analytics values may be negative.
   *
   * Example:
   *
   *   number: -5
   *
   * must remain:
   *
   *   -5
   *
   * and must NOT become:
   *
   *   '-5
   *
   * However, user-controlled text such as:
   *
   *   "=SUM(A1:A2)"
   *   "+CMD(...)"
   *   "-10+20"
   *   "@SUM(...)"
   *
   * must be neutralized before being written to CSV.
   * =========================================================
   */

  const shouldSanitizeAsText =
    typeof normalized === "string";

  let stringValue;

  /**
   * ---------------------------------------------------------
   * OBJECT SERIALIZATION
   * ---------------------------------------------------------
   */

  if (
    typeof normalized === "object" &&
    normalized !== null
  ) {
    stringValue =
      JSON.stringify(normalized);
  } else {
    stringValue =
      String(normalized);
  }

  /**
   * ---------------------------------------------------------
   * SPREADSHEET FORMULA-INJECTION PROTECTION
   * ---------------------------------------------------------
   *
   * Do NOT apply this to actual numeric values.
   */

  if (shouldSanitizeAsText) {
    stringValue =
      sanitizeCsvSpreadsheetValue(
        stringValue
      );
  }

  /**
   * ---------------------------------------------------------
   * STANDARD RFC-STYLE CSV ESCAPING
   * ---------------------------------------------------------
   *
   * Fields containing commas, quotes or line breaks must be
   * quoted.
   *
   * Embedded quotes are escaped by doubling them.
   */

  const mustQuote =
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r");

  if (!mustQuote) {
    return stringValue;
  }

  return `"${stringValue.replace(
    /"/g,
    '""'
  )}"`;
};


/**
 * =========================================================
 * FILE NAME HELPERS
 * =========================================================
 */

const slugifyFilePart = (value) =>
  String(value || "report")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) ||
  "report";


const buildDatasetFileName = ({
  reportType,
  datasetName,
  generatedAt,
}) => {
  const date =
    generatedAt
      ? new Date(generatedAt)
          .toISOString()
          .slice(0, 10)
      : new Date()
          .toISOString()
          .slice(0, 10);

  return [
    slugifyFilePart(reportType),
    slugifyFilePart(datasetName),
    date,
  ].join("-") +
    `.${CSV_EXTENSION}`;
};


/**
 * =========================================================
 * FLATTEN OBJECT
 * =========================================================
 *
 * Nested objects become dot-notation columns.
 *
 * Example:
 *
 * {
 *   listing: {
 *     title: "Chair"
 *   }
 * }
 *
 * becomes:
 *
 * {
 *   "listing.title": "Chair"
 * }
 *
 * Arrays are intentionally NOT recursively expanded here.
 * Complex arrays are handled as their own datasets where
 * possible.
 */

const flattenObject = (
  input,
  prefix = "",
  output = {}
) => {
  if (!isPlainObject(input)) {
    return output;
  }

  for (
    const [key, value]
    of Object.entries(input)
  ) {
    const column =
      prefix
        ? `${prefix}.${key}`
        : key;

    if (isPrimitive(value)) {
      output[column] =
        normalizePrimitive(value);

      continue;
    }

    if (value instanceof Date) {
      output[column] =
        value.toISOString();

      continue;
    }

    if (Array.isArray(value)) {
      /*
       * Do not explode arrays into hundreds of columns.
       *
       * If the array is not promoted to its own dataset,
       * preserve it safely as JSON.
       */

      output[column] =
        JSON.stringify(value);

      continue;
    }

    if (isPlainObject(value)) {
      flattenObject(
        value,
        column,
        output
      );

      continue;
    }

    output[column] =
      String(value);
  }

  return output;
};


/**
 * =========================================================
 * DISCOVER TABULAR ARRAYS
 * =========================================================
 *
 * Recursively discovers arrays of objects inside a report
 * section.
 *
 * This allows the exporter to support the current analytics
 * structures without duplicating or guessing their schemas.
 *
 * Example:
 *
 * section.data.topListings
 *
 * becomes a dataset such as:
 *
 * listing-performance-top-listings
 */

const discoverTabularArrays = (
  value,
  path = "",
  results = [],
  visited = new WeakSet()
) => {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return results;
  }

  if (
    isPlainObject(value) ||
    Array.isArray(value)
  ) {
    if (visited.has(value)) {
      return results;
    }

    visited.add(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return results;
    }

    const objectRows =
      value.filter(isPlainObject);

    /*
     * Only promote the array when every row is an object.
     *
     * Primitive arrays remain part of their parent summary.
     */

    if (
      objectRows.length ===
      value.length
    ) {
      results.push({
        path:
          path || "rows",

        rows:
          objectRows,
      });

      return results;
    }

    return results;
  }

  if (!isPlainObject(value)) {
    return results;
  }

  for (
    const [key, child]
    of Object.entries(value)
  ) {
    const childPath =
      path
        ? `${path}.${key}`
        : key;

    discoverTabularArrays(
      child,
      childPath,
      results,
      visited
    );
  }

  return results;
};


/**
 * =========================================================
 * DATASET NAME
 * =========================================================
 */

const buildDatasetName = (
  sectionCode,
  suffix = null
) => {
  const base =
    slugifyFilePart(
      sectionCode || "report"
    );

  if (!suffix) {
    return base;
  }

  return `${base}-${slugifyFilePart(
    suffix
  )}`;
};


/**
 * =========================================================
 * NORMALIZE ROWS
 * =========================================================
 */

const normalizeRows = (
  rows,
  {
    maxRows =
      MAX_SECTION_ROWS,
  } = {}
) => {
  const safeRows =
    Array.isArray(rows)
      ? rows
      : [];

  const limitedRows =
    safeRows.slice(
      0,
      maxRows
    );

  return {
    rows:
      limitedRows.map(
        (row) => {
          if (isPlainObject(row)) {
            return flattenObject(
              row
            );
          }

          return {
            value:
              normalizePrimitive(
                row
              ),
          };
        }
      ),

    sourceRowCount:
      safeRows.length,

    exportedRowCount:
      limitedRows.length,

    truncated:
      safeRows.length >
      limitedRows.length,
  };
};


/**
 * =========================================================
 * DETERMINE HEADERS
 * =========================================================
 */

const collectHeaders = (rows) => {
  const headers =
    new Set();

  for (const row of rows) {
    for (
      const key
      of Object.keys(row)
    ) {
      headers.add(key);
    }
  }

  return [
    ...headers,
  ];
};


/**
 * =========================================================
 * ROWS → CSV
 * =========================================================
 */

const rowsToCsv = ({
  headers,
  rows,
}) => {
  if (
    !Array.isArray(headers) ||
    headers.length === 0
  ) {
    return "";
  }

  const lines = [];

  lines.push(
    headers
      .map(escapeCsvValue)
      .join(",")
  );

  for (const row of rows) {
    lines.push(
      headers
        .map((header) =>
          escapeCsvValue(
            row?.[header]
          )
        )
        .join(",")
    );
  }

  return lines.join("\r\n");
};


/**
 * =========================================================
 * CREATE DATASET
 * =========================================================
 */

const createCsvDataset = ({
  report,
  name,
  title,
  rows,
  maxRows =
    MAX_SECTION_ROWS,
}) => {
  const normalized =
    normalizeRows(
      rows,
      {
        maxRows,
      }
    );

  const headers =
    collectHeaders(
      normalized.rows
    );

  const csv =
    rowsToCsv({
      headers,
      rows:
        normalized.rows,
    });

  return {
    name,

    title,

    fileName:
      buildDatasetFileName({
        reportType:
          report.reportType,

        datasetName:
          name,

        generatedAt:
          report.generatedAt,
      }),

    mimeType:
      CSV_MIME_TYPE,

    headers,

    rows:
      normalized.rows,

    csv,

    sourceRowCount:
      normalized
        .sourceRowCount,

    exportedRowCount:
      normalized
        .exportedRowCount,

    truncated:
      normalized.truncated,
  };
};


/**
 * =========================================================
 * REPORT METADATA DATASET
 * =========================================================
 */

const buildMetadataDataset = (
  report
) => {
  const metadata = {
    reportId:
      report.reportId ||
      report.metadata
        ?.reportId ||
      "",

    reportType:
      report.reportType ||
      report.metadata
        ?.reportType ||
      "",

    title:
      report.title ||
      "",

    version:
      report.version ||
      report.metadata
        ?.reportVersion ||
      "",

    generatedAt:
      report.generatedAt ||
      "",

    analyticsTier:
      report.metadata
        ?.analyticsTier ||
      "",

    businessName:
      report.business
        ?.businessName ||
      report.business?.name ||
      "",

    businessSlug:
      report.business?.slug ||
      "",

    periodStart:
      report.period
        ?.startDate ||
      report.reportingPeriod
        ?.startDate ||
      "",

    periodEnd:
      report.period
        ?.endDate ||
      report.reportingPeriod
        ?.endDate ||
      "",

    periodDays:
      report.period?.days ||
      report.reportingPeriod
        ?.days ||
      "",

    timezone:
      report.metadata
        ?.timezone ||
      "",
  };

  return createCsvDataset({
    report,

    name:
      "report-metadata",

    title:
      "Report Metadata",

    rows: [
      metadata,
    ],

    maxRows: 1,
  });
};


/**
 * =========================================================
 * SECTION SUMMARY DATASET
 * =========================================================
 *
 * Scalar/object section data becomes one flattened row.
 *
 * Arrays inside the section remain JSON here and are also
 * promoted to their own datasets where possible.
 */

const buildSectionSummaryDataset = ({
  report,
  section,
}) => {
  if (
    !section ||
    section.available === false ||
    section.data === null ||
    section.data === undefined
  ) {
    return null;
  }

  let row;

  if (isPlainObject(section.data)) {
    row =
      flattenObject(
        section.data
      );
  } else if (
    Array.isArray(
      section.data
    )
  ) {
    /*
     * Array sections are handled separately.
     */

    return null;
  } else {
    row = {
      value:
        normalizePrimitive(
          section.data
        ),
    };
  }

  if (
    Object.keys(row).length === 0
  ) {
    return null;
  }

  return createCsvDataset({
    report,

    name:
      buildDatasetName(
        section.code,
        "summary"
      ),

    title:
      `${section.title || section.code} Summary`,

    rows: [
      row,
    ],

    maxRows: 1,
  });
};


/**
 * =========================================================
 * SECTION ARRAY DATASETS
 * =========================================================
 */

const buildSectionArrayDatasets = ({
  report,
  section,
}) => {
  if (
    !section ||
    section.available === false ||
    section.data === null ||
    section.data === undefined
  ) {
    return [];
  }

  /*
   * If the section itself is an array, export it directly.
   */

  if (
    Array.isArray(
      section.data
    )
  ) {
    return [
      createCsvDataset({
        report,

        name:
          buildDatasetName(
            section.code
          ),

        title:
          section.title ||
          section.code,

        rows:
          section.data,
      }),
    ];
  }

  const arrays =
    discoverTabularArrays(
      section.data
    );

  return arrays.map(
    ({
      path,
      rows,
    }) =>
      createCsvDataset({
        report,

        name:
          buildDatasetName(
            section.code,
            path
          ),

        title:
          `${
            section.title ||
            section.code
          } — ${path}`,

        rows,
      })
  );
};


/**
 * =========================================================
 * REMOVE DUPLICATE DATASETS
 * =========================================================
 */

const deduplicateDatasets = (
  datasets
) => {
  const seen =
    new Set();

  const output = [];

  for (
    const dataset
    of datasets
  ) {
    if (!dataset) {
      continue;
    }

    let name =
      dataset.name;

    let counter = 2;

    while (
      seen.has(name)
    ) {
      name =
        `${dataset.name}-${counter}`;

      counter += 1;
    }

    seen.add(name);

    if (
      name !==
      dataset.name
    ) {
      output.push({
        ...dataset,

        name,

        fileName:
          dataset.fileName.replace(
            /\.csv$/i,
            `-${counter - 1}.csv`
          ),
      });

      continue;
    }

    output.push(
      dataset
    );
  }

  return output;
};


/**
 * =========================================================
 * ENFORCE GLOBAL CSV ROW LIMIT
 * =========================================================
 *
 * MAX_CSV_ROWS applies across the complete export request,
 * not independently to every dataset.
 */

const enforceGlobalRowLimit = (
  datasets
) => {
  let remaining =
    MAX_CSV_ROWS;

  const output = [];

  let globalTruncated =
    false;

  for (
    const dataset
    of datasets
  ) {
    if (
      remaining <= 0
    ) {
      globalTruncated =
        true;

      break;
    }

    const rows =
      dataset.rows ||
      [];

    if (
      rows.length <=
      remaining
    ) {
      output.push(
        dataset
      );

      remaining -=
        rows.length;

      if (
        dataset.truncated
      ) {
        globalTruncated =
          true;
      }

      continue;
    }

    const limitedRows =
      rows.slice(
        0,
        remaining
      );

    const headers =
      collectHeaders(
        limitedRows
      );

    output.push({
      ...dataset,

      rows:
        limitedRows,

      headers,

      csv:
        rowsToCsv({
          headers,
          rows:
            limitedRows,
        }),

      exportedRowCount:
        limitedRows.length,

      truncated:
        true,
    });

    remaining = 0;

    globalTruncated =
      true;
  }

  return {
    datasets:
      output,

    truncated:
      globalTruncated,

    totalRows:
      output.reduce(
        (
          total,
          dataset
        ) =>
          total +
          dataset
            .exportedRowCount,

        0
      ),
  };
};


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
    typeof report !==
      "object"
  ) {
    const error =
      new Error(
        "A canonical business report is required for CSV export."
      );

    error.code =
      "BUSINESS_REPORT_REQUIRED";

    throw error;
  }

  if (
    !report.reportType
  ) {
    const error =
      new Error(
        "The canonical report is missing reportType."
      );

    error.code =
      "BUSINESS_REPORT_TYPE_REQUIRED";

    throw error;
  }

  if (
    !Array.isArray(
      report.sections
    )
  ) {
    const error =
      new Error(
        "The canonical report is missing report sections."
      );

    error.code =
      "BUSINESS_REPORT_SECTIONS_REQUIRED";

    throw error;
  }
};


/**
 * =========================================================
 * GENERATE CSV EXPORT
 * =========================================================
 *
 * IMPORTANT:
 *
 * BUSINESS_INTELLIGENCE is intentionally returned as
 * multiple named datasets.
 *
 * We do NOT flatten the flagship report into one giant,
 * semantically meaningless CSV table.
 */

export const generateBusinessReportCsvExport =
  ({
    report,
  } = {}) => {
    validateCanonicalReport(
      report
    );

    const datasets = [
      buildMetadataDataset(
        report
      ),
    ];

    for (
      const section
      of report.sections
    ) {
      const summaryDataset =
        buildSectionSummaryDataset({
          report,
          section,
        });

      if (summaryDataset) {
        datasets.push(
          summaryDataset
        );
      }

      datasets.push(
        ...buildSectionArrayDatasets({
          report,
          section,
        })
      );
    }

    const uniqueDatasets =
      deduplicateDatasets(
        datasets
      );

    const limited =
      enforceGlobalRowLimit(
        uniqueDatasets
      );

    return {
      format:
        BUSINESS_REPORT_FORMATS.CSV,

      reportId:
        report.reportId ||
        report.metadata
          ?.reportId ||
        null,

      reportType:
        report.reportType,

      generatedAt:
        new Date()
          .toISOString(),

      sourceGeneratedAt:
        report.generatedAt ||
        null,

      mimeType:
        CSV_MIME_TYPE,

      mode:
        report.reportType ===
        BUSINESS_REPORT_TYPES
          .BUSINESS_INTELLIGENCE
          ? "MULTI_DATASET"
          : limited.datasets
                .length > 1
            ? "MULTI_DATASET"
            : "SINGLE_DATASET",

      datasetCount:
        limited.datasets
          .length,

      totalRows:
        limited.totalRows,

      maxRows:
        MAX_CSV_ROWS,

      maxDatasetRows:
        MAX_CSV_DATASET_ROWS,

      truncated:
        limited.truncated,

      datasets:
        limited.datasets,
    };
  };


/**
 * =========================================================
 * GET CSV EXPORT SUMMARY
 * =========================================================
 *
 * Useful later for controllers/frontends without exposing
 * the CSV body itself.
 */

export const getBusinessReportCsvExportSummary =
  ({
    report,
  } = {}) => {
    const exported =
      generateBusinessReportCsvExport({
        report,
      });

    return {
      format:
        exported.format,

      reportId:
        exported.reportId,

      reportType:
        exported.reportType,

      mode:
        exported.mode,

      datasetCount:
        exported.datasetCount,

      totalRows:
        exported.totalRows,

      maxRows:
        exported.maxRows,

      maxDatasetRows:
        exported.maxDatasetRows,

      truncated:
        exported.truncated,

      datasets:
        exported.datasets.map(
          (dataset) => ({
            name:
              dataset.name,

            title:
              dataset.title,

            fileName:
              dataset.fileName,

            sourceRowCount:
              dataset
                .sourceRowCount,

            exportedRowCount:
              dataset
                .exportedRowCount,

            truncated:
              dataset.truncated,
          })
        ),
    };
  };


/**
 * =========================================================
 * CSV SERVICE CAPABILITIES
 * =========================================================
 */

export const getBusinessReportCsvCapabilities =
  () => ({
    format:
      BUSINESS_REPORT_FORMATS.CSV,

    mimeType:
      CSV_MIME_TYPE,

    extension:
      CSV_EXTENSION,

maxRows:
        MAX_CSV_ROWS,

      maxDatasetRows:
        MAX_CSV_DATASET_ROWS,

      truncationSupported:
        true,

      multipleDatasets:
        true,

    combinedReportMode:
      "MULTI_DATASET",

    queriesDatabase:
      false,

    calculatesAnalytics:
      false,

    requiresCanonicalReport:
      true,
  });