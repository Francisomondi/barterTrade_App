js
import api from "./axios";

/**
 * GET PROMOTION PACKAGES
 */
export const getPromotionPackages =
  async () => {
    const response = await api.get(
      "/promotions/packages"
    );

    return response.data;
  };

/**
 * CREATE PROMOTION
 */
export const createPromotion =
  async ({
    listingId,
    type,
    durationDays,
  }) => {
    const response = await api.post(
      "/promotions",
      {
        listingId,
        type,
        durationDays,
      }
    );

    return response.data;
  };

/**
 * PAY FOR PROMOTION
 */
export const payForPromotion =
  async (
    promotionId,
    phoneNumber
  ) => {
    const response = await api.post(
      `/promotions/${promotionId}/pay`,
      {
        phoneNumber,
      }
    );

    return response.data;
  };

/**
 * GET MY PROMOTIONS
 */
export const getMyPromotions =
  async () => {
    const response = await api.get(
      "/promotions/my"
    );

    return response.data;
  };

/**
 * GET SINGLE PROMOTION
 */
export const getPromotion =
  async (promotionId) => {
    const response = await api.get(
      `/promotions/${promotionId}`
    );

    return response.data;
  };
