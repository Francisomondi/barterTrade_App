import express from "express";

import {
  createBusinessProfile,
  getMyBusinessProfile,
  getPublicBusinessProfile,
  getPublicBusinessListings,
  updateMyBusinessProfile,
  updateMyBusinessStatus,

  uploadBusinessLogo,
  deleteBusinessLogo,
  uploadBusinessCover,
  deleteBusinessCover,
} from "../controllers/businessController.js";

import {
  getMyBusinessStorefrontEntitlement,
} from "../controllers/businessStorefrontController.js";

import {
  getMyBusinessStorefrontBranding,
  updateMyBusinessStorefrontBranding,
} from "../controllers/businessStorefrontBrandingController.js";

import {
  getMyBusinessAnalytics,
  getMyBusinessAnalyticsOverview,
  getMyBusinessListingAnalytics,
  getMyBusinessTopListingPerformance,
  getMyBusinessOfferAnalytics,
  getMyBusinessTradeAnalytics,
  getMyBusinessThirtyDayPerformance,
  getMyBusinessPromotionAnalytics,
  getMyBusinessAnalyticsEntitlement,
  getMyBusinessConversionIntelligence,
  getMyBusinessDemandIntelligence,
  getMyBusinessCategoryBenchmarks,
  getMyBusinessGrowthRecommendations,
  getMyBusinessAdvancedPromotionAnalytics,
} from "../controllers/businessAnalyticsController.js";

import {
  generateMyBusinessReport,
  getMyBusinessReportAccess,
} from "../controllers/businessReportController.js";

import {
  trackPublicBusinessEvent,
} from "../controllers/businessAnalyticsTrackingController.js";

import upload from "../middleware/upload.js";

import {
  protect,
  optionalAuth,
} from "../middleware/authMiddleware.js";

import {
  analyticsVisitor,
} from "../middleware/analyticsVisitor.js";
import {
  getMyBusinessFeaturedListings,
  addMyBusinessFeaturedListing,
  removeMyBusinessFeaturedListing,
  reorderMyBusinessFeaturedListings,
  getMyBusinessFeaturedListingSummary,
} from "../controllers/businessFeaturedListingsController.js";

const router = express.Router();

/**
 * =========================================================
 * PRIVATE BUSINESS OWNER ROUTES
 * =========================================================
 *
 * IMPORTANT:
 *
 * Keep /me routes ABOVE dynamic /:slug routes.
 */

router.get(
  "/me",
  protect,
  getMyBusinessProfile
);

router.post(
  "/",
  protect,
  createBusinessProfile
);

router.patch(
  "/me",
  protect,
  updateMyBusinessProfile
);

router.patch(
  "/me/status",
  protect,
  updateMyBusinessStatus
);

/**
 * =========================================================
 * BUSINESS LOGO
 * =========================================================
 */

router.patch(
  "/me/logo",
  protect,
  upload.single("logo"),
  uploadBusinessLogo
);

router.delete(
  "/me/logo",
  protect,
  deleteBusinessLogo
);

/**
 * =========================================================
 * BUSINESS COVER
 * =========================================================
 */

router.patch(
  "/me/cover",
  protect,
  upload.single("cover"),
  uploadBusinessCover
);

router.delete(
  "/me/cover",
  protect,
  deleteBusinessCover
);

router.get(
  "/me/storefront/entitlement",
  protect,
  getMyBusinessStorefrontEntitlement
);

router.get(
  "/me/storefront/branding",
  protect,
  getMyBusinessStorefrontBranding
);

router.patch(
  "/me/storefront/branding",
  protect,
  updateMyBusinessStorefrontBranding
);
router.get(
  "/me/storefront/featured-listings",
  protect,
  getMyBusinessFeaturedListings
);

/*
 * GET FEATURED LISTINGS SUMMARY
 */
router.get(
  "/me/storefront/featured-listings/summary",
  protect,
  getMyBusinessFeaturedListingSummary
);

/*
 * ADD FEATURED LISTING
 */
router.post(
  "/me/storefront/featured-listings",
  protect,
  addMyBusinessFeaturedListing
);

/*
 * REORDER FEATURED LISTINGS
 */
router.patch(
  "/me/storefront/featured-listings/reorder",
  protect,
  reorderMyBusinessFeaturedListings
);

/*
 * REMOVE FEATURED LISTING
 */
