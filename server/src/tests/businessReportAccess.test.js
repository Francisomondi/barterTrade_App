// CREATE — server/src/tests/businessReportAccess.test.js

import assert from "node:assert/strict";

import {
  BUSINESS_REPORT_TYPES,
  BUSINESS_REPORT_HISTORY,
  BUSINESS_REPORT_VERSION,
} from "../config/businessReportConfig.js";

import {
  BUSINESS_REPORT_ACCESS_CODES,
  resolveBusinessReportAccess,
  requireBusinessReportAccess,
  getBusinessReportEntitlement,
} from "../services/businessReportAccessService.js";


/**
 * =========================================================
 * BUSINESS REPORT ACCESS TESTS
 * =========================================================
 *
 * Roadmap:
 *
 * 9.11.19.20.3 — Access / Business Pro
 *
 * Tests:
 *
 * - missing authentication
 * - missing business
 * - unsupported reports
 * - Business Free
 * - Personal Premium isolation
 * - Business Pro
 * - entitlement/business mismatch
 * - locked preview safety
 * - safe subscription metadata
 * - thrown access errors
 * - entitlement summary
 * - entitlement resolver behavior
 *
 * No Prisma/database access is performed.
 * =========================================================
 */


/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const USER_ID =
  "user-001";

const BUSINESS_ID =
  "business-001";

const OTHER_BUSINESS_ID =
  "business-999";

const business = {
  id: BUSINESS_ID,
  name: "Test Business",
};


const businessFreeEntitlement = {
  isBusinessPro: false,
  businessId: BUSINESS_ID,
};


const businessProEntitlement = {
  isBusinessPro: true,
  businessId: BUSINESS_ID,
  plan: "BUSINESS_PRO",
  status: "ACTIVE",
  startedAt:
    "2026-09-01T00:00:00.000Z",
  expiresAt:
    "2026-10-01T23:59:59.999Z",
  daysRemaining: 10,
};


const mismatchedBusinessProEntitlement = {
  ...businessProEntitlement,
  businessId:
    OTHER_BUSINESS_ID,
};


/**
 * Personal Premium deliberately contains
 * premium-looking fields but NOT isBusinessPro.
 *
 * The reporting layer must never interpret
 * Personal Premium as Business Pro.
 */
const personalPremiumOnlyEntitlement = {
  isPremium: true,
  isPersonalPremium: true,
  personalPremium: true,

  plan:
    "PREMIUM",

  status:
    "ACTIVE",

  businessId:
    BUSINESS_ID,

  isBusinessPro:
    false,
};


/**
 * =========================================================
 * RESOLVERS
 * =========================================================
 */

const createResolver = (
  entitlement
) =>
  async () =>
    entitlement;


const createTrackingResolver = (
  entitlement
) => {
  const calls = [];

  const resolver =
    async (userId) => {
      calls.push(
        userId
      );

      return entitlement;
    };

  return {
    resolver,
    calls,
  };
};


const createFailingResolver =
  () =>
    async () => {
      throw new Error(
        "Resolver should not have been called."
      );
    };


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
 * AUTHENTICATION
 * =========================================================
 */

const testMissingUserDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_REQUIRED
    );

    assert.match(
      result.message,
      /authentication/i
    );
  };


/**
 * =========================================================
 * BUSINESS REQUIREMENT
 * =========================================================
 */

const testMissingBusinessDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business:
          null,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_REQUIRED
    );
  };


const testBusinessWithoutIdDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business: {
          name:
            "Missing ID",
        },

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_REQUIRED
    );
  };


/**
 * =========================================================
 * REPORT TYPE
 * =========================================================
 */

const testUnsupportedReportDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          "NOT_A_REPORT",

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .UNSUPPORTED_REPORT_TYPE
    );
  };


const testMissingReportTypeDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .UNSUPPORTED_REPORT_TYPE
    );
  };


const testReportTypeNormalized =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          " business_performance ",

        entitlementResolver:
          createResolver(
            businessProEntitlement
          ),
      });

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_PERFORMANCE
    );
  };


/**
 * =========================================================
 * ENTITLEMENT RESOLUTION
 * =========================================================
 */

const testResolverReceivesUserId =
  async () => {
    const {
      resolver,
      calls,
    } =
      createTrackingResolver(
        businessProEntitlement
      );

    await resolveBusinessReportAccess({
      userId:
        USER_ID,

      business,

      reportType:
        BUSINESS_REPORT_TYPES
          .BUSINESS_PERFORMANCE,

      entitlementResolver:
        resolver,
    });

    assert.deepEqual(
      calls,
      [
        USER_ID,
      ]
    );
  };


