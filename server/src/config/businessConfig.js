/*
 * ============================================================
 * BUSINESS ACCOUNT CONFIGURATION
 * ============================================================
 *
 * Central source of truth for BarterTrade Business Accounts.
 *
 * IMPORTANT:
 *
 * Business Account != Premium Subscription
 * Business Account != Verified Business
 *
 * These are separate concepts.
 */

/*
 * ============================================================
 * BUSINESS PROFILE RULES
 * ============================================================
 */

export const BUSINESS_PROFILE_RULES = {
  businessName: {
    minLength: 2,
    maxLength: 100,
  },

  description: {
    maxLength: 1000,
  },

  category: {
    maxLength: 80,
  },

  location: {
    maxLength: 150,
  },

  address: {
    maxLength: 250,
  },

  phone: {
    maxLength: 30,
  },

  email: {
    maxLength: 150,
  },

  website: {
    maxLength: 255,
  },

  slug: {
    minLength: 2,
    maxLength: 120,
  },
};

/*
 * ============================================================
 * BUSINESS ACCOUNT FEATURES
 * ============================================================
 *
 * These features come from having an ACTIVE BusinessProfile.
 *
 * They do NOT require Premium.
 */

export const BUSINESS_FEATURES = {
  businessProfile: true,

  businessBadge: true,

  publicStorefront: true,

  businessDashboard: true,

  businessListings: true,

  contactInformation: true,

  basicBusinessAnalytics: true,
};

/*
 * ============================================================
 * BUSINESS STATUS
 * ============================================================
 */

export const BUSINESS_STATUSES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  CLOSED: "CLOSED",
};

/*
 * ============================================================
 * BUSINESS VERIFICATION STATUS
 * ============================================================
 *
 * Actual verification will be implemented later.
 *
 * Creating a Business Account NEVER automatically verifies it.
 */

export const BUSINESS_VERIFICATION_STATUSES = {
  UNVERIFIED: "UNVERIFIED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
};

/*
 * ============================================================
 * DEFAULT BUSINESS ACCOUNT STATE
 * ============================================================
 */

export const DEFAULT_BUSINESS_STATE = {
  status: BUSINESS_STATUSES.ACTIVE,

  verificationStatus:
    BUSINESS_VERIFICATION_STATUSES.UNVERIFIED,
};

/*
 * ============================================================
 * BUSINESS CATEGORIES
 * ============================================================
 *
 * Initial supported categories.
 *
 * This list can be expanded later without changing the database
 * because BusinessProfile.category is stored as a String.
 */

export const BUSINESS_CATEGORIES = [
  "Automotive",
  "Beauty & Personal Care",
  "Books & Education",
  "Construction & Hardware",
  "Electronics",
  "Fashion & Clothing",
  "Furniture & Interior Decor",
  "Home & Garden",
  "Kids & Baby",
  "Professional Services",
  "Sports & Fitness",
  "Technology",
  "Other",
];

/*
 * ============================================================
 * CHECK BUSINESS CATEGORY
 * ============================================================
 */

export const isValidBusinessCategory = (category) => {
  if (!category) {
    return true;
  }

  return BUSINESS_CATEGORIES.includes(
    String(category).trim()
  );
};

/*
 * ============================================================
 * NORMALIZE BUSINESS NAME
 * ============================================================
 */

export const normalizeBusinessName = (businessName) => {
  if (!businessName) {
    return "";
  }

  return String(businessName)
    .trim()
    .replace(/\s+/g, " ");
};

/*
 * ============================================================
 * GENERATE BUSINESS SLUG
 * ============================================================
 *
 * Example:
 *
 * "Royal Pallets & Interior Decor"
 *
 * becomes:
 *
 * "royal-pallets-interior-decor"
 *
 * Uniqueness will be handled by the Business service/controller.
 */

