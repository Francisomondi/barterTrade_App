// CREATE — frontend/src/api/businessAnalytics.js

import api from "./axios";

/**
 * =========================================================
 * BUSINESS ANALYTICS EVENTS
 * =========================================================
 *
 * Only engagement events that originate from explicit
 * frontend user actions belong here.
 *
 * Passive views are NOT sent from the frontend.
 *
 * STOREFRONT_VIEW:
 *   tracked by GET /business/:slug
 *
 * LISTING_VIEW:
 *   tracked by GET /listings/:id
 */

export const BUSINESS_ANALYTICS_EVENTS =
  Object.freeze({
    CONTACT_CLICK:
      "CONTACT_CLICK",

    WEBSITE_CLICK:
      "WEBSITE_CLICK",

    PHONE_CLICK:
      "PHONE_CLICK",

    LISTING_SHARE:
      "LISTING_SHARE",
  });

/**
 * Events the public analytics endpoint accepts.
 */
const ALLOWED_EVENTS =
  new Set(
    Object.values(
      BUSINESS_ANALYTICS_EVENTS
    )
  );

/**
 * =========================================================
 * TRACK BUSINESS EVENT
 * =========================================================
 *
 * POST
 * /api/business/:slug/analytics/event
 *
 * Analytics are deliberately best-effort.
 *
 * A user clicking:
 *
 * - phone
 * - website
 * - contact
 * - share
 *
 * should NEVER be prevented from performing the action
 * because analytics failed.
 */
export const trackBusinessEvent = async ({
  slug,
  type,
  listingId = null,
  metadata = null,
}) => {
  /**
   * Invalid local analytics input should simply
   * not generate a request.
   */
  if (
    !slug ||
    typeof slug !== "string"
  ) {
    return {
      success: false,
      tracked: false,
      reason:
        "INVALID_BUSINESS_SLUG",
    };
  }

  if (!ALLOWED_EVENTS.has(type)) {
    return {
      success: false,
      tracked: false,
      reason:
        "INVALID_ANALYTICS_EVENT",
    };
  }

  try {
    const response =
      await api.post(
        `/business/${encodeURIComponent(
          slug
        )}/analytics/event`,
        {
          type,

          ...(listingId
            ? {
                listingId,
              }
            : {}),

          ...(metadata
            ? {
                metadata,
              }
            : {}),
        }
      );

    return response.data;
  } catch (error) {
    /**
     * =====================================================
     * FAIL OPEN
     * =====================================================
     *
     * Analytics should never interfere with the actual
     * marketplace action.
     *
     * Therefore this function does NOT throw.
     */
    if (
      import.meta.env.DEV
    ) {
      console.warn(
        "Business analytics event was not recorded:",
        {
          type,
          slug,
          listingId,

          status:
            error?.response
              ?.status,

          message:
            error?.response
              ?.data
              ?.message ||
            error?.message,
        }
      );
    }

    return {
      success: false,
      tracked: false,
      reason:
        "ANALYTICS_REQUEST_FAILED",
    };
  }
};

/**
 * =========================================================
 * CONTACT CLICK
 * =========================================================
 */

export const trackContactClick = ({
  slug,
  listingId = null,
  source =
    "BUSINESS_STOREFRONT",
}) =>
  trackBusinessEvent({
    slug,

    type:
      BUSINESS_ANALYTICS_EVENTS
        .CONTACT_CLICK,

    listingId,

    metadata: {
      source,
    },
  });

/**
 * =========================================================
 * PHONE CLICK
 * =========================================================
 */

export const trackPhoneClick = ({
  slug,
  listingId = null,
  source =
    "BUSINESS_STOREFRONT",
}) =>
  trackBusinessEvent({
    slug,

    type:
      BUSINESS_ANALYTICS_EVENTS
        .PHONE_CLICK,

    listingId,

    metadata: {
      source,
    },
  });

/**
 * =========================================================
 * WEBSITE CLICK
 * =========================================================
 */

export const trackWebsiteClick = ({
  slug,
  listingId = null,
  source =
    "BUSINESS_STOREFRONT",
}) =>
  trackBusinessEvent({
    slug,

    type:
      BUSINESS_ANALYTICS_EVENTS
        .WEBSITE_CLICK,

    listingId,

    metadata: {
      source,
    },
  });

/**
 * =========================================================
 * LISTING SHARE
 * =========================================================
 */

export const trackListingShare = ({
  slug,
  listingId,
  source =
    "LISTING_DETAILS",
}) =>
  trackBusinessEvent({
    slug,

    type:
      BUSINESS_ANALYTICS_EVENTS
        .LISTING_SHARE,

    listingId,

    metadata: {
      source,
    },
  });