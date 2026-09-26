// CREATE — server/src/routes/userRoutes.js

import express from "express";

import {
  getPublicUserProfile,
} from "../controllers/userController.js";

const router = express.Router();

/*
 * ============================================================
 * PUBLIC USER PROFILE
 * ============================================================
 *
 * No protect middleware.
 *
 * Personal marketplace profiles must be accessible to other
 * users without requiring them to own the profile.
 * ============================================================
 */

router.get(
  "/:userId/public-profile",
  getPublicUserProfile
);

export default router;