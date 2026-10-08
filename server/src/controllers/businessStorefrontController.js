import {
  resolveBusinessStorefrontEntitlement,
} from "../services/businessStorefrontEntitlementService.js";

/**
 * ============================================================
 * GET MY BUSINESS STOREFRONT ENTITLEMENT
 * ============================================================
 *
 * GET /api/business/me/storefront/entitlement
 *
 * Security:
 * - Authentication required.
 * - Business ownership is resolved from req.user.id.
 * - Business Pro is checked against the Subscription table
 *   through the existing subscription service.
 * - Personal Premium does not unlock Business Pro.
 * - Expired or scheduled subscriptions cannot unlock Pro.
 */

export const getMyBusinessStorefrontEntitlement = async (
  req,
  res
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
      });
    }

    const access =
      await resolveBusinessStorefrontEntitlement(userId);

    if (!access) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_NOT_FOUND",
        message: "Business account not found.",
      });
    }

    return res.status(200).json({
      success: true,

      access: {
        tier: access.tier,
        isBusinessPro: access.isBusinessPro,
        features: access.features,
        subscription: access.subscription,
      },
    });
  } catch (error) {
    console.error(
      "GET BUSINESS STOREFRONT ENTITLEMENT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      code: "BUSINESS_STOREFRONT_ENTITLEMENT_ERROR",
      message:
        "Failed to load business storefront entitlement.",
    });
  }
};