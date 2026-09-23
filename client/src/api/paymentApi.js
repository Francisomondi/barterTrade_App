
import api from "./axios";

/**
 * INITIATE M-PESA STK PUSH
 */
export const initiateMpesaPayment = async ({
  amount,
  phoneNumber,
  type,
  tradeId = null,
  description = "",
}) => {
  const response = await api.post(
    "/payments/mpesa/stkpush",
    {
      amount,
      phoneNumber,
      type,
      tradeId,
      description,
    }
  );

  return response.data;
};

/**
 * GET PAYMENT STATUS
 */
export const getPaymentStatus = async (
  paymentId
) => {
  const response = await api.get(
    `/payments/${paymentId}`
  );

  return response.data;
};

/**
 * GET MY PAYMENT HISTORY
 */
export const getMyPayments = async ({
  page = 1,
  limit = 10,
  status = "",
  type = "",
} = {}) => {
  const params = new URLSearchParams();

  params.set("page", page);
  params.set("limit", limit);

  if (status) {
    params.set("status", status);
  }

  if (type) {
    params.set("type", type);
  }

  const response = await api.get(
    `/payments?${params.toString()}`
  );

  return response.data;
};
