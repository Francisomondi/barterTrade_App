import { useEffect, useState } from "react";

import {
  getPromotionAnalytics,
} from "../api/promotionApi";

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

const promotionLabels = {
  FEATURED: "⭐ Featured",
  BOOST: "🚀 Boosted",
  HOMEPAGE: "🏠 Homepage",
};

const StatCard = ({
  label,
  value,
  description,
}) => {
  return (
    <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-extrabold text-[#3D0F18]">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
};

const PromotionAnalytics = ({
  promotionId,
  onClose,
}) => {
  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!promotionId) {
      return;
    }

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getPromotionAnalytics(
            promotionId
          );

        setData(response);
      } catch (error) {
        console.error(
          "Promotion analytics error:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to load promotion analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [promotionId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E7DDDF] bg-white p-8 text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

        <p className="mt-4 text-sm font-semibold text-gray-500">
          Loading analytics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const promotion =
    data.promotion;

  const analytics =
    data.analytics;

  return (
    <section className="rounded-3xl border border-[#E7DDDF] bg-[#F8F5F3] p-5 shadow-sm md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A2638]">
            Promotion Analytics
          </p>

          <h2 className="mt-1 text-2xl font-extrabold text-[#3D0F18]">
            {promotion.listing?.title ||
              "Promoted Listing"}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#DCAEB7] bg-white px-3 py-1 text-xs font-bold text-[#5B1725]">
              {promotionLabels[
                promotion.type
              ] || promotion.type}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
              {promotion.durationDays} days
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
              {formatMoney(
                promotion.amount,
                promotion.currency
              )}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#DCAEB7] bg-white px-4 py-2 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
          >
            Close
          </button>
        )}
      </div>

      {/* Promotion dates */}
      <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Status
            </p>

            <p className="mt-1 font-extrabold text-green-700">
              {promotion.status}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Started
            </p>

            <p className="mt-1 font-semibold text-gray-700">
              {formatDate(
                promotion.startsAt
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Ends
            </p>

            <p className="mt-1 font-semibold text-gray-700">
              {formatDate(
                promotion.endsAt
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Impressions"
          value={analytics.totalViews.toLocaleString()}
          description="Times your promotion was displayed"
        />

        <StatCard
          label="Clicks"
          value={analytics.totalClicks.toLocaleString()}
          description="Times users opened the listing"
        />

        <StatCard
          label="Unique viewers"
          value={analytics.uniqueViewers.toLocaleString()}
          description="Different signed-in viewers"
        />

        <StatCard
          label="Click-through rate"
          value={`${analytics.clickThroughRate}%`}
          description="Clicks compared with impressions"
        />
      </div>

      {/* Performance */}
      <div className="mt-8 rounded-2xl border border-[#E7DDDF] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-[#3D0F18]">
              Daily Performance
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Views and clicks generated by this
              promotion.
            </p>
          </div>
        </div>

        {analytics.daily?.length === 0 ? (
          <div className="mt-6 rounded-xl bg-[#F8F5F3] p-6 text-center">
            <p className="text-sm font-semibold text-gray-500">
              No analytics data yet.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-[#E7DDDF] text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">
                    Date
                  </th>

                  <th className="px-4 py-3">
                    Views
                  </th>

                  <th className="px-4 py-3">
                    Clicks
                  </th>

                  <th className="px-4 py-3">
                    CTR
                  </th>
                </tr>
              </thead>

              <tbody>
                {analytics.daily.map(
                  (day) => (
                    <tr
                      key={day.date}
                      className="border-b border-[#F0E8EA] last:border-0"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                        {formatDate(
                          day.date
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-[#3D0F18]">
                        {day.views.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-[#5B1725]">
                        {day.clicks.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-sm font-bold text-green-700">
                        {day.clickThroughRate}%
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default PromotionAnalytics;