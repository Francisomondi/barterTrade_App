import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getPromotionAnalytics,
} from "../api/promotionApi";

// ======================================================
// FORMATTERS
// ======================================================

const formatMoney = (
  amount,
  currency = "KES"
) => {
  const value = Number(amount);

  if (Number.isNaN(value)) {
    return `${currency} —`;
  }

  return `${currency} ${value.toLocaleString(
    "en-KE"
  )}`;
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

const formatShortDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
    }
  );
};

const formatNumber = (value) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0";
  }

  return number.toLocaleString("en-KE");
};

const formatPercentage = (value) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0%";
  }

  return `${number.toFixed(
    number % 1 === 0 ? 0 : 2
  )}%`;
};

// ======================================================
// PROMOTION CONFIG
// ======================================================

const PROMOTION_CONFIG = {
  FEATURED: {
    icon: "⭐",
    label: "Featured",
    description:
      "Priority placement in the marketplace",
  },

  BOOST: {
    icon: "🚀",
    label: "Boosted",
    description:
      "Higher visibility in marketplace results",
  },

  HOMEPAGE: {
    icon: "🏠",
    label: "Homepage",
    description:
      "Premium placement on the homepage",
  },
};

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    badge:
      "border-green-200 bg-green-50 text-green-700",
    dot: "bg-green-500",
  },

  PENDING: {
    label: "Pending",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },

  EXPIRED: {
    label: "Expired",
    badge:
      "border-gray-200 bg-gray-50 text-gray-600",
    dot: "bg-gray-400",
  },

  CANCELLED: {
    label: "Cancelled",
    badge:
      "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

// ======================================================
// HELPERS
// ======================================================

const getRemainingTime = (endsAt) => {
  if (!endsAt) {
    return {
      expired: false,
      days: 0,
      hours: 0,
      label: "Not available",
    };
  }

  const difference =
    new Date(endsAt).getTime() -
    Date.now();

  if (difference <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      label: "Promotion ended",
    };
  }

  const totalHours = Math.ceil(
    difference / (1000 * 60 * 60)
  );

  const days = Math.floor(
    totalHours / 24
  );

  const hours =
    totalHours % 24;

  let label = "";

  if (days > 0) {
    label = `${days} ${
      days === 1 ? "day" : "days"
    }`;

    if (hours > 0) {
      label += ` ${hours}h`;
    }

    label += " remaining";
  } else {
    label = `${totalHours} ${
      totalHours === 1
        ? "hour"
        : "hours"
    } remaining`;
  }

  return {
    expired: false,
    days,
    hours,
    label,
  };
};

const getPromotionProgress = (
  startsAt,
  endsAt
) => {
  if (!startsAt || !endsAt) {
    return 0;
  }

  const start =
    new Date(startsAt).getTime();

  const end =
    new Date(endsAt).getTime();

  const now =
    Date.now();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end <= start
  ) {
    return 0;
  }

  if (now <= start) {
    return 0;
  }

  if (now >= end) {
    return 100;
  }

  const progress =
    ((now - start) /
      (end - start)) *
    100;

  return Math.min(
    100,
    Math.max(0, progress)
  );
};

const getListingImage = (listing) => {
  if (!listing) return null;

  return (
    listing.imageUrl ||
    listing.images?.[0]?.url ||
    listing.images?.[0]?.imageUrl ||
    null
  );
};

// ======================================================
// STAT CARD
// ======================================================

