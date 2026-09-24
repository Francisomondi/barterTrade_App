import api from "./axios";

export const getMyEntitlements =
  async () => {
    const response =
      await api.get(
        "/entitlements/me"
      );

    return response.data;
  };