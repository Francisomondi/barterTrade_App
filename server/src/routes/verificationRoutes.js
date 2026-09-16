
import express from "express";

import {
  createVerifications,
  getVerifications,
  getMyVerification,
  verifyItem,
  rejectItem,
} from "../controllers/verificationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * All verification endpoints require authentication.
 */
router.use(protect);

/**
 * Initialize verification records.
 */
router.post(
  "/:tradeId/verifications",
  createVerifications
);

/**
 * Get all verification records for a trade.
 */
router.get(
  "/:tradeId/verifications",
  getVerifications
);

/**
 * Get the authenticated user's verification.
 */
router.get(
  "/:tradeId/verifications/me",
  getMyVerification
);

/**
 * Verify the authenticated user's item.
 */
router.patch(
  "/:tradeId/verifications/verify",
  verifyItem
);

/**
 * Reject the authenticated user's verification.
 */
router.patch(
  "/:tradeId/verifications/reject",
  rejectItem
);

export default router;

