
import api from "./axios";

// Create a new barter offer
export const createOffer = async (offerData) => {
  const response = await api.post("/offers", offerData);

  return response.data;
};

// Get offers sent by the logged-in user
export const getSentOffers = async () => {
  const response = await api.get("/offers/sent");

  return response.data;
};

// Get offers received by the logged-in user
export const getReceivedOffers = async () => {
  const response = await api.get("/offers/received");

  return response.data;
};

// Get one offer
export const getOfferById = async (id) => {
  const response = await api.get(`/offers/${id}`);

  return response.data;
};

// Accept an offer
export const acceptOffer = async (id) => {
  const response = await api.patch(
    `/offers/${id}/accept`
  );

  return response.data;
};

// Reject an offer
export const rejectOffer = async (id) => {
  const response = await api.patch(
    `/offers/${id}/reject`
  );

  return response.data;
};

// Cancel an offer
export const cancelOffer = async (id) => {
  const response = await api.patch(
    `/offers/${id}/cancel`
  );

  return response.data;
};

