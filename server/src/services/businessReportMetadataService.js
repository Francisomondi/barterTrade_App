import crypto from "crypto";

import {
  BUSINESS_REPORT_HISTORY,
  BUSINESS_REPORT_VERSION,
} from "../config/businessReportConfig.js";

/**
 * =========================================================
 * BUSINESS REPORT METADATA SERVICE
 * =========================================================
 *
 * Central source of truth for report identity, reporting
 * period, generation metadata, business identity and
 * report traceability.
 *
 * This service does NOT:
 *
 * - query Prisma
 * - calculate analytics
 * - calculate report metrics
 * - authorize report access
 * - determine Business Pro entitlement
 * - generate CSV
 * - generate JSON
 * - generate PDF files
 */


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

export const DEFAULT_REPORT_TIMEZONE =
  "UTC";

export const DEFAULT_REPORT_CURRENCY =
  "KES";

export const REPORT_PERIOD_MODES = {
  RELATIVE: "RELATIVE",
  CUSTOM: "CUSTOM",
};


/**
 * =========================================================
 * ERROR HELPER
 * =========================================================
 */

const createMetadataError = (
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
 * BASIC DATE HELPERS
 * =========================================================
 */

const startOfDayUtc = (
  value
) => {
  const date =
    new Date(value);

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
};


const endOfDayUtc = (
  value
) => {
  const date =
    new Date(value);

  date.setUTCHours(
    23,
    59,
    59,
    999
  );

  return date;
};


const isValidDate = (
  value
) => {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};


const toIsoString = (
  value
) => {
  if (!isValidDate(value)) {
    return null;
  }

  return new Date(
    value
  ).toISOString();
};


/**
 * =========================================================
 * NORMALIZE DAYS
 * =========================================================
 */

const normalizeDays = (
  value
) => {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed <
      BUSINESS_REPORT_HISTORY.MIN_DAYS
  ) {
    return BUSINESS_REPORT_HISTORY
      .DEFAULT_DAYS;
  }

  return Math.min(
    parsed,
    BUSINESS_REPORT_HISTORY
      .MAX_DAYS
  );
};


/**
 * =========================================================
 * CALCULATE INCLUSIVE DAY COUNT
 * =========================================================
 */

const calculateInclusiveDays = (
  start,
  end
) => {
  const startDay =
    startOfDayUtc(start);

  const endDay =
    startOfDayUtc(end);

  const difference =
    endDay.getTime() -
    startDay.getTime();

  return (
    Math.floor(
      difference /
        (24 * 60 * 60 * 1000)
    ) + 1
  );
};


/**
 * =========================================================
 * REPORT ID
 * =========================================================
 */

export const generateBusinessReportId =
  () =>
    `rpt_${crypto
      .randomUUID()
      .replaceAll("-", "")}`;


/**
 * =========================================================
 * BUILD REPORTING PERIOD
 * =========================================================
 *
 * IMPORTANT:
 *
 * This function describes the report period.
 *
 * It must not replace the analytics service's own date
 * filtering rules.
 */

export const buildBusinessReportGeneratedPeriod =
  ({
    days =
      BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

    startDate = null,

    endDate = null,

    generatedAt =
      new Date(),
  } = {}) => {
    const hasStart =
      Boolean(startDate);

    const hasEnd =
      Boolean(endDate);

    /*
     * Custom range must provide both boundaries.
     */

    if (
      hasStart !== hasEnd
    ) {
      throw createMetadataError(
        "BUSINESS_REPORT_INVALID_PERIOD",
        "Both startDate and endDate are required for a custom reporting period."
      );
    }

    /*
     * CUSTOM PERIOD
     */

    if (
      hasStart &&
      hasEnd
    ) {
      if (
        !isValidDate(
          startDate
        ) ||
        !isValidDate(
          endDate
        )
      ) {
        throw createMetadataError(
          "BUSINESS_REPORT_INVALID_PERIOD",
          "The custom reporting period contains an invalid date."
        );
      }

      const start =
        startOfDayUtc(
          startDate
        );

      const end =
        endOfDayUtc(
          endDate
        );

      if (
        start.getTime() >
        end.getTime()
      ) {
        throw createMetadataError(
          "BUSINESS_REPORT_INVALID_PERIOD",
          "The report start date cannot be after the end date."
        );
      }

      const periodDays =
        calculateInclusiveDays(
          start,
          end
        );

      if (
        periodDays >
        BUSINESS_REPORT_HISTORY
          .MAX_DAYS
      ) {
        throw createMetadataError(
          "BUSINESS_REPORT_PERIOD_TOO_LARGE",
          `The reporting period cannot exceed ${BUSINESS_REPORT_HISTORY.MAX_DAYS} days.`,
          {
            days:
              periodDays,

            maxDays:
              BUSINESS_REPORT_HISTORY
                .MAX_DAYS,
          }
        );
      }

      return {
        mode:
          REPORT_PERIOD_MODES.CUSTOM,

        startDate:
          start.toISOString(),

        endDate:
          end.toISOString(),

        days:
          periodDays,

        custom:
          true,
      };
    }

    /*
     * RELATIVE PERIOD
     */

    if (
      !isValidDate(
        generatedAt
      )
    ) {
      throw createMetadataError(
        "BUSINESS_REPORT_INVALID_GENERATED_AT",
        "generatedAt must be a valid date."
      );
    }

    const normalizedDays =
      normalizeDays(days);

    const end =
      endOfDayUtc(
        generatedAt
      );

    const start =
      startOfDayUtc(
        end
      );

    start.setUTCDate(
      start.getUTCDate() -
        (
          normalizedDays -
          1
        )
    );

    return {
      mode:
        REPORT_PERIOD_MODES.RELATIVE,

      startDate:
        start.toISOString(),

      endDate:
        end.toISOString(),

      days:
        normalizedDays,

      custom:
        false,
    };
  };


