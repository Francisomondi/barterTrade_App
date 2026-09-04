
import express from "express";
import {createOffer,getSentOffers,getReceivedOffers,acceptOffer,rejectOffer,cancelOffer, getOffer} from "../controllers/offerController.js";
import {protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| OFFER ROUTES
|--------------------------------------------------------------------------
*/

// Create offer
router.post("/",protect, createOffer);

// Sent offers
router.get("/sent",protect,getSentOffers);

// Received offers
router.get("/received",protect,getReceivedOffers);

// Single offer
router.get("/:id",protect,getOffer);

// Accept
router.patch( "/:id/accept",protect,acceptOffer);

// Reject
router.patch( "/:id/reject",protect,rejectOffer);

// Cancel
router.patch("/:id/cancel",protect,cancelOffer);

export default router;

