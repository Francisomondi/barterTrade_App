import {
findMatchesForListing,
getUserMatches,
getMatchById,
deactivateMatch,
cleanupStaleMatches,
} from "../services/matchService.js";

/**

* GET /api/matches
*
* Get matches belonging to the authenticated user.
*
* Query parameters:
* ?minScore=50
* ?limit=20
  */
  export const getMatches = async (req, res) => {
  try {
  const userId = req.user.id;

  const minScore = Number(req.query.minScore || 0);
  const limit = Math.min(
  Math.max(Number(req.query.limit || 20), 1),
  100
  );

  if (Number.isNaN(minScore) || minScore < 0 || minScore > 100) {
  return res.status(400).json({
  success: false,
  message: "minScore must be between 0 and 100",
  });
  }

  let matches = await getUserMatches(userId);

  matches = matches
  .filter((match) => match.score >= minScore)
  .slice(0, limit);

  return res.status(200).json({
  success: true,
  count: matches.length,
  matches,
  });
  } catch (error) {
  console.error("GET MATCHES ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to retrieve matches",
  });
  }
  };

/**

* POST /api/matches/listing/:listingId
*
* Generate matches for one listing.
  */
  export const getMatchesForListing = async (req, res) => {
  try {
  const { listingId } = req.params;
  const userId = req.user.id;

  const minScore = Number(req.query.minScore || 0);
  const limit = Math.min(
  Math.max(Number(req.query.limit || 20), 1),
  100
  );

  if (Number.isNaN(minScore) || minScore < 0 || minScore > 100) {
  return res.status(400).json({
  success: false,
  message: "minScore must be between 0 and 100",
  });
  }

  const matches = await findMatchesForListing(
  listingId,
  userId
  );

  const filteredMatches = matches
  .filter((match) => match.score >= minScore)
  .slice(0, limit);

  return res.status(200).json({
  success: true,
  count: filteredMatches.length,
  matches: filteredMatches,
  });
  } catch (error) {
  console.error("GET LISTING MATCHES ERROR:", error);

  if (
  error.message === "Listing not found"
  ) {
  return res.status(404).json({
  success: false,
  message: error.message,
  });
  }

  if (
  error.message ===
  "You can only generate matches for your own listing" ||
  error.message ===
  "Only active listings can generate matches"
  ) {
  return res.status(403).json({
  success: false,
  message: error.message,
  });
  }

  return res.status(500).json({
  success: false,
  message: "Failed to generate listing matches",
  });
  }
  };

/**

* GET /api/matches/:id
*
* Get one match.
  */
  export const getMatchByIdController = async (req, res) => {
  try {
  const { id } = req.params;
  const userId = req.user.id;

  const match = await getMatchById(id);

  if (!match) {
  return res.status(404).json({
  success: false,
  message: "Match not found",
  });
  }

  const isParticipant =
  match.userId === userId ||
  match.listingA.userId === userId ||
  match.listingB.userId === userId;

  if (!isParticipant) {
  return res.status(403).json({
  success: false,
  message: "You are not authorized to view this match",
  });
  }

  return res.status(200).json({
  success: true,
  match,
  });
  } catch (error) {
  console.error("GET MATCH ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to retrieve match",
  });
  }
  };

/**

* PATCH /api/matches/:id/deactivate
*
* Deactivate a match.
  */
  export const deactivateMatchController = async (req, res) => {
  try {
  const { id } = req.params;
  const userId = req.user.id;

  const match = await getMatchById(id);

  if (!match) {
  return res.status(404).json({
  success: false,
  message: "Match not found",
  });
  }

  const isParticipant =
  match.userId === userId ||
  match.listingA.userId === userId ||
  match.listingB.userId === userId;

  if (!isParticipant) {
  return res.status(403).json({
  success: false,
  message: "You are not authorized to deactivate this match",
  });
  }

  const updatedMatch = await deactivateMatch(id);

  return res.status(200).json({
  success: true,
  message: "Match deactivated successfully",
  match: updatedMatch,
  });
  } catch (error) {
  console.error("DEACTIVATE MATCH ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to deactivate match",
  });
  }
  };


  /**

* PATCH /api/matches/cleanup
*
* Deactivate matches whose listings are no longer ACTIVE.
  */
  export const cleanupMatches = async (req, res) => {
  try {
  const count = await cleanupStaleMatches();

  return res.status(200).json({
  success: true,
  message: "Stale matches cleaned up successfully",
  deactivatedCount: count,
  });
  } catch (error) {
  console.error("CLEANUP MATCHES ERROR:", error);

  return res.status(500).json({
  success: false,
  message: "Failed to clean up stale matches",
  });
  }
  };

