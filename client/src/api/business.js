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


/*
 * ============================================================
 * BUSINESS INTRODUCTION API
 * ============================================================
 *
 * GET: Business Free and Business Pro.
 * PATCH: Active Business Pro only.
 *
 * Business Pro authorization is enforced by the backend.
 */

/**
 * GET MY BUSINESS INTRODUCTION
 *
 * GET /api/business/me/storefront/introduction
 *
 * Returns:
 * - introduction
 * - subscription tier
 * - introduction management permission
 */
export const getMyBusinessIntroduction = async () => {
  const response = await api.get(
    "/business/me/storefront/introduction"
  );

  return response.data;
};

/**
 * UPDATE MY BUSINESS INTRODUCTION
 *
 * PATCH /api/business/me/storefront/introduction
 *
 * @param {string|null} introduction
 *
 * Passing null or an empty string clears the introduction.
 * Maximum: 1000 characters.
 */
export const updateMyBusinessIntroduction = async (
  introduction
) => {
  if (
    introduction !== null &&
    typeof introduction !== "string"
  ) {
    throw new Error(
      "Business introduction must be text or null."
    );
  }

  const normalizedIntroduction =
    typeof introduction === "string"
      ? introduction.trim()
      : null;

  if (
    normalizedIntroduction &&
    normalizedIntroduction.length > 1000
  ) {
    throw new Error(
      "Business introduction cannot exceed 1000 characters."
    );
  }

  const response = await api.patch(
    "/business/me/storefront/introduction",
    {
      introduction: normalizedIntroduction || null,
    }
  );

  return response.data;
};

/*
 * ============================================================
 * BUSINESS PROMOTIONAL HIGHLIGHTS API
 * ============================================================
 *
 * GET: Business Free and Business Pro.
 * CREATE/UPDATE/DELETE/REORDER: Active Business Pro only.
 *
 * Maximum: 6 highlights per Business Pro storefront.
 */

const BUSINESS_HIGHLIGHT_LIMIT = 6;

/**
 * Validate a promotional highlight ID.
 */
const validatePromotionalHighlightId = (highlightId) => {
  if (
    typeof highlightId !== "string" ||
    !highlightId.trim()
  ) {
    throw new Error(
      "A valid promotional highlight ID is required."
    );
  }

  return highlightId.trim();
};

/**
 * Validate promotional highlight input.
 *
 * For creation:
 * - title is required
 *
 * For updates:
 * - only supplied fields are validated
 */
const validatePromotionalHighlightData = (
  data,
  { requireTitle = false } = {}
) => {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      "Promotional highlight data must be an object."
    );
  }

  const allowedFields = [
    "title",
    "description",
    "icon",
    "isActive",
  ];

  const normalized = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      normalized[field] = data[field];
    }
  }

  if (requireTitle && normalized.title === undefined) {
    throw new Error(
      "Promotional highlight title is required."
    );
  }

  if (normalized.title !== undefined) {
    if (
      typeof normalized.title !== "string" ||
      !normalized.title.trim() ||
      normalized.title.trim().length > 100
    ) {
      throw new Error(
        "Highlight title must contain 1 to 100 characters."
      );
    }

    normalized.title = normalized.title.trim();
  }

  if (normalized.description !== undefined) {
    if (
      normalized.description !== null &&
      typeof normalized.description !== "string"
    ) {
      throw new Error(
        "Highlight description must be text or null."
      );
    }

    const description =
      normalized.description?.trim() || null;

    if (description && description.length > 300) {
      throw new Error(
        "Highlight description cannot exceed 300 characters."
      );
    }

    normalized.description = description;
  }

  if (normalized.icon !== undefined) {
    if (
      normalized.icon !== null &&
      typeof normalized.icon !== "string"
    ) {
      throw new Error(
        "Highlight icon must be text or null."
      );
    }

    const icon = normalized.icon?.trim() || null;

    if (icon && icon.length > 50) {
      throw new Error(
        "Highlight icon cannot exceed 50 characters."
      );
    }

    normalized.icon = icon;
  }

  if (
    normalized.isActive !== undefined &&
    typeof normalized.isActive !== "boolean"
  ) {
    throw new Error(
      "Highlight active status must be true or false."
    );
  }

  if (Object.keys(normalized).length === 0) {
    throw new Error(
      "Provide at least one promotional highlight field."
    );
  }

  return normalized;
};

/**
 * GET MY PROMOTIONAL HIGHLIGHTS
 *
 * GET /api/business/me/storefront/highlights
 *
 * Returns:
 * - highlights
 * - subscription tier
 * - management permission
 * - maximum highlight allowance
 */
export const getMyBusinessPromotionalHighlights =
  async () => {
    const response = await api.get(
      "/business/me/storefront/highlights"
    );

    return response.data;
  };

/**
 * CREATE PROMOTIONAL HIGHLIGHT
 *
 * POST /api/business/me/storefront/highlights
 *
 * @param {{
 *   title: string,
 *   description?: string|null,
 *   icon?: string|null,
 *   isActive?: boolean
 * }} highlightData
 */
export const createMyBusinessPromotionalHighlight =
  async (highlightData) => {
    const validatedData =
      validatePromotionalHighlightData(
        highlightData,
        { requireTitle: true }
      );

    const response = await api.post(
      "/business/me/storefront/highlights",
      validatedData
    );

    return response.data;
  };

/**
 * UPDATE PROMOTIONAL HIGHLIGHT
 *
 * PATCH /api/business/me/storefront/highlights/:highlightId
 *
 * Can update:
 * - title
 * - description
 * - icon
 * - isActive
 */
export const updateMyBusinessPromotionalHighlight =
  async (highlightId, highlightData) => {
    const validId =
      validatePromotionalHighlightId(highlightId);

    const validatedData =
      validatePromotionalHighlightData(highlightData);

    const response = await api.patch(
      `/business/me/storefront/highlights/${encodeURIComponent(
        validId
      )}`,
      validatedData
    );

    return response.data;
  };

/**
 * DELETE PROMOTIONAL HIGHLIGHT
 *
 * DELETE /api/business/me/storefront/highlights/:highlightId
 */
export const deleteMyBusinessPromotionalHighlight =
  async (highlightId) => {
    const validId =
      validatePromotionalHighlightId(highlightId);

    const response = await api.delete(
      `/business/me/storefront/highlights/${encodeURIComponent(
        validId
      )}`
    );

    return response.data;
  };

/**
 * REORDER PROMOTIONAL HIGHLIGHTS
 *
 * PATCH /api/business/me/storefront/highlights/reorder
 *
 * @param {string[]} highlightIds
 *
 * The array must contain all saved highlight IDs
 * in their desired display order.
 *
 * An empty array is valid when no highlights exist.
 */
export const reorderMyBusinessPromotionalHighlights =
  async (highlightIds) => {
    if (
      !Array.isArray(highlightIds) ||
      highlightIds.length > BUSINESS_HIGHLIGHT_LIMIT ||
      highlightIds.some(
        (id) =>
          typeof id !== "string" ||
          !id.trim()
      )
    ) {
      throw new Error(
        "Provide up to six valid promotional highlight IDs."
      );
    }

    const normalizedIds = highlightIds.map(
      (id) => id.trim()
    );

    if (
      new Set(normalizedIds).size !==
      normalizedIds.length
    ) {
      throw new Error(
        "Duplicate promotional highlight IDs are not allowed."
      );
    }

    const response = await api.patch(
      "/business/me/storefront/highlights/reorder",
      {
        highlightIds: normalizedIds,
      }
    );

    return response.data;
  };

