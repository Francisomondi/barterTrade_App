import express from "express";

import {
  getPremiumAnalytics,
} from "../controllers/premiumAnalyticsController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

import {
  requirePremium,
} from "../middleware/premiumMiddleware.js";

const router =
  express.Router();

router.use(protect);

router.get(
  "/",
  requirePremium,
  getPremiumAnalytics
);

export default router;