const testValidationOccursBeforeEntitlementLookup =
  async () => {
    let calls = 0;

    const resolver =
      async () => {
        calls += 1;

        return businessProEntitlement;
      };

    await resolveBusinessReportAccess({
      userId:
        null,

      business,

      reportType:
        BUSINESS_REPORT_TYPES
          .BUSINESS_PERFORMANCE,

      entitlementResolver:
        resolver,
    });

    await resolveBusinessReportAccess({
      userId:
        USER_ID,

      business:
        null,

      reportType:
        BUSINESS_REPORT_TYPES
          .BUSINESS_PERFORMANCE,

      entitlementResolver:
        resolver,
    });

    await resolveBusinessReportAccess({
      userId:
        USER_ID,

      business,

      reportType:
        "NOT_REAL",

      entitlementResolver:
        resolver,
    });

    assert.equal(
      calls,
      0,
      "Entitlement lookup should happen only after basic access validation."
    );
  };


/**
 * =========================================================
 * BUSINESS FREE
 * =========================================================
 */

const testBusinessFreeDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            businessFreeEntitlement
          ),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_PRO_REQUIRED
    );

    assert.equal(
      result.access
        .analyticsTier,
      "BUSINESS_FREE"
    );

    assert.equal(
      result.access
        .isBusinessPro,
      false
    );

    assert.equal(
      result.access
        .reportGeneration,
      false
    );

    assert.equal(
      result.access
        .reportExport,
      false
    );

    assert.equal(
      result.access
        .customDateRange,
      false
    );

    assert.equal(
      result.access
        .maxHistoryDays,
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS
    );
  };


const testNullEntitlementDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            null
          ),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_PRO_REQUIRED
    );
  };


/**
 * =========================================================
 * PERSONAL PREMIUM ISOLATION
 * =========================================================
 */

const testPersonalPremiumDoesNotUnlockBusinessReports =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_INTELLIGENCE,

        entitlementResolver:
          createResolver(
            personalPremiumOnlyEntitlement
          ),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_PRO_REQUIRED
    );

    assert.equal(
      result.access
        .isBusinessPro,
      false
    );

    assert.equal(
      result.access
        .reportGeneration,
      false
    );

    assert.equal(
      result.access
        .reportExport,
      false
    );
  };


/**
 * =========================================================
 * LOCKED PREVIEW
 * =========================================================
 */

const testBusinessFreePreviewSafe =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            businessFreeEntitlement
          ),
      });

    assert.ok(
      result.preview
    );

    assert.equal(
      result.preview
        .reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_PERFORMANCE
    );

    assert.equal(
      result.preview
        .locked,
      true
    );

    assert.equal(
      result.preview
        .requiresBusinessPro,
      true
    );

    assert.equal(
      result.preview
        .dataExposed,
      false
    );

    assert.ok(
      Array.isArray(
        result.preview
          .supportedFormats
      )
    );

    assert.ok(
      Array.isArray(
        result.preview
          .sections
      )
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          result.preview,
          "data"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          result.preview,
          "analytics"
        ),
      false
    );
  };


const testBusinessFreeUpgradeMetadata =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            businessFreeEntitlement
          ),
      });

    assert.equal(
      result.upgrade
        .required,
      true
    );

    assert.equal(
      result.upgrade
        .plan,
      "BUSINESS_PRO"
    );

    assert.equal(
      result.upgrade
        .pricing,
      null
    );
  };


/**
 * =========================================================
 * BUSINESS MISMATCH
 * =========================================================
 */

const testBusinessMismatchDenied =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            mismatchedBusinessProEntitlement
          ),
      });

    assert.equal(
      result.allowed,
      false
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .BUSINESS_MISMATCH
    );

    assert.equal(
      result.access
        .analyticsTier,
      "BUSINESS_FREE"
    );

    assert.equal(
      result.access
        .isBusinessPro,
      false
    );

    assert.equal(
      result.access
        .reportGeneration,
      false
    );

    assert.equal(
      result.access
        .reportExport,
      false
    );
  };


/**
 * =========================================================
 * BUSINESS PRO
 * =========================================================
 */

const testBusinessProGranted =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_INTELLIGENCE,

        entitlementResolver:
          createResolver(
            businessProEntitlement
          ),
      });

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .GRANTED
    );

    assert.equal(
      result.reportType,
      BUSINESS_REPORT_TYPES
        .BUSINESS_INTELLIGENCE
    );

    assert.ok(
      result.definition
    );

    assert.equal(
      result.definition.code,
      BUSINESS_REPORT_TYPES
        .BUSINESS_INTELLIGENCE
    );
  };


