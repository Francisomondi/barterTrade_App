import {
  BUSINESS_REPORT_EXPORT_LIMITS,
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_VERSION,
} from "../config/businessReportConfig.js";

/**
 * =========================================================
 * BUSINESS REPORT JSON EXPORT SERVICE
 * =========================================================
 *
 * Converts an already-generated canonical business report
 * into a controlled JSON export.
 *
 * IMPORTANT:
 *
 * This service does NOT:
 *
 * - query Prisma
 * - calculate analytics
 * - calculate benchmarks
 * - calculate promotion attribution
 * - generate recommendations
 * - authorize business ownership
 * - determine Business Pro entitlement
 *
 * It serializes only the canonical report supplied to it.
 */


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const JSON_MIME_TYPE =
  "application/json; charset=utf-8";

const JSON_EXTENSION =
  "json";

/**
 * =========================================================
 * JSON LARGE EXPORT LIMITS
 * =========================================================
 *
 * These limits come from the central Business Report
 * configuration.
 *
 * JSON exports intentionally use a fail-closed strategy:
 *
 * - oversized JSON is NOT silently truncated
 * - excessively deep JSON is rejected
 * - the canonical report is never mutated to make it fit
 *
 * The controller converts oversized/depth failures into
 * the appropriate HTTP error response.
 */

const MAX_JSON_DEPTH =
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_JSON_DEPTH;

const MAX_JSON_BYTES =
  BUSINESS_REPORT_EXPORT_LIMITS
    .MAX_JSON_BYTES;


/**
 * =========================================================
 * ERROR HELPER
 * =========================================================
 */

const createJsonExportError = (
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


const slugifyFilePart = (value) =>
  String(value || "report")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) ||
  "report";


const buildJsonFileName = ({
  reportType,
  generatedAt,
}) => {
  let date =
    new Date()
      .toISOString()
      .slice(0, 10);

  if (generatedAt) {
    const parsed =
      new Date(generatedAt);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      date =
        parsed
          .toISOString()
          .slice(0, 10);
    }
  }

  return [
    slugifyFilePart(
      reportType
    ),
    date,
  ].join("-") +
    `.${JSON_EXTENSION}`;
};


/**
 * =========================================================
 * CANONICAL REPORT VALIDATION
 * =========================================================
 */

const validateCanonicalReport = (
  report
) => {
  if (
    !report ||
    typeof report !==
      "object" ||
    Array.isArray(report)
  ) {
    throw createJsonExportError(
      "BUSINESS_REPORT_REQUIRED",
      "A canonical business report is required for JSON export."
    );
  }

  if (!report.reportType) {
    throw createJsonExportError(
      "BUSINESS_REPORT_TYPE_REQUIRED",
      "The canonical report is missing reportType."
    );
  }

  if (
    !Array.isArray(
      report.sections
    )
  ) {
    throw createJsonExportError(
      "BUSINESS_REPORT_SECTIONS_REQUIRED",
      "The canonical report is missing report sections."
    );
  }
};


/**
 * =========================================================
 * SAFE VALUE CLONING
 * =========================================================
 *
 * Produces a JSON-compatible clone without mutating the
 * canonical report.
 *
 * Supported conversions:
 *
 * Date   -> ISO string
 * BigInt -> string
 *
 * Unsupported runtime values such as functions, symbols and
 * undefined object properties are omitted.
 *
 * Circular references are rejected rather than silently
 * producing incorrect export data.
 */

const cloneJsonSafeValue = (
  value,
  {
    depth = 0,
    ancestors =
      new WeakSet(),
  } = {}
) => {
  if (
    depth >
    MAX_JSON_DEPTH
  ) {
    throw createJsonExportError(
      "BUSINESS_REPORT_JSON_DEPTH_EXCEEDED",
      `JSON export exceeded the maximum supported depth of ${MAX_JSON_DEPTH}.`
    );
  }

  if (
    value === null
  ) {
    return null;
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    /*
     * JSON cannot safely represent NaN or Infinity.
     */

    if (
      typeof value ===
        "number" &&
      !Number.isFinite(value)
    ) {
      return null;
    }

    return value;
  }

  if (
    typeof value ===
      "bigint"
  ) {
    return value.toString();
  }

  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }

  if (
    typeof value ===
      "undefined" ||
    typeof value ===
      "function" ||
    typeof value ===
      "symbol"
  ) {
    return undefined;
  }

  if (
    typeof value !==
      "object"
  ) {
    return String(value);
  }

  if (
    ancestors.has(value)
  ) {
    throw createJsonExportError(
      "BUSINESS_REPORT_JSON_CIRCULAR_REFERENCE",
      "JSON export cannot contain circular references."
    );
  }

  ancestors.add(value);

  try {
    if (
      Array.isArray(value)
    ) {
      const output = [];

      for (
        const item
        of value
      ) {
        const cloned =
          cloneJsonSafeValue(
            item,
            {
              depth:
                depth + 1,

              ancestors,
            }
          );

        /*
         * JSON.stringify normally converts unsupported array
         * entries to null. We do the same explicitly.
         */

        output.push(
          cloned ===
            undefined
            ? null
            : cloned
        );
      }

      return output;
    }

    const output = {};

    for (
      const [key, child]
      of Object.entries(value)
    ) {
      const cloned =
        cloneJsonSafeValue(
          child,
          {
            depth:
              depth + 1,

            ancestors,
          }
        );

      if (
        cloned !==
        undefined
      ) {
        output[key] =
          cloned;
      }
    }

    return output;
  } finally {
    ancestors.delete(value);
  }
};


/**
 * =========================================================
 * SAFE BUSINESS METADATA
 * =========================================================
 *
 * This does NOT query another source.
 *
 * It only copies approved identity fields already present in
 * the canonical report.
 */

