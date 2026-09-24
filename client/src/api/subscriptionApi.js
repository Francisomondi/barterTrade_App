import api from "./axios";

/**
 * GET /api/subscriptions/plans
 */
export const getSubscriptionPlans = async () => {
  const response = await api.get("/subscriptions/plans");
  return response.data;
};

/**
 * POST /api/subscriptions
 *
 * {
 *   plan: "PREMIUM"
 * }
 */
export const createSubscription = async (plan = "PREMIUM") => {
  const response = await api.post("/subscriptions", {
    plan,
  });

  return response.data;
};

/**
 * GET /api/subscriptions/me
 */
export const getMySubscription = async () => {
  const response = await api.get("/subscriptions/me");
  return response.data;
};

/**
 * GET /api/subscriptions/:id
 */
export const getSubscription = async (subscriptionId) => {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required.");
  }

  const response = await api.get(
    `/subscriptions/${subscriptionId}`
  );

  return response.data;
};

/**
 * POST /api/subscriptions/:id/pay
 *
 * {
 *   phoneNumber: "0712345678"
 * }
 */
export const payForSubscription = async (
  subscriptionId,
  phoneNumber
) => {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required.");
  }

  if (!phoneNumber) {
    throw new Error("Phone number is required.");
  }

  const response = await api.post(
    `/subscriptions/${subscriptionId}/pay`,
    {
      phoneNumber,
    }
  );

  return response.data;
};

/**
 * GET /api/subscriptions/payments/:paymentId/status
 */
export const getSubscriptionPaymentStatus = async (
  paymentId
) => {
  if (!paymentId) {
    throw new Error("Payment ID is required.");
  }

  const response = await api.get(
    `/subscriptions/payments/${paymentId}/status`
  );

  return response.data;
};

/**
 * ============================================================
 * SUBSCRIPTION DASHBOARD
 * ============================================================
 */

export const getSubscriptionDashboard = async () => {
  const response = await api.get("/subscriptions/me");

  return response.data;
};