const testBusinessProCapabilities =
  async () => {
    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            businessProEntitlement
          ),
      });

    assert.equal(
      result.access
        .analyticsTier,
      "BUSINESS_PRO"
    );

    assert.equal(
      result.access
        .isBusinessPro,
      true
    );

    assert.equal(
      result.access
        .reportGeneration,
      true
    );

    assert.equal(
      result.access
        .reportExport,
      true
    );

    assert.equal(
      result.access
        .customDateRange,
      BUSINESS_REPORT_HISTORY
        .CUSTOM_DATE_RANGE
    );

    assert.equal(
      result.access
        .maxHistoryDays,
      BUSINESS_REPORT_HISTORY
        .MAX_DAYS
    );

    assert.equal(
      result.access
        .reportVersion,
      BUSINESS_REPORT_VERSION
    );
  };


/**
 * =========================================================
 * SAFE SUBSCRIPTION METADATA
 * =========================================================
 */

const testBusinessProSubscriptionMetadata =
  async () => {
    const entitlement = {
      ...businessProEntitlement,

      /**
       * These fields simulate internal subscription
       * data that must not leak through the report
       * access service.
       */
      id:
        "subscription-secret-id",

      userId:
        USER_ID,

      businessId:
        BUSINESS_ID,

      checkoutRequestId:
        "mpesa-secret",

      merchantRequestId:
        "merchant-secret",

      rawCallback: {
        secret:
          true,
      },
    };

    const result =
      await resolveBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            entitlement
          ),
      });

    const subscription =
      result.access
        .subscription;

    assert.deepEqual(
      subscription,
      {
        plan:
          "BUSINESS_PRO",

        status:
          "ACTIVE",

        startedAt:
          "2026-09-01T00:00:00.000Z",

        expiresAt:
          "2026-10-01T23:59:59.999Z",

        daysRemaining:
          10,
      }
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          subscription,
          "id"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          subscription,
          "userId"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          subscription,
          "businessId"
        ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          subscription,
          "rawCallback"
        ),
      false
    );
  };


/**
 * =========================================================
 * REQUIRE ACCESS WRAPPER
 * =========================================================
 */

const testRequireAccessReturnsGrantedResult =
  async () => {
    const result =
      await requireBusinessReportAccess({
        userId:
          USER_ID,

        business,

        reportType:
          BUSINESS_REPORT_TYPES
            .BUSINESS_PERFORMANCE,

        entitlementResolver:
          createResolver(
            businessProEntitlement
          ),
      });

    assert.equal(
      result.allowed,
      true
    );

    assert.equal(
      result.code,
      BUSINESS_REPORT_ACCESS_CODES
        .GRANTED
    );
  };


const testRequireAccessThrowsForBusinessFree =
  async () => {
    await assert.rejects(
      () =>
        requireBusinessReportAccess({
          userId:
            USER_ID,

          business,

          reportType:
            BUSINESS_REPORT_TYPES
              .BUSINESS_PERFORMANCE,

          entitlementResolver:
            createResolver(
              businessFreeEntitlement
            ),
        }),

      (error) => {
        assert.equal(
          error.code,
          BUSINESS_REPORT_ACCESS_CODES
            .BUSINESS_PRO_REQUIRED
        );

        assert.ok(
          error.reportAccess
        );

        assert.equal(
          error.reportAccess
            .allowed,
          false
        );

        assert.equal(
          error.reportAccess
            .preview
            .dataExposed,
          false
        );

        return true;
      }
    );
  };


const testRequireAccessThrowsForMismatch =
  async () => {
    await assert.rejects(
      () =>
        requireBusinessReportAccess({
          userId:
            USER_ID,

          business,

          reportType:
            BUSINESS_REPORT_TYPES
              .BUSINESS_PERFORMANCE,

          entitlementResolver:
            createResolver(
              mismatchedBusinessProEntitlement
            ),
        }),

      (error) => {
        assert.equal(
          error.code,
          BUSINESS_REPORT_ACCESS_CODES
            .BUSINESS_MISMATCH
        );

        assert.equal(
          error.reportAccess
            .allowed,
          false
        );

        return true;
      }
    );
  };


/**
 * =========================================================
 * ENTITLEMENT SUMMARY — NO BUSINESS
 * =========================================================
 */

