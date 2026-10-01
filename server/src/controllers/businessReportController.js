import prisma from "../config/prisma.js";

import {
  BUSINESS_REPORT_FORMATS,
  BUSINESS_REPORT_HISTORY,
  DEFAULT_BUSINESS_REPORT_FORMAT,
  normalizeBusinessReportFormat,
  normalizeBusinessReportType,
} from "../config/businessReportConfig.js";

import {
  generateBusinessReport,
} from "../services/businessReportService.js";

import {
  resolveBusinessReportAccess,
  getBusinessReportEntitlement,
} from "../services/businessReportAccessService.js";

import {
  generateBusinessReportCsvExport,
} from "../services/businessReportCsvService.js";

import {
  generateBusinessReportJsonExport,
} from "../services/businessReportJsonService.js";

import {
  generateBusinessReportPdfReadyData,
} from "../services/businessReportPdfReadyService.js";

import {
  applyBusinessReportExportHeaders,
  buildSafeBusinessReportFileName,
} from "../services/businessReportExportSecurityService.js";

/**
 * ============================================================
 * BUSINESS REPORT CONTROLLER
 * ============================================================
 *
 * Secure API layer for Business Pro reports.
 *
 * SECURITY MODEL:
 *
 * req.user.id
 *      ↓
 * owner BusinessProfile
 *      ↓
 * Business Pro entitlement
 *      ↓
 * report type / format validation
 *      ↓
 * reporting period validation
 *      ↓
 * canonical report
 *      ↓
 * requested export format
 *
 * IMPORTANT:
 *
 * The controller NEVER trusts:
 *
 * - req.body.businessId
 * - req.query.businessId
 * - req.params.businessId
 * - req.body.userId
 * - req.query.userId
 * - req.query.isBusinessPro
 * - req.body.isBusinessPro
 * - req.query.analyticsTier
 * - req.query.plan
 * - req.query.subscriptionId
 *
 * Business ownership always comes from req.user.id.
 * ============================================================
 */


/**
 * ============================================================
 * OWNER BUSINESS
 * ============================================================
 *
 * Resolves the BusinessProfile belonging to the authenticated
 * user.
 *
 * No client-supplied business ID is accepted.
 * ============================================================
 */

const getOwnerBusiness = async (
  userId
) => {
  if (!userId) {
    return null;
  }

  return prisma.businessProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
      userId: true,

      businessName: true,
      slug: true,

      category: true,

      logo: true,
      coverImage: true,

      status: true,

      verificationStatus: true,

      createdAt: true,
      updatedAt: true,
    },
  });
};


/**
 * ============================================================
 * REQUIRE OWNER BUSINESS
 * ============================================================
 */

const requireOwnerBusiness = async (
  req,
  res
) => {
  const userId =
    req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,

      code:
        "AUTHENTICATION_REQUIRED",

      message:
        "Authentication is required.",
    });

    return null;
  }

  const business =
    await getOwnerBusiness(
      userId
    );

  if (!business) {
    res.status(404).json({
      success: false,

      code:
        "BUSINESS_REQUIRED",

      message:
        "Business account not found.",
    });

    return null;
  }

  return business;
};


/**
 * ============================================================
 * POSITIVE INTEGER
 * ============================================================
 */

const parsePositiveInteger = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};


/**
 * ============================================================
 * OPTIONAL DATE
 * ============================================================
 */

const parseOptionalDate = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
};


/**
 * ============================================================
 * REPORT RANGE
 * ============================================================
 *
 * Business reports are Business Pro only.
 *
 * Maximum supported history:
 *
 *     365 days
 *
 * Either:
 *
 *     ?days=30
 *
 * OR:
 *
 *     ?startDate=...
 *     &endDate=...
 *
 * Mixing days with a custom range is rejected.
 * ============================================================
 */

