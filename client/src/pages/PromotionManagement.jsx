import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  getMyPromotions,
} from "../api/promotionApi";

import PromotionAnalytics from "../components/PromotionAnalytics";

// ======================================================
// CONFIG
// ======================================================

const PROMOTION_CONFIG = {
  FEATURED: {
    label: "Featured",
    icon: "⭐",
    description:
      "Priority marketplace placement",
  },

  BOOST: {
    label: "Boosted",
    icon: "🚀",
    description:
      "Higher marketplace visibility",
  },

  HOMEPAGE: {
    label: "Homepage",
    icon: "🏠",
    description:
      "Premium homepage exposure",
  },
};

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending Payment",
    icon: "⏳",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    panel:
      "border-amber-200 bg-amber-50",
    title:
      "Complete your payment",
    description:
      "This promotion has not started yet. Complete the M-PESA payment to activate it.",
  },

  ACTIVE: {
    label: "Active",
    icon: "✓",
    badge:
      "border-green-200 bg-green-50 text-green-700",
    panel:
      "border-green-200 bg-green-50",
    title:
      "Promotion is live",
    description:
      "Your listing is currently receiving promoted marketplace visibility.",
  },

  EXPIRED: {
    label: "Expired",
    icon: "⌛",
    badge:
      "border-gray-200 bg-gray-100 text-gray-600",
    panel:
      "border-gray-200 bg-gray-50",
    title:
      "Promotion has ended",
    description:
      "This promotion has finished. You can promote the listing again.",
  },

  CANCELLED: {
    label: "Cancelled",
    icon: "✕",
    badge:
      "border-red-200 bg-red-50 text-red-700",
    panel:
      "border-red-200 bg-red-50",
    title:
      "Promotion cancelled",
    description:
      "This promotion is no longer active. You can start another promotion.",
  },
};

