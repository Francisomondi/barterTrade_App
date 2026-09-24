import api from "./axios";

/**
 * =========================================================
 * PROMOTION PLANS
 * =========================================================
 */

export const getPromotionPlans = async () => {
  const response = await api.get(
    "/promotions/plans"
  );

  return response.data;
};

/**
 * =========================================================
 * CREATE PROMOTION
 * =========================================================
 */

export const createPromotion = async ({
  listingId,
  type,
}) => {
  const response = await api.post(
    "/promotions",
    {
      listingId,
      type,
    }
  );

  return response.data;
};

/**
 * =========================================================
 * PAY FOR PROMOTION
 * =========================================================
 */

export const payForPromotion = async ({
  promotionId,
  phoneNumber,
}) => {
  const response = await api.post(
    `/promotions/${promotionId}/pay`,
    {
      phoneNumber,
    }
  );

  return response.data;
};

/**
 * =========================================================
 * PROMOTION PAYMENT STATUS
 * =========================================================
 */

export const getPromotionPaymentStatus = async (
  paymentId
) => {
  const response = await api.get(
    `/promotions/payments/${paymentId}/status`
  );

  return response.data;
};

/**
 * =========================================================
 * MY PROMOTIONS
 * =========================================================
 */

export const getMyPromotions = async () => {
  const response = await api.get(
    "/promotions/my"
  );

  return response.data;
};

/**
 * =========================================================
 * SINGLE PROMOTION
 * =========================================================
 */

export const getPromotion = async (
  promotionId
) => {
  if (!promotionId) {
    throw new Error(
      "Promotion ID is required."
    );
  }

  const response = await api.get(
    `/promotions/${promotionId}`
  );

  return response.data;
};

/**
 * =========================================================
 * RECORD PROMOTION VIEW
 * =========================================================
 *
 * Backend:
 * POST /api/promotions/:id/analytics/view
 *
 * This endpoint intentionally does not require authentication.
 */
export const recordPromotionView = async (
  promotionId
) => {
  if (!promotionId) {
    return null;
  }

  try {
    const response = await api.post(
      `/promotions/${promotionId}/analytics/view`
    );

    return response.data;
  } catch (error) {
    /**
     * Promotion analytics must never break
     * marketplace rendering.
     */
    console.error(
      "RECORD PROMOTION VIEW ERROR:",
      error
    );

    return null;
  }
};

/**
 * =========================================================
 * RECORD PROMOTION CLICK
 * =========================================================
 *
 * Backend:
 * POST /api/promotions/:id/analytics/click
 *
 * This endpoint intentionally does not require authentication.
 */
export const recordPromotionClick = async (
  promotionId
) => {
  if (!promotionId) {
    return null;
  }

  try {
    const response = await api.post(
      `/promotions/${promotionId}/analytics/click`
    );

    return response.data;
  } catch (error) {
    /**
     * Analytics must never prevent
     * listing navigation.
     */
    console.error(
      "RECORD PROMOTION CLICK ERROR:",
      error
    );

    return null;
  }
};

/**
 * =========================================================
 * GET PROMOTION ANALYTICS
 * =========================================================
 *
 * Backend:
 * GET /api/promotions/:id/analytics
 *
 * Protected endpoint.
 * Only the promotion owner should be able
 * to access this data.
 */
export const getPromotionAnalytics = async (
  promotionId
) => {
  if (!promotionId) {
    throw new Error(
      "Promotion ID is required."
    );
  }

  const response = await api.get(
    `/promotions/${promotionId}/analytics`
  );

  return response.data;
};