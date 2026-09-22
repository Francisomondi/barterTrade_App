
import api from "./axios";

/**
 * Create verification records for both traders.
 */
export const createVerifications = async (tradeId) => {
  const response = await api.post(
    `/trades/${tradeId}/verifications`
  );

  return response.data;
};

/**
 * Get both traders' verification records.
 */
export const getVerifications = async (tradeId) => {
  const response = await api.get(
    `/trades/${tradeId}/verifications`
  );

  return response.data;
};

/**
 * Get the current user's verification record.
 */
export const getMyVerification = async (tradeId) => {
  const response = await api.get(
    `/trades/${tradeId}/verifications/me`
  );

  return response.data;
};

/**
 * Verify the current user's item.
 */
export const verifyItem = async (
  tradeId,
  notes = "",
  documentUrl = ""
) => {
  const response = await api.patch(
    `/trades/${tradeId}/verifications/verify`,
    {
      notes,
      documentUrl,
    }
  );

  return response.data;
};

/**
 * Reject the current user's item verification.
 */
export const rejectItem = async (
  tradeId,
  notes = ""
) => {
  const response = await api.patch(
    `/trades/${tradeId}/verifications/reject`,
    {
      notes,
    }
  );

  return response.data;
};
