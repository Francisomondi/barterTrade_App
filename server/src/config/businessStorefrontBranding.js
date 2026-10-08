
/**
 * ============================================================
 * BUSINESS STOREFRONT BRANDING CONFIGURATION
 * ============================================================
 */

export const STOREFRONT_LAYOUTS = Object.freeze({
  CLASSIC: "CLASSIC",
  MODERN: "MODERN",
  MINIMAL: "MINIMAL",
});

export const DEFAULT_STOREFRONT_BRANDING =
  Object.freeze({
    primaryColor: "#5B1725",
    secondaryColor: "#D6B15E",
    accentColor: "#8A2638",
    layoutStyle: STOREFRONT_LAYOUTS.CLASSIC,
    tagline: null,
  });

export const ALLOWED_STOREFRONT_LAYOUTS =
  Object.freeze(
    Object.values(STOREFRONT_LAYOUTS)
  );
