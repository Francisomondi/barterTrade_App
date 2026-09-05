
import api from "./axios";

export const getTrades = async () => {
  const response = await api.get("/trades");
  return response.data;
};

export const getTradeById = async (tradeId) => {
  const response = await api.get(`/trades/${tradeId}`);
  return response.data;
};

export const updateTradeStatus = async (tradeId, status) => {
  const response = await api.patch(
    `/trades/${tradeId}/status`,
    { status }
  );

  return response.data;
};

export const completeTrade = async (tradeId) => {
  const response = await api.patch(
    `/trades/${tradeId}/complete`
  );

  return response.data;
};

