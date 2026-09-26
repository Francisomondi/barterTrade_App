import crypto from "crypto";
import prisma from "../config/prisma.js";

/**
 * =========================================================
 * BUSINESS ANALYTICS TRACKING SERVICE
 * =========================================================
 *
 * Responsibilities:
 *
 * - Record business analytics events.
 * - Generate privacy-conscious visitor identifiers.
 * - Prevent business owners from inflating their own data.
 * - Deduplicate passive view events.
 * - Validate that listings belong to the business.
 *
 * IMPORTANT:
 *
 * Analytics are collected for BOTH:
 *
 * - Business Free
 * - Business Pro
 *
 * Subscription level must NEVER determine whether an event
 * is recorded.
 *
 * Business Pro will affect analytics FEATURES later,
 * not analytics collection.
 */

/**
 * =========================================================
 * TRACKABLE EVENTS
 * =========================================================
 */

const TRACKABLE_EVENTS = new Set([
  "LISTING_VIEW",
  "STOREFRONT_VIEW",
  "CONTACT_CLICK",
  "WEBSITE_CLICK",
  "PHONE_CLICK",
  "LISTING_SHARE",
]);

/**
 * Passive events are deduplicated.
 *
 * Example:
 *
 * User opens listing
 * User refreshes listing 10 times
 *
 * We do not want that to become 10 meaningful views.
 */
const DEDUPLICATED_EVENTS = new Set([
  "LISTING_VIEW",
  "STOREFRONT_VIEW",
]);

/**
 * Default deduplication window.
 */
const DEFAULT_DEDUPLICATION_MINUTES = 30;

/**
 * Metadata that may safely be stored.
 *
 * Never blindly persist:
 *
 * - req.body
 * - req.headers
 * - IP addresses
 * - Authorization headers
 * - cookies
 */
const ALLOWED_METADATA_KEYS = new Set([
  "source",
  "placement",
  "referrerType",
  "deviceType",
]);

/**
 * =========================================================
 * SMALL UTILITIES
 * =========================================================
 */

const normalizeString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const hashValue = (value) => {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  return crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
};

/**
 * =========================================================
 * VISITOR KEY
 * =========================================================
 *
 * We DO NOT store the visitor's raw IP address.
 *
 * Logged-in users:
 * ----------------
 * Their user ID becomes the basis of an irreversible hash.
 *
 * Anonymous users:
 * ----------------
 * A combination of IP + user agent may be used to generate
 * an anonymous identifier.
 *
 * The raw values themselves are never stored by this service.
 */

export const createVisitorKey = ({
  userId = null,
  ip = "",
  userAgent = "",
}) => {
  if (userId) {
    return hashValue(
      `bartertrade:user:${userId}`
    );
  }

  const normalizedIp =
    normalizeString(ip);

  const normalizedUserAgent =
    normalizeString(userAgent);

  if (
    !normalizedIp &&
    !normalizedUserAgent
  ) {
    return null;
  }

  return hashValue(
    `bartertrade:anonymous:${normalizedIp}:${normalizedUserAgent}`
  );
};

/**
 * =========================================================
 * SESSION KEY
 * =========================================================
 *
 * The raw analytics session identifier is never stored.
 */

export const createSessionKey = (
  sessionId
) => {
  const normalized =
    normalizeString(sessionId);

  if (!normalized) {
    return null;
  }

  return hashValue(
    `bartertrade:session:${normalized}`
  );
};

/**
 * =========================================================
 * METADATA SANITIZATION
 * =========================================================
 */

const sanitizeMetadata = (
  metadata
) => {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }

  const sanitized = {};

  for (const [
    key,
    value,
  ] of Object.entries(metadata)) {
    if (
      !ALLOWED_METADATA_KEYS.has(key)
    ) {
      continue;
    }

    if (
      typeof value !== "string"
    ) {
      continue;
    }

    const normalized =
      value.trim();

    if (!normalized) {
      continue;
    }

    sanitized[key] =
      normalized.slice(0, 100);
  }

  return Object.keys(sanitized).length
    ? sanitized
    : null;
};

/**
 * =========================================================
 * DEDUPLICATION WINDOW
 * =========================================================
 */

