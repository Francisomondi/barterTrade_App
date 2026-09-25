import api from "./axios";

/*
 * ============================================================
 * CREATE BUSINESS ACCOUNT
 * ============================================================
 */

export const createBusinessAccount = async (
  data
) => {
  const response = await api.post(
    "/business",
    data
  );

  return response.data;
};

/*
 * ============================================================
 * GET MY BUSINESS
 * ============================================================
 */

export const getMyBusiness = async () => {
  const response = await api.get(
    "/business/me"
  );

  return response.data;
};

/*
 * ============================================================
 * UPDATE MY BUSINESS
 * ============================================================
 */

export const updateMyBusiness = async (
  data
) => {
  const response = await api.patch(
    "/business/me",
    data
  );

  return response.data;
};

/*
 * ============================================================
 * UPDATE BUSINESS STATUS
 * ============================================================
 */

export const updateMyBusinessStatus = async (
  status
) => {
  const response = await api.patch(
    "/business/me/status",
    {
      status,
    }
  );

  return response.data;
};

/*
 * ============================================================
 * BUSINESS LOGO
 * ============================================================
 */

export const uploadBusinessLogo = async (
  file
) => {
  const formData =
    new FormData();

  formData.append(
    "logo",
    file
  );

  const response =
    await api.patch(
      "/business/me/logo",
      formData
    );

  return response.data;
};

export const deleteBusinessLogo =
  async () => {
    const response =
      await api.delete(
        "/business/me/logo"
      );

    return response.data;
  };

/*
 * ============================================================
 * BUSINESS COVER
 * ============================================================
 */

export const uploadBusinessCover = async (
  file
) => {
  const formData =
    new FormData();

  formData.append(
    "cover",
    file
  );

  const response =
    await api.patch(
      "/business/me/cover",
      formData
    );

  return response.data;
};

export const deleteBusinessCover =
  async () => {
    const response =
      await api.delete(
        "/business/me/cover"
      );

    return response.data;
  };

/*
 * ============================================================
 * GET PUBLIC BUSINESS
 * ============================================================
 */

export const getPublicBusiness = async (
  slug
) => {
  const response = await api.get(
    `/business/${encodeURIComponent(
      slug
    )}`
  );

  return response.data;
};

/*
 * ============================================================
 * GET PUBLIC BUSINESS LISTINGS
 * ============================================================
 */

export const getPublicBusinessListings =
  async ({
    slug,
    page = 1,
    limit = 12,
  }) => {
    const response = await api.get(
      `/business/${encodeURIComponent(
        slug
      )}/listings`,
      {
        params: {
          page,
          limit,
        },
      }
    );

    return response.data;
  };