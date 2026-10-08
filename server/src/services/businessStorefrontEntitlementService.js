import prisma from "../config/prisma.js";

import {
  getBusinessProEntitlement,
} from "./subscriptionService.js";

import {
  getBusinessStorefrontFeatures,
} from "../config/businessStorefrontFeatures.js";

/**
 * ============================================================
 * BUSINESS STOREFRONT ENTITLEMENT
 * ============================================================
 *
 * Determines storefront customization permissions.
 *
 * Business Free:
 *   Basic storefront capabilities.
 *
 * Business Pro:
 *   Advanced storefront customization.
 *
 * Security:
 * - Never trust client-provided subscription flags.
 * - Verify entitlement against the actual business.
 * - Personal Premium does not grant Business Pro.
 * - Pending renewals do not grant access.
 */

export const resolveBusinessStorefrontEntitlement = async (
  userId
) => {
  if (!userId) {
    return null;
  }

  const business = await prisma.businessProfile.findUnique({
    where: {
      userId,
    },

    select: {
      id: true,
      userId: true,
      businessName: true,
      slug: true,
      status: true,
    },
  });

  if (!business) {
    return null;
  }

  const entitlement =
    await getBusinessProEntitlement(userId);

  const isBusinessPro = Boolean(
    entitlement?.isBusinessPro &&
    entitlement?.businessId === business.id
  );

  return {
    businessId: business.id,

    tier: isBusinessPro
      ? "BUSINESS_PRO"
      : "BUSINESS_FREE",

    isBusinessPro,

    features:
      getBusinessStorefrontFeatures(isBusinessPro),

    subscription: isBusinessPro
      ? {
          plan: entitlement.plan,
          status: entitlement.status,
          startedAt: entitlement.startedAt,
          expiresAt: entitlement.expiresAt,
          daysRemaining: entitlement.daysRemaining,
        }
      : null,
  };
};