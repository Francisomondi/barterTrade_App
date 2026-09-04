import express from "express";

import {
  getTrades,
  getTradeById,
  updateTradeStatus,
  completeTrade,
} from "../controllers/tradeController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * All trade routes require authentication
 */
router.use(protect);

/**
 * GET /api/trades
 * Get all trades belonging to the logged-in user
 */
router.get("/", getTrades);

/**
 * GET /api/trades/:id
 * Get a single trade
 */
router.get("/:id", getTradeById);

/**
 * PATCH /api/trades/:id/status
 * Update trade status
 */
router.patch("/:id/status", updateTradeStatus);

/**
 * PATCH /api/trades/:id/complete
 * Complete an in-progress trade
 */
router.patch("/:id/complete", completeTrade);

export default router;