const StatCard = ({
  icon,
  label,
  value,
  description,
}) => {
  return (
    <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
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
// PERFORMANCE CHART
// ======================================================

const PerformanceChart = ({
  daily = [],
}) => {
  const maxValue = useMemo(() => {
    if (!daily.length) {
      return 1;
    }

    const values = daily.flatMap(
      (day) => [
        Number(day.views) || 0,
        Number(day.clicks) || 0,
      ]
    );

    return Math.max(
      1,
      ...values
    );
  }, [daily]);

  if (!daily.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#DCCACE] bg-[#FAF7F5] px-5 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
          📊
        </div>

        <h4 className="mt-4 font-extrabold text-[#3D0F18]">
          No performance data yet
        </h4>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Views and clicks will appear here
          after users begin seeing and
          interacting with your promoted
          listing.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-600">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#5B1725]" />
          Views
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-[#D7A24A]" />
          Clicks
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="flex min-w-[620px] items-end gap-3"
          style={{
            height: "260px",
          }}
        >
          {daily.map((day) => {
            const views =
              Number(day.views) || 0;

            const clicks =
              Number(day.clicks) || 0;

            const viewHeight =
              Math.max(
                views > 0 ? 8 : 2,
                (views / maxValue) * 190
              );

            const clickHeight =
              Math.max(
                clicks > 0 ? 8 : 2,
                (clicks / maxValue) * 190
              );

            return (
              <div
                key={day.date}
                className="flex min-w-[72px] flex-1 flex-col items-center justify-end"
              >
                <div className="mb-2 flex h-[200px] items-end gap-1.5">
                  <div className="group relative flex items-end">
                    <div
                      className="w-5 rounded-t-md bg-[#5B1725] transition hover:opacity-80"
                      style={{
                        height:
                          `${viewHeight}px`,
                      }}
                    />

                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#241014] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg group-hover:block">
                      {formatNumber(
                        views
                      )}{" "}
                      views
                    </div>
                  </div>

                  <div className="group relative flex items-end">
                    <div
                      className="w-5 rounded-t-md bg-[#D7A24A] transition hover:opacity-80"
                      style={{
                        height:
                          `${clickHeight}px`,
                      }}
                    />

                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#241014] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg group-hover:block">
                      {formatNumber(
                        clicks
                      )}{" "}
                      clicks
                    </div>
                  </div>
                </div>

                <p className="mt-2 whitespace-nowrap text-[11px] font-semibold text-gray-500">
                  {formatShortDate(
                    day.date
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ======================================================
// PROMOTION ANALYTICS
// ======================================================

const PromotionAnalytics = ({
  promotionId: promotionIdProp,
  onClose,
}) => {
  const {
    promotionId: routePromotionId,
  } = useParams();

  const promotionId =
    promotionIdProp ||
    routePromotionId;

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ======================================================
  // LOAD ANALYTICS
  // ======================================================

  useEffect(() => {
    if (!promotionId) {
      setLoading(false);
      setError(
        "Promotion ID is missing."
      );
      return;
    }

    let cancelled = false;

    const loadAnalytics =
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await getPromotionAnalytics(
              promotionId
            );

          if (!cancelled) {
            setData(response);
          }
        } catch (error) {
          console.error(
            "Promotion analytics error:",
            error
          );

          if (!cancelled) {
            setError(
              error.response?.data
                ?.message ||
                "Unable to load promotion analytics."
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [promotionId]);

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-[#FAF7F5] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

            <p className="mt-4 text-sm font-semibold text-gray-500">
              Loading promotion analytics...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <main className="min-h-[70vh] bg-[#FAF7F5] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
              ⚠️
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-[#3D0F18]">
              Unable to load analytics
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <Link
              to="/dashboard"
              className="mt-6 inline-flex rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (
    !data?.promotion ||
    !data?.analytics
  ) {
    return null;
  }

  // ======================================================
  // DATA
  // ======================================================

  const promotion =
    data.promotion;

  const analytics =
    data.analytics;

  const promotionConfig =
    PROMOTION_CONFIG[
      promotion.type
    ] || {
      icon: "📣",
      label:
        promotion.type ||
        "Promotion",
      description:
        "Promoted listing",
    };

  const statusConfig =
    STATUS_CONFIG[
      promotion.status
    ] ||
    STATUS_CONFIG.EXPIRED;

  const remainingTime =
    getRemainingTime(
      promotion.endsAt
    );

  const progress =
    getPromotionProgress(
      promotion.startsAt,
      promotion.endsAt
    );

  const listingImage =
    getListingImage(
      promotion.listing
    );

  const totalViews =
    Number(
      analytics.totalViews
    ) || 0;

  const totalClicks =
    Number(
      analytics.totalClicks
    ) || 0;

  const uniqueViewers =
    Number(
      analytics.uniqueViewers
    ) || 0;

  const ctr =
    Number(
      analytics.clickThroughRate
    ) || 0;

  const daily =
    Array.isArray(
      analytics.daily
    )
      ? analytics.daily
      : [];

  // ======================================================
  // PERFORMANCE SUMMARY
  // ======================================================

  const bestDay = daily.reduce(
    (best, day) => {
      if (!best) {
        return day;
      }

      const currentViews =
        Number(day.views) || 0;

      const bestViews =
        Number(best.views) || 0;

      return currentViews >
        bestViews
        ? day
        : best;
    },
    null
  );

  const averageViews =
    daily.length > 0
      ? Math.round(
          daily.reduce(
            (total, day) =>
              total +
              (Number(
                day.views
              ) || 0),
            0
          ) / daily.length
        )
      : 0;

  const averageClicks =
    daily.length > 0
      ? Math.round(
          daily.reduce(
            (total, day) =>
              total +
              (Number(
                day.clicks
              ) || 0),
            0
          ) / daily.length
        )
      : 0;

  // ======================================================
  // UI
  // ======================================================

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FAF7F5] via-[#FCFAF9] to-[#F7F1F2] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* ================================ */}
        {/* BREADCRUMB */}
        {/* ================================ */}

        {!onClose && (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
            <Link
              to="/dashboard"
              className="font-semibold text-gray-500 transition hover:text-[#5B1725]"
            >
              Dashboard
            </Link>

            <span className="text-gray-300">
              /
            </span>

            <span className="font-bold text-[#5B1725]">
              Promotion Analytics
            </span>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

          {/* ================================ */}
          {/* HERO */}
          {/* ================================ */}

          <div className="relative overflow-hidden bg-[#3D0F18] px-5 py-7 text-white sm:px-8 sm:py-9">

            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />

            <div className="absolute -bottom-24 right-32 h-52 w-52 rounded-full bg-[#D7A24A]/10" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex min-w-0 items-center gap-5">

                {listingImage ? (
                  <img
                    src={
                      listingImage
                    }
                    alt={
                      promotion
                        .listing
                        ?.title ||
                      "Promoted listing"
                    }
                    className="hidden h-24 w-24 shrink-0 rounded-2xl border border-white/20 object-cover shadow-lg sm:block"
                  />
                ) : (
                  <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl sm:flex">
                    {
                      promotionConfig.icon
                    }
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#E4BD69]">
                    Promotion Analytics
                  </p>

                  <h1 className="mt-2 truncate text-2xl font-extrabold sm:text-3xl lg:text-4xl">
                    {promotion
                      .listing
                      ?.title ||
                      "Promoted Listing"}
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    Monitor the
                    visibility and
                    engagement generated
                    by this promotion.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold">
                      {
                        promotionConfig.icon
                      }{" "}
                      {
                        promotionConfig.label
                      }
                    </span>

                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                      {
                        promotion.durationDays
                      }{" "}
                      days
                    </span>

                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                      {formatMoney(
                        promotion.amount,
                        promotion.currency
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-extrabold ${statusConfig.badge}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${statusConfig.dot}`}
                      />

                      {
                        statusConfig.label
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="flex shrink-0 flex-wrap gap-3">

                {onClose ? (
                  <button
                    type="button"
                    onClick={
                      onClose
                    }
                    className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#5B1725] transition hover:bg-[#F8ECEF]"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    {promotion
                      .listing
                      ?.id && (
                      <Link
                        to={`/listings/${promotion.listing.id}/manage`}
                        className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                      >
                        Manage Listing
                      </Link>
                    )}

                    <Link
                      to="/dashboard"
                      className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#5B1725] transition hover:bg-[#F8ECEF]"
                    >
                      ← Dashboard
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8">

            {/* ================================ */}
            {/* CAMPAIGN STATUS */}
            {/* ================================ */}

            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">

              <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF8F8] p-5 sm:p-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">
                      Campaign Timeline
                    </p>

                    <h2 className="mt-1 text-lg font-extrabold text-[#3D0F18]">
                      Promotion progress
                    </h2>
                  </div>

                  {promotion.status ===
                    "ACTIVE" &&
                    !remainingTime.expired && (
                      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2">
                        <p className="text-sm font-extrabold text-green-700">
                          {
                            remainingTime.label
                          }
                        </p>
                      </div>
                    )}
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-500">
                    <span>
                      Campaign progress
                    </span>

                    <span>
                      {Math.round(
                        progress
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-[#E9DEE0]">
                    <div
                      className="h-full rounded-full bg-[#5B1725] transition-all"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Started
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-gray-700">
                      {formatDate(
                        promotion.startsAt
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Ends
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-gray-700">
                      {formatDate(
                        promotion.endsAt
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Duration
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-gray-700">
                      {
                        promotion.durationDays
                      }{" "}
                      days
                    </p>
                  </div>
                </div>
              </div>

              {/* PROMOTION INFO */}

              <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 sm:p-6">

                <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">
                  Promotion Type
                </p>

                <div className="mt-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F8ECEF] text-2xl">
                    {
                      promotionConfig.icon
                    }
                  </div>

                  <div>
                    <h3 className="font-extrabold text-[#3D0F18]">
                      {
                        promotionConfig.label
                      }
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      {
                        promotionConfig.description
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#EEE6E8] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      Promotion cost
                    </span>

                    <span className="font-extrabold text-[#5B1725]">
                      {formatMoney(
                        promotion.amount,
                        promotion.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================================ */}
            {/* MAIN STATS */}
            {/* ================================ */}

            <div className="mt-8">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">
                  Performance
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-[#3D0F18]">
                  Promotion results
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Engagement generated
                  by this promoted
                  listing.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                  icon="👁️"
                  label="Impressions"
                  value={formatNumber(
                    totalViews
                  )}
                  description="Times your promotion was displayed"
                />

                <StatCard
                  icon="👆"
                  label="Clicks"
                  value={formatNumber(
                    totalClicks
                  )}
                  description="Times users opened the listing"
                />

                <StatCard
                  icon="👥"
                  label="Unique Viewers"
                  value={formatNumber(
                    uniqueViewers
                  )}
                  description="Different signed-in viewers"
                />

                <StatCard
                  icon="📈"
                  label="Click-through Rate"
                  value={formatPercentage(
                    ctr
                  )}
                  description="Clicks compared with impressions"
                />
              </div>
            </div>

            {/* ================================ */}
            {/* VISUAL CHART */}
            {/* ================================ */}

            <div className="mt-8 rounded-2xl border border-[#E7DDDF] bg-white p-5 sm:p-6">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A2638]">
                    Engagement Trend
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold text-[#3D0F18]">
                    Views & clicks
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Daily activity
                    generated by this
                    promotion.
                  </p>
                </div>

                <span className="text-xs font-semibold text-gray-400">
                  {
                    daily.length
                  }{" "}
                  tracked{" "}
                  {daily.length === 1
                    ? "day"
                    : "days"}
                </span>
              </div>

              <div className="mt-7">
                <PerformanceChart
                  daily={daily}
                />
              </div>
            </div>

            {/* ================================ */}
            {/* PERFORMANCE SUMMARY */}
            {/* ================================ */}

            <div className="mt-8 grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Best Day
                </p>

                <p className="mt-2 text-xl font-extrabold text-[#3D0F18]">
                  {bestDay
                    ? formatDate(
                        bestDay.date
                      )
                    : "—"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {bestDay
                    ? `${formatNumber(
                        bestDay.views
                      )} views`
                    : "No activity yet"}
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Avg. Daily Views
                </p>

                <p className="mt-2 text-xl font-extrabold text-[#3D0F18]">
                  {formatNumber(
                    averageViews
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Average impressions
                  per tracked day
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Avg. Daily Clicks
                </p>

                <p className="mt-2 text-xl font-extrabold text-[#3D0F18]">
                  {formatNumber(
                    averageClicks
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Average listing
                  visits per tracked
                  day
                </p>
              </div>
            </div>

            {/* ================================ */}
            {/* DAILY TABLE */}
            {/* ================================ */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white">

              <div className="border-b border-[#E7DDDF] p-5 sm:p-6">
                <h2 className="text-lg font-extrabold text-[#3D0F18]">
                  Daily Performance
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Detailed daily views,
                  clicks and
                  click-through rate.
                </p>
              </div>

              {daily.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-gray-500">
                    No analytics data
                    yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left">

                    <thead className="bg-[#FBF8F8]">
                      <tr className="text-xs uppercase tracking-wider text-gray-500">

                        <th className="px-5 py-4">
                          Date
                        </th>

                        <th className="px-5 py-4">
                          Views
                        </th>

                        <th className="px-5 py-4">
                          Clicks
                        </th>

                        <th className="px-5 py-4">
                          CTR
                        </th>

                      </tr>
                    </thead>

                    <tbody>
                      {daily.map(
                        (day) => (
                          <tr
                            key={
                              day.date
                            }
                            className="border-t border-[#F0E8EA] transition hover:bg-[#FCFAFA]"
                          >

                            <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                              {formatDate(
                                day.date
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm font-extrabold text-[#3D0F18]">
                              {formatNumber(
                                day.views
                              )}
                            </td>

                            <td className="px-5 py-4 text-sm font-extrabold text-[#5B1725]">
                              {formatNumber(
                                day.clicks
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-extrabold text-green-700">
                                {formatPercentage(
                                  day.clickThroughRate
                                )}
                              </span>
                            </td>

                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ================================ */}
            {/* FOOTER ACTIONS */}
            {/* ================================ */}

            {!onClose && (
              <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-[#3D0F18] p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">

                <div>
                  <h3 className="font-extrabold">
                    Manage your listing
                  </h3>

                  <p className="mt-1 text-sm text-white/65">
                    Update the listing
                    or return to your
                    dashboard to manage
                    other promotions.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">

                  {promotion
                    .listing
                    ?.id && (
                    <Link
                      to={`/listings/${promotion.listing.id}/manage`}
                      className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      Manage Listing
                    </Link>
                  )}

                  <Link
                    to="/dashboard"
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#5B1725] transition hover:bg-[#F8ECEF]"
                  >
                    Dashboard →
                  </Link>

                </div>
              </div>
            )}

          </div>
        </section>
      </div>
    </main>
  );
};

export default PromotionAnalytics;