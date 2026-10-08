
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getMyBusinessStorefrontEntitlement,
} from "../api/business";

/**
 * ============================================================
 * BUSINESS STOREFRONT ENTITLEMENT HOOK
 * ============================================================
 *
 * Centralized frontend access to storefront permissions.
 *
 * IMPORTANT:
 * This hook is for frontend presentation only.
 * The backend must enforce permissions on protected actions.
 */

const FREE_FEATURES = Object.freeze({
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

export const useBusinessStorefrontEntitlement = () => {
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshEntitlement = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await getMyBusinessStorefrontEntitlement();

      if (
        response?.success !== true ||
        !response?.access ||
        typeof response.access.isBusinessPro !== "boolean"
      ) {
        throw new Error(
          "Invalid storefront entitlement response."
        );
      }

      setAccess(response.access);

      return response.access;
    } catch (err) {
      setAccess(null);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load storefront permissions."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEntitlement();
  }, [refreshEntitlement]);

  const isBusinessPro =
    access?.isBusinessPro === true;

  const tier =
    access?.tier || "BUSINESS_FREE";

  /*
   * Fail closed when entitlement cannot be loaded.
   *
   * Never enable Pro features based on stale local state.
   */
  const features = {
    ...FREE_FEATURES,
    ...(access?.features || {}),
  };

  const canUseCustomBranding =
    isBusinessPro &&
    features.customBranding === true;

  const canFeatureListings =
    isBusinessPro &&
    features.featuredListings === true;

  const canUsePromotionalHighlights =
    isBusinessPro &&
    features.promotionalHighlights === true;

  const canUseEnhancedLayout =
    isBusinessPro &&
    features.enhancedLayout === true;

  const maxFeaturedListings =
    canFeatureListings
      ? Math.max(
          0,
          Number(features.maxFeaturedListings) || 0
        )
      : 0;

  return {
    access,
    tier,
    isBusinessPro,

    features: {
      ...features,
      customBranding: canUseCustomBranding,
      featuredListings: canFeatureListings,
      promotionalHighlights:
        canUsePromotionalHighlights,
      enhancedLayout: canUseEnhancedLayout,
      maxFeaturedListings,
    },

    subscription:
      isBusinessPro
        ? access?.subscription || null
        : null,

    canUseCustomBranding,
    canFeatureListings,
    canUsePromotionalHighlights,
    canUseEnhancedLayout,
    maxFeaturedListings,

    loading,
    error,
    refreshEntitlement,
  };
};
