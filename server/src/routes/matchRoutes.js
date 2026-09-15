import express from "express";

import {
getMatches,
getMatchesForListing,
getMatchByIdController,
deactivateMatchController,
cleanupMatches,
} from "../controllers/matchController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**

* GET /api/matches
*
* Get authenticated user's matches.
*
* Examples:
* /api/matches
* /api/matches?minScore=65
* /api/matches?minScore=50&limit=10
  */
  router.get("/", protect, getMatches);

/**

* POST /api/matches/listing/:listingId
*
* Generate/update matches for a listing.
*
* Examples:
* /api/matches/listing/123
* /api/matches/listing/123?minScore=65
* /api/matches/listing/123?minScore=50&limit=10
  */
  router.post(
  "/listing/:listingId",
  protect,
  getMatchesForListing
  );


  router.patch(
    "/cleanup",
    protect,
    cleanupMatches
    );
/**

* GET /api/matches/:id
  */
  router.get(
  "/:id",
  protect,
  getMatchByIdController
  );

/**

* PATCH /api/matches/:id/deactivate
  */
  router.patch(
  "/:id/deactivate",
  protect,
  deactivateMatchController
  );

export default router;
