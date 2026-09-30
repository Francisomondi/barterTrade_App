import {
  getBusinessProEntitlement,
} from "./subscriptionService.js";

import {
  BUSINESS_REPORT_ACCESS,
  BUSINESS_REPORT_HISTORY,
  BUSINESS_REPORT_VERSION,
  getBusinessReportDefinition,
  normalizeBusinessReportType,
} from "../config/businessReportConfig.js";


/**
 * =========================================================
 * BUSINESS REPORT ACCESS SERVICE
 * =========================================================
 *
 * Central authorization policy for Business Reports.
 *
 * Responsibilities:
 *
 * - Resolve Business Pro entitlement.
 * - Enforce Business Free / Business Pro report boundary.
 * - Prevent Personal Premium from unlocking Business reports.
 * - Validate that entitlement belongs to the same business.
 * - Return safe locked previews for Business Free.
 *
 * IMPORTANT:
 *
 * This service DOES NOT:
 *
 * - generate reports
 * - calculate analytics
 * - trust client subscription flags
 * - accept client-supplied entitlement state
 * - modify subscriptions
 *
 * Subscription remains the source of truth.
 * =========================================================
 */


/**
 * =========================================================
 * ACCESS CODES
 * =========================================================
 */

export const BUSINESS_REPORT_ACCESS_CODES =
  Object.freeze({
    GRANTED:
      "BUSINESS_REPORT_ACCESS_GRANTED",

    BUSINESS_REQUIRED:
      "BUSINESS_REQUIRED",

    BUSINESS_PRO_REQUIRED:
      "BUSINESS_PRO_REQUIRED",

    BUSINESS_MISMATCH:
      "BUSINESS_ENTITLEMENT_MISMATCH",

    UNSUPPORTED_REPORT_TYPE:
      "UNSUPPORTED_REPORT_TYPE",
  });


/**
 * =========================================================
 * SAFE REPORT PREVIEW
 * =========================================================
 *
 * Business Free users may see what a report provides,
 * but they receive NO report analytics.
 */

const buildLockedReportPreview = (
  definition
) => {
  if (!definition) {
    return null;
  }

  return {
    reportType:
      definition.code,

    title:
      definition.title,

    description:
      definition.description,

    requiredPlan:
      BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

    locked: true,

    requiresBusinessPro: true,

    supportedFormats: [
      ...definition.supportedFormats,
    ],

    sections: [
      ...definition.sections,
    ],

    dataExposed: false,
  };
};


/**
 * =========================================================
 * SAFE SUBSCRIPTION METADATA
 * =========================================================
 */

const buildSafeSubscriptionMetadata = (
  entitlement
) => {
  if (
    !entitlement ||
    !entitlement.isBusinessPro
  ) {
    return null;
  }

  return {
    plan:
      entitlement.plan ||
      "BUSINESS_PRO",

    status:
      entitlement.status ||
      "ACTIVE",

    startedAt:
      entitlement.startedAt ||
      null,

    expiresAt:
      entitlement.expiresAt ||
      null,

    daysRemaining:
      entitlement.daysRemaining ??
      null,
  };
};


/**
 * =========================================================
 * REPORT ACCESS
 * =========================================================
 *
 * `business` must already have been resolved from the
 * authenticated user's ownership context.
 *
 * The client must NEVER choose the business used here.
 */