router.delete(
  "/me/storefront/featured-listings/:listingId",
  protect,
  removeMyBusinessFeaturedListing
);

/**
 * =========================================================
 * BUSINESS ANALYTICS
 * =========================================================
 */

router.get(
  "/me/analytics",
  protect,
  getMyBusinessAnalytics
);

router.get(
  "/me/analytics/entitlement",
  protect,
  getMyBusinessAnalyticsEntitlement
);

router.get(
  "/me/analytics/overview",
  protect,
  getMyBusinessAnalyticsOverview
);

router.get(
  "/me/analytics/listings",
  protect,
  getMyBusinessListingAnalytics
);

/**
 * =========================================================
 * BUSINESS FREE — BASIC PROMOTION ANALYTICS
 * =========================================================
 *
 * GET /api/business/me/analytics/promotions
 *
 * Available to:
 *
 * - Business Free
 * - Business Pro
 *
 * Provides the existing basic promotion analytics:
 *
 * - promotion views
 * - promotion clicks
 * - click-through rate
 * - promotion spend
 * - top promotion performance
 *
 * This route MUST remain available to Business Free.
 */

router.get(
  "/me/analytics/promotions",
  protect,
  getMyBusinessPromotionAnalytics
);

/**
 * =========================================================
 * BUSINESS PRO — ADVANCED PROMOTION ANALYTICS
 * =========================================================
 *
 * GET /api/business/me/analytics/promotions/advanced
 *
 * Authentication:
 *   Required.
 *
 * Business Free:
 *   Receives a locked Business Pro feature preview.
 *
 * Business Pro:
 *   Receives full Advanced Promotion Analytics.
 *
 * Advanced analytics include:
 *
 * - promotion performance intelligence
 * - promotion traffic analysis
 * - promotion engagement analysis
 * - observed promotion uplift
 * - cost-efficiency metrics
 * - promotion outcome analysis
 * - best-performing promotions
 * - underperforming promotions
 * - promotion recommendations
 * - historical promotion trends
 *
 * IMPORTANT:
 *
 * The controller resolves:
 *
 * - authenticated business ownership
 * - Business Pro entitlement
 * - historical range access
 *
 * server-side.
 *
 * Client-supplied tier/business flags cannot unlock this route.
 */

router.get(
  "/me/analytics/promotions/advanced",
  protect,
  getMyBusinessAdvancedPromotionAnalytics
);

router.get(
  "/me/analytics/offers",
  protect,
  getMyBusinessOfferAnalytics
);

router.get(
  "/me/analytics/trades",
  protect,
  getMyBusinessTradeAnalytics
);

router.get(
  "/me/analytics/performance",
  protect,
  getMyBusinessThirtyDayPerformance
);

router.get(
  "/me/analytics/conversions",
  protect,
  getMyBusinessConversionIntelligence
);


router.get(
  "/me/analytics/demand",
  protect,
  getMyBusinessDemandIntelligence
);

/**
 * =========================================================
 * BUSINESS PRO — CATEGORY BENCHMARKS
 * =========================================================
 */

router.get(
  "/me/analytics/category-benchmarks",
  protect,
  getMyBusinessCategoryBenchmarks
);

/**
 * =========================================================
 * BUSINESS PRO — GROWTH RECOMMENDATIONS
 * =========================================================
 */

router.get(
  "/me/analytics/growth-recommendations",
  protect,
  getMyBusinessGrowthRecommendations
);

/**
 * =========================================================
 * BUSINESS TOP LISTINGS
 * =========================================================
 */

router.get(
  "/me/analytics/top-listings",
  protect,
  getMyBusinessTopListingPerformance
);


router.get(
  "/me/reports",
  protect,
  getMyBusinessReportAccess
);
router.get(
  "/me/reports/:reportType",
  protect,
  generateMyBusinessReport
);

router.post(
  "/:slug/analytics/event",
  optionalAuth,
  analyticsVisitor,
  trackPublicBusinessEvent
);

router.get(
  "/:slug/listings",
  optionalAuth,
  analyticsVisitor,
  getPublicBusinessListings
);

/**
 * =========================================================
 * PUBLIC BUSINESS STOREFRONT
 * =========================================================
 *
 * STOREFRONT_VIEW is recorded after the ACTIVE business
 * has successfully been found by the controller.
 */

router.get(
  "/:slug",
  optionalAuth,
  analyticsVisitor,
  getPublicBusinessProfile
);

export default router;