import api from "./axios";

export const getTrades = async () => {
const response = await api.get("/trades");
return response.data;
};

export const getTradeById = async (tradeId) => {
const response = await api.get(`/trades/${tradeId}`);
return response.data;
};

export const confirmTrade = async (tradeId) => {
const response = await api.patch(
`/trades/${tradeId}/confirm`
);

return response.data;
};

export const updateTradeStatus = async (
tradeId,
status
) => {
const response = await api.patch(
`/trades/${tradeId}/status`,
{
status,
}
);

return response.data;
};

export const completeTrade = async (tradeId) => {
const response = await api.patch(
`/trades/${tradeId}/complete`
);

return response.data;
};


/**
 * Create verification records for a trade
 */
export const createTradeVerifications = (tradeId) => {
  return api.post(`/trades/${tradeId}/verifications`);
};

/**
 * Get both traders' verification records
 */
export const getTradeVerifications = (tradeId) => {
  return api.get(`/trades/${tradeId}/verifications`);
};

/**
 * Get the logged-in user's verification record
 */
export const getMyTradeVerification = (tradeId) => {
  return api.get(`/trades/${tradeId}/verifications/me`);
};

/**
 * Verify the logged-in user's item
 */
export const verifyTradeItem = (tradeId, data = {}) => {
  return api.patch(
    `/trades/${tradeId}/verifications/verify`,
    data
  );
};

/**
 * Reject the logged-in user's item verification
 */
export const rejectTradeVerification = (
  tradeId,
  data = {}
) => {
  return api.patch(
    `/trades/${tradeId}/verifications/reject`,
    data
  );
};


