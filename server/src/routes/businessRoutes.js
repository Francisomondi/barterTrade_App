import express from "express";
import {
  createBusinessProfile,
  getMyBusinessProfile,
  getPublicBusinessProfile,
  getPublicBusinessListings,
  updateMyBusinessProfile,
  updateMyBusinessStatus,

  uploadBusinessLogo,
  deleteBusinessLogo,
  uploadBusinessCover,
  deleteBusinessCover,
} from "../controllers/businessController.js";
import upload from "../middleware/upload.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


router.get("/me", protect, getMyBusinessProfile);
router.post("/", protect, createBusinessProfile);
router.patch("/me",protect,updateMyBusinessProfile);
router.patch("/me/status", protect, updateMyBusinessStatus);
/*
 * ============================================================
 * BUSINESS LOGO
 * ============================================================
 */

router.patch("/me/logo", protect, upload.single("logo"), uploadBusinessLogo);
router.delete("/me/logo", protect, deleteBusinessLogo);
/*
 * ============================================================
 * BUSINESS COVER
 * ============================================================
 */

router.patch( "/me/cover", protect, upload.single("cover"), uploadBusinessCover);
router.delete("/me/cover", protect, deleteBusinessCover);
router.get( "/:slug/listings", getPublicBusinessListings);
router.get( "/:slug", getPublicBusinessProfile);



export default router;