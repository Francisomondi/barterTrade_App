
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMyPromotions,
  payForPromotion,
} from "../api/promotionApi";

import PromotionAnalytics from "../components/PromotionAnalytics";

const promotionTypeLabels = {
  FEATURED: "Featured",
  BOOST: "Boosted",
  HOMEPAGE: "Homepage",
};

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
};

const formatStatus = (status) => {
  return (
    status
      ?.replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      ) || "Unknown"
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const formatMoney = (amount, currency = "KES") => {
  return `${currency} ${Number(
    amount || 0
  ).toLocaleString("en-KE")}`;
};

const getListingImage = (listing) => {
  return (
    listing?.images?.find(
      (image) => image.isPrimary
    )?.url ||
    listing?.images?.[0]?.url ||
    listing?.images?.[0]?.imageUrl ||
    "https://placehold.co/700x500?text=No+Image"
  );
};

const PromotionManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [phoneNumbers, setPhoneNumbers] = useState({});
  const [paymentLoading, setPaymentLoading] =
    useState(null);

  const [paymentMessages, setPaymentMessages] =
    useState({});

  const [analyticsPromotionId, setAnalyticsPromotionId] =
    useState(null);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyPromotions();

      setPromotions(
        response?.promotions || []
      );
    } catch (error) {
      console.error(
        "LOAD PROMOTIONS ERROR:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load your promotions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const handlePhoneChange = (
    promotionId,
    value
  ) => {
    setPhoneNumbers((current) => ({
      ...current,
      [promotionId]: value,
    }));
  };

  const handlePayment = async (promotion) => {
    const phoneNumber =
      phoneNumbers[promotion.id]?.trim();

    if (!phoneNumber) {
      setPaymentMessages((current) => ({
        ...current,
        [promotion.id]:
          "Please enter the M-PESA phone number.",
      }));

      return;
    }

    try {
      setPaymentLoading(promotion.id);

      setPaymentMessages((current) => ({
        ...current,
        [promotion.id]: "",
      }));

      const response =
        await payForPromotion(
          promotion.id,
          phoneNumber
        );

      setPaymentMessages((current) => ({
        ...current,
        [promotion.id]:
          response?.message ||
          "M-PESA payment request sent. Check your phone and enter your M-PESA PIN.",
      }));

      /*
       * Reload so payment/promotion information
       * stays synchronized with the backend.
       *
       * The promotion will become ACTIVE after
       * the M-PESA callback completes successfully.
       */
      await loadPromotions();
    } catch (error) {
      console.error(
        "PROMOTION PAYMENT ERROR:",
        error
      );

      setPaymentMessages((current) => ({
        ...current,
        [promotion.id]:
          error.response?.data?.message ||
          "Unable to start the M-PESA payment.",
      }));
    } finally {
      setPaymentLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#F5E8EB] border-t-[#5B1725]" />

            <p className="mt-4 text-sm font-semibold text-gray-500">
              Loading your promotions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* HEADER */}
      <section className="bg-[#3D0F18] px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-widest text-[#DCAEB7]">
            Promotion Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
            My Promotions
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
            Manage your promoted listings,
            monitor payment status and view
            promotion performance.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* EMPTY */}
        {promotions.length === 0 && !error && (
          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📣</div>

            <h2 className="mt-4 text-2xl font-extrabold text-[#21191B]">
              No promotions yet
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
              Promote one of your active listings
              to increase its visibility in the
              marketplace.
            </p>

            <Link
              to="/my-listings"
              className="mt-6 inline-flex rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Go to My Listings
            </Link>
          </div>
        )}

        {/* PROMOTIONS */}
        <div className="space-y-6">
          {promotions.map((promotion) => {
            const listing =
              promotion.listing;

            const payment =
              promotion.payment;

            const isPending =
              promotion.status === "PENDING";

            const isActive =
              promotion.status === "ACTIVE";

            const paymentPending =
              payment?.status === "PENDING";

            const paymentCompleted =
              payment?.status === "COMPLETED";

            const message =
              paymentMessages[
                promotion.id
              ];

            return (
              <article
                key={promotion.id}
                className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm"
              >
                {/* CARD HEADER */}
                <div className="flex flex-col gap-4 border-b border-[#E7DDDF] bg-[#FBF5F6] px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                        {promotionTypeLabels[
                          promotion.type
                        ] ||
                          formatStatus(
                            promotion.type
                          )}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusStyles[
                            promotion.status
                          ] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {formatStatus(
                          promotion.status
                        )}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-extrabold text-[#21191B]">
                      {listing?.title ||
                        "Listing unavailable"}
                    </h2>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Promotion cost
                    </p>

                    <p className="mt-1 text-xl font-extrabold text-[#8A2638]">
                      {formatMoney(
                        promotion.amount,
                        promotion.currency
                      )}
                    </p>
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
                  {/* IMAGE */}
                  <div className="overflow-hidden rounded-xl bg-[#F8F5F3]">
                    <img
                      src={getListingImage(
                        listing
                      )}
                      alt={
                        listing?.title ||
                        "Promoted listing"
                      }
                      className="h-52 w-full object-cover lg:h-full"
                    />
                  </div>

                  {/* DETAILS */}
                  <div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Duration
                        </p>

                        <p className="mt-1 font-extrabold text-[#21191B]">
                          {promotion.durationDays}{" "}
                          {promotion.durationDays ===
                          1
                            ? "day"
                            : "days"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Payment
                        </p>

                        <p className="mt-1 font-extrabold text-[#21191B]">
                          {payment?.status
                            ? formatStatus(
                                payment.status
                              )
                            : "Not available"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Starts
                        </p>

                        <p className="mt-1 font-extrabold text-[#21191B]">
                          {formatDate(
                            promotion.startsAt
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Ends
                        </p>

                        <p className="mt-1 font-extrabold text-[#21191B]">
                          {formatDate(
                            promotion.endsAt
                          )}
                        </p>
                      </div>
                    </div>

                    {/* PAYMENT */}
                    {isPending &&
                      paymentPending && (
                        <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                          <p className="font-extrabold text-yellow-900">
                            Complete M-PESA
                            payment
                          </p>

                          <p className="mt-1 text-sm leading-6 text-yellow-800">
                            Enter the phone
                            number that should
                            receive the M-PESA
                            STK Push.
                          </p>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <input
                              type="tel"
                              value={
                                phoneNumbers[
                                  promotion.id
                                ] || ""
                              }
                              onChange={(event) =>
                                handlePhoneChange(
                                  promotion.id,
                                  event.target.value
                                )
                              }
                              placeholder="0712345678"
                              className="w-full rounded-xl border border-yellow-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB] sm:max-w-xs"
                            />

                            <button
                              type="button"
                              disabled={
                                paymentLoading ===
                                promotion.id
                              }
                              onClick={() =>
                                handlePayment(
                                  promotion
                                )
                              }
                              className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {paymentLoading ===
                              promotion.id
                                ? "Sending STK..."
                                : `Pay ${formatMoney(
                                    promotion.amount,
                                    promotion.currency
                                  )}`}
                            </button>
                          </div>

                          {message && (
                            <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-yellow-800">
                              {message}
                            </p>
                          )}
                        </div>
                      )}

                    {/* PAYMENT COMPLETE */}
                    {paymentCompleted && (
                      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                        <p className="font-extrabold text-green-800">
                          ✓ Payment completed
                        </p>

                        {payment.receiptNumber && (
                          <p className="mt-1 text-sm text-green-700">
                            Receipt:{" "}
                            <span className="font-bold">
                              {
                                payment.receiptNumber
                              }
                            </span>
                          </p>
                        )}

                        {isActive && (
                          <p className="mt-1 text-sm text-green-700">
                            Your promotion is now
                            active.
                          </p>
                        )}
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {listing?.id && (
                        <Link
                          to={`/listings/${listing.id}`}
                          className="rounded-xl border border-[#DCCACE] px-5 py-3 text-center text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
                        >
                          View Listing
                        </Link>
                      )}

                      {isActive && (
                        <button
                          type="button"
                          onClick={() =>
                            setAnalyticsPromotionId(
                              promotion.id
                            )
                          }
                          className="rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
                        >
                          View Analytics
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* ANALYTICS */}
      {analyticsPromotionId && (
        <PromotionAnalytics
          promotionId={
            analyticsPromotionId
          }
          onClose={() =>
            setAnalyticsPromotionId(null)
          }
        />
      )}
    </div>
  );
};

export default PromotionManagement;
