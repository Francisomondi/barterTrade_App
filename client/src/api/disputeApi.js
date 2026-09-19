
import api from "./axios";

/**
 * USER
 */

export const createDispute = async (tradeId, reason,description) => {
  const response = await api.post( `/disputes/trades/${tradeId}`,
    {
      reason,
      description,
    }
  );

  return response.data;
};

export const getTradeDispute = async (tradeId) => {
  const response = await api.get(
    `/disputes/trades/${tradeId}`
  );

  return response.data;
};


/**
 * ADMIN
 */

export const getAdminDisputes = async ( status = "") => {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  const response = await api.get(
    `/disputes/admin${query}`
  );

  return response.data;
};

export const updateDispute = async (disputeId,status,resolution = "") => {
  const response = await api.patch(
    `/disputes/admin/${disputeId}`,
    {
      status,
      resolution,
    }
  );

  return response.data;
};

export const applyDisputeOutcome = async (
  disputeId,
  outcome,
  resolution
) => {
  const response = await api.patch(
    `/disputes/admin/${disputeId}/outcome`,
    {
      outcome,
      resolution,
    }
  );

  return response.data;
};
