
import express from "express";

import {
  getTrades,
  getTradeById,
  confirmTrade,
  updateTradeStatus,
  completeTrade,
} from "../controllers/tradeController.js";

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
 * All trade routes require authentication.
 */
router.use(protect);

/**
 * TRADE ROUTES
 */
router.get("/", getTrades);

router.get("/:id", getTradeById);

router.patch("/:id/confirm", confirmTrade);

router.patch("/:id/status", updateTradeStatus);

router.patch("/:id/complete", completeTrade);

/**
 * VERIFICATION ROUTES
 */

/**
 * Create verification records
 */
router.post("/:tradeId/verifications", createVerifications);
router.get("/:tradeId/verifications",getVerifications);
router.get( "/:tradeId/verifications/me", getMyVerification);
router.patch("/:tradeId/verifications/verify",verifyItem);
router.patch("/:tradeId/verifications/reject", rejectItem);

export default router;

