import api from "./axios";

/**
 * =========================================================
 * BUSINESS REPORTS API
 * =========================================================
 *
 * Backend:
 *
 * GET /api/business/me/reports
 * GET /api/business/me/reports/:reportType
 *
 * IMPORTANT:
 *
 * The backend remains the authority for:
 *
 * - authenticated business ownership
 * - Business Pro entitlement
 * - supported report types
 * - supported formats
 * - report history limits
 *
 * Client state must never be used as authorization.
 */


/**
 * =========================================================
 * REPORT FORMATS
 * =========================================================
 */

export const BUSINESS_REPORT_FORMATS =
  Object.freeze({
    JSON: "JSON",
    CSV: "CSV",
    PDF_READY: "PDF_READY",
  });


/**
 * =========================================================
 * REPORT TYPES
 * =========================================================
 */

export const BUSINESS_REPORT_TYPES =
  Object.freeze({
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
 * GET REPORT ACCESS
 * =========================================================
 *
 * GET /business/me/reports
 *
 * This endpoint is the frontend's source of truth for
 * Business Report entitlement.
 */

export const getMyBusinessReportAccess =
  async () => {
    const response =
      await api.get(
        "/business/me/reports"
      );

    return response.data;
  };


/**
 * =========================================================
 * GENERATE BUSINESS REPORT
 * =========================================================
 *
 * GET /business/me/reports/:reportType
 *
 * Supported query options:
 *
 * format
 * days
 * startDate
 * endDate
 */

export const generateMyBusinessReport =
  async ({
    reportType,

    format =
      BUSINESS_REPORT_FORMATS.JSON,

    days = null,

    startDate = null,

    endDate = null,
  }) => {
    if (
      !reportType ||
      typeof reportType !== "string"
    ) {
      throw new Error(
        "A business report type is required."
      );
    }

    const params = {
      format,
    };

    if (
      days !== null &&
      days !== undefined &&
      days !== ""
    ) {
      params.days = days;
    }

    if (startDate) {
      params.startDate =
        startDate;
    }

    if (endDate) {
      params.endDate =
        endDate;
    }

    const response =
      await api.get(
        `/business/me/reports/${encodeURIComponent(
          reportType
        )}`,
        {
          params,
        }
      );

    return response.data;
  };