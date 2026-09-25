import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Crown,
  Eye,
  Handshake,
  MousePointerClick,
  Percent,
  RefreshCw,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { getPremiumAnalytics } from "../api/premiumAnalyticsApi";
import { useAuth } from "../context/AuthContext";

/*
 * ============================================================
 * PREMIUM ANALYTICS PAGE
 * ============================================================
 *
 * Route:
 * /account/analytics
 *
 * IMPORTANT:
 * - Promotion views are NOT organic listing views.
 * - Promotion spend comes from completed promotion payments.
 * - Backend remains the source of truth for Premium access.
 * ============================================================
 */

const PremiumAnalytics = () => {
  const {
    user,
    isPremium,
  } = useAuth();

  const [analytics, setAnalytics] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ==========================================================
   * LOAD ANALYTICS
   * ==========================================================
   */

  const loadAnalytics = async ({
    silent = false,
  } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data =
        await getPremiumAnalytics();

      setAnalytics(data);
    } catch (err) {
      console.error(
        "LOAD PREMIUM ANALYTICS ERROR:",
        err
      );

      const status =
        err?.response?.status;

      const code =
        err?.response?.data?.code;

      const message =
        err?.response?.data?.message;

      if (
        status === 403 ||
        code === "PREMIUM_REQUIRED"
      ) {
        setError(
          message ||
            "Premium membership is required to access advanced analytics."
        );

        return;
      }

      setError(
        message ||
          "Unable to load your analytics right now."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  /*
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const summary =
    analytics?.summary || {};

  const listings =
    analytics?.listings || [];

  const metadata =
    analytics?.metadata || {};

  /*
   * ==========================================================
   * SORT LISTINGS
   *
   * Best performing promoted listings first.
   * ==========================================================
   */

  const sortedListings =
    useMemo(() => {
      return [...listings].sort(
        (a, b) => {
          if (
            b.promotionViews !==
            a.promotionViews
          ) {
            return (
              b.promotionViews -
              a.promotionViews
            );
          }

          if (
            b.offersReceived !==
            a.offersReceived
          ) {
            return (
              b.offersReceived -
              a.offersReceived
            );
          }

          return (
            new Date(b.createdAt) -
            new Date(a.createdAt)
          );
        }
      );
    }, [listings]);

  /*
   * ==========================================================
   * HELPERS
   * ==========================================================
   */

  const formatNumber = (
    value
  ) =>
    Number(
      value || 0
    ).toLocaleString("en-KE");

  const formatPercent = (
    value
  ) =>
    `${Number(
      value || 0
    ).toFixed(2)}%`;

  const formatMoney = (
    value,
    currency = "KES"
  ) =>
    `${currency} ${Number(
      value || 0
    ).toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "en-KE",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(
      new Date(value)
    );
  };

  const getStatusClasses = (
    status
  ) => {
    switch (status) {
      case "ACTIVE":
        return "border-green-200 bg-green-50 text-green-700";

      case "TRADED":
      case "SOLD":
        return "border-blue-200 bg-blue-50 text-blue-700";

      case "RESERVED":
        return "border-amber-200 bg-amber-50 text-amber-700";

      case "REMOVED":
      case "EXPIRED":
        return "border-gray-200 bg-gray-100 text-gray-600";

      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F5F3]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 w-52 rounded-lg bg-gray-200" />

            <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-200" />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({
                length: 8,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-3xl border border-gray-200 bg-white"
                />
              ))}
            </div>

            <div className="mt-8 h-72 rounded-3xl border border-gray-200 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * PREMIUM ACCESS ERROR
   * ==========================================================
   */

  if (
    error &&
    !analytics
  ) {
    return (
      <main className="min-h-screen bg-[#F8F5F3] px-4 py-12">
        <div className="mx-auto max-w-xl rounded-[32px] border border-[#E7DDDF] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Crown size={30} />
          </div>

          <h1 className="mt-6 text-2xl font-black text-[#3D0F18]">
            Premium Analytics
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            {error}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {!isPremium && (
              <Link
                to="/premium"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8A2638] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6F1D2D]"
              >
                <Crown size={17} />
                Explore Premium
              </Link>
            )}

            <button
              type="button"
              onClick={() =>
                loadAnalytics()
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7DDDF] bg-white px-5 py-3 text-sm font-bold text-[#3D0F18] transition hover:bg-[#F8F5F3]"
            >
              <RefreshCw
                size={17}
              />
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * SUMMARY CARDS
   * ==========================================================
   */

  const summaryCards = [
    {
      label:
        "Total Listings",

      value:
        formatNumber(
          summary.totalListings
        ),

      helper: `${formatNumber(
        summary.activeListings
      )} currently active`,

      icon: BarChart3,
    },

    {
      label:
        "Promotion Views",

      value:
        formatNumber(
          summary.promotionViews
        ),

      helper:
        "Promoted listing views",

      icon: Eye,
    },

    {
      label:
        "Promotion Clicks",

      value:
        formatNumber(
          summary.promotionClicks
        ),

      helper:
        "Clicks from promotions",

      icon:
        MousePointerClick,
    },

    {
      label:
        "Promotion CTR",

      value:
        formatPercent(
          summary.promotionCtr
        ),

      helper:
        "Clicks ÷ promotion views",

      icon: TrendingUp,
    },

    {
      label:
        "Offers Received",

      value:
        formatNumber(
          summary.offersReceived
        ),

      helper: `${formatNumber(
        summary.pendingOffers
      )} pending`,

      icon: Handshake,
    },

    {
      label:
        "Accepted Offers",

      value:
        formatNumber(
          summary.acceptedOffers
        ),

      helper:
        "Offers successfully accepted",

      icon: BadgeCheck,
    },

    {
      label:
        "Offer Conversion",

      value:
        formatPercent(
          summary.offerConversionRate
        ),

      helper:
        "Accepted ÷ received",

      icon: Percent,
    },

    {
      label:
        "Promotion Spend",

      value:
        formatMoney(
          summary.promotionSpend,
          summary.currency ||
            "KES"
        ),

      helper: `${formatNumber(
        summary.promotionsUsed
      )} paid promotions`,

      icon: WalletCards,
    },
  ];

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <main className="min-h-screen bg-[#F8F5F3]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ================================================= */}
        {/* BACK */}
        {/* ================================================= */}

        <Link
          to="/account/subscription"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8A2638] transition hover:text-[#3D0F18]"
        >
          <ArrowLeft
            size={17}
          />

          My Subscription
        </Link>

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <section className="mt-5 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#3D0F18] via-[#5B1725] to-[#8A2638] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-amber-200">
                <Crown
                  size={14}
                  fill="currentColor"
                />

                Premium
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Advanced Analytics
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                Understand how your
                promoted listings are
                performing, how buyers
                interact with them, and
                how effectively offers
                convert.
              </p>

              {user?.name && (
                <p className="mt-4 text-sm font-bold text-amber-200">
                  Analytics for{" "}
                  {user.name}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                loadAnalytics({
                  silent: true,
                })
              }
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </section>

        {/* ================================================= */}
        {/* ERROR AFTER REFRESH */}
        {/* ================================================= */}

        {error &&
          analytics && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Activity
              size={20}
              className="text-[#8A2638]"
            />

            <h2 className="text-xl font-black text-[#3D0F18]">
              Account Performance
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(
              ({
                label,
                value,
                helper,
                icon: Icon,
              }) => (
                <div
                  key={label}
                  className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                        {label}
                      </p>

                      <p className="mt-3 break-words text-2xl font-black text-[#3D0F18]">
                        {value}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8ECEF] text-[#8A2638]">
                      <Icon
                        size={21}
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    {helper}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================================================= */}
        {/* EXTRA CONVERSION */}
        {/* ================================================= */}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">
              Click → Offer Rate
            </p>

            <p className="mt-2 text-2xl font-black text-[#3D0F18]">
              {formatPercent(
                summary.clickToOfferRate
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Percentage of
              promotion clicks
              compared with offers
              received.
            </p>
          </div>

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400">
              Completed Listings
            </p>

            <p className="mt-2 text-2xl font-black text-[#3D0F18]">
              {formatNumber(
                summary.completedListings
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Listings marked as
              traded or sold.
            </p>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <Sparkles
                size={17}
              />

              <p className="text-xs font-black uppercase tracking-wider">
                Analytics Scope
              </p>
            </div>

            <p className="mt-3 text-xs leading-5 text-amber-800">
              Promotion views and
              clicks measure activity
              generated by your paid
              promotions. Organic
              listing views are not
              included.
            </p>
          </div>
        </section>

        {/* ================================================= */}
        {/* LISTING PERFORMANCE */}
        {/* ================================================= */}

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-black text-[#3D0F18]">
                Listing Performance
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Detailed performance
                across your listings
                and paid promotions.
              </p>
            </div>

            <p className="text-xs font-bold text-gray-400">
              {formatNumber(
                listings.length
              )}{" "}
              listings
            </p>
          </div>

          {/* =============================================== */}
          {/* EMPTY STATE */}
          {/* =============================================== */}

          {sortedListings.length ===
          0 ? (
            <div className="mt-5 rounded-[32px] border border-dashed border-[#DCCBCD] bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8ECEF] text-[#8A2638]">
                <BarChart3
                  size={26}
                />
              </div>

              <h3 className="mt-5 text-lg font-black text-[#3D0F18]">
                No listing analytics
                yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                Create listings and
                promote them to begin
                collecting promotion
                views, clicks and offer
                performance data.
              </p>

              <Link
                to="/listings/create"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#8A2638] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6F1D2D]"
              >
                Create Listing
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {sortedListings.map(
                (listing) => (
                  <article
                    key={
                      listing.listingId
                    }
                    className="overflow-hidden rounded-[28px] border border-[#E7DDDF] bg-white shadow-sm"
                  >
                    {/* ===================================== */}
                    {/* LISTING HEADER */}
                    {/* ===================================== */}

                    <div className="flex flex-col gap-4 border-b border-[#F0E8EA] p-5 sm:flex-row sm:items-center">
                      {listing.image ? (
                        <img
                          src={
                            listing.image
                          }
                          alt={
                            listing.title
                          }
                          className="h-20 w-full rounded-2xl object-cover sm:w-24"
                        />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded-2xl bg-[#F8ECEF] text-[#8A2638] sm:w-24">
                          <BarChart3
                            size={24}
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-black text-[#3D0F18]">
                            {
                              listing.title
                            }
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClasses(
                              listing.status
                            )}`}
                          >
                            {
                              listing.status
                            }
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-gray-400">
                          Listed{" "}
                          {formatDate(
                            listing.createdAt
                          )}
                        </p>
                      </div>

                      <Link
                        to={`/listings/${listing.listingId}`}
                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#E7DDDF] px-4 py-2.5 text-xs font-black text-[#8A2638] transition hover:bg-[#F8F5F3]"
                      >
                        View Listing
                      </Link>
                    </div>

                    {/* ===================================== */}
                    {/* LISTING METRICS */}
                    {/* ===================================== */}

                    <div className="grid grid-cols-2 gap-px bg-[#F0E8EA] md:grid-cols-4 lg:grid-cols-5">
                      <Metric
                        label="Promotion Views"
                        value={formatNumber(
                          listing.promotionViews
                        )}
                      />

                      <Metric
                        label="Promotion Clicks"
                        value={formatNumber(
                          listing.promotionClicks
                        )}
                      />

                      <Metric
                        label="CTR"
                        value={formatPercent(
                          listing.promotionCtr
                        )}
                      />

                      <Metric
                        label="Offers"
                        value={formatNumber(
                          listing.offersReceived
                        )}
                      />

                      <Metric
                        label="Accepted"
                        value={formatNumber(
                          listing.acceptedOffers
                        )}
                      />

                      <Metric
                        label="Pending"
                        value={formatNumber(
                          listing.pendingOffers
                        )}
                      />

                      <Metric
                        label="Click → Offer"
                        value={formatPercent(
                          listing.clickToOfferRate
                        )}
                      />

                      <Metric
                        label="Offer Conversion"
                        value={formatPercent(
                          listing.offerConversionRate
                        )}
                      />

                      <Metric
                        label="Promotions Used"
                        value={formatNumber(
                          listing.promotionsUsed
                        )}
                      />

                      <Metric
                        label="Promotion Spend"
                        value={formatMoney(
                          listing.promotionSpend,
                          summary.currency ||
                            "KES"
                        )}
                      />
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* DATA DEFINITIONS */}
        {/* ================================================= */}

        <section className="mt-8 rounded-3xl border border-[#E7DDDF] bg-white p-5 sm:p-6">
          <h3 className="text-sm font-black text-[#3D0F18]">
            Understanding your
            analytics
          </h3>

          <div className="mt-4 grid gap-4 text-xs leading-5 text-gray-500 md:grid-cols-2">
            <p>
              <strong className="text-gray-700">
                Promotion views:
              </strong>{" "}
              {metadata.viewsDefinition ||
                "Promotion-generated views only."}
            </p>

            <p>
              <strong className="text-gray-700">
                Promotion clicks:
              </strong>{" "}
              {metadata.clicksDefinition ||
                "Promotion-generated clicks only."}
            </p>

            <p>
              <strong className="text-gray-700">
                Offer conversion:
              </strong>{" "}
              {metadata.offerConversionDefinition ||
                "Accepted offers divided by offers received."}
            </p>

            <p>
              <strong className="text-gray-700">
                Promotion spend:
              </strong>{" "}
              {metadata.spendDefinition ||
                "Completed promotion payments only."}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

/*
 * ============================================================
 * METRIC
 * ============================================================
 */

const Metric = ({
  label,
  value,
}) => {
  return (
    <div className="bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
        {label}
      </p>

      <p className="mt-2 break-words text-base font-black text-[#3D0F18]">
        {value}
      </p>
    </div>
  );
};

export default PremiumAnalytics;