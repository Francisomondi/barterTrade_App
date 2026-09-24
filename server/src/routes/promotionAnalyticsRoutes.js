import express from "express";

import {
  recordPromotionView,
  recordPromotionClick,
  getAnalytics,
} from "../controllers/promotionAnalyticsController.js";

import {
  protect,
  optionalAuth,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * =========================================================
 * RECORD VIEW
 * =========================================================
 *
 * Public route.
 *
 * optionalAuth allows us to identify logged-in
 * users while still allowing anonymous visitors.
 */
router.post(
  "/:id/analytics/view",
  optionalAuth,
  recordPromotionView
);

/**
 * =========================================================
 * RECORD CLICK
 * =========================================================
 */
router.post(
  "/:id/analytics/click",
  optionalAuth,
  recordPromotionClick
);

/**
 * =========================================================
 * PROMOTION ANALYTICS DASHBOARD
 * =========================================================
 *
 * Private route.
 *
 * Only an authenticated promotion owner can
 * retrieve analytics.
 */
router.get(
  "/:id/analytics",
  protect,
  getAnalytics
);

export default router;