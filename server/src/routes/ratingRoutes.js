import express from "express";

import {
  createRating,
  getTradeRatings,
  getUserRatings,
} from "../controllers/ratingController.js";

// Use the SAME auth middleware/import used by your trade routes.
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/trades/:tradeId",
  authMiddleware,
  createRating
);

router.get(
  "/trades/:tradeId",
  authMiddleware,
  getTradeRatings
);

router.get(
  "/users/:userId",
  authMiddleware,
  getUserRatings
);

export default router;