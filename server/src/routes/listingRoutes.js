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
  reorderListingImages,
  getHomepagePromotedListings,
} from "../controllers/listingController.js";

import {
  protect,
  optionalAuth,
} from "../middleware/authMiddleware.js";

import {
  analyticsVisitor,
} from "../middleware/analyticsVisitor.js";

import upload from "../middleware/upload.js";

const router = express.Router();

/**
 * =========================================================
 * GET ALL LISTINGS
 * =========================================================
 *
 * Marketplace browsing itself does not count as a
 * LISTING_VIEW.
 *
 * A view is recorded only when the visitor opens the
 * individual listing.
 */

router.get(
  "/",
  getListings
);

/**
 * =========================================================
 * CREATE LISTING
 * =========================================================
 */

router.post(
  "/",
  protect,
  upload.array("images", 8),
  createListing
);

/**
 * =========================================================
 * LISTING IMAGE MANAGEMENT
 * =========================================================
 */

router.patch(
  "/:id/images/:imageId/primary",
  protect,
  setPrimaryListingImage
);

router.post(
  "/:id/images",
  protect,
  upload.array("images", 8),
  addListingImages
);

router.delete(
  "/:id/images/:imageId",
  protect,
  deleteListingImage
);

router.patch(
  "/:id/images/reorder",
  protect,
  reorderListingImages
);

/**
 * =========================================================
 * HOMEPAGE PROMOTED LISTINGS
 * =========================================================
 *
 * IMPORTANT:
 *
 * This route must remain ABOVE /:id.
 *
 * Otherwise Express could interpret:
 *
 * "homepage-promoted"
 *
 * as a listing ID.
 */

router.get(
  "/homepage-promoted",
  getHomepagePromotedListings
);

/**
 * =========================================================
 * CURRENT USER'S LISTINGS
 * =========================================================
 *
 * This route must also remain ABOVE /:id.
 */

router.get(
  "/user/me",
  protect,
  getMyListings
);

/**
 * =========================================================
 * GET LISTING BY ID
 * =========================================================
 *
 * Public route.
 *
 * optionalAuth:
 *
 * - Logged-in visitor → req.user
 * - Anonymous visitor → req.user = null
 *
 * analyticsVisitor:
 *
 * Creates:
 *
 * req.analyticsVisitor = {
 *   visitorUserId,
 *   visitorKey,
 *   sessionKey
 * }
 *
 * getListingById will use this information to record
 * LISTING_VIEW for ACTIVE business listings.
 */

router.get(
  "/:id",
  optionalAuth,
  analyticsVisitor,
  getListingById
);

/**
 * =========================================================
 * REMOVE LISTING
 * =========================================================
 */

router.delete(
  "/:id",
  protect,
  removeListing
);

export default router;