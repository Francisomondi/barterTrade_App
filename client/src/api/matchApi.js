import api from "./axios";

/**

* Get authenticated user's matches.
*
* Optional:
* {
* minScore: 65,
* limit: 20
* }
  */
  export const getMatches = async (params = {}) => {
  const response = await api.get("/matches", {
  params,
  });

return response.data;
};

/**

* Generate/update matches for a listing.
*
* Optional:
* {
* minScore: 50,
* limit: 20
* }
  */
  export const generateMatchesForListing = async (
  listingId,
  params = {}
  ) => {
  const response = await api.post(
  `/matches/listing/${listingId}`,
  null,
  {
  params,
  }
  );

return response.data;
};

/**

* Get a single match.
  */
  export const getMatchById = async (matchId) => {
  const response = await api.get(`/matches/${matchId}`);

return response.data;
};

/**

* Deactivate a match.
  */
  export const deactivateMatch = async (matchId) => {
  const response = await api.patch(
  `/matches/${matchId}/deactivate`
  );

return response.data;
};