export const resolveBusinessReportAccess =
  async ({
    userId,
    business,
    reportType,
  } = {}) => {
    /**
     * -----------------------------------------------------
     * USER
     * -----------------------------------------------------
     */

    if (!userId) {
      return {
        allowed: false,

        code:
          BUSINESS_REPORT_ACCESS_CODES.BUSINESS_REQUIRED,

        message:
          "Authentication is required to access business reports.",
      };
    }

    /**
     * -----------------------------------------------------
     * BUSINESS
     * -----------------------------------------------------
     */

    if (
      !business ||
      !business.id
    ) {
      return {
        allowed: false,

        code:
          BUSINESS_REPORT_ACCESS_CODES.BUSINESS_REQUIRED,

        message:
          "A business account is required to access business reports.",
      };
    }

    /**
     * -----------------------------------------------------
     * REPORT TYPE
     * -----------------------------------------------------
     */

    const normalizedReportType =
      normalizeBusinessReportType(
        reportType
      );

    if (!normalizedReportType) {
      return {
        allowed: false,

        code:
          BUSINESS_REPORT_ACCESS_CODES.UNSUPPORTED_REPORT_TYPE,

        message:
          "Unsupported business report type.",
      };
    }

    const definition =
      getBusinessReportDefinition(
        normalizedReportType
      );

    if (!definition) {
      return {
        allowed: false,

        code:
          BUSINESS_REPORT_ACCESS_CODES.UNSUPPORTED_REPORT_TYPE,

        message:
          "Unsupported business report type.",
      };
    }

    /**
     * -----------------------------------------------------
     * ENTITLEMENT
     * -----------------------------------------------------
     *
     * IMPORTANT:
     *
     * This lookup is server-side.
     *
     * We do NOT accept:
     *
     * req.query.isBusinessPro
     * req.body.isBusinessPro
     * req.body.plan
     * req.body.subscription
     * req.body.businessId
     */

    const entitlement =
      await getBusinessProEntitlement(
        userId
      );

    /**
     * -----------------------------------------------------
     * BUSINESS PRO
     * -----------------------------------------------------
     */

    const hasBusinessPro =
      Boolean(
        entitlement?.isBusinessPro
      );

    /**
     * -----------------------------------------------------
     * BUSINESS OWNERSHIP MATCH
     * -----------------------------------------------------
     *
     * A Business Pro entitlement must belong to the same
     * BusinessProfile for which the report is requested.
     */

    const entitlementBusinessId =
      entitlement?.businessId ||
      null;

    const entitlementMatchesBusiness =
      hasBusinessPro &&
      entitlementBusinessId ===
        business.id;

    /**
     * -----------------------------------------------------
     * BUSINESS FREE
     * -----------------------------------------------------
     */

    if (!hasBusinessPro) {
      return {
        allowed: false,

        code:
          BUSINESS_REPORT_ACCESS_CODES.BUSINESS_PRO_REQUIRED,

        message:
          "Business reports are available with Business Pro.",

        reportType:
          normalizedReportType,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          isBusinessPro:
            false,

          reportGeneration:
            false,

          reportExport:
            false,

          customDateRange:
            false,

          maxHistoryDays:
            BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,
        },

        preview:
          buildLockedReportPreview(
            definition
          ),

        upgrade: {
          required: true,

          plan:
            BUSINESS_REPORT_ACCESS.BUSINESS_PRO,

          pricing: null,

          message:
            "Upgrade to Business Pro to generate and export business intelligence reports.",
        },
      };
    }

    /**
     * -----------------------------------------------------
     * ENTITLEMENT / BUSINESS MISMATCH
     * -----------------------------------------------------
     *
     * This should normally never happen because the
     * subscription service resolves the authenticated
     * user's own business.
     *
     * We still fail closed.
     */

    if (
      !entitlementMatchesBusiness
    ) {
      return {
        allowed: false,

        code:
          BUSINESS_REPORT_ACCESS_CODES.BUSINESS_MISMATCH,

        message:
          "Business report entitlement does not match this business.",

        reportType:
          normalizedReportType,

        access: {
          analyticsTier:
            "BUSINESS_FREE",

          isBusinessPro:
            false,

          reportGeneration:
            false,

          reportExport:
            false,
        },
      };
    }

    /**
     * -----------------------------------------------------
     * ACCESS GRANTED
     * -----------------------------------------------------
     */

    return {
      allowed: true,

      code:
        BUSINESS_REPORT_ACCESS_CODES.GRANTED,

      message:
        "Business Pro report access granted.",

      reportType:
        normalizedReportType,

      definition,

      access: {
        analyticsTier:
          "BUSINESS_PRO",

        isBusinessPro:
          true,

        reportGeneration:
          true,

        reportExport:
          true,

        customDateRange:
          BUSINESS_REPORT_HISTORY.CUSTOM_DATE_RANGE,

        maxHistoryDays:
          BUSINESS_REPORT_HISTORY.MAX_DAYS,

        reportVersion:
          BUSINESS_REPORT_VERSION,

        subscription:
          buildSafeSubscriptionMetadata(
            entitlement
          ),
      },
    };
  };


/**
 * =========================================================
 * REQUIRE BUSINESS REPORT ACCESS
 * =========================================================
 *
 * Convenience wrapper for future controllers.
 *
 * Throws a structured error when report access is denied.
 */

export const requireBusinessReportAccess =
  async ({
    userId,
    business,
    reportType,
  } = {}) => {
    const result =
      await resolveBusinessReportAccess({
        userId,
        business,
        reportType,
      });

    if (result.allowed) {
      return result;
    }

    const error =
      new Error(
        result.message ||
        "Business report access denied."
      );

    error.code =
      result.code;

    error.reportAccess =
      result;

    throw error;
  };


/**
 * =========================================================
 * BUSINESS REPORT ENTITLEMENT SUMMARY
 * =========================================================
 *
 * Useful later for frontend report UI.
 *
 * This does NOT expose report analytics.
 */

export const getBusinessReportEntitlement =
  async ({
    userId,
    business,
  } = {}) => {
    if (
      !userId ||
      !business?.id
    ) {
      return {
        isBusiness:
          Boolean(
            business?.id
          ),

        isBusinessPro:
          false,

        reportGeneration:
          false,

        reportExport:
          false,

        maxHistoryDays:
          BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

        customDateRange:
          false,

        subscription:
          null,
      };
    }

    const entitlement =
      await getBusinessProEntitlement(
        userId
      );

    const isBusinessPro =
      Boolean(
        entitlement?.isBusinessPro &&
        entitlement?.businessId ===
          business.id
      );

    if (!isBusinessPro) {
      return {
        isBusiness: true,

        isBusinessPro: false,

        analyticsTier:
          "BUSINESS_FREE",

        reportGeneration:
          false,

        reportExport:
          false,

        maxHistoryDays:
          BUSINESS_REPORT_HISTORY.DEFAULT_DAYS,

        customDateRange:
          false,

        subscription:
          null,
      };
    }

    return {
      isBusiness: true,

      isBusinessPro: true,

      analyticsTier:
        "BUSINESS_PRO",

      reportGeneration:
        true,

      reportExport:
        true,

      maxHistoryDays:
        BUSINESS_REPORT_HISTORY.MAX_DAYS,

      customDateRange:
        BUSINESS_REPORT_HISTORY.CUSTOM_DATE_RANGE,

      reportVersion:
        BUSINESS_REPORT_VERSION,

      subscription:
        buildSafeSubscriptionMetadata(
          entitlement
        ),
    };
  };