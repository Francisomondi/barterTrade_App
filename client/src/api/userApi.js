// CREATE — frontend/src/api/userApi.js

import api from "./axios";

/**
 * ============================================================
 * GET PUBLIC USER PROFILE
 * ============================================================
 *
 * Public endpoint.
 *
 * Used when another marketplace user visits:
 *
 * /profile/:userId
 *
 * Backend decides whether the account should be represented as:
 *
 * PERSONAL
 * or
 * BUSINESS
 *
 * If BUSINESS, PublicProfile.jsx will redirect the visitor to:
 *
 * /business/:slug
 */
export const getPublicUserProfile = async (
  userId
) => {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const response = await api.get(
    `/users/${encodeURIComponent(
      userId
    )}/public-profile`
  );

  return response.data;
};