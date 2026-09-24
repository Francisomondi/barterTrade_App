import express from "express";

import {
  getPromotionPlans,
  createPromotion,
  getMyPromotions,
  getPromotion,
  payForPromotion,
  getPromotionPaymentStatus,
} from "../controllers/promotionController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * =========================================================
 * PUBLIC ROUTES
 * =========================================================
 */

/**
 * Get available promotion plans.
 */
router.get("/plans", getPromotionPlans);

/**
 * =========================================================
 * PROTECTED ROUTES
 * =========================================================
 */

router.use(protect);

/**
 * Create or reuse a promotion.
 */
router.post("/", createPromotion);

/**
 * Get current user's promotions.
 */
router.get("/my", getMyPromotions);

/**
 * Check M-PESA promotion payment status.
 *
 * IMPORTANT:
 * Keep this before /:id.
 */
router.get(
  "/payments/:paymentId/status",
  getPromotionPaymentStatus
);

/**
 * Initiate M-PESA payment.
 */
router.post("/:id/pay", payForPromotion);

/**
 * Get single promotion.
 *
 * Keep dynamic /:id last.
 */
router.get("/:id", getPromotion);

export default router;