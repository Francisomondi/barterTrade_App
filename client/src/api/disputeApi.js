import api from "./axios";

export const createDispute = async (
  tradeId,
  reason,
  description
) => {
  const response = await api.post(
    `/disputes/trades/${tradeId}`,
    {
      reason,
      description,
    }
  );

  return response.data;
};

export const getTradeDispute = async (
  tradeId
) => {
  const response = await api.get(
    `/disputes/trades/${tradeId}`
  );

  return response.data;
};