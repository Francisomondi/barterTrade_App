import express from "express";
import { createRating, getTradeRatings, getUserRatings,} from "../controllers/ratingController.js";
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post( "/trades/:tradeId", protect, createRating);
router.get("/trades/:tradeId", protect, getTradeRatings);
router.get("/users/:userId", protect, getUserRatings);

export default router;