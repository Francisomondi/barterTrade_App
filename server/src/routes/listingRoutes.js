import express from "express";

import {
createListing,
getListings,
getListingById,
getMyListings,
removeListing,
deleteListingImage,
addListingImages,
setPrimaryListingImage,
} from "../controllers/listingController.js";

import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Get all listings
router.get("/", getListings);

// Create listing with up to 8 images
router.post("/",protect,upload.array("images", 8),createListing);

// Get current user's listings
router.get("/user/me",protect,getMyListings);

router.patch("/:id/images/:imageId/primary",protect,setPrimaryListingImage);


// Add more images to an existing listing
router.post("/:id/images",protect,upload.array("images", 8),addListingImages);

// Delete a specific image from a listing
router.delete("/:id/images/:imageId", protect, deleteListingImage, );

// Get listing by ID
router.get("/:id", getListingById);

// Delete/remove listing
router.delete("/:id",protect,removeListing);

export default router;
