
import { useEffect, useState } from "react";

import {
  getPromotionPackages,
  createPromotion,
  payForPromotion,
} from "../api/promotionApi";

import {
  getPaymentStatus,
} from "../api/paymentApi";

const PromotionPayment = ({
  listing,
  onSuccess,
}) => {
  const [packages, setPackages] =
    useState([]);

  const [type, setType] =
    useState("FEATURED");

  const [durationDays, setDurationDays] =
    useState(7);

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [promotion, setPromotion] =
    useState(null);

  const [payment, setPayment] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [polling, setPolling] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const response =
          await getPromotionPackages();

        setPackages(
          response?.packages || []
        );
      } catch (error) {
        console.error(
          "Load promotion packages error:",
          error
        );

        setError(
          "Unable to load promotion packages."
        );
      }
    };

    loadPackages();
  }, []);

  /*
   * Find currently selected package.
   *
   * The price comes from the backend.
   */
  const selectedPackage =
    packages.find(
      (item) =>
        item.type === type &&
        Number(item.durationDays) ===
          Number(durationDays)
    );

  /*
   * Poll payment status.
   */
  useEffect(() => {
    if (!payment?.id) {
      return;
    }

    if (
      payment.status === "COMPLETED" ||
      payment.status === "FAILED" ||
      payment.status === "CANCELLED"
    ) {
      return;
    }

    let interval;

    const checkStatus = async () => {
      try {
        setPolling(true);

        const response =
          await getPaymentStatus(
            payment.id
          );

        const latest =
          response?.payment;

        if (!latest) {
          return;
        }

        setPayment(latest);

        if (
          latest.status ===
          "COMPLETED"
        ) {
          setSuccess(
            "Payment completed. Your promotion is now being activated."
          );

          if (onSuccess) {
            onSuccess(
              latest,
              promotion
            );
          }
        }

        if (
          latest.status ===
            "FAILED" ||
          latest.status ===
            "CANCELLED"
        ) {
          setError(
            latest.resultDescription ||
              "Promotion payment failed."
          );
        }
      } catch (error) {
        console.error(
          "Promotion payment status error:",
          error
        );
      } finally {
        setPolling(false);
      }
    };

    checkStatus();

    interval = setInterval(
      checkStatus,
      3000
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    payment?.id,
    payment?.status,
    onSuccess,
    promotion,
  ]);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!listing?.id) {
      setError(
        "Listing information is missing."
      );
      return;
    }

    if (!selectedPackage) {
      setError(
        "Please select a valid promotion package."
      );
      return;
    }

    if (!phoneNumber.trim()) {
      setError(
        "Please enter your M-PESA phone number."
      );
      return;
    }

    try {
      setLoading(true);

      /*
       * STEP 1
       * Create PENDING promotion.
       *
       * Backend calculates the price.
       */
      const promotionResponse =
        await createPromotion({
          listingId: listing.id,
          type,
          durationDays:
            Number(durationDays),
        });

      const createdPromotion =
        promotionResponse?.promotion;

      if (!createdPromotion) {
        throw new Error(
          "Promotion could not be created."
        );
      }

      setPromotion(
        createdPromotion
      );

      /*
       * STEP 2
       * Send STK Push for the existing
       * promotion payment.
       */
      const paymentResponse =
        await payForPromotion(
          createdPromotion.id,
          phoneNumber
        );

      if (
        !paymentResponse?.success
      ) {
        throw new Error(
          paymentResponse?.message ||
            "Unable to initiate payment."
        );
      }

      setPayment(
        paymentResponse.payment
      );

      setSuccess(
        paymentResponse.message ||
          "Check your phone and enter your M-PESA PIN."
      );
    } catch (error) {
      console.error(
        "Promotion payment error:",
        error
      );

      setError(
        error.response?.data?.message ||
          error.message ||
          "Unable to process promotion payment."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#8A2638]">
          Promote Listing
        </p>

        <h2 className="mt-1 text-2xl font-bold text-[#3D0F18]">
          {listing?.title}
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Increase your listing's visibility
          in the marketplace.
        </p>
      </div>

      {!payment && (
        <form onSubmit={handleSubmit}>
          {/* Promotion type */}
          <label className="mb-2 block text-sm font-bold text-gray-700">
            Promotion Type
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                value: "FEATURED",
                title: "Featured",
                description:
                  "Highlight your listing.",
              },
              {
                value: "BOOST",
                title: "Boost",
                description:
                  "Increase visibility.",
              },
              {
                value: "HOMEPAGE",
                title: "Homepage",
                description:
                  "Showcase on homepage.",
              },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setType(
                    item.value
                  )
                }
                className={`rounded-xl border p-4 text-left transition ${
                  type === item.value
                    ? "border-[#8A2638] bg-[#F8F5F3]"
                    : "border-gray-200 hover:border-[#DCAEB7]"
                }`}
              >
                <p className="font-bold text-[#3D0F18]">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {item.description}
                </p>
              </button>
            ))}
          </div>

          {/* Duration */}
          <label className="mb-2 mt-6 block text-sm font-bold text-gray-700">
            Duration
          </label>

          <div className="flex gap-3">
            {[3, 7].map(
              (days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setDurationDays(
                      days
                    )
                  }
                  className={`rounded-xl border px-5 py-3 text-sm font-bold transition ${
                    Number(
                      durationDays
                    ) === days
                      ? "border-[#8A2638] bg-[#5B1725] text-white"
                      : "border-gray-200 text-gray-700 hover:border-[#DCAEB7]"
                  }`}
                >
                  {days} days
                </button>
              )
            )}
          </div>

          {/* Price */}
          {selectedPackage && (
            <div className="mt-6 rounded-2xl bg-[#F8F5F3] p-5">
              <p className="text-sm text-gray-500">
                Total
              </p>

              <p className="mt-1 text-3xl font-bold text-[#5B1725]">
                KES{" "}
                {Number(
                  selectedPackage.amount
                ).toLocaleString()}
              </p>
            </div>
          )}

          {/* Phone */}
          <label className="mb-2 mt-6 block text-sm font-bold text-gray-700">
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
            disabled={loading}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#8A2638] focus:ring-2 focus:ring-[#DCAEB7]"
          />

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !selectedPackage
            }
            className="mt-6 w-full rounded-xl bg-[#5B1725] px-5 py-3 font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Starting payment..."
              : `Pay KES ${
                  selectedPackage
                    ? Number(
                        selectedPackage.amount
                      ).toLocaleString()
                    : "0"
                }`}
          </button>
        </form>
      )}

      {/* Payment pending */}
      {payment &&
        payment.status ===
          "PENDING" && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
            <h3 className="font-bold text-yellow-900">
              Check your phone
            </h3>

            <p className="mt-2 text-sm text-yellow-800">
              An M-PESA payment request has
              been sent to:
            </p>

            <p className="mt-2 font-bold text-yellow-900">
              {payment.phoneNumber}
            </p>

            <p className="mt-3 text-sm text-yellow-800">
              Enter your M-PESA PIN to complete
              the payment.
            </p>

            {polling && (
              <p className="mt-4 text-xs font-semibold text-yellow-700">
                Waiting for payment confirmation...
              </p>
            )}
          </div>
        )}

      {/* Completed */}
      {payment &&
        payment.status ===
          "COMPLETED" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 font-bold text-white">
                ✓
              </div>

              <div>
                <h3 className="font-bold text-green-900">
                  Payment Successful
                </h3>

                <p className="mt-1 text-sm text-green-800">
                  Your promotion payment was
                  successfully received.
                </p>

                {payment.receiptNumber && (
                  <p className="mt-3 text-sm text-green-700">
                    Receipt:{" "}
                    <span className="font-bold">
                      {
                        payment.receiptNumber
                      }
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Failed */}
      {payment &&
        payment.status ===
          "FAILED" && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <h3 className="font-bold text-red-900">
              Payment Failed
            </h3>

            <p className="mt-1 text-sm text-red-700">
              {payment.resultDescription ||
                "The M-PESA payment was not completed."}
            </p>
          </div>
        )}
    </div>
  );
};

export default PromotionPayment;
