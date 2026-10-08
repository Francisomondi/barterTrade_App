import api from "./axios";

/*
 * ============================================================
 * CREATE BUSINESS ACCOUNT
 * ============================================================
 */

export const createBusinessAccount = async (
  data
) => {
  const response = await api.post(
    "/business",
    data
  );

  return response.data;
};

/*
 * ============================================================
 * GET MY BUSINESS
 * ============================================================
 */

export const getMyBusiness = async () => {
  const response = await api.get(
    "/business/me"
  );

  return response.data;
};

/*
 * ============================================================
 * UPDATE MY BUSINESS
 * ============================================================
 */

export const updateMyBusiness = async (
  data
) => {
  const response = await api.patch(
    "/business/me",
    data
  );

  return response.data;
};

/*
 * ============================================================
 * UPDATE BUSINESS STATUS
 * ============================================================
 */

export const updateMyBusinessStatus = async (
  status
) => {
  const response = await api.patch(
    "/business/me/status",
    {
      status,
    }
  );

  return response.data;
};

/*
 * ============================================================
 * BUSINESS LOGO
 * ============================================================
 */

export const uploadBusinessLogo = async (
  file
) => {
  const formData =
    new FormData();

  formData.append(
    "logo",
    file
  );

  const response =
    await api.patch(
      "/business/me/logo",
      formData
    );

  return response.data;
};

export const deleteBusinessLogo =
  async () => {
    const response =
      await api.delete(
        "/business/me/logo"
      );

    return response.data;
  };

/*
 * ============================================================
 * BUSINESS COVER
 * ============================================================
 */

export const uploadBusinessCover = async (
  file
) => {
  const formData =
    new FormData();

  formData.append(
    "cover",
    file
  );

  const response =
    await api.patch(
      "/business/me/cover",
      formData
    );

  return response.data;
};

export const deleteBusinessCover =
  async () => {
    const response =
      await api.delete(
        "/business/me/cover"
      );

    return response.data;
  };

/*
 * ============================================================
 * GET PUBLIC BUSINESS
 * ============================================================
 */

export const getPublicBusiness = async (
  slug
) => {
  const response = await api.get(
    `/business/${encodeURIComponent(
      slug
    )}`
  );

  return response.data;
};

/*
 * ============================================================
 * GET PUBLIC BUSINESS LISTINGS
 * ============================================================
 */

export const getPublicBusinessListings = async ({
    slug,
    page = 1,
    limit = 12,
  }) => {
    const response = await api.get(
      `/business/${encodeURIComponent(
        slug
      )}/listings`,
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data;
};

/*
 * ============================================================
 * GET BUSINESS ANALYTICS ENTITLEMENT
 * ============================================================
 *
 * GET /api/business/me/analytics/entitlement
 *
 * This is the authoritative frontend source for:
 *
 * - BUSINESS_FREE
 * - BUSINESS_PRO
 * - active Business Pro subscription
 * - expiry
 * - days remaining
 * - renewal state
 *
 * IMPORTANT:
 *
 * Business Pro must NEVER be inferred from:
 *
 * - Personal Premium
 * - AuthContext
 * - BusinessProfile fields
 * - localStorage
 * - frontend flags
 */

export const getMyBusinessAnalyticsEntitlement = async () => {
    const response = await api.get(
      "/business/me/analytics/entitlement"
    );

    return response.data;
  };

  
/**
 * ============================================================
 * GET BUSINESS STOREFRONT ENTITLEMENT
 * ============================================================
 *
 * GET /api/business/me/storefront/entitlement
 *
 * Returns the authenticated business owner's:
 *
 * - Business Free / Business Pro tier
 * - Storefront feature permissions
 * - Featured listing allowance
 * - Current Business Pro subscription information
 *
 * The backend is the source of truth.
 */

export const getMyBusinessStorefrontEntitlement =
  async () => {
    const response = await api.get(
      "/business/me/storefront/entitlement"
    );

    return response.data;
  };

  
/**
 * ============================================================
 * GET MY BUSINESS STOREFRONT BRANDING
 * ============================================================
 *
 * Available to authenticated Business Free and Pro owners.
 * Returns effective branding and customization access.
 */
export const getMyBusinessStorefrontBranding = async () => {
  const response = await api.get(
    "/business/me/storefront/branding"
  );

  return response.data;
};

/**
 * ============================================================
 * UPDATE MY BUSINESS STOREFRONT BRANDING
 * ============================================================
 *
 * Requires active Business Pro entitlement.
 *
 * Supported fields:
 * - primaryColor
 * - secondaryColor
 * - accentColor
 * - layoutStyle
 * - tagline
 */
export const updateMyBusinessStorefrontBranding = async (
  brandingData
) => {
  const response = await api.patch(
    "/business/me/storefront/branding",
    brandingData
  );

  return response.data;
};