const testEntitlementSummaryWithoutUser =
  async () => {
    const summary =
      await getBusinessReportEntitlement({
        userId:
          null,

        business,

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      summary.isBusiness,
      true
    );

    assert.equal(
      summary.isBusinessPro,
      false
    );

    assert.equal(
      summary.reportGeneration,
      false
    );

    assert.equal(
      summary.reportExport,
      false
    );

    assert.equal(
      summary.maxHistoryDays,
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS
    );

    assert.equal(
      summary.customDateRange,
      false
    );

    assert.equal(
      summary.subscription,
      null
    );
  };


const testEntitlementSummaryWithoutBusiness =
  async () => {
    const summary =
      await getBusinessReportEntitlement({
        userId:
          USER_ID,

        business:
          null,

        entitlementResolver:
          createFailingResolver(),
      });

    assert.equal(
      summary.isBusiness,
      false
    );

    assert.equal(
      summary.isBusinessPro,
      false
    );

    assert.equal(
      summary.reportGeneration,
      false
    );

    assert.equal(
      summary.reportExport,
      false
    );

    assert.equal(
      summary.subscription,
      null
    );
  };


/**
 * =========================================================
 * ENTITLEMENT SUMMARY — BUSINESS FREE
 * =========================================================
 */

const testBusinessFreeEntitlementSummary =
  async () => {
    const summary =
      await getBusinessReportEntitlement({
        userId:
          USER_ID,

        business,

        entitlementResolver:
          createResolver(
            businessFreeEntitlement
          ),
      });

    assert.equal(
      summary.isBusiness,
      true
    );

    assert.equal(
      summary.isBusinessPro,
      false
    );

    assert.equal(
      summary.analyticsTier,
      "BUSINESS_FREE"
    );

    assert.equal(
      summary.reportGeneration,
      false
    );

    assert.equal(
      summary.reportExport,
      false
    );

    assert.equal(
      summary.maxHistoryDays,
      BUSINESS_REPORT_HISTORY
        .DEFAULT_DAYS
    );

    assert.equal(
      summary.customDateRange,
      false
    );

    assert.equal(
      summary.subscription,
      null
    );
  };


const testPersonalPremiumEntitlementSummary =
  async () => {
    const summary =
      await getBusinessReportEntitlement({
        userId:
          USER_ID,

        business,

        entitlementResolver:
          createResolver(
            personalPremiumOnlyEntitlement
          ),
      });

    assert.equal(
      summary.isBusinessPro,
      false
    );

    assert.equal(
      summary.analyticsTier,
      "BUSINESS_FREE"
    );

    assert.equal(
      summary.reportGeneration,
      false
    );

    assert.equal(
      summary.reportExport,
      false
    );
  };


const testMismatchedEntitlementSummary =
  async () => {
    const summary =
      await getBusinessReportEntitlement({
        userId:
          USER_ID,

        business,

        entitlementResolver:
          createResolver(
            mismatchedBusinessProEntitlement
          ),
      });

    assert.equal(
      summary.isBusinessPro,
      false
    );

    assert.equal(
      summary.analyticsTier,
      "BUSINESS_FREE"
    );

    assert.equal(
      summary.subscription,
      null
    );
  };


/**
 * =========================================================
 * ENTITLEMENT SUMMARY — BUSINESS PRO
 * =========================================================
 */

const testBusinessProEntitlementSummary =
  async () => {
    const summary =
      await getBusinessReportEntitlement({
        userId:
          USER_ID,

        business,

        entitlementResolver:
          createResolver(
            businessProEntitlement
          ),
      });

    assert.equal(
      summary.isBusiness,
      true
    );

    assert.equal(
      summary.isBusinessPro,
      true
    );

    assert.equal(
      summary.analyticsTier,
      "BUSINESS_PRO"
    );

    assert.equal(
      summary.reportGeneration,
      true
    );

    assert.equal(
      summary.reportExport,
      true
    );

    assert.equal(
      summary.maxHistoryDays,
      BUSINESS_REPORT_HISTORY
        .MAX_DAYS
    );

    assert.equal(
      summary.customDateRange,
      BUSINESS_REPORT_HISTORY
        .CUSTOM_DATE_RANGE
    );

    assert.equal(
      summary.reportVersion,
      BUSINESS_REPORT_VERSION
    );

    assert.deepEqual(
      summary.subscription,
      {
        plan:
          "BUSINESS_PRO",

        status:
          "ACTIVE",

        startedAt:
          "2026-09-01T00:00:00.000Z",

        expiresAt:
          "2026-10-01T23:59:59.999Z",

        daysRemaining:
          10,
      }
    );
  };


/**
 * =========================================================
 * ALL REPORT TYPES
 * =========================================================
 */

const testBusinessProCanAccessAllRegisteredReports =
  async () => {
    for (
      const reportType
      of Object.values(
        BUSINESS_REPORT_TYPES
      )
    ) {
      const result =
        await resolveBusinessReportAccess({
          userId:
            USER_ID,

          business,

          reportType,

          entitlementResolver:
            createResolver(
              businessProEntitlement
            ),
        });

      assert.equal(
        result.allowed,
        true,
        `${reportType} should be available to Business Pro.`
      );

      assert.equal(
        result.reportType,
        reportType
      );
    }
  };


const testBusinessFreeCannotGenerateAnyRegisteredReport =
  async () => {
    for (
      const reportType
      of Object.values(
        BUSINESS_REPORT_TYPES
      )
    ) {
      const result =
        await resolveBusinessReportAccess({
          userId:
            USER_ID,

          business,

          reportType,

          entitlementResolver:
            createResolver(
              businessFreeEntitlement
            ),
        });

      assert.equal(
        result.allowed,
        false,
        `${reportType} should remain locked for Business Free.`
      );

      assert.equal(
        result.code,
        BUSINESS_REPORT_ACCESS_CODES
          .BUSINESS_PRO_REQUIRED
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
    " Business Report Access Tests"
  );
  console.log(
    " 9.11.19.20.3"
  );
  console.log(
    "============================================"
  );
  console.log("");

  const tests = [
    [
      "Missing authenticated user is denied",
      testMissingUserDenied,
    ],

    [
      "Missing business is denied",
      testMissingBusinessDenied,
    ],

    [
      "Business without ID is denied",
      testBusinessWithoutIdDenied,
    ],

    [
      "Unsupported report type is denied",
      testUnsupportedReportDenied,
    ],

    [
      "Missing report type is denied",
      testMissingReportTypeDenied,
    ],

    [
      "Report type is normalized before authorization",
      testReportTypeNormalized,
    ],

    [
      "Entitlement resolver receives authenticated user ID",
      testResolverReceivesUserId,
    ],

    [
      "Validation occurs before entitlement lookup",
      testValidationOccursBeforeEntitlementLookup,
    ],

    [
      "Business Free cannot generate reports",
      testBusinessFreeDenied,
    ],

    [
      "Missing entitlement is treated as Business Free",
      testNullEntitlementDenied,
    ],

    [
      "Personal Premium does not unlock Business Pro reports",
      testPersonalPremiumDoesNotUnlockBusinessReports,
    ],

    [
      "Business Free preview exposes no analytics",
      testBusinessFreePreviewSafe,
    ],

    [
      "Business Free receives safe upgrade metadata",
      testBusinessFreeUpgradeMetadata,
    ],

    [
      "Mismatched Business Pro entitlement fails closed",
      testBusinessMismatchDenied,
    ],

    [
      "Matching Business Pro entitlement grants access",
      testBusinessProGranted,
    ],

    [
      "Business Pro receives report capabilities",
      testBusinessProCapabilities,
    ],

    [
      "Business Pro subscription metadata is safely filtered",
      testBusinessProSubscriptionMetadata,
    ],

    [
      "requireBusinessReportAccess returns granted result",
      testRequireAccessReturnsGrantedResult,
    ],

    [
      "requireBusinessReportAccess throws for Business Free",
      testRequireAccessThrowsForBusinessFree,
    ],

    [
      "requireBusinessReportAccess throws for business mismatch",
      testRequireAccessThrowsForMismatch,
    ],

    [
      "Entitlement summary fails closed without user",
      testEntitlementSummaryWithoutUser,
    ],

    [
      "Entitlement summary fails closed without business",
      testEntitlementSummaryWithoutBusiness,
    ],

    [
      "Business Free entitlement summary is locked",
      testBusinessFreeEntitlementSummary,
    ],

    [
      "Personal Premium entitlement summary remains Business Free",
      testPersonalPremiumEntitlementSummary,
    ],

    [
      "Mismatched entitlement summary remains Business Free",
      testMismatchedEntitlementSummary,
    ],

    [
      "Business Pro entitlement summary is unlocked",
      testBusinessProEntitlementSummary,
    ],

    [
      "Business Pro can access every registered report",
      testBusinessProCanAccessAllRegisteredReports,
    ],

    [
      "Business Free cannot generate any registered report",
      testBusinessFreeCannotGenerateAnyRegisteredReport,
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
      `${failed} business report access test(s) failed.`
    );
  }

  console.log(
    "✅ 9.11.19.20.3 Business Report Access verification passed."
  );
};


run().catch((error) => {
  console.error("");
  console.error(
    "Business report access verification failed."
  );

  console.error(
    error
  );

  process.exitCode = 1;
});