import api from "./axios";

export const getListings = async (params = {}) => {
  const response = await api.get("/listings", {
    params,
  });

  return response.data;
};

export const getListingById = async (id) => {
  const response = await api.get(`/listings/${id}`);

  return response.data;
};

export const getMyListings = async () => {
  const response = await api.get("/listings/user/me");

  return response.data;
};

export const createListing = async (listingData) => {
  const response = await api.post("/listings", listingData);

  return response.data;
};

export const removeListing = async (id) => {
  const response = await api.delete(`/listings/${id}`
  );

  return response.data;
};