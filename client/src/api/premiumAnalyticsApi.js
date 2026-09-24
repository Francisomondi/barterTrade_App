import api from "./axios";

export const getPremiumAnalytics =
  async () => {
    const response =
      await api.get(
        "/premium-analytics"
      );

    return response.data;
  };