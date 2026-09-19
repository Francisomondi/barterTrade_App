import express from "express";

import { createDispute, getTradeDispute,} from "../controllers/disputeController.js";
import { protect } from "../middleware/authMiddleware.js";



const router = express.Router();

router.post("/trades/:tradeId", protect, createDispute);
router.get("/trades/:tradeId", protect, getTradeDispute);

export default router;