/**
 * =========================================================
 * NORMALIZE EXISTING REPORT PERIOD
 * =========================================================
 *
 * Prefer the period already produced by the canonical
 * report. This prevents export layers from independently
 * inventing a different period.
 */

export const normalizeBusinessReportPeriod =
  (
    period
  ) => {
    if (
      !period ||
      typeof period !==
        "object"
    ) {
      return null;
    }

    const startDate =
      toIsoString(
        period.startDate
      );

    const endDate =
      toIsoString(
        period.endDate
      );

    if (
      !startDate ||
      !endDate
    ) {
      return null;
    }

    const days =
      Number.isFinite(
        Number(
          period.days
        )
      )
        ? Number(
            period.days
          )
        : calculateInclusiveDays(
            startDate,
            endDate
          );

    return {
      mode:
        period.mode ||
        (
          period.custom
            ? REPORT_PERIOD_MODES.CUSTOM
            : REPORT_PERIOD_MODES.RELATIVE
        ),

      startDate,

      endDate,

      days,

      custom:
        period.custom ===
          true ||
        period.mode ===
          REPORT_PERIOD_MODES.CUSTOM,
    };
  };


/**
 * =========================================================
 * SAFE BUSINESS IDENTITY
 * =========================================================
 *
 * Portable reports do not need internal BusinessProfile IDs.
 */

