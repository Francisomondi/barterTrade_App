import api from "./axios";

/*
 * ============================================================
 * GET ALL LISTINGS
 * ============================================================
 *
 * Cache busting is intentional here.
 * It prevents the browser/proxy from returning an older
 * marketplace response after a new listing has been created.
 */
export const getListings = async (params = {}) => {
  const response = await api.get("/listings", {
    params: {
      ...params,
      _t: Date.now(),
    },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return response.data;
};

/*
 * ============================================================
 * GET SINGLE LISTING
 * ============================================================
 */

export const getListingById = async (id) => {
  const response = await api.get(`/listings/${id}`, {
    params: {
      _t: Date.now(),
    },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return response.data;
};

/*
 * ============================================================
 * GET MY LISTINGS
 * ============================================================
 */

export const getMyListings = async () => {
  const response = await api.get("/listings/user/me", {
    params: {
      _t: Date.now(),
    },
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return response.data;
};

/*
 * ============================================================
 * CREATE LISTING
 * ============================================================
 */

export const createListing = async (formData) => {
  const response = await api.post("/listings", formData);

  return response.data;
};

/*
 * ============================================================
 * REMOVE LISTING
 * ============================================================
 */

export const removeListing = async (id) => {
  const response = await api.delete(`/listings/${id}`);

  return response.data;
};

/*
 * ============================================================
 * DELETE LISTING IMAGE
 * ============================================================
 */

export const deleteListingImage = async (listingId, imageId) => {
  const response = await api.delete(
    `/listings/${listingId}/images/${imageId}`
  );

  return response.data;
};

/*
 * ============================================================
 * ADD LISTING IMAGES
 * ============================================================
 */

export const addListingImages = async (listingId, formData) => {
  const response = await api.post(
    `/listings/${listingId}/images`,
    formData
  );

  return response.data;
};

/*
 * ============================================================
 * SET PRIMARY IMAGE
 * ============================================================
 */

export const setPrimaryListingImage = async (
  listingId,
  imageId
) => {
  const response = await api.patch(
    `/listings/${listingId}/images/${imageId}/primary`
  );

  return response.data;
};

/*
 * ============================================================
 * REORDER LISTING IMAGES
 * ============================================================
 */

export const reorderListingImages = async (
  listingId,
  imageIds
) => {
  const response = await api.patch(
    `/listings/${listingId}/images/reorder`,
    {
      imageIds,
    }
  );

  return response.data;
};