const getDeduplicationStart = (
  minutes =
    DEFAULT_DEDUPLICATION_MINUTES
) => {
  const parsedMinutes =
    Number(minutes);

  const safeMinutes =
    Number.isFinite(parsedMinutes) &&
    parsedMinutes > 0
      ? parsedMinutes
      : DEFAULT_DEDUPLICATION_MINUTES;

  return new Date(
    Date.now() -
      safeMinutes * 60 * 1000
  );
};

/**
 * =========================================================
 * BUSINESS OWNER CHECK
 * =========================================================
 */

export const isBusinessOwner = ({
  businessUserId,
  visitorUserId,
}) => {
  if (
    !businessUserId ||
    !visitorUserId
  ) {
    return false;
  }

  return (
    businessUserId ===
    visitorUserId
  );
};

/**
 * =========================================================
 * GET ACTIVE BUSINESS FOR LISTING
 * =========================================================
 *
 * Listings remain owned by User.
 *
 * We DO NOT add businessId to Listing.
 *
 * A listing is treated as a business listing when:
 *
 * Listing.user
 *      ↓
 * User.businessProfile
 *      ↓
 * status === ACTIVE
 */

export const getActiveBusinessForListing =
  async (listingId) => {
    if (!listingId) {
      return null;
    }

    const listing =
      await prisma.listing.findUnique({
        where: {
          id: listingId,
        },

        select: {
          id: true,
          userId: true,
          status: true,

          user: {
            select: {
              businessProfile: {
                select: {
                  id: true,
                  userId: true,
                  status: true,
                },
              },
            },
          },
        },
      });

    if (!listing) {
      return null;
    }

    const business =
      listing.user?.businessProfile;

    if (
      !business ||
      business.status !== "ACTIVE"
    ) {
      return null;
    }

    return {
      listing,
      business,
    };
  };

/**
 * =========================================================
 * DUPLICATE CHECK
 * =========================================================
 */