export const buildBusinessReportBusinessIdentity =
  (
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
 * DATA COVERAGE
 * =========================================================
 */

export const buildBusinessReportDataCoverage =
  ({
    sections = [],
    notes = null,
  } = {}) => {
    const safeSections =
      Array.isArray(sections)
        ? sections
        : [];

    const availableSections =
      safeSections
        .filter(
          (section) =>
            section &&
            section.available !==
              false
        )
        .map(
          (section) =>
            section.code
        )
        .filter(Boolean);

    const unavailableSections =
      safeSections
        .filter(
          (section) =>
            section &&
            section.available ===
              false
        )
        .map(
          (section) =>
            section.code
        )
        .filter(Boolean);

    return {
      complete:
        unavailableSections
          .length === 0,

      availableSections,

      unavailableSections,

      availableSectionCount:
        availableSections.length,

      unavailableSectionCount:
        unavailableSections.length,

      notes:
        notes || null,
    };
  };


/**
 * =========================================================
 * METHODOLOGY NOTES
 * =========================================================
 */

export const buildBusinessReportMethodologyMetadata =
  ({
    notes = [],
  } = {}) => {
    const suppliedNotes =
      Array.isArray(notes)
        ? notes.filter(Boolean)
        : [];

    return {
      reportVersion:
        BUSINESS_REPORT_VERSION,

      notes: [
        ...suppliedNotes,
      ],

      interpretation: {
        promotionAttribution:
          "Promotion activity observed during a promotion period does not by itself prove causal attribution.",

        categoryBenchmarks:
          "Category benchmarks are aggregated and do not expose individual competitor performance.",

        recommendations:
          "Growth recommendations are derived from existing analytics signals and are not independently calculated by the reporting layer.",
      },
    };
  };


/**
 * =========================================================
 * BUILD CANONICAL REPORT METADATA
 * =========================================================
 */

export const buildBusinessReportMetadata =
  ({
    reportId = null,

    reportType,

    business,

    period,

    generatedAt =
      new Date(),

    analyticsTier =
      "BUSINESS_PRO",

    currency =
      DEFAULT_REPORT_CURRENCY,

    timezone =
      DEFAULT_REPORT_TIMEZONE,

    sections = [],

    dataCoverageNotes =
      null,

    methodologyNotes = [],
  } = {}) => {
    if (!reportType) {
      throw createMetadataError(
        "BUSINESS_REPORT_TYPE_REQUIRED",
        "reportType is required when building report metadata."
      );
    }

    if (
      !isValidDate(
        generatedAt
      )
    ) {
      throw createMetadataError(
        "BUSINESS_REPORT_INVALID_GENERATED_AT",
        "generatedAt must be a valid date."
      );
    }

    const normalizedPeriod =
      normalizeBusinessReportPeriod(
        period
      );

    if (!normalizedPeriod) {
      throw createMetadataError(
        "BUSINESS_REPORT_INVALID_PERIOD",
        "A valid reporting period is required when building report metadata."
      );
    }

    const finalReportId =
      reportId ||
      generateBusinessReportId();

    const generatedAtIso =
      new Date(
        generatedAt
      ).toISOString();

    return {
      reportId:
        finalReportId,

      reportType,

      reportVersion:
        BUSINESS_REPORT_VERSION,

      generatedAt:
        generatedAtIso,

      reportingPeriod:
        normalizedPeriod,

      business:
        buildBusinessReportBusinessIdentity(
          business
        ),

      analyticsTier,

      currency:
        currency ||
        DEFAULT_REPORT_CURRENCY,

      timezone:
        timezone ||
        DEFAULT_REPORT_TIMEZONE,

      dataCoverage:
        buildBusinessReportDataCoverage({
          sections,

          notes:
            dataCoverageNotes,
        }),

      methodology:
        buildBusinessReportMethodologyMetadata({
          notes:
            methodologyNotes,
        }),
    };
  };


/**
 * =========================================================
 * EXPORT TRACEABILITY
 * =========================================================
 *
 * Export timestamps are separate from report generation.
 */

export const buildBusinessReportExportTrace =
  ({
    report,

    format,

    exportedAt =
      new Date(),
  } = {}) => {
    if (
      !report ||
      typeof report !==
        "object"
    ) {
      throw createMetadataError(
        "BUSINESS_REPORT_REQUIRED",
        "A canonical report is required to build export traceability."
      );
    }

    if (!format) {
      throw createMetadataError(
        "BUSINESS_REPORT_EXPORT_FORMAT_REQUIRED",
        "An export format is required."
      );
    }

    if (
      !isValidDate(
        exportedAt
      )
    ) {
      throw createMetadataError(
        "BUSINESS_REPORT_INVALID_EXPORTED_AT",
        "exportedAt must be a valid date."
      );
    }

    return {
      reportId:
        report.reportId ||
        report.metadata
          ?.reportId ||
        null,

      reportType:
        report.reportType ||
        report.metadata
          ?.reportType ||
        null,

      reportVersion:
        report.version ||
        report.metadata
          ?.reportVersion ||
        BUSINESS_REPORT_VERSION,

      reportGeneratedAt:
        toIsoString(
          report.generatedAt ||
          report.metadata
            ?.generatedAt
        ),

      exportedAt:
        new Date(
          exportedAt
        ).toISOString(),

      format,

      reportingPeriod:
        normalizeBusinessReportPeriod(
          report.period ||
          report.reportingPeriod ||
          report.metadata
            ?.reportingPeriod
        ),

      analyticsTier:
        report.metadata
          ?.analyticsTier ||
        null,
    };
  };


/**
 * =========================================================
 * METADATA CAPABILITIES
 * =========================================================
 */

export const getBusinessReportMetadataCapabilities =
  () => ({
    reportVersion:
      BUSINESS_REPORT_VERSION,

    defaultCurrency:
      DEFAULT_REPORT_CURRENCY,

    defaultTimezone:
      DEFAULT_REPORT_TIMEZONE,

    defaultHistoryDays:
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS,

    maxHistoryDays:
      BUSINESS_REPORT_HISTORY
        .MAX_DAYS,

    customDateRange:
      BUSINESS_REPORT_HISTORY
        .CUSTOM_DATE_RANGE,

    reportIdentity:
      true,

    generatedPeriod:
      true,

    dataCoverage:
      true,

    methodology:
      true,

    exportTraceability:
      true,

    queriesDatabase:
      false,

    calculatesAnalytics:
      false,
  });