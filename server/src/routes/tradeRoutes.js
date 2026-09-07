import express from "express";

import {
  getTrades,
  getTradeById,
  confirmTrade,
  updateTradeStatus,
  completeTrade,
} from "../controllers/tradeController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getTrades);

router.get("/:id", getTradeById);

router.patch("/:id/confirm", confirmTrade);

router.patch("/:id/status", updateTradeStatus);

router.patch("/:id/complete", completeTrade);

export default router;