export const generateBusinessSlug = (businessName) => {
  const normalized =
    normalizeBusinessName(businessName);

  return normalized
    .toLowerCase()

    /*
     * Remove apostrophes instead of replacing them with a dash.
     *
     * Example:
     * "Joe's Furniture"
     * becomes:
     * "joes-furniture"
     */
    .replace(/['’]/g, "")

    /*
     * Replace & with a readable separator.
     */
    .replace(/&/g, " and ")

    /*
     * Remove everything except letters, numbers and spaces.
     */
    .replace(/[^a-z0-9\s-]/g, "")

    /*
     * Convert whitespace to hyphens.
     */
    .replace(/\s+/g, "-")

    /*
     * Collapse multiple hyphens.
     */
    .replace(/-+/g, "-")

    /*
     * Remove leading/trailing hyphens.
     */
    .replace(/^-|-$/g, "")

    /*
     * Respect database/application slug limit.
     */
    .slice(
      0,
      BUSINESS_PROFILE_RULES.slug.maxLength
    )

    /*
     * Prevent a truncated slug ending in "-".
     */
    .replace(/-$/g, "");
};

/*
 * ============================================================
 * BUSINESS PROFILE VALIDATION
 * ============================================================
 */

export const validateBusinessProfileInput = ({
  businessName,
  description,
  category,
  location,
  address,
  phone,
  email,
  website,
}) => {
  const errors = {};

  /*
   * BUSINESS NAME
   */

  const normalizedName =
    normalizeBusinessName(businessName);

  if (!normalizedName) {
    errors.businessName =
      "Business name is required.";
  } else if (
    normalizedName.length <
    BUSINESS_PROFILE_RULES.businessName
      .minLength
  ) {
    errors.businessName =
      `Business name must be at least ${BUSINESS_PROFILE_RULES.businessName.minLength} characters.`;
  } else if (
    normalizedName.length >
    BUSINESS_PROFILE_RULES.businessName
      .maxLength
  ) {
    errors.businessName =
      `Business name cannot exceed ${BUSINESS_PROFILE_RULES.businessName.maxLength} characters.`;
  }

  /*
   * DESCRIPTION
   */

  if (
    description &&
    String(description).trim().length >
      BUSINESS_PROFILE_RULES.description
        .maxLength
  ) {
    errors.description =
      `Description cannot exceed ${BUSINESS_PROFILE_RULES.description.maxLength} characters.`;
  }

  /*
   * CATEGORY
   */

  if (
    category &&
    String(category).trim().length >
      BUSINESS_PROFILE_RULES.category
        .maxLength
  ) {
    errors.category =
      `Category cannot exceed ${BUSINESS_PROFILE_RULES.category.maxLength} characters.`;
  } else if (
    category &&
    !isValidBusinessCategory(
      String(category).trim()
    )
  ) {
    errors.category =
      "Invalid business category.";
  }

  /*
   * LOCATION
   */

  if (
    location &&
    String(location).trim().length >
      BUSINESS_PROFILE_RULES.location
        .maxLength
  ) {
    errors.location =
      `Location cannot exceed ${BUSINESS_PROFILE_RULES.location.maxLength} characters.`;
  }

  /*
   * ADDRESS
   */

  if (
    address &&
    String(address).trim().length >
      BUSINESS_PROFILE_RULES.address
        .maxLength
  ) {
    errors.address =
      `Address cannot exceed ${BUSINESS_PROFILE_RULES.address.maxLength} characters.`;
  }

  /*
   * PHONE
   */

  if (
    phone &&
    String(phone).trim().length >
      BUSINESS_PROFILE_RULES.phone
        .maxLength
  ) {
    errors.phone =
      `Phone number cannot exceed ${BUSINESS_PROFILE_RULES.phone.maxLength} characters.`;
  }

  /*
   * EMAIL
   */

  if (email) {
    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    if (
      normalizedEmail.length >
      BUSINESS_PROFILE_RULES.email
        .maxLength
    ) {
      errors.email =
        `Email cannot exceed ${BUSINESS_PROFILE_RULES.email.maxLength} characters.`;
    } else {
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          normalizedEmail
        )
      ) {
        errors.email =
          "Enter a valid business email address.";
      }
    }
  }

  /*
   * WEBSITE
   */

  if (website) {
    const normalizedWebsite =
      String(website).trim();

    if (
      normalizedWebsite.length >
      BUSINESS_PROFILE_RULES.website
        .maxLength
    ) {
      errors.website =
        `Website cannot exceed ${BUSINESS_PROFILE_RULES.website.maxLength} characters.`;
    } else {
      try {
        const parsedUrl =
          new URL(normalizedWebsite);

        if (
          ![
            "http:",
            "https:",
          ].includes(
            parsedUrl.protocol
          )
        ) {
          errors.website =
            "Website must use http:// or https://.";
        }
      } catch {
        errors.website =
          "Enter a valid website URL including https://.";
      }
    }
  }

  /*
   * ==========================================================
   * RESULT
   * ==========================================================
   */

  return {
    valid:
      Object.keys(errors).length ===
      0,

    errors,

    data: {
      businessName:
        normalizedName,

      description:
        description
          ? String(
              description
            ).trim()
          : null,

      category:
        category
          ? String(
              category
            ).trim()
          : null,

      location:
        location
          ? String(
              location
            ).trim()
          : null,

      address:
        address
          ? String(
              address
            ).trim()
          : null,

      phone:
        phone
          ? String(
              phone
            ).trim()
          : null,

      email:
        email
          ? String(email)
              .trim()
              .toLowerCase()
          : null,

      website:
        website
          ? String(
              website
            ).trim()
          : null,
    },
  };
};