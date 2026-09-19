import express from "express";

import { createDispute, getTradeDispute,getAdminDisputes, updateDispute, applyDisputeOutcome,} from "../controllers/disputeController.js";
import { protect } from "../middleware/authMiddleware.js";



const router = express.Router();

router.post("/trades/:tradeId", protect, createDispute);
router.get("/trades/:tradeId", protect, getTradeDispute);
router.get( "/admin",protect,getAdminDisputes);
router.patch("/admin/:disputeId", protect,updateDispute);
router.patch("/admin/:disputeId/outcome",protect,applyDisputeOutcome);

export default router;