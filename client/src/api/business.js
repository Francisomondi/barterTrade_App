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


/*
 * ============================================================
 * BUSINESS PRO FEATURED LISTINGS API
 * ============================================================
 *
 * These helpers use the existing authenticated Axios
 * instance and return the backend response data.
 *
 * Business Pro authorization is enforced by the backend.
 */

/**
 * GET FEATURED LISTINGS
 *
 * Returns:
 * - Business details
 * - Business Pro access
 * - Current featured listings
 * - Eligible active listings
 * - Featured listing usage summary
 *
 * GET /api/business/me/storefront/featured-listings
 */
export const getMyBusinessFeaturedListings = async () => {
  const response = await api.get(
    "/business/me/storefront/featured-listings"
  );

  return response.data;
};

/**
 * GET FEATURED LISTING SUMMARY
 *
 * Returns:
 * - Subscription tier
 * - Featured listing count
 * - Maximum featured listing limit
 * - Remaining featured slots
 *
 * GET /api/business/me/storefront/featured-listings/summary
 */
export const getMyBusinessFeaturedListingSummary =
  async () => {
    const response = await api.get(
      "/business/me/storefront/featured-listings/summary"
    );

    return response.data;
  };

/**
 * ADD FEATURED LISTING
 *
 * @param {string} listingId
 *
 * POST /api/business/me/storefront/featured-listings
 */
export const addMyBusinessFeaturedListing = async (
  listingId
) => {
  if (
    typeof listingId !== "string" ||
    !listingId.trim()
  ) {
    throw new Error("A valid listing ID is required.");
  }

  const response = await api.post(
    "/business/me/storefront/featured-listings",
    {
      listingId: listingId.trim(),
    }
  );

  return response.data;
};

/**
 * REMOVE FEATURED LISTING
 *
 * @param {string} listingId
 *
 * DELETE /api/business/me/storefront/featured-listings/:listingId
 */
export const removeMyBusinessFeaturedListing = async (
  listingId
) => {
  if (
    typeof listingId !== "string" ||
    !listingId.trim()
  ) {
    throw new Error("A valid listing ID is required.");
  }

  const response = await api.delete(
    `/business/me/storefront/featured-listings/${encodeURIComponent(
      listingId.trim()
    )}`
  );

  return response.data;
};

/**
 * REORDER FEATURED LISTINGS
 *
 * @param {string[]} listingIds
 *
 * PATCH /api/business/me/storefront/featured-listings/reorder
 *
 * The array must contain all currently featured listing
 * IDs in their desired display order.
 */
export const reorderMyBusinessFeaturedListings = async (
  listingIds
) => {
  if (
    !Array.isArray(listingIds) ||
    listingIds.length === 0 ||
    listingIds.some(
      (id) =>
        typeof id !== "string" ||
        !id.trim()
    )
  ) {
    throw new Error(
      "A non-empty array of valid listing IDs is required."
    );
  }

  const normalizedIds = listingIds.map((id) =>
    id.trim()
  );

  if (
    new Set(normalizedIds).size !==
    normalizedIds.length
  ) {
    throw new Error(
      "Duplicate listing IDs are not allowed."
    );
  }

  const response = await api.patch(
    "/business/me/storefront/featured-listings/reorder",
    {
      listingIds: normalizedIds,
    }
  );

  return response.data;
};