const hasRecentDuplicate =
  async ({
    businessId,
    listingId = null,
    type,
    visitorKey = null,
    sessionKey = null,
    deduplicationMinutes =
      DEFAULT_DEDUPLICATION_MINUTES,
  }) => {
    if (
      !DEDUPLICATED_EVENTS.has(type)
    ) {
      return false;
    }

    /**
     * Without some visitor/session identity,
     * reliable deduplication is impossible.
     */
    if (
      !visitorKey &&
      !sessionKey
    ) {
      return false;
    }

    const identityConditions = [];

    if (visitorKey) {
      identityConditions.push({
        visitorKey,
      });
    }

    if (sessionKey) {
      identityConditions.push({
        sessionKey,
      });
    }

    const existingEvent =
      await prisma.businessAnalyticsEvent.findFirst({
        where: {
          businessId,
          type,

          ...(listingId
            ? {
                listingId,
              }
            : {
                listingId: null,
              }),

          createdAt: {
            gte:
              getDeduplicationStart(
                deduplicationMinutes
              ),
          },

          OR: identityConditions,
        },

        select: {
          id: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return Boolean(existingEvent);
  };

/**
 * =========================================================
 * GENERIC EVENT RECORDER
 * =========================================================
 *
 * This is the central write path for business analytics.
 */

export const trackBusinessAnalyticsEvent =
  async ({
    businessId,
    businessUserId,
    listingId = null,

    visitorUserId = null,
    visitorKey = null,
    sessionKey = null,

    type,
    metadata = null,

    deduplicate = true,

    deduplicationMinutes =
      DEFAULT_DEDUPLICATION_MINUTES,
  }) => {
    if (
      !businessId ||
      !businessUserId
    ) {
      return {
        tracked: false,
        reason: "INVALID_BUSINESS",
      };
    }

    if (
      !TRACKABLE_EVENTS.has(type)
    ) {
      return {
        tracked: false,
        reason:
          "INVALID_EVENT_TYPE",
      };
    }

    /**
     * Do not count activity from the
     * business owner themselves.
     */
    if (
      isBusinessOwner({
        businessUserId,
        visitorUserId,
      })
    ) {
      return {
        tracked: false,
        reason:
          "OWNER_ACTIVITY",
      };
    }

    /**
     * Passive views are deduplicated.
     */
    if (
      deduplicate &&
      DEDUPLICATED_EVENTS.has(
        type
      )
    ) {
      const duplicate =
        await hasRecentDuplicate({
          businessId,
          listingId,
          type,
          visitorKey,
          sessionKey,
          deduplicationMinutes,
        });

      if (duplicate) {
        return {
          tracked: false,
          reason: "DUPLICATE",
        };
      }
    }

    const event =
      await prisma.businessAnalyticsEvent.create({
        data: {
          businessId,
          listingId,
          visitorUserId,
          type,
          visitorKey,
          sessionKey,

          metadata:
            sanitizeMetadata(
              metadata
            ),
        },

        select: {
          id: true,
          businessId: true,
          listingId: true,
          type: true,
          createdAt: true,
        },
      });

    return {
      tracked: true,
      reason: null,
      event,
    };
  };

/**
 * =========================================================
 * TRACK LISTING VIEW
 * =========================================================
 */

export const trackListingView =
  async ({
    listingId,

    visitorUserId = null,
    visitorKey = null,
    sessionKey = null,

    metadata = null,
  }) => {
    if (!listingId) {
      return {
        tracked: false,
        reason:
          "MISSING_LISTING_ID",
      };
    }

    const context =
      await getActiveBusinessForListing(
        listingId
      );

    /**
     * Personal listings and listings belonging
     * to CLOSED/SUSPENDED businesses do not
     * contribute to Business Analytics.
     */
    if (!context) {
      return {
        tracked: false,
        reason:
          "NOT_ACTIVE_BUSINESS_LISTING",
      };
    }

    return trackBusinessAnalyticsEvent({
      businessId:
        context.business.id,

      businessUserId:
        context.business.userId,

      listingId:
        context.listing.id,

      visitorUserId,
      visitorKey,
      sessionKey,

      type: "LISTING_VIEW",

      metadata,

      deduplicate: true,
    });
  };

/**
 * =========================================================
 * TRACK STOREFRONT VIEW
 * =========================================================
 */

export const trackStorefrontView =
  async ({
    business,

    visitorUserId = null,
    visitorKey = null,
    sessionKey = null,

    metadata = null,
  }) => {
    if (
      !business ||
      !business.id ||
      !business.userId ||
      business.status !== "ACTIVE"
    ) {
      return {
        tracked: false,
        reason:
          "BUSINESS_NOT_ACTIVE",
      };
    }

    return trackBusinessAnalyticsEvent({
      businessId:
        business.id,

      businessUserId:
        business.userId,

      visitorUserId,
      visitorKey,
      sessionKey,

      type:
        "STOREFRONT_VIEW",

      metadata,

      deduplicate: true,
    });
  };

/**
 * =========================================================
 * TRACK ENGAGEMENT
 * =========================================================
 *
 * Used for explicit user actions:
 *
 * - Contact business
 * - Phone click
 * - Website click
 * - Listing share
 *
 * These are NOT treated exactly like passive views.
 */

export const trackBusinessEngagement =
  async ({
    businessId,
    businessUserId,

    listingId = null,

    visitorUserId = null,
    visitorKey = null,
    sessionKey = null,

    type,
    metadata = null,
  }) => {
    const allowed =
      new Set([
        "CONTACT_CLICK",
        "WEBSITE_CLICK",
        "PHONE_CLICK",
        "LISTING_SHARE",
      ]);

    if (!allowed.has(type)) {
      return {
        tracked: false,
        reason:
          "INVALID_ENGAGEMENT_EVENT",
      };
    }

    return trackBusinessAnalyticsEvent({
      businessId,
      businessUserId,
      listingId,

      visitorUserId,
      visitorKey,
      sessionKey,

      type,
      metadata,

      /**
       * Explicit interactions are currently
       * preserved individually.
       *
       * Rate limiting/abuse controls can be
       * layered on later.
       */
      deduplicate: false,
    });
  };

/**
 * =========================================================
 * EXPORTED CONFIGURATION
 * =========================================================
 */

export const BUSINESS_ANALYTICS_TRACKABLE_EVENTS =
  Object.freeze([
    ...TRACKABLE_EVENTS,
  ]);

export const BUSINESS_ANALYTICS_DEDUPLICATED_EVENTS =
  Object.freeze([
    ...DEDUPLICATED_EVENTS,
  ]);

export const BUSINESS_ANALYTICS_DEDUPLICATION_MINUTES =
  DEFAULT_DEDUPLICATION_MINUTES;