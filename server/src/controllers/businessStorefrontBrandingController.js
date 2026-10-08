
import prisma from "../config/prisma.js";

import {
  resolveBusinessStorefrontEntitlement,
} from "../services/businessStorefrontEntitlementService.js";

import {
  DEFAULT_STOREFRONT_BRANDING,
} from "../config/businessStorefrontBranding.js";

import {
  validateBusinessStorefrontBranding,
} from "../utils/validateBusinessStorefrontBranding.js";

/**
 * ============================================================
 * BUSINESS STOREFRONT BRANDING CONTROLLER
 * ============================================================
 *
 * GET   /api/business/me/storefront/branding
 * PATCH /api/business/me/storefront/branding
 *
 * Rules:
 * - Authenticated business owners only.
 * - Business ownership comes from req.user.id.
 * - Business Pro entitlement is resolved server-side.
 * - Free businesses receive default effective branding.
 * - Expired Pro settings remain stored but are not applied.
 */

const getOwnerBusiness = async (userId) => {
  return prisma.businessProfile.findUnique({
    where: { userId },

    select: {
      id: true,
      userId: true,
      businessName: true,
      slug: true,
      logo: true,
      coverImage: true,
    },
  });
};

/**
 * GET MY BUSINESS STOREFRONT BRANDING
 */
export const getMyBusinessStorefrontBranding = async (
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

    const business = await getOwnerBusiness(userId);

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_NOT_FOUND",
        message: "Business account not found.",
      });
    }

    const access =
      await resolveBusinessStorefrontEntitlement(userId);

    const isBusinessPro =
      access?.businessId === business.id &&
      access?.isBusinessPro === true &&
      access?.features?.customBranding === true;

    const settings =
      await prisma.businessStorefrontSettings.findUnique({
        where: {
          businessId: business.id,
        },
      });

    const effectiveBranding = isBusinessPro
      ? {
          ...DEFAULT_STOREFRONT_BRANDING,
          ...(settings
            ? {
                primaryColor: settings.primaryColor,
                secondaryColor: settings.secondaryColor,
                accentColor: settings.accentColor,
                layoutStyle: settings.layoutStyle,
                tagline: settings.tagline,
              }
            : {}),
        }
      : { ...DEFAULT_STOREFRONT_BRANDING };

    return res.status(200).json({
      success: true,

      business: {
        id: business.id,
        businessName: business.businessName,
        slug: business.slug,
        logo: business.logo,
        coverImage: business.coverImage,
      },

      access: {
        tier: isBusinessPro
          ? "BUSINESS_PRO"
          : "BUSINESS_FREE",
        isBusinessPro,
        canCustomizeBranding: isBusinessPro,
      },

      branding: effectiveBranding,
    });
  } catch (error) {
    console.error(
      "GET BUSINESS STOREFRONT BRANDING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      code: "STOREFRONT_BRANDING_FETCH_ERROR",
      message: "Failed to load storefront branding.",
    });
  }
};

/**
 * UPDATE MY BUSINESS STOREFRONT BRANDING
 */
export const updateMyBusinessStorefrontBranding = async (
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

    const business = await getOwnerBusiness(userId);

    if (!business) {
      return res.status(404).json({
        success: false,
        code: "BUSINESS_NOT_FOUND",
        message: "Business account not found.",
      });
    }

    const access =
      await resolveBusinessStorefrontEntitlement(userId);

    const canCustomizeBranding =
      access?.businessId === business.id &&
      access?.isBusinessPro === true &&
      access?.features?.customBranding === true;

    if (!canCustomizeBranding) {
      return res.status(403).json({
        success: false,
        code: "BUSINESS_PRO_REQUIRED",
        message:
          "An active Business Pro subscription is required to customize storefront branding.",
        upgradeRequired: true,
      });
    }

    const validation =
      validateBusinessStorefrontBranding(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: "INVALID_STOREFRONT_BRANDING",
        message: "Invalid storefront branding settings.",
        errors: validation.errors,
      });
    }

    const settings =
      await prisma.businessStorefrontSettings.upsert({
        where: {
          businessId: business.id,
        },

        create: {
          businessId: business.id,
          ...validation.data,
        },

        update: {
          ...validation.data,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Storefront branding updated successfully.",

      branding: {
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        layoutStyle: settings.layoutStyle,
        tagline: settings.tagline,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE BUSINESS STOREFRONT BRANDING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      code: "STOREFRONT_BRANDING_UPDATE_ERROR",
      message: "Failed to update storefront branding.",
    });
  }
};
