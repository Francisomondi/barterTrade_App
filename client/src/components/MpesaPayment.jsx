
import { useEffect, useRef, useState } from "react";

import {
  initiateMpesaPayment,
  getPaymentStatus,
} from "../api/paymentApi";

const MpesaPayment = ({
  amount,
  type = "OTHER",
  tradeId = null,
  description = "Barter Trade Payment",
  onSuccess,
  onFailure,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const pollingRef = useRef(null);

  /*
   * Stop polling when the component is removed.
   */
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  /*
   * Stop polling when payment reaches
   * a final state.
   */
  useEffect(() => {
    if (!payment) {
      return;
    }

    if (
      payment.status === "COMPLETED" ||
      payment.status === "FAILED" ||
      payment.status === "CANCELLED" ||
      payment.status === "REFUNDED"
    ) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [payment]);

  /*
   * Check the latest payment status.
   */
  const checkPaymentStatus = async (
    paymentId
  ) => {
    try {
      setStatusLoading(true);

      const response =
        await getPaymentStatus(paymentId);

      if (response?.payment) {
        setPayment(response.payment);
      }

      return response?.payment;
    } catch (error) {
      console.error(
        "Payment status error:",
        error
      );

      /*
       * Don't immediately display a fatal error
       * during polling.
       *
       * The payment may still be processing.
       */
      return null;
    } finally {
      setStatusLoading(false);
    }
  };

  /*
   * Begin polling.
   */
  const startPolling = (paymentId) => {
    /*
     * Prevent duplicate polling intervals.
     */
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    /*
     * Check immediately.
     */
    checkPaymentStatus(paymentId);

    /*
     * Then check every 3 seconds.
     */
    pollingRef.current = setInterval(
      async () => {
        const latestPayment =
          await checkPaymentStatus(
            paymentId
          );

        if (!latestPayment) {
          return;
        }

        /*
         * Successful payment.
         */
        if (
          latestPayment.status ===
          "COMPLETED"
        ) {
          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            );

            pollingRef.current = null;
          }

          setSuccess(
            "M-PESA payment completed successfully."
          );

          if (onSuccess) {
            onSuccess(latestPayment);
          }
        }

        /*
         * Failed payment.
         */
        if (
          latestPayment.status ===
            "FAILED" ||
          latestPayment.status ===
            "CANCELLED"
        ) {
          if (pollingRef.current) {
            clearInterval(
              pollingRef.current
            );

            pollingRef.current = null;
          }

          setError(
            latestPayment.resultDescription ||
              "M-PESA payment was not completed."
          );

          if (onFailure) {
            onFailure(latestPayment);
          }
        }
      },
      3000
    );
  };

  /*
   * Start M-PESA payment.
   */
  const handlePayment = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setPayment(null);

    /*
     * Basic phone validation.
     *
     * The backend performs the authoritative
     * validation as well.
     */
    if (!phoneNumber.trim()) {
      setError(
        "Please enter your M-PESA phone number."
      );

      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError(
        "Payment amount must be greater than zero."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await initiateMpesaPayment({
          amount,
          phoneNumber,
          type,
          tradeId,
          description,
        });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to initiate payment."
        );
      }

      const createdPayment =
        response.payment;

      setPayment(createdPayment);

      setSuccess(
        response.message ||
          "STK Push sent. Check your phone and enter your M-PESA PIN."
      );

      /*
       * Start watching payment status.
       */
      if (createdPayment?.id) {
        startPolling(createdPayment.id);
      }
    } catch (error) {
      console.error(
        "M-PESA payment error:",
        error
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to initiate M-PESA payment."
      );
    } finally {
      setLoading(false);
    }
  };

  const isCompleted =
    payment?.status === "COMPLETED";

  const isFailed =
    payment?.status === "FAILED";

  const isPending =
    payment?.status === "PENDING";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#3D0F18]">
          Pay with M-PESA
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Enter your M-PESA number and we will
          send a payment request to your phone.
        </p>
      </div>

      {/* Amount */}
      <div className="mb-5 rounded-xl bg-[#F8F5F3] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Amount
        </p>

        <p className="mt-1 text-2xl font-bold text-[#5B1725]">
          KES{" "}
          {Number(amount || 0).toLocaleString()}
        </p>
      </div>

      {/* Payment form */}
      {!isCompleted && (
        <form onSubmit={handlePayment}>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            M-PESA Phone Number
          </label>

          <input
            type="tel"
            value={phoneNumber}
            onChange={(event) =>
              setPhoneNumber(
                event.target.value
              )
            }
            placeholder="0712345678"
            disabled={loading || isPending}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#DCAEB7]"
          />

          <p className="mt-2 text-xs text-gray-500">
            Example: 0712345678 or +254712345678
          </p>

          <button
            type="submit"
            disabled={loading || isPending}
            className="mt-5 w-full rounded-xl bg-[#5B1725] px-5 py-3 font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Sending STK Push..."
              : isPending
              ? "Waiting for payment..."
              : `Pay KES ${Number(
                  amount || 0
                ).toLocaleString()}`}
          </button>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Success / pending message */}
      {success && !isCompleted && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">
            {success}
          </p>
        </div>
      )}

      {/* Pending payment */}
      {isPending && (
        <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
              ...
            </div>

            <div>
              <h3 className="font-bold text-yellow-900">
                Check your phone
              </h3>

              <p className="mt-1 text-sm text-yellow-800">
                An M-PESA payment request has
                been sent to your phone.
              </p>

              <p className="mt-2 text-xs text-yellow-700">
                Enter your M-PESA PIN on your
                phone to complete the payment.
              </p>

              {statusLoading && (
                <p className="mt-3 text-xs font-semibold text-yellow-700">
                  Checking payment status...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed */}
      {isCompleted && (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 font-bold text-white">
              ✓
            </div>

            <div>
              <h3 className="font-bold text-green-900">
                Payment Successful
              </h3>

              <p className="mt-1 text-sm text-green-800">
                Your M-PESA payment has been
                successfully received.
              </p>

              {payment.receiptNumber && (
                <div className="mt-4 rounded-xl bg-white p-3">
                  <p className="text-xs text-gray-500">
                    M-PESA Receipt
                  </p>

                  <p className="mt-1 font-bold text-[#3D0F18]">
                    {payment.receiptNumber}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Failed */}
      {isFailed && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-bold text-red-900">
            Payment Failed
          </h3>

          <p className="mt-1 text-sm text-red-800">
            {payment?.resultDescription ||
              "The M-PESA payment was not completed."}
          </p>

          <button
            type="button"
            onClick={() => {
              setPayment(null);
              setError("");
              setSuccess("");
            }}
            className="mt-4 rounded-xl bg-[#5B1725] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default MpesaPayment;