const buildSafeBusinessMetadata = (
  business
) => {
  if (
    !business ||
    typeof business !==
      "object"
  ) {
    return null;
  }

  return {
    businessName:
      business.businessName ||
      business.name ||
      null,

    slug:
      business.slug ||
      null,

    category:
      business.category ||
      null,

    status:
      business.status ||
      null,

    verificationStatus:
      business
        .verificationStatus ||
      null,
  };
};


/**
 * =========================================================
 * SAFE PERIOD METADATA
 * =========================================================
 */

const buildSafePeriod = (
  report
) => {
  const period =
    report.period ||
    report.reportingPeriod ||
    null;

  if (!period) {
    return null;
  }

  return cloneJsonSafeValue(
    period
  );
};


/**
 * =========================================================
 * EXPORT PAYLOAD
 * =========================================================
 *
 * The actual report remains under `report`.
 *
 * Export-specific metadata remains under `export`.
 *
 * This prevents export metadata from being confused with
 * analytics/report metadata.
 */

const buildJsonExportPayload = ({
  report,
  exportedAt,
}) => {
  const safeReport =
    cloneJsonSafeValue(
      report
    );

  /*
   * Preserve the canonical report as the source of truth,
   * while normalizing public business identity metadata.
   *
   * We intentionally do not reconstruct analytics sections.
   */

  if (
    safeReport.business
  ) {
    safeReport.business =
      buildSafeBusinessMetadata(
        safeReport.business
      );
  }

  return {
    export: {
      format:
        BUSINESS_REPORT_FORMATS.JSON,

      exportedAt,

      reportVersion:
        report.version ||
        report.metadata
          ?.reportVersion ||
        BUSINESS_REPORT_VERSION,

      reportId:
        report.reportId ||
        report.metadata
          ?.reportId ||
        null,

      reportType:
        report.reportType,

      sourceGeneratedAt:
        report.generatedAt ||
        null,

      analyticsTier:
        report.metadata
          ?.analyticsTier ||
        null,
    },

    report: {
      ...safeReport,

      period:
        buildSafePeriod(
          report
        ),
    },
  };
};


/**
 * =========================================================
 * SERIALIZE
 * =========================================================
 */

const serializeJsonPayload = (
  payload,
  {
    pretty = true,
  } = {}
) => {
  let json;

  try {
    json =
      JSON.stringify(
        payload,
        null,
        pretty
          ? 2
          : 0
      );
  } catch (error) {
    throw createJsonExportError(
      "BUSINESS_REPORT_JSON_SERIALIZATION_FAILED",
      "Unable to serialize the business report as JSON.",
      {
        cause:
          error?.message ||
          null,
      }
    );
  }

  const byteLength =
    Buffer.byteLength(
      json,
      "utf8"
    );

  if (
    byteLength >
    MAX_JSON_BYTES
  ) {
    throw createJsonExportError(
      "BUSINESS_REPORT_JSON_TOO_LARGE",
      "The JSON report exceeds the maximum allowed export size.",
      {
        byteLength,
        maxBytes:
          MAX_JSON_BYTES,
      }
    );
  }

  return {
    json,
    byteLength,
  };
};


/**
 * =========================================================
 * GENERATE JSON EXPORT
 * =========================================================
 */

export const generateBusinessReportJsonExport =
  ({
    report,
    pretty = true,
  } = {}) => {
    validateCanonicalReport(
      report
    );

    const exportedAt =
      new Date()
        .toISOString();

    const payload =
      buildJsonExportPayload({
        report,
        exportedAt,
      });

    const {
      json,
      byteLength,
    } =
      serializeJsonPayload(
        payload,
        {
          pretty,
        }
      );

    return {
      format:
        BUSINESS_REPORT_FORMATS.JSON,

      reportId:
        report.reportId ||
        report.metadata
          ?.reportId ||
        null,

      reportType:
        report.reportType,

      exportedAt,

      sourceGeneratedAt:
        report.generatedAt ||
        null,

      fileName:
        buildJsonFileName({
          reportType:
            report.reportType,

          generatedAt:
            report.generatedAt,
        }),

      mimeType:
        JSON_MIME_TYPE,

      extension:
        JSON_EXTENSION,

      byteLength,

      pretty:
        Boolean(pretty),

      payload,

      json,
    };
  };


/**
 * =========================================================
 * GET JSON EXPORT SUMMARY
 * =========================================================
 *
 * Returns metadata without returning the full JSON body.
 */

export const getBusinessReportJsonExportSummary =
  ({
    report,
    pretty = true,
  } = {}) => {
    const exported =
      generateBusinessReportJsonExport({
        report,
        pretty,
      });

    return {
      format:
        exported.format,

      reportId:
        exported.reportId,

      reportType:
        exported.reportType,

      exportedAt:
        exported.exportedAt,

      sourceGeneratedAt:
        exported
          .sourceGeneratedAt,

      fileName:
        exported.fileName,

      mimeType:
        exported.mimeType,

      extension:
        exported.extension,

      byteLength:
        exported.byteLength,

      pretty:
        exported.pretty,
    };
  };


/**
 * =========================================================
 * JSON EXPORT CAPABILITIES
 * =========================================================
 */

export const getBusinessReportJsonCapabilities =
  () => ({
    format:
      BUSINESS_REPORT_FORMATS.JSON,

    mimeType:
      JSON_MIME_TYPE,

    extension:
      JSON_EXTENSION,

    maxBytes:
      MAX_JSON_BYTES,

    maxDepth:
      MAX_JSON_DEPTH,

    prettyPrinting:
      true,

    queriesDatabase:
      false,

    calculatesAnalytics:
      false,

    requiresCanonicalReport:
      true,
  });