const resolveReportRange = (
  query = {}
) => {
  const hasDays =
    query.days !== undefined &&
    query.days !== null &&
    query.days !== "";

  const hasStartDate =
    query.startDate !== undefined &&
    query.startDate !== null &&
    query.startDate !== "";

  const hasEndDate =
    query.endDate !== undefined &&
    query.endDate !== null &&
    query.endDate !== "";

  /**
   * ----------------------------------------------------------
   * CUSTOM RANGE MUST HAVE BOTH DATES
   * ----------------------------------------------------------
   */

  if (
    hasStartDate !==
    hasEndDate
  ) {
    const error =
      new Error(
        "Both startDate and endDate are required for a custom report range."
      );

    error.code =
      "INVALID_REPORT_RANGE";

    throw error;
  }

  /**
   * ----------------------------------------------------------
   * DO NOT MIX DAYS + CUSTOM RANGE
   * ----------------------------------------------------------
   */

  if (
    hasDays &&
    hasStartDate &&
    hasEndDate
  ) {
    const error =
      new Error(
        "Use either days or startDate/endDate, not both."
      );

    error.code =
      "INVALID_REPORT_RANGE";

    throw error;
  }

  /**
   * ----------------------------------------------------------
   * CUSTOM RANGE
   * ----------------------------------------------------------
   */

  if (
    hasStartDate &&
    hasEndDate
  ) {
    const startDate =
      parseOptionalDate(
        query.startDate
      );

    const endDate =
      parseOptionalDate(
        query.endDate
      );

    if (
      !startDate ||
      !endDate
    ) {
      const error =
        new Error(
          "Invalid report startDate or endDate."
        );

      error.code =
        "INVALID_REPORT_RANGE";

      throw error;
    }

    if (
      startDate >
      endDate
    ) {
      const error =
        new Error(
          "Report startDate cannot be after endDate."
        );

      error.code =
        "INVALID_REPORT_RANGE";

      throw error;
    }

    const durationMs =
      endDate.getTime() -
      startDate.getTime();

    const calculatedDays =
      Math.floor(
        durationMs /
          (
            24 *
            60 *
            60 *
            1000
          )
      ) + 1;

    if (
      calculatedDays >
      BUSINESS_REPORT_HISTORY.MAX_DAYS
    ) {
      const error =
        new Error(
          `Business reports support a maximum history of ${BUSINESS_REPORT_HISTORY.MAX_DAYS} days.`
        );

      error.code =
        "REPORT_RANGE_TOO_LARGE";

      throw error;
    }

    return {
      days:
        calculatedDays,

      startDate,

      endDate,
    };
  }

  /**
   * ----------------------------------------------------------
   * ROLLING DAYS
   * ----------------------------------------------------------
   */

  const days =
    hasDays
      ? parsePositiveInteger(
          query.days
        )
      : BUSINESS_REPORT_HISTORY.DEFAULT_DAYS;

  if (!days) {
    const error =
      new Error(
        "Report days must be a positive integer."
      );

    error.code =
      "INVALID_REPORT_DAYS";

    throw error;
  }

  if (
    days >
    BUSINESS_REPORT_HISTORY.MAX_DAYS
  ) {
    const error =
      new Error(
        `Business reports support a maximum history of ${BUSINESS_REPORT_HISTORY.MAX_DAYS} days.`
      );

    error.code =
      "REPORT_RANGE_TOO_LARGE";

    throw error;
  }

  return {
    days,

    startDate: null,

    endDate: null,
  };
};


/**
 * ============================================================
 * ERROR STATUS
 * ============================================================
 */

const getReportErrorStatus = (
  code
) => {
  switch (code) {
    case "AUTHENTICATION_REQUIRED":
      return 401;

    case "BUSINESS_REQUIRED":
      return 404;

    case "BUSINESS_PRO_REQUIRED":
      return 403;

    case "BUSINESS_ENTITLEMENT_MISMATCH":
      return 403;

    case "UNSUPPORTED_REPORT_TYPE":
      return 400;

    case "UNSUPPORTED_REPORT_FORMAT":
      return 400;

    case "REPORT_FORMAT_NOT_SUPPORTED":
      return 400;

    case "INVALID_REPORT_RANGE":
      return 400;

    case "INVALID_REPORT_DAYS":
      return 400;

    case "REPORT_RANGE_TOO_LARGE":
      return 400;

    case "BUSINESS_REPORT_REQUIRED":
      return 400;

    case "BUSINESS_REPORT_TYPE_REQUIRED":
      return 400;

    case "BUSINESS_REPORT_SECTIONS_REQUIRED":
      return 400;

    case "BUSINESS_REPORT_JSON_DEPTH_EXCEEDED":
      return 413;

    case "BUSINESS_REPORT_JSON_TOO_LARGE":
      return 413;

    case "BUSINESS_REPORT_TOO_MANY_SECTIONS":
      return 413;

    default:
      return 500;
  }
};


