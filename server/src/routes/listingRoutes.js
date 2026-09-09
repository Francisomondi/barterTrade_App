import express from "express";
import { createListing, getListings, getListingById, getMyListings, removeListing} from "../controllers/listingController.js";
import {protect} from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", getListings);
router.post( "/", protect,upload.array("images", 8), createListing);
router.get( "/user/me", protect, getMyListings);
router.get( "/:id", getListingById);
router.delete("/:id", protect, removeListing);

export default router;