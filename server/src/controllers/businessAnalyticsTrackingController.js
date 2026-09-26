import prisma from "../config/prisma.js";

import {
  trackBusinessEngagement,
} from "../services/businessAnalyticsTrackingService.js";

/**
 * =========================================================
 * PUBLIC BUSINESS ANALYTICS EVENTS
 * =========================================================
 *
 * These events may be submitted by the frontend.
 *
 * LISTING_VIEW and STOREFRONT_VIEW are NOT accepted here.
 * Those will be tracked server-side when their respective
 * resources are successfully loaded.
 */
const PUBLIC_ENGAGEMENT_EVENTS = new Set([
  "CONTACT_CLICK",
  "WEBSITE_CLICK",
  "PHONE_CLICK",
  "LISTING_SHARE",
]);

/**
 * =========================================================
 * TRACK PUBLIC BUSINESS ENGAGEMENT EVENT
 * =========================================================
 *
 * POST /api/business/:slug/analytics/event
 *
 * Public route.
 *
 * optionalAuth + analyticsVisitor should run before this
 * controller.
 *
 * Expected body:
 *
 * {
 *   type: "PHONE_CLICK",
 *   listingId: null,
 *   metadata: {
 *     source: "BUSINESS_STOREFRONT"
 *   }
 * }
 *
 * IMPORTANT:
 *
 * The client is NOT allowed to provide:
 *
 * - businessId
 * - businessUserId
 * - visitorUserId
 * - visitorKey
 * - sessionKey
 *
 * Those values are determined by the server.
 */
export const trackPublicBusinessEvent = async (
  req,
  res
) => {
  try {
    const { slug } = req.params;

    const {
      type,
      listingId = null,
      metadata = null,
    } = req.body || {};

    /**
     * -------------------------------------------------------
     * VALIDATE SLUG
     * -------------------------------------------------------
     */
    if (
      !slug ||
      typeof slug !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Business slug is required.",
      });
    }

    /**
     * -------------------------------------------------------
     * VALIDATE EVENT TYPE
     * -------------------------------------------------------
     */
    if (
      !type ||
      !PUBLIC_ENGAGEMENT_EVENTS.has(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid business analytics event type.",
      });
    }

    /**
     * -------------------------------------------------------
     * FIND ACTIVE BUSINESS
     * -------------------------------------------------------
     *
     * Never trust a business ID supplied by the frontend.
     *
     * The business is resolved from the public slug.
     */
    const business =
      await prisma.businessProfile.findUnique({
        where: {
          slug,
        },

        select: {
          id: true,
          userId: true,
          status: true,
        },
      });

    if (
      !business ||
      business.status !== "ACTIVE"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Business not found.",
      });
    }

    /**
     * -------------------------------------------------------
     * VALIDATE LISTING OWNERSHIP
     * -------------------------------------------------------
     *
     * listingId is optional because:
     *
     * PHONE_CLICK
     * WEBSITE_CLICK
     * CONTACT_CLICK
     *
     * may originate directly from the storefront.
     *
     * However, if listingId is supplied, the server verifies
     * that the listing actually belongs to this business user.
     */
    if (listingId) {
      if (
        typeof listingId !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid listing ID.",
        });
      }

      const listing =
        await prisma.listing.findFirst({
          where: {
            id: listingId,
            userId:
              business.userId,
          },

          select: {
            id: true,
          },
        });

      if (!listing) {
        return res.status(400).json({
          success: false,
          message:
            "Listing does not belong to this business.",
        });
      }
    }

    /**
     * -------------------------------------------------------
     * ANALYTICS VISITOR
     * -------------------------------------------------------
     *
     * These values were created by analyticsVisitor.
     *
     * Never accept these values directly from req.body.
     */
    const visitorUserId =
      req.analyticsVisitor
        ?.visitorUserId || null;

    const visitorKey =
      req.analyticsVisitor
        ?.visitorKey || null;

    const sessionKey =
      req.analyticsVisitor
        ?.sessionKey || null;

    /**
     * -------------------------------------------------------
     * RECORD EVENT
     * -------------------------------------------------------
     */
    const result =
      await trackBusinessEngagement({
        businessId:
          business.id,

        businessUserId:
          business.userId,

        listingId,

        visitorUserId,
        visitorKey,
        sessionKey,

        type,
        metadata,
      });

    /**
     * -------------------------------------------------------
     * RESPONSE
     * -------------------------------------------------------
     *
     * 202 is appropriate because this endpoint represents
     * analytics/event collection rather than a marketplace
     * resource the user needs immediately.
     *
     * We intentionally do not expose internal analytics
     * information such as visitorKey/sessionKey.
     */
    return res.status(202).json({
      success: true,
      tracked:
        result.tracked,
    });
  } catch (error) {
    console.error(
      "Track public business analytics event error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to record analytics event.",
    });
  }
};