// ======================================================
// FORMATTERS
// ======================================================

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
  if (!date) {
    return "—";
  }

  return new Date(
    date
  ).toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const formatDateTime = (date) => {
  if (!date) {
    return "—";
  }

  return new Date(
    date
  ).toLocaleString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

const formatMoney = (
  amount,
  currency = "KES"
) => {
  const value =
    Number(amount) || 0;

  return `${currency} ${value.toLocaleString(
    "en-KE"
  )}`;
};

// ======================================================
// HELPERS
// ======================================================

const getListingImage = (
  listing
) => {
  return (
    listing?.images?.find(
      (image) =>
        image.isPrimary
    )?.url ||
    listing?.images?.[0]
      ?.url ||
    listing?.images?.[0]
      ?.imageUrl ||
    "https://placehold.co/700x500?text=No+Image"
  );
};

const getLatestPayment = (
  promotion
) => {
  return (
    promotion?.payments?.[0] ||
    promotion?.payment ||
    null
  );
};

const getRemainingTime = (
  endsAt
) => {
  if (!endsAt) {
    return null;
  }

  const difference =
    new Date(
      endsAt
    ).getTime() -
    Date.now();

  if (difference <= 0) {
    return "Ended";
  }

  const hours =
    Math.ceil(
      difference /
        (1000 * 60 * 60)
    );

  if (hours < 24) {
    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    } remaining`;
  }

  const days =
    Math.ceil(
      hours / 24
    );

  return `${days} ${
    days === 1
      ? "day"
      : "days"
  } remaining`;
};

// ======================================================
// SUMMARY CARD
// ======================================================

const SummaryCard = ({
  label,
  value,
  icon,
  description,
}) => {
  return (
    <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-extrabold text-[#3D0F18]">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F8ECEF] text-xl">
          {icon}
        </div>

      </div>

      <p className="mt-3 text-xs leading-5 text-gray-500">
        {description}
      </p>
    </div>
  );
};

// ======================================================
// PROMOTION MANAGEMENT
// ======================================================

const PromotionManagement =
  () => {
    const navigate =
      useNavigate();

    const [
      promotions,
      setPromotions,
    ] = useState([]);

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      error,
      setError,
    ] = useState("");

    const [
      analyticsPromotionId,
      setAnalyticsPromotionId,
    ] = useState(null);

    // ==================================================
    // LOAD PROMOTIONS
    // ==================================================

    const loadPromotions =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await getMyPromotions();

          setPromotions(
            Array.isArray(
              response?.promotions
            )
              ? response.promotions
              : []
          );
        } catch (error) {
          console.error(
            "LOAD PROMOTIONS ERROR:",
            error
          );

          setError(
            error.response?.data
              ?.message ||
              "Unable to load your promotions."
          );
        } finally {
          setLoading(false);
        }
      };

    useEffect(() => {
      loadPromotions();
    }, []);

    // ==================================================
    // GROUPS / SUMMARY
    // ==================================================

    const summary =
      useMemo(() => {
        const active =
          promotions.filter(
            (promotion) =>
              promotion.status ===
              "ACTIVE"
          ).length;

        const pending =
          promotions.filter(
            (promotion) =>
              promotion.status ===
              "PENDING"
          ).length;

        const expired =
          promotions.filter(
            (promotion) =>
              promotion.status ===
                "EXPIRED" ||
              promotion.status ===
                "CANCELLED"
          ).length;

        const spent =
          promotions.reduce(
            (
              total,
              promotion
            ) => {
              const hasCompletedPayment =
                promotion.payments?.some(
                  (payment) =>
                    payment.status ===
                    "COMPLETED"
                ) ||
                promotion.payment
                  ?.status ===
                  "COMPLETED";

              if (
                !hasCompletedPayment
              ) {
                return total;
              }

              return (
                total +
                (Number(
                  promotion.amount
                ) || 0)
              );
            },
            0
          );

        return {
          active,
          pending,
          expired,
          spent,
        };
      }, [promotions]);

    // ==================================================
    // NAVIGATION
    // ==================================================

    const handlePendingPayment =
      (promotion) => {
        const listingId =
          promotion?.listing
            ?.id ||
          promotion?.listingId;

        if (
          !listingId ||
          !promotion?.id
        ) {
          return;
        }

        const params =
          new URLSearchParams({
            continuePayment:
              "1",
            promotionId:
              promotion.id,
            promotionType:
              promotion.type ||
              "",
          });

        navigate(
          `/listings/${listingId}/manage?${params.toString()}`
        );
      };

    const handlePromoteAgain =
      (promotion) => {
        const listingId =
          promotion?.listing
            ?.id ||
          promotion?.listingId;

        if (!listingId) {
          return;
        }

        navigate(
          `/listings/${listingId}/manage`
        );
      };

    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {
      return (
        <main className="min-h-screen bg-[#F8F5F3] px-4 py-14 sm:px-6">

          <div className="mx-auto max-w-7xl">

            <div className="rounded-3xl border border-[#E7DDDF] bg-white p-12 text-center shadow-sm">

              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#F5E8EB] border-t-[#5B1725]" />

              <p className="mt-4 text-sm font-semibold text-gray-500">
                Loading your
                promotions...
              </p>

            </div>

          </div>

        </main>
      );
    }

    // ==================================================
    // UI
    // ==================================================

    return (
      <main className="min-h-screen bg-gradient-to-b from-[#F8F5F3] via-[#FCFAF9] to-[#F7F1F2]">

        {/* ============================================== */}
        {/* HERO */}
        {/* ============================================== */}

        <section className="relative overflow-hidden bg-[#3D0F18] px-4 py-12 text-white sm:px-6">

          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/5" />

          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#D7A24A]/10" />

          <div className="relative mx-auto max-w-7xl">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-[#D7A24A]">
                  Promotion Center
                </p>

                <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
                  My Promotions
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                  Complete pending
                  payments, monitor
                  active promotions and
                  promote your listings
                  again when campaigns
                  end.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <Link
                  to="/my-listings"
                  className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  My Listings
                </Link>

                <Link
                  to="/marketplace"
                  className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#5B1725] transition hover:bg-[#F8ECEF]"
                >
                  Browse Marketplace
                </Link>

              </div>

            </div>

          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">

          {/* ============================================ */}
          {/* ERROR */}
          {/* ============================================ */}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">

              <p className="font-bold text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={
                  loadPromotions
                }
                className="mt-3 text-sm font-extrabold text-red-800 underline"
              >
                Try again
              </button>

            </div>
          )}

          {/* ============================================ */}
          {/* SUMMARY */}
          {/* ============================================ */}

          {promotions.length >
            0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <SummaryCard
                icon="🚀"
                label="Active"
                value={
                  summary.active
                }
                description="Promotions currently live"
              />

              <SummaryCard
                icon="⏳"
                label="Pending"
                value={
                  summary.pending
                }
                description="Promotions waiting for payment"
              />

              <SummaryCard
                icon="⌛"
                label="Ended"
                value={
                  summary.expired
                }
                description="Expired or cancelled campaigns"
              />

              <SummaryCard
                icon="💳"
                label="Promotion Spend"
                value={formatMoney(
                  summary.spent
                )}
                description="Completed promotion payments"
              />

            </div>
          )}

          {/* ============================================ */}
          {/* EMPTY */}
          {/* ============================================ */}

          {promotions.length ===
            0 &&
            !error && (
              <div className="rounded-3xl border border-[#E7DDDF] bg-white p-10 text-center shadow-sm sm:p-14">

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F8ECEF] text-4xl">
                  📣
                </div>

                <h2 className="mt-5 text-2xl font-extrabold text-[#21191B]">
                  No promotions yet
                </h2>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                  Promote one of your
                  active listings to
                  increase its
                  visibility in the
                  marketplace.
                </p>

                <Link
                  to="/my-listings"
                  className="mt-6 inline-flex rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#3D0F18]"
                >
                  Choose a Listing
                </Link>

              </div>
            )}

          {/* ============================================ */}
          {/* PROMOTIONS */}
          {/* ============================================ */}

          {promotions.length >
            0 && (
            <section className="mt-9">

              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">
                  Your Campaigns
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#3D0F18]">
                  Promotion activity
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Actions shown below
                  change depending on
                  each promotion's
                  current status.
                </p>
              </div>

              <div className="mt-5 space-y-6">

                {promotions.map(
                  (
                    promotion
                  ) => {
                    const listing =
                      promotion.listing;

                    const payment =
                      getLatestPayment(
                        promotion
                      );

                    const status =
                      promotion.status;

                    const isPending =
                      status ===
                      "PENDING";

                    const isActive =
                      status ===
                      "ACTIVE";

                    const isEnded =
                      status ===
                        "EXPIRED" ||
                      status ===
                        "CANCELLED";

                    const config =
                      PROMOTION_CONFIG[
                        promotion.type
                      ] || {
                        label:
                          formatStatus(
                            promotion.type
                          ),
                        icon: "📣",
                        description:
                          "Listing promotion",
                      };

                    const statusConfig =
                      STATUS_CONFIG[
                        status
                      ] || {
                        label:
                          formatStatus(
                            status
                          ),
                        icon: "•",
                        badge:
                          "border-gray-200 bg-gray-50 text-gray-600",
                        panel:
                          "border-gray-200 bg-gray-50",
                        title:
                          "Promotion",
                        description:
                          "",
                      };

                    const remaining =
                      isActive
                        ? getRemainingTime(
                            promotion.endsAt
                          )
                        : null;

                    return (
                      <article
                        key={
                          promotion.id
                        }
                        className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm transition hover:shadow-md"
                      >

                        {/* HEADER */}

                        <div className="flex flex-col gap-4 border-b border-[#E7DDDF] bg-[#FBF8F8] px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between">

                          <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                              {
                                config.icon
                              }
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">

                                <span className="text-sm font-extrabold text-[#3D0F18]">
                                  {
                                    config.label
                                  }
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${statusConfig.badge}`}
                                >
                                  {
                                    statusConfig.icon
                                  }

                                  {
                                    statusConfig.label
                                  }
                                </span>

                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                {
                                  config.description
                                }
                              </p>

                            </div>

                          </div>

                          <div className="md:text-right">

                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                              Promotion Cost
                            </p>

                            <p className="mt-1 text-lg font-extrabold text-[#8A2638]">
                              {formatMoney(
                                promotion.amount,
                                promotion.currency
                              )}
                            </p>

                          </div>

                        </div>

                        {/* BODY */}

                        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[220px_1fr]">

                          {/* IMAGE */}

                          <Link
                            to={
                              listing?.id
                                ? `/listings/${listing.id}`
                                : "#"
                            }
                            className="group overflow-hidden rounded-2xl bg-[#F8F5F3]"
                          >

                            <img
                              src={getListingImage(
                                listing
                              )}
                              alt={
                                listing?.title ||
                                "Promoted listing"
                              }
                              className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03] lg:h-full"
                            />

                          </Link>

                          {/* DETAILS */}

                          <div className="min-w-0">

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                              <div>

                                <h3 className="text-xl font-extrabold text-[#21191B]">
                                  {listing?.title ||
                                    "Listing unavailable"}
                                </h3>

                                {listing?.description && (
                                  <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-gray-500">
                                    {
                                      listing.description
                                    }
                                  </p>
                                )}

                              </div>

                            </div>

                            {/* INFORMATION */}

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                              <div className="rounded-xl bg-[#FAF8F7] p-4">

                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Duration
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-[#21191B]">
                                  {
                                    promotion.durationDays
                                  }{" "}
                                  {promotion.durationDays ===
                                  1
                                    ? "day"
                                    : "days"}
                                </p>

                              </div>

                              <div className="rounded-xl bg-[#FAF8F7] p-4">

                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Payment
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-[#21191B]">
                                  {payment?.status
                                    ? formatStatus(
                                        payment.status
                                      )
                                    : isPending
                                      ? "Required"
                                      : "—"}
                                </p>

                              </div>

                              <div className="rounded-xl bg-[#FAF8F7] p-4">

                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Started
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-[#21191B]">
                                  {formatDate(
                                    promotion.startsAt
                                  )}
                                </p>

                              </div>

                              <div className="rounded-xl bg-[#FAF8F7] p-4">

                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                  Ends
                                </p>

                                <p className="mt-1 text-sm font-extrabold text-[#21191B]">
                                  {formatDate(
                                    promotion.endsAt
                                  )}
                                </p>

                              </div>

                            </div>

                            {/* ================================== */}
                            {/* STATUS-SPECIFIC PANEL */}
                            {/* ================================== */}

                            <div
                              className={`mt-5 rounded-2xl border p-5 ${statusConfig.panel}`}
                            >

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                  <div className="flex items-center gap-2">

                                    <span className="text-lg">
                                      {
                                        statusConfig.icon
                                      }
                                    </span>

                                    <p className="font-extrabold text-[#3D0F18]">
                                      {
                                        statusConfig.title
                                      }
                                    </p>

                                  </div>

                                  <p className="mt-1 max-w-xl text-sm leading-6 text-gray-600">
                                    {
                                      statusConfig.description
                                    }
                                  </p>

                                  {isActive &&
                                    remaining && (
                                      <p className="mt-2 text-sm font-extrabold text-green-700">
                                        {
                                          remaining
                                        }
                                      </p>
                                    )}

                                  {isPending &&
                                    payment
                                      ?.createdAt && (
                                      <p className="mt-2 text-xs font-semibold text-amber-700">
                                        Latest payment
                                        attempt:{" "}
                                        {formatDateTime(
                                          payment.createdAt
                                        )}
                                      </p>
                                    )}

                                </div>

                                {/* PRIMARY STATUS ACTION */}

                                <div className="shrink-0">

                                  {isPending &&
                                    listing?.id && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePendingPayment(
                                            promotion
                                          )
                                        }
                                        className="w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] sm:w-auto"
                                      >
                                        Complete Payment →
                                      </button>
                                    )}

                                  {isActive && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAnalyticsPromotionId(
                                          promotion.id
                                        )
                                      }
                                      className="w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] sm:w-auto"
                                    >
                                      View Analytics →
                                    </button>
                                  )}

                                  {isEnded &&
                                    listing?.id && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handlePromoteAgain(
                                            promotion
                                          )
                                        }
                                        className="w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] sm:w-auto"
                                      >
                                        Promote Again →
                                      </button>
                                    )}

                                </div>

                              </div>

                            </div>

                            {/* ================================== */}
                            {/* SECONDARY ACTIONS */}
                            {/* ================================== */}

                            <div className="mt-5 flex flex-wrap gap-3">

                              {listing?.id && (
                                <Link
                                  to={`/listings/${listing.id}`}
                                  className="rounded-xl border border-[#DCCACE] bg-white px-4 py-2.5 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
                                >
                                  View Listing
                                </Link>
                              )}

                              {listing?.id &&
                                !isEnded && (
                                  <Link
                                    to={`/listings/${listing.id}/manage`}
                                    className="rounded-xl border border-[#DCCACE] bg-white px-4 py-2.5 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
                                  >
                                    Manage Listing
                                  </Link>
                                )}

                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePromoteAgain(
                                      promotion
                                    )
                                  }
                                  className="rounded-xl border border-[#DCCACE] bg-white px-4 py-2.5 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
                                >
                                  Promote Again
                                </button>
                              )}

                            </div>

                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>

            </section>
          )}

          {/* ============================================ */}
          {/* BOTTOM CTA */}
          {/* ============================================ */}

          {promotions.length >
            0 && (
            <div className="mt-10 flex flex-col gap-4 rounded-3xl bg-[#3D0F18] p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">

              <div>
                <h3 className="text-xl font-extrabold">
                  Want more visibility?
                </h3>

                <p className="mt-1 text-sm text-white/65">
                  Choose another active
                  listing and promote it
                  in the marketplace.
                </p>
              </div>

              <Link
                to="/my-listings"
                className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-extrabold text-[#5B1725] transition hover:bg-[#F8ECEF]"
              >
                Choose a Listing →
              </Link>

            </div>
          )}

        </div>

        {/* ============================================== */}
        {/* ANALYTICS */}
        {/* ============================================== */}

        {analyticsPromotionId && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm">

            <div className="mx-auto max-w-7xl">

              <PromotionAnalytics
                promotionId={
                  analyticsPromotionId
                }
                onClose={() =>
                  setAnalyticsPromotionId(
                    null
                  )
                }
              />

            </div>

          </div>
        )}

      </main>
    );
  };

export default PromotionManagement;