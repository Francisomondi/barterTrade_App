
import api from "./axios";

/**
 * Submit a rating for the other trader.
 *
 * POST /api/ratings/trades/:tradeId
 */
export const createRating = async (
  tradeId,
  rating,
  comment = ""
) => {
  const response = await api.post(
    `/ratings/trades/${tradeId}`,
    {
      rating,
      comment,
    }
  );

  return response.data;
};

/**
 * Get ratings belonging to a completed trade.
 */
export const getTradeRatings = async (
  tradeId
) => {
  const response = await api.get(
    `/ratings/trades/${tradeId}`
  );

  return response.data;
};

/**
 * Get a user's reputation and received ratings.
 */
export const getUserRatings = async (
  userId
) => {
  const response = await api.get(
    `/ratings/users/${userId}`
  );

  return response.data;
};

