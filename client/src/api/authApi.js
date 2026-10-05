import api from "./axios";

export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password", {
    email,
  });

  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post(`/auth/reset-password/${token}`, {
    password,
  });

  return response.data;
};

/**
 * ============================================================
 * UPDATE MY PROFILE
 * PATCH /api/auth/me
 * ============================================================
 */
export const updateMyProfile = async ({
  name,
  phone,
  location,
  bio,
}) => {
  const response = await api.patch(
    "/auth/me",
    {
      name,
      phone,
      location,
      bio,
    }
  );

  return response.data;
};

export const uploadMyAvatar = async (file) => {
  const formData = new FormData();

  formData.append("avatar", file);

  const response = await api.patch(
    "/auth/me/avatar",
    formData,
    {
      timeout: 120000,
    }
  );

  return response.data;
};

export const deleteMyAvatar = async () => {
  const response = await api.delete(
    "/auth/me/avatar"
  );

  return response.data;
};