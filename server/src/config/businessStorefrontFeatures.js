
/*
 * ============================================================
 * BUSINESS STOREFRONT FEATURE CONFIGURATION
 * ============================================================
 *
 * These are capability definitions, not proof that a user
 * has purchased Business Pro.
 *
 * The backend entitlement resolver selects the correct tier.
 */

export const BUSINESS_STOREFRONT_TIERS = Object.freeze({
  FREE: "BUSINESS_FREE",
  PRO: "BUSINESS_PRO",
});

export const BUSINESS_FREE_STOREFRONT_FEATURES =
  Object.freeze({
    businessLogo: true,
    businessCover: true,
    businessDescription: true,
    contactInformation: true,
    standardListingDisplay: true,

    customBranding: false,
    featuredListings: false,
    promotionalHighlights: false,
    enhancedLayout: false,

    maxFeaturedListings: 0,
  });

export const BUSINESS_PRO_STOREFRONT_FEATURES =
  Object.freeze({
    ...BUSINESS_FREE_STOREFRONT_FEATURES,

    customBranding: true,
    featuredListings: true,
    promotionalHighlights: true,
    enhancedLayout: true,

    maxFeaturedListings: 6,
  });

export const getBusinessStorefrontFeatures = (
  isBusinessPro = false
) => {
  return {
    ...(isBusinessPro
      ? BUSINESS_PRO_STOREFRONT_FEATURES
      : BUSINESS_FREE_STOREFRONT_FEATURES),
  };
};
