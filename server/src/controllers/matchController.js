import {
findMatchesForListing,
getUserMatches,
getMatchById,
} from "../services/matchService.js";

/**

* GENERATE MATCHES FOR A LISTING
*
* GET /api/matches/listing/:listingId
*
* Finds active listings that may be suitable
* barter matches for the specified listing.
  */
  export const generateMatchesForListing = async (req, res) => {
  try {
  const { listingId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
  return res.status(401).json({
  message: "Authentication required.",
  });
  }

  if (!listingId) {
  return res.status(400).json({
  message: "Listing ID is required.",
  });
  }

  const matches = await findMatchesForListing(
  listingId,
  userId
  );

  return res.status(200).json({
  message: "Matches generated successfully.",
  matches: matches || [],
  count: matches?.length || 0,
  });
  } catch (error) {
  console.error(
  "GENERATE MATCHES ERROR:",
  error
  );

  const message =
  error?.message ||
  "Unable to generate matches.";

  /*

  * Known business-rule errors should be returned
  * as client errors rather than 500 errors.
    */
    if (
    message.toLowerCase().includes("not found")
    ) {
    return res.status(404).json({
    message,
    });
    }

  if (
  message.toLowerCase().includes("active")
  ) {
  return res.status(400).json({
  message,
  });
  }

  if (
  message.toLowerCase().includes("owner") ||
  message.toLowerCase().includes("permission") ||
  message.toLowerCase().includes("authorized")
  ) {
  return res.status(403).json({
  message,
  });
  }

  return res.status(500).json({
  message: "Unable to generate matches.",
  });
  }
  };

/**

* GET USER MATCHES
*
* GET /api/matches
*
* Returns matches associated with the
* currently authenticated user.
  */
  export const getMyMatches = async (req, res) => {
  try {
  const userId = req.user?.id;

  if (!userId) {
  return res.status(401).json({
  message: "Authentication required.",
  });
  }

  const matches = await getUserMatches(userId);

  return res.status(200).json({
  message: "Matches loaded successfully.",
  matches: matches || [],
  count: matches?.length || 0,
  });
  } catch (error) {
  console.error(
  "GET USER MATCHES ERROR:",
  error
  );

  return res.status(500).json({
  message: "Unable to load your matches.",
  });
  }
  };

/**

* GET SINGLE MATCH
*
* GET /api/matches/:matchId
*
* Returns one match, provided that the
* authenticated user is allowed to access it.
  */
  export const getSingleMatch = async (req, res) => {
  try {
  const { matchId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
  return res.status(401).json({
  message: "Authentication required.",
  });
  }

  if (!matchId) {
  return res.status(400).json({
  message: "Match ID is required.",
  });
  }

  const match = await getMatchById(
  matchId,
  userId
  );

  if (!match) {
  return res.status(404).json({
  message: "Match not found.",
  });
  }

  return res.status(200).json({
  message: "Match loaded successfully.",
  match,
  });
  } catch (error) {
  console.error(
  "GET SINGLE MATCH ERROR:",
  error
  );

  const message =
  error?.message ||
  "Unable to load match.";

  if (
  message.toLowerCase().includes("not found")
  ) {
  return res.status(404).json({
  message,
  });
  }

  if (
  message.toLowerCase().includes("permission") ||
  message.toLowerCase().includes("authorized") ||
  message.toLowerCase().includes("access")
  ) {
  return res.status(403).json({
  message,
  });
  }

  return res.status(500).json({
  message: "Unable to load match.",
  });
  }
  };