/**
 * ============================================================
 * GENERATE BUSINESS REPORT
 * ============================================================
 *
 * GET /api/business/me/reports/:reportType
 *
 * Query:
 *
 * ?format=JSON
 * ?days=30
 *
 * OR:
 *
 * ?format=CSV
 * ?startDate=2026-09-01
 * ?endDate=2026-09-30
 *
 * Supported formats:
 *
 * JSON
 * CSV
 * PDF_READY
 *
 * IMPORTANT:
 *
 * PDF_READY is structured rendering data.
 * It is NOT a binary PDF.
 * ============================================================
 */

export const generateMyBusinessReport =
  async (
    req,
    res
  ) => {
    try {
      /**
       * ------------------------------------------------------
       * OWNER BUSINESS
       * ------------------------------------------------------
       */

      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      /**
       * ------------------------------------------------------
       * REPORT TYPE
       * ------------------------------------------------------
       */

      const reportType =
        normalizeBusinessReportType(
          req.params.reportType
        );

      if (!reportType) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "UNSUPPORTED_REPORT_TYPE",

            message:
              "Unsupported business report type.",
          });
      }

      /**
       * ------------------------------------------------------
       * FORMAT
       * ------------------------------------------------------
       */

      const requestedFormat =
        req.query.format ||
        DEFAULT_BUSINESS_REPORT_FORMAT;

      const format =
        normalizeBusinessReportFormat(
          requestedFormat
        );

      if (!format) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "UNSUPPORTED_REPORT_FORMAT",

            message:
              "Unsupported business report format.",

            supportedFormats: [
              BUSINESS_REPORT_FORMATS.JSON,
              BUSINESS_REPORT_FORMATS.CSV,
              BUSINESS_REPORT_FORMATS.PDF_READY,
            ],
          });
      }

      /**
       * ------------------------------------------------------
       * BUSINESS PRO ACCESS
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * Personal Premium does NOT unlock this.
       *
       * Subscription is resolved server-side.
       */

      const access =
        await resolveBusinessReportAccess({
          userId:
            req.user.id,

          business,

          reportType,
        });

      if (!access.allowed) {
        const status =
          access.code ===
          "BUSINESS_PRO_REQUIRED"
            ? 403
            : access.code ===
                "BUSINESS_ENTITLEMENT_MISMATCH"
              ? 403
              : 400;

        return res
          .status(status)
          .json({
            success: false,

            code:
              access.code,

            message:
              access.message,

            reportType:
              access.reportType ||
              reportType,

            access:
              access.access ||
              null,

            preview:
              access.preview ||
              null,

            upgrade:
              access.upgrade ||
              null,

            dataExposed:
              false,
          });
      }

      /**
       * ------------------------------------------------------
       * FORMAT ALLOWED FOR THIS REPORT
       * ------------------------------------------------------
       */

      const supportedFormats =
        Array.isArray(
          access.definition
            ?.supportedFormats
        )
          ? access.definition
              .supportedFormats
          : [];

      if (
        supportedFormats.length >
          0 &&
        !supportedFormats.includes(
          format
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            code:
              "REPORT_FORMAT_NOT_SUPPORTED",

            message:
              `${format} is not supported for ${reportType}.`,

            reportType,

            requestedFormat:
              format,

            supportedFormats,
          });
      }

      /**
       * ------------------------------------------------------
       * REPORT RANGE
       * ------------------------------------------------------
       */

      const range =
        resolveReportRange(
          req.query
        );

      /**
       * ------------------------------------------------------
       * CANONICAL REPORT
       * ------------------------------------------------------
       *
       * This is the ONE analytics/report source of truth.
       *
       * Export services consume this result.
       */

      const report =
        await generateBusinessReport({
          business,

          reportType,

          format,

          days:
            range.days,

          startDate:
            range.startDate,

          endDate:
            range.endDate,

          analyticsTier:
            access.access
              ?.analyticsTier ||
            "BUSINESS_PRO",

          timezone:
            "UTC",
        });

      // UPDATE — server/src/controllers/businessReportController.js

      /**
       * ------------------------------------------------------
       * JSON
       * ------------------------------------------------------
       *
       * IMPORTANT:
       *
       * This endpoint returns a JSON API envelope.
       *
       * Therefore the HTTP response Content-Type must remain
       * application/json.
       *
       * The generated export's MIME type is returned inside
       * export metadata for future download functionality.
       * ------------------------------------------------------
       */

      if (
        format ===
        BUSINESS_REPORT_FORMATS.JSON
      ) {
        const exported =
          generateBusinessReportJsonExport({
            report,
          });

        const fileName =
          buildSafeBusinessReportFileName({
            reportType:
              report.reportType,

            format:
              BUSINESS_REPORT_FORMATS.JSON,

            generatedAt:
              report.generatedAt,
          });

        /**
         * Apply export security headers.
         *
         * JSON is also the actual HTTP response format here,
         * so application/json is correct.
         */

        applyBusinessReportExportHeaders(
          res,
          {
            format:
              BUSINESS_REPORT_FORMATS.JSON,

            fileName,

            /**
             * This is an API response, not a raw downloadable
             * attachment.
             */

            attachment:
              false,
          }
        );

        return res
          .status(200)
          .json({
            success: true,

            export: {
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

              /**
               * Use the filename generated by our central
               * export-security service.
               */

              fileName,

              mimeType:
                exported.mimeType,

              extension:
                exported.extension,

              byteLength:
                exported.byteLength,
            },

            data:
              exported.payload,
          });
      }


      /**
       * ------------------------------------------------------
       * CSV
       * ------------------------------------------------------
       *
       * CSV may contain multiple datasets.
       *
       * The combined Business Intelligence report therefore
       * remains MULTI_DATASET rather than being incorrectly
       * flattened into one giant CSV table.
       *
       * IMPORTANT:
       *
       * This endpoint currently returns a JSON API envelope
       * containing CSV datasets.
       *
       * It does NOT return a raw text/csv response.
       *
       * Therefore:
       *
       * HTTP Content-Type = application/json
       *
       * while:
       *
       * export.mimeType = text/csv
       *
       * describes the generated export data.
       * ------------------------------------------------------
       */

      if (
        format ===
        BUSINESS_REPORT_FORMATS.CSV
      ) {
        const exported =
          generateBusinessReportCsvExport({
            report,
          });

        const fileName =
          buildSafeBusinessReportFileName({
            reportType:
              report.reportType,

            format:
              BUSINESS_REPORT_FORMATS.CSV,

            generatedAt:
              report.generatedAt,
          });

        /**
         * SECURITY HEADERS
         *
         * We intentionally use JSON here because the actual
         * HTTP response body below is JSON.
         *
         * We must NOT send text/csv while calling res.json().
         */

        applyBusinessReportExportHeaders(
          res,
          {
            format:
              BUSINESS_REPORT_FORMATS.JSON,

            /**
             * No Content-Disposition is generated because
             * attachment is false.
             *
             * The safe CSV filename remains available in the
             * response metadata for the frontend/future raw
             * download endpoint.
             */

            fileName,

            attachment:
              false,
          }
        );

        return res
          .status(200)
          .json({
            success: true,

            export: {
              format:
                exported.format,

              reportId:
                exported.reportId,

              reportType:
                exported.reportType,

              generatedAt:
                exported.generatedAt,

              sourceGeneratedAt:
                exported
                  .sourceGeneratedAt,

              fileName,

              /**
               * This describes the export itself.
               *
               * It does NOT override the HTTP Content-Type.
               */

              mimeType:
                exported.mimeType,

              mode:
                exported.mode,

              datasetCount:
                exported.datasetCount,

              totalRows:
                exported.totalRows,

              maxRows:
                exported.maxRows,

              maxDatasetRows:
                exported
                  .maxDatasetRows,

              truncated:
                exported.truncated,
            },

            datasets:
              exported.datasets,
          });
      }


      /**
       * ------------------------------------------------------
       * PDF READY
       * ------------------------------------------------------
       *
       * This is NOT a binary PDF.
       *
       * It is structured presentation data for the future
       * PDF renderer.
       *
       * PDF_READY is currently JSON data and therefore the
       * HTTP response remains application/json.
       * ------------------------------------------------------
       */

      if (
        format ===
        BUSINESS_REPORT_FORMATS.PDF_READY
      ) {
        const prepared =
          generateBusinessReportPdfReadyData({
            report,
          });

        const fileName =
          buildSafeBusinessReportFileName({
            reportType:
              report.reportType,

            format:
              BUSINESS_REPORT_FORMATS.PDF_READY,

            generatedAt:
              report.generatedAt,

            suffix:
              "pdf-ready",
          });

        /**
         * PDF_READY previously bypassed our centralized
         * export response security.
         *
         * Apply the same:
         *
         * - nosniff
         * - private/no-store
         * - no-cache
         * - no-referrer
         *
         * protection used by the other report formats.
         */

        applyBusinessReportExportHeaders(
          res,
          {
            format:
              BUSINESS_REPORT_FORMATS.PDF_READY,

            fileName,

            attachment:
              false,
          }
        );

        return res
          .status(200)
          .json({
            success: true,

            export: {
              format:
                BUSINESS_REPORT_FORMATS.PDF_READY,

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

              fileName,

              mimeType:
                "application/json; charset=utf-8",

              extension:
                "json",

              binaryPdf:
                false,

              largeExportProtection: {
                ...prepared
                  .largeExportProtection,
              },
            },

            data:
              prepared,
          });
      }
      /**
       * ------------------------------------------------------
       * FAIL CLOSED
       * ------------------------------------------------------
       */

      return res
        .status(400)
        .json({
          success: false,

          code:
            "UNSUPPORTED_REPORT_FORMAT",

          message:
            "Unsupported business report format.",
        });
    } catch (error) {
      console.error(
        "Generate business report error:",
        error
      );

      const status =
        getReportErrorStatus(
          error?.code
        );

      return res
        .status(status)
        .json({
          success: false,

          code:
            error?.code ||
            "BUSINESS_REPORT_GENERATION_FAILED",

          message:
            status === 500
              ? "Unable to generate business report."
              : error.message,

          details:
            status === 500
              ? undefined
              : error?.details ||
                undefined,
        });
    }
  };


/**
 * ============================================================
 * GET BUSINESS REPORT ENTITLEMENT
 * ============================================================
 *
 * GET /api/business/me/reports
 *
 * Used by the future frontend reports page.
 *
 * Does NOT generate analytics.
 * Does NOT expose report data.
 * ============================================================
 */

export const getMyBusinessReportAccess =
  async (
    req,
    res
  ) => {
    try {
      const business =
        await requireOwnerBusiness(
          req,
          res
        );

      if (!business) {
        return;
      }

      const entitlement =
        await getBusinessReportEntitlement({
          userId:
            req.user.id,

          business,
        });

      return res
        .status(200)
        .json({
          success: true,

          business: {
            businessName:
              business.businessName,

            slug:
              business.slug,

            status:
              business.status,

            verificationStatus:
              business
                .verificationStatus,
          },

          reports:
            entitlement,
        });
    } catch (error) {
      console.error(
        "Get business report access error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          code:
            "BUSINESS_REPORT_ACCESS_FAILED",

          message:
            "Unable to load business report access.",
        });
    }
  };