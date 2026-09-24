import {
  getPromotionPaymentStatus,
} from "../api/promotionApi";

/**
 * Poll an M-PESA promotion payment until it reaches
 * a final state or the polling period expires.
 */
export const pollPromotionPayment = async ({
  paymentId,
  interval = 3000,
  maxAttempts = 20,
  onStatusChange,
}) => {
  if (!paymentId) {
    throw new Error("Payment ID is required.");
  }

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    const data =
      await getPromotionPaymentStatus(
        paymentId
      );

    const payment = data.payment;
    const promotion = data.promotion;

    if (onStatusChange) {
      onStatusChange({
        payment,
        promotion,
        attempt,
      });
    }

    // ---------------------------------------------
    // SUCCESS
    // ---------------------------------------------

    if (payment.status === "COMPLETED") {
      return {
        success: true,
        payment,
        promotion,
      };
    }

    // ---------------------------------------------
    // FAILED
    // ---------------------------------------------

    if (
      payment.status === "FAILED" ||
      payment.status === "CANCELLED"
    ) {
      return {
        success: false,
        payment,
        promotion,
      };
    }

    // ---------------------------------------------
    // Still pending
    // ---------------------------------------------

    if (attempt < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, interval)
      );
    }
  }

  // -----------------------------------------------
  // Polling timed out
  // -----------------------------------------------

  return {
    success: false,
    timeout: true,
    payment: null,
    promotion: null,
  };
};