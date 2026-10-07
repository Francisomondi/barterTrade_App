import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  ArrowLeft,
  BarChart3,
  Crown,
  Eye,
  Handshake,
  Lightbulb,
  Megaphone,
   Scale,
   Search,
   TrendingUp,
  LockKeyhole,
  MousePointerClick,
  Package,
  RefreshCw,
  Store,
  Tag,
  Users,
} from "lucide-react";

import {
  getBusinessAnalyticsEntitlement,
  getBusinessAnalytics,
  getBusinessConversionIntelligence,
  getBusinessDemandIntelligence,
  getBusinessCategoryBenchmarks,
  getBusinessGrowthRecommendations,
  getBusinessAdvancedPromotionAnalytics,
} from "../api/businessAnalyticsApi";

const formatNumber = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "0";
  }

  return new Intl.NumberFormat(
    "en-KE"
  ).format(number);
};

const numberValue = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const percentageValue = (
  value
) => {
  const number =
    numberValue(value);

  return `${number.toFixed(
    1
  )}%`;
};

/**
 * ============================================================
 * BUSINESS PRO ANALYTICS FEATURES
 * ============================================================
 *
 * Presentation metadata only.
 *
 * Access itself is resolved from the server-provided
 * entitlement flags inside BusinessAnalytics.
 * ============================================================
 */

const BUSINESS_PRO_ANALYTICS_FEATURES = [
  {
    key:
      "conversionIntelligence",

    title:
      "Conversion Intelligence",

    description:
      "Understand how views, engagement, offers, accepted offers, and completed trades progress through your marketplace funnel.",

    icon:
      TrendingUp,
  },

  {
    key:
      "demandIntelligence",

    title:
      "Demand Intelligence",

    description:
      "Explore deeper customer-interest and marketplace-demand signals across your business activity.",

    icon:
      Search,
  },

  {
    key:
      "categoryBenchmarks",

    title:
      "Category Benchmarks",

    description:
      "Compare your business performance with privacy-safe category-level marketplace benchmarks.",

    icon:
      Scale,
  },

  {
    key:
      "growthRecommendations",

    title:
      "Growth Recommendations",

    description:
      "Turn your analytics into prioritized and actionable opportunities for improving business performance.",

    icon:
      Lightbulb,
  },

  {
    key:
      "advancedPromotionAnalytics",

    title:
      "Advanced Promotion Analytics",

    description:
      "Go beyond basic promotion totals with deeper performance and promotion-related intelligence.",

    icon:
      Megaphone,
  },
];

/** Renders only explicit, non-suppressed values returned by the API. */
const BenchmarkComparisonCard = ({ item, fallbackTitle }) => {
  const name = item?.categoryName ?? item?.listingTitle ?? item?.title ?? item?.name ?? fallbackTitle;
  const suppressed = item?.suppressed === true || item?.isSuppressed === true ||
    item?.status === "SUPPRESSED" || item?.benchmark?.suppressed === true;
  const position = item?.position ?? item?.performancePosition ?? item?.comparison?.position;
  const explanation = item?.description ?? item?.reason ?? item?.message;
  return (
    <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
      <h4 className="break-words text-sm font-black text-[#3D0F18]">{typeof name === "string" ? name : fallbackTitle}</h4>
      {suppressed ? (
        <p className="mt-2 text-xs text-amber-700">Benchmark withheld: insufficient eligible marketplace sample.</p>
      ) : (
        <>
          {typeof position === "string" && (
            <span className="mt-3 inline-flex rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
              {position.replaceAll("_", " ")}
            </span>
          )}
          {typeof explanation === "string" && <p className="mt-2 text-xs leading-5 text-gray-600">{explanation}</p>}
          {!position && !explanation && (
            <p className="mt-2 text-xs text-gray-500">Category comparison recorded. Detailed metrics depend on available benchmark samples.</p>
          )}
        </>
      )}
    </article>
  );
};

const BenchmarkInsightCard = ({ item }) => {
  const title = item?.title ?? item?.label ?? item?.code ?? "Benchmark insight";
  const description = item?.description ?? item?.message ?? item?.reason;
  return (
    <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
      <h4 className="text-sm font-bold text-[#3D0F18]">{typeof title === "string" ? title.replaceAll("_", " ") : "Benchmark insight"}</h4>
      {typeof description === "string" && <p className="mt-2 text-xs leading-5 text-gray-600">{description}</p>}
      {typeof item?.affectedListings === "number" && (
        <p className="mt-2 text-xs font-semibold text-[#8A2638]">{item.affectedListings} affected listings</p>
      )}
    </article>
  );
};


const GrowthActionCard = ({ action }) => {
  const priority = String(action?.priority ?? "").toUpperCase();
  const priorityClass = priority === "HIGH"
    ? "border-red-200 bg-red-50 text-red-700"
    : priority === "MEDIUM"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-black text-[#3D0F18]">{action?.title || "Growth opportunity"}</h4>
        {priority && (
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${priorityClass}`}>
            {priority} priority
          </span>
        )}
      </div>
      {action?.listing?.title && (
        <p className="mt-2 text-xs font-semibold text-[#8A2638]">{action.listing.title}</p>
      )}
      {typeof action?.message === "string" && (
        <p className="mt-2 text-xs leading-5 text-gray-600">{action.message}</p>
      )}
      {typeof action?.reason === "string" && (
        <p className="mt-2 text-xs leading-5 text-gray-500"><strong>Why:</strong> {action.reason}</p>
      )}
      {typeof action?.action === "string" && (
        <div className="mt-3 rounded-xl bg-[#F8F5F3] p-3 text-xs leading-5 text-[#3D0F18]">
          <strong>Recommended action:</strong> {action.action}
        </div>
      )}
    </article>
  );
};


const PromotionStat = ({ label, value, note }) => (
  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
    <p className="text-[11px] font-bold text-gray-500">{label}</p>
    <p className="mt-2 break-words text-xl font-black text-[#3D0F18]">{value}</p>
    {note && <p className="mt-1 text-[11px] text-gray-500">{note}</p>}
  </article>
);

const PromotionPerformanceCard = ({ promotion, currencyLabel }) => {
  const activity = promotion?.activityDuringPromotion ?? {};
  const traffic = promotion?.promotionTraffic ?? {};
  return (
    <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-black text-[#3D0F18]">{promotion?.listing?.title || "Promoted listing"}</h4>
          <p className="mt-1 text-xs text-gray-500">{String(promotion?.type ?? "Promotion").replaceAll("_", " ")}</p>
        </div>
        {promotion?.performanceState && (
          <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold text-[#5B1725]">
            {String(promotion.performanceState).replaceAll("_", " ")}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div><span className="text-gray-500">Promotion views</span><p className="font-black text-[#3D0F18]">{formatNumber(traffic.views)}</p></div>
        <div><span className="text-gray-500">Promotion clicks</span><p className="font-black text-[#3D0F18]">{formatNumber(traffic.clicks)}</p></div>
        <div><span className="text-gray-500">Offers during promotion</span><p className="font-black text-[#3D0F18]">{formatNumber(activity.offersDuringPromotion)}</p></div>
        <div><span className="text-gray-500">Trades during promotion</span><p className="font-black text-[#3D0F18]">{formatNumber(activity.completedTradesDuringPromotion)}</p></div>
      </div>
      {promotion?.amount != null && (
        <p className="mt-4 border-t border-[#EEE6E2] pt-3 text-xs font-semibold text-[#8A2638]">
          Promotion spend: {promotion.currency || currencyLabel || "Currency unspecified"} {formatNumber(promotion.amount)}
        </p>
      )}
    </article>
  );
};

const PromotionRecommendationCard = ({ item }) => {
  const priority = String(item?.priority ?? "").toUpperCase();
  return (
    <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-black text-[#3D0F18]">{item?.title || String(item?.code || "Optimization opportunity").replaceAll("_", " ")}</h4>
        {priority && <span className="rounded-full bg-[#FFF6DF] px-2.5 py-1 text-[10px] font-black text-[#8A6420]">{priority}</span>}
      </div>
      {typeof item?.message === "string" && <p className="mt-2 text-xs leading-5 text-gray-600">{item.message}</p>}
      {typeof item?.reason === "string" && <p className="mt-2 text-xs leading-5 text-gray-500">{item.reason}</p>}
      {typeof item?.action === "string" && <p className="mt-3 rounded-xl bg-[#F8F5F3] p-3 text-xs font-semibold leading-5 text-[#3D0F18]">{item.action}</p>}
    </article>
  );
};

const BusinessAnalytics = () => {
  const [
    entitlement,
    setEntitlement,
  ] = useState(null);

  const [
    analyticsResponse,
    setAnalyticsResponse,
  ] = useState(null);

  const [
    selectedDays,
    setSelectedDays,
  ] = useState(30);

  /**
 * ============================================================
 * BUSINESS PRO ANALYTICS STATE
 * ============================================================
 *
 * These are deliberately separate from the basic analytics
 * response.
 *
 * A failure in one Business Pro feature must not destroy the
 * entire analytics dashboard.
 */

const [
  conversionIntelligence,
  setConversionIntelligence,
] = useState(null);

const [
  demandIntelligence,
  setDemandIntelligence,
] = useState(null);

const [
  categoryBenchmarks,
  setCategoryBenchmarks,
] = useState(null);

const [
  growthRecommendations,
  setGrowthRecommendations,
] = useState(null);

const [
  advancedPromotionAnalytics,
  setAdvancedPromotionAnalytics,
] = useState(null);

const [
  proAnalyticsLoading,
  setProAnalyticsLoading,
] = useState(false);

const [
  proAnalyticsErrors,
  setProAnalyticsErrors,
] = useState({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const resetProAnalytics = useCallback(() => {
    setConversionIntelligence(
      null
    );

    setDemandIntelligence(
      null
    );

    setCategoryBenchmarks(
      null
    );

    setGrowthRecommendations(
      null
    );

    setAdvancedPromotionAnalytics(
      null
    );

    setProAnalyticsErrors({});
  }, []);

  const loadProAnalytics =
  useCallback(
    async ({
      access,
      days,
    }) => {
      if (
        !access?.isBusinessPro
      ) {
        resetProAnalytics();
        return;
      }

      const features =
        access?.features || {};

      setProAnalyticsLoading(
        true
      );

      setProAnalyticsErrors(
        {}
      );

      const requests = [];

      /**
       * Conversion Intelligence
       */
      if (
        features
          .conversionIntelligence ===
        true
      ) {
        requests.push({
          key:
            "conversionIntelligence",

          request: () =>
            getBusinessConversionIntelligence(
              {
                days,
              }
            ),

          setter:
            setConversionIntelligence,
        });
      } else {
        setConversionIntelligence(
          null
        );
      }

      /**
       * Demand Intelligence
       */
      if (
        features
          .demandIntelligence ===
        true
      ) {
        requests.push({
          key:
            "demandIntelligence",

          request: () =>
            getBusinessDemandIntelligence(
              {
                days,
              }
            ),

          setter:
            setDemandIntelligence,
        });
      } else {
        setDemandIntelligence(
          null
        );
      }

      /**
       * Category Benchmarks
       */
      if (
        features
          .categoryBenchmarks ===
        true
      ) {
        requests.push({
          key:
            "categoryBenchmarks",

          request: () =>
            getBusinessCategoryBenchmarks(
              {
                days,
              }
            ),

          setter:
            setCategoryBenchmarks,
        });
      } else {
        setCategoryBenchmarks(
          null
        );
      }

      /**
       * Growth Recommendations
       */
      if (
        features
          .growthRecommendations ===
        true
      ) {
        requests.push({
          key:
            "growthRecommendations",

          request: () =>
            getBusinessGrowthRecommendations(
              {
                days,
              }
            ),

          setter:
            setGrowthRecommendations,
        });
      } else {
        setGrowthRecommendations(
          null
        );
      }

      /**
       * Advanced Promotion Analytics
       */
      if (
        features
          .advancedPromotionAnalytics ===
        true
      ) {
        requests.push({
          key:
            "advancedPromotionAnalytics",

          request: () =>
            getBusinessAdvancedPromotionAnalytics(
              {
                days,
              }
            ),

          setter:
            setAdvancedPromotionAnalytics,
        });
      } else {
        setAdvancedPromotionAnalytics(
          null
        );
      }

      /**
       * Nothing is entitled.
       *
       * Normally this will only occur if the backend returns
       * Business Pro with no advanced feature permissions.
       */
      if (
        requests.length === 0
      ) {
        setProAnalyticsLoading(
          false
        );

        return;
      }

      try {
        /**
         * Run entitled features independently.
         *
         * Promise.allSettled is intentional.
         *
         * Example:
         *
         * conversions      -> 200
         * demand           -> 200
         * benchmarks       -> 500
         * recommendations  -> 200
         * promotions       -> 200
         *
         * We still keep the four successful features.
         */
        const results =
          await Promise.allSettled(
            requests.map(
              ({ request }) =>
                request()
            )
          );

        const nextErrors = {};

        results.forEach(
          (
            result,
            index
          ) => {
            const {
              key,
              setter,
            } =
              requests[index];

            if (
              result.status ===
              "fulfilled"
            ) {
              setter(
                result.value
              );

              return;
            }

            setter(null);

            const requestError =
              result.reason;

            console.error(
              `LOAD BUSINESS PRO ANALYTICS ERROR [${key}]:`,
              requestError
            );

            nextErrors[key] =
              requestError
                ?.response
                ?.data
                ?.message ||
              "Unable to load this Business Pro insight.";
          }
        );

        setProAnalyticsErrors(
          nextErrors
        );
      } finally {
        setProAnalyticsLoading(
          false
        );
      }
    },
    [resetProAnalytics]
  );

  /*
   * ==========================================================
   * LOAD ENTITLEMENT
   * ==========================================================
   *
   * This endpoint is the frontend authority for CURRENT
   * Business Analytics entitlement.
   *
   * Renewal state is intentionally not handled here.
   */

const loadAnalytics =
  useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * Load entitlement first.
       *
       * We need the server-resolved access before deciding
       * what analytics window the frontend may request.
       */
      const entitlementResponse =
        await getBusinessAnalyticsEntitlement();

      const resolvedAccess =
        entitlementResponse?.access ||
        null;

      const resolvedMaxHistoryDays =
        Number(
          resolvedAccess
            ?.maxHistoryDays
        ) || 30;

      /*
       * Never request more history than the server says
       * this account may use.
       *
       * Business Free therefore remains <= 30 days.
       */
      const safeDays =
        Math.min(
          Math.max(
            Number(
              selectedDays
            ) || 30,
            1
          ),
          resolvedMaxHistoryDays
        );

      /*
       * Load the complete BASIC analytics payload.
       *
       * IMPORTANT:
       *
       * This endpoint is available to Business Free.
       *
       * We do NOT call any Business Pro-only endpoints here.
       */
      const analytics =
        await getBusinessAnalytics({
          days: safeDays,
        });

      setEntitlement(
        entitlementResponse ||
          null
      );

setAnalyticsResponse(
  analytics || null
);

/*
 * ==========================================================
 * LOAD BUSINESS PRO ANALYTICS
 * ==========================================================
 *
 * Advanced endpoints are requested only when the backend
 * says the current account has Business Pro access.
 *
 * loadProAnalytics() performs an additional feature-level
 * entitlement check before requesting each endpoint.
 */

if (
  resolvedAccess?.isBusinessPro ===
  true
) {
  await loadProAnalytics({
    access:
      resolvedAccess,

    days:
      safeDays,
  });
} else {
  /*
   * Clear any previously loaded Pro data.
   *
   * This protects against stale Pro analytics remaining in
   * memory after entitlement expires or changes.
   */
  resetProAnalytics();
}

/*
 * Keep the selector synchronized if the selected
 * period had to be reduced by the entitlement limit.
 */
if (
  safeDays !==
  selectedDays
) {
  setSelectedDays(
    safeDays
  );
}
    } catch (err) {
      console.error(
        "LOAD BUSINESS ANALYTICS ERROR:",
        err
      );

      setAnalyticsResponse(
        null
      );

      resetProAnalytics();

      setError(
        err?.response?.data
          ?.message ||
          "Unable to load Business Analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [
  selectedDays,
  loadProAnalytics,
  resetProAnalytics,
]);


useEffect(() => {
  loadAnalytics();
}, [loadAnalytics]);

  /*
   * ==========================================================
   * DERIVED ACCESS
   * ==========================================================
   */

  const business =
    entitlement?.business ||
    null;

  const access =
    entitlement?.access ||
    null;

  const dashboard =
    entitlement?.dashboard ||
    null;

  const isBusinessPro =
    access?.isBusinessPro ===
    true;

  const maxHistoryDays =
    Number(
      access?.maxHistoryDays
    ) || 30;

    /**
 * ==========================================================
 * BUSINESS PRO FEATURE ENTITLEMENTS
 * ==========================================================
 *
 * Do not infer individual feature access merely from the
 * overall Business Pro flag.
 *
 * The backend is the source of truth for each capability.
 * ==========================================================
 */

const features =
  access?.features || {};

const canUseConversionIntelligence =
  features
    .conversionIntelligence ===
  true;

const canUseDemandIntelligence =
  features
    .demandIntelligence ===
  true;

const canUseCategoryBenchmarks =
  features
    .categoryBenchmarks ===
  true;

const canUseGrowthRecommendations =
  features
    .growthRecommendations ===
  true;

const canUseAdvancedPromotionAnalytics =
  features
    .advancedPromotionAnalytics ===
  true;

const canUseCustomDateRange =
  access?.customDateRange ===
  true;

 /**
 * ==========================================================
 * FEATURE ACCESS MAP
 * ==========================================================
 *
 * This lets the UI render each feature according to its own
 * server-provided entitlement instead of using one global
 * Business Pro boolean.
 * ==========================================================
 */

const businessProFeatureAccess = {
  conversionIntelligence:
    canUseConversionIntelligence,

  demandIntelligence:
    canUseDemandIntelligence,

  categoryBenchmarks:
    canUseCategoryBenchmarks,

  growthRecommendations:
    canUseGrowthRecommendations,

  advancedPromotionAnalytics:
    canUseAdvancedPromotionAnalytics,
};   

    /*
 * ==========================================================
 * BASIC ANALYTICS DATA
 * ==========================================================
 */

const analytics =
  analyticsResponse?.analytics ||
  null;

const period =
  analytics?.period ||
  null;

const overview =
  analytics?.overview ||
  {};

const engagement =
  analytics?.engagement ||
  {};

const listings =
  analytics?.listings ||
  {};

const offers =
  analytics?.offers ||
  {};

const trades =
  analytics?.trades ||
  {};

  const conversions =
  analytics?.conversions ||
  {};

const topListings =
  Array.isArray(
    analytics?.topListings
  )
    ? analytics.topListings
    : [];

const performance =
  analytics?.performance ||
  null;

const promotions =
  analytics?.promotions ||
  {};
/**
 * ==========================================================
 * BUSINESS PRO — CONVERSION INTELLIGENCE DATA
 * ==========================================================
 *
 * The dedicated Business Pro endpoint returns:
 *
 * {
 *   success,
 *   business,
 *   access,
 *   intelligence
 * }
 *
 * Keep this separate from the basic analytics payload.
 */

const conversionData =
  conversionIntelligence
    ?.intelligence ||
  null;

const conversionListings =
  Array.isArray(
    conversionData?.listings
  )
    ? conversionData.listings
    : [];

const conversionFunnel =
  conversionListings.reduce(
    (totals, listing) => {
      totals.views +=
        numberValue(
          listing?.views ??
            listing?.conversion
              ?.counts
              ?.views
        );

      totals.engagementActions +=
        numberValue(
          listing
            ?.engagementActions ??
            listing?.conversion
              ?.counts
              ?.engagementActions
        );

      totals.offersReceived +=
        numberValue(
          listing
            ?.offersReceived ??
            listing?.conversion
              ?.counts
              ?.offersReceived
        );

      totals.acceptedOffers +=
        numberValue(
          listing
            ?.acceptedOffers ??
            listing?.conversion
              ?.counts
              ?.acceptedOffers
        );

      totals.completedTrades +=
        numberValue(
          listing
            ?.completedTrades ??
            listing?.conversion
              ?.counts
              ?.completedTrades
        );

      return totals;
    },
    {
      views: 0,
      engagementActions: 0,
      offersReceived: 0,
      acceptedOffers: 0,
      completedTrades: 0,
    }
  );
const calculateConversionRate = (
  numerator,
  denominator
) => {
  const safeNumerator =
    numberValue(numerator);

  const safeDenominator =
    numberValue(denominator);

  if (safeDenominator <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (safeNumerator /
        safeDenominator) *
        100
    )
  );
};

const conversionRates = {
  viewToEngagement:
    calculateConversionRate(
      conversionFunnel
        .engagementActions,
      conversionFunnel.views
    ),

  engagementToOffer:
    calculateConversionRate(
      conversionFunnel
        .offersReceived,
      conversionFunnel
        .engagementActions
    ),

  offerAcceptance:
    calculateConversionRate(
      conversionFunnel
        .acceptedOffers,
      conversionFunnel
        .offersReceived
    ),

  acceptedOfferToTrade:
    calculateConversionRate(
      conversionFunnel
        .completedTrades,
      conversionFunnel
        .acceptedOffers
    ),

  viewToTrade:
    calculateConversionRate(
      conversionFunnel
        .completedTrades,
      conversionFunnel.views
    ),
};

/**
 * ==========================================================
 * BUSINESS PRO — DEMAND INTELLIGENCE DATA
 * ==========================================================
 */

const demandData =
  demandIntelligence
    ?.intelligence ||
  null;

const demandSummary =
  demandData?.summary ||
  {};

const demandDistribution =
  demandData?.distribution ||
  {};

const topDemandListings =
  Array.isArray(
    demandData
      ?.topDemandListings
  )
    ? demandData
        .topDemandListings
    : [];

const emergingDemand =
  Array.isArray(
    demandData?.emergingDemand
  )
    ? demandData
        .emergingDemand
    : [];

const highInterestLowConversion =
  Array.isArray(
    demandData
      ?.highInterestLowConversion
  )
    ? demandData
        .highInterestLowConversion
    : [];

const demandOpportunities =
  Array.isArray(
    demandData
      ?.demandOpportunities
  )
    ? demandData
        .demandOpportunities
    : [];

const demandListings =
  Array.isArray(
    demandData?.listings
  )
    ? demandData.listings
    : [];

    const formatDemandLevel = (
  value
) => {
  if (!value) {
    return "No observed demand";
  }

  return String(value)
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const getDemandBadgeClass = (
  level
) => {
  switch (level) {
    case "VERY_HIGH":
      return "border-[#D6B15E] bg-[#FFF8E5] text-[#7A5A14]";

    case "HIGH":
      return "border-green-200 bg-green-50 text-green-700";

    case "MODERATE":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "LOW":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
};

/*
 * ==========================================================
 * SAFE DISPLAY HELPERS
 * ==========================================================
 */

/**
 * BUSINESS PRO — CATEGORY BENCHMARKS
 * The API owns privacy suppression. Never infer or fill
 * missing competitor benchmark values with zero.
 */
const benchmarkData = categoryBenchmarks?.intelligence ?? null;
const benchmarkSummary = benchmarkData?.summary ?? {};
const benchmarkCategories = Array.isArray(benchmarkData?.categories)
  ? benchmarkData.categories
  : Array.isArray(benchmarkData?.categoryBenchmarks)
    ? benchmarkData.categoryBenchmarks
    : [];
const benchmarkListings = Array.isArray(benchmarkData?.listings)
  ? benchmarkData.listings
  : Array.isArray(benchmarkData?.listingComparisons)
    ? benchmarkData.listingComparisons
    : [];
const benchmarkOpportunities = Array.isArray(benchmarkData?.opportunities)
  ? benchmarkData.opportunities
  : Array.isArray(benchmarkData?.benchmarkOpportunities)
    ? benchmarkData.benchmarkOpportunities
    : [];
const benchmarkRecommendations = Array.isArray(benchmarkData?.recommendations)
  ? benchmarkData.recommendations
  : [];




/**
 * BUSINESS PRO — GROWTH RECOMMENDATIONS
 * API response: { success, intelligence: { summary, topActions,
 * businessRecommendations, listings, recommendations, ... } }
 */
const growthData = growthRecommendations?.intelligence ?? null;
const growthSummary = growthData?.summary ?? {};
const growthTopActions = Array.isArray(growthData?.topActions)
  ? growthData.topActions : [];
const growthBusinessActions = Array.isArray(growthData?.businessRecommendations)
  ? growthData.businessRecommendations : [];
const growthListingGroups = Array.isArray(growthData?.listings)
  ? growthData.listings : [];


/** Advanced Promotion Analytics — server-provided metrics only. */
const promotionData = advancedPromotionAnalytics?.intelligence ?? null;
const promotionSummary = promotionData?.summary ?? {};
const promotionCurrencies = Array.isArray(promotionSummary.currencies) ? promotionSummary.currencies : [];
const promotionCurrency = promotionCurrencies.length === 1 ? promotionCurrencies[0] : null;
const promotionBest = Array.isArray(promotionData?.bestPerformingPromotions) ? promotionData.bestPerformingPromotions : [];
const promotionUnderperforming = Array.isArray(promotionData?.underperformingPromotions) ? promotionData.underperformingPromotions : [];
const promotionRecommendations = Array.isArray(promotionData?.topRecommendations) ? promotionData.topRecommendations : [];
const promotionTrends = Array.isArray(promotionData?.trends) ? promotionData.trends : [];
const formatPromotionCost = (value) => value == null || !promotionCurrency
  ? "Not available"
  : `${promotionCurrency} ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

            <p className="mt-4 text-sm font-semibold text-gray-500">
              Loading Business
              Analytics...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error) {
    return (
      <main className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
              ⚠️
            </div>

            <h1 className="mt-4 text-xl font-extrabold text-[#3D0F18]">
              Unable to load analytics
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={
                  loadAnalytics
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
              >
                <RefreshCw
                  size={16}
                />

                Try again
              </button>

              <Link
                to="/business/dashboard"
                className="rounded-xl border border-[#D8CBCD] bg-white px-5 py-3 text-sm font-bold text-[#5B1725] transition hover:bg-[#F8ECEF]"
              >
                Business Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <main className="min-h-screen bg-[#F8F5F3] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* BREADCRUMB */}

        <div className="mb-5">
          <Link
            to="/business/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-[#5B1725]"
          >
            <ArrowLeft
              size={16}
            />

            Business Dashboard
          </Link>
        </div>

        {/* HERO */}

        <section className="overflow-hidden rounded-3xl bg-[#3D0F18] text-white shadow-sm">
          <div className="relative px-6 py-8 sm:px-8 lg:px-10">
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                    <BarChart3
                      size={22}
                    />
                  </div>

                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#D6B15E]">
                    Business Analytics
                  </p>
                </div>

                <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
                  {business?.businessName ||
                    "Your Business"}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  Understand how your
                  BarterConnekt business
                  performs and discover
                  opportunities to grow.
                </p>
              </div>

              <div>
                {isBusinessPro ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#D6B15E]/30 bg-[#D6B15E]/10 px-4 py-2 text-sm font-extrabold text-[#F2D58D]">
                    <Crown
                      size={16}
                    />

                    Business Pro
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/80">
                    Business Free
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ANALYTICS PERIOD */}

        <section className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[#3D0F18]">
              Analytics period
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Viewing the last{" "}
              {selectedDays} days.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
            {[7, 14, 30, ...(isBusinessPro ? [60, 90, 180, 365].filter((days) => days <= maxHistoryDays) : [])].map(
              (days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setSelectedDays(
                      days
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    selectedDays ===
                    days
                      ? "bg-[#5B1725] text-white"
                      : "border border-[#E7DDDF] bg-white text-gray-600 hover:border-[#5B1725] hover:text-[#5B1725]"
                  }`}
                >
                  {days} days
                </button>
              )
            )}

            {!isBusinessPro && (
              <Link
                to="/business/pro"
                className="inline-flex items-center gap-2 rounded-xl border border-[#E3D5B4] bg-[#FFF9EA] px-4 py-2 text-sm font-bold text-[#8A6420]"
              >
                <LockKeyhole
                  size={14}
                />

                Longer history
              </Link>
            )}
          </div>
        </section>

        {/* ACCESS SUMMARY */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Analytics Plan
            </p>

            <p className="mt-2 text-xl font-extrabold text-[#3D0F18]">
              {isBusinessPro
                ? "Business Pro"
                : "Business Free"}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              History
            </p>

            <p className="mt-2 text-xl font-extrabold text-[#3D0F18]">
              Up to{" "}
              {maxHistoryDays} days
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Advanced Analytics
            </p>

            <div className="mt-2 flex items-center gap-2">
              {!isBusinessPro && (
                <LockKeyhole
                  size={17}
                  className="text-gray-400"
                />
              )}

              <p className="text-xl font-extrabold text-[#3D0F18]">
                {dashboard
                  ?.advancedAnalytics
                  ? "Unlocked"
                  : "Locked"}
              </p>
            </div>
          </div>
        </section>

        {/* PERFORMANCE OVERVIEW */}

        <section className="rounded-3xl border border-[#E8DFDB] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A2638]">
                Performance Overview
              </p>

              <h2 className="mt-1 text-xl font-black text-[#3D0F18]">
                Marketplace activity
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Real activity recorded for your business during the selected period.
              </p>
            </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#E8DFDB] bg-[#FAF8F7] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Current period
              </p>

              <p className="mt-0.5 text-xs font-black text-[#3D0F18]">
                Last {selectedDays} days
              </p>
            </div>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8DFDB] bg-white text-[#5B1725] transition hover:bg-[#F8F5F3] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh analytics"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>
          </div>

          {period && (
            <div className="mt-4 rounded-xl bg-[#F8F5F3] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Analytics period
              </p>

              <p className="mt-1 text-xs font-bold text-[#3D0F18]">
                {period.days
                  ? `${period.days} days`
                  : `${selectedDays} days`}
              </p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Total Views
              </p>

              <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                {formatNumber(
                  overview.totalViews
                )}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Storefront and listing views
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Unique Visitors
              </p>

              <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                {formatNumber(
                  overview.uniqueVisitors
                )}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Observed unique visitors
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Offers Received
              </p>

              <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                {formatNumber(
                  overview.offersReceived
                )}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Marketplace offers received
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Completed Trades
              </p>

              <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                {formatNumber(
                  overview.completedTrades
                )}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Successfully completed exchanges
              </p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Active Listings
              </p>

              <p className="mt-2 text-xl font-black text-[#3D0F18]">
                {formatNumber(
                  overview.activeListings
                )}
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Engagement Actions
              </p>

              <p className="mt-2 text-xl font-black text-[#3D0F18]">
                {formatNumber(
                  overview.engagementActions
                )}
              </p>
            </article>

            <article className="rounded-2xl border border-[#EEE6E2] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Engagement Rate
              </p>

              <p className="mt-2 text-xl font-black text-[#3D0F18]">
                {Number(
                  engagement.engagementRate ||
                    0
                ).toFixed(1)}
                %
              </p>
            </article>
          </div>
        </section>

        {!isBusinessPro && (
          <section className="overflow-hidden rounded-3xl border border-[#E3D4C2] bg-white shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F0E1]">
                  <LockKeyhole
                    size={19}
                    className="text-[#9A762B]"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-black text-[#3D0F18]">
                      Extended analytics history
                    </h2>

                    <span className="rounded-full bg-[#F7F0E1] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#8A6721]">
                      Business Pro
                    </span>
                  </div>

                  <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                    Business Free includes up to{" "}
                    {maxHistoryDays} days of
                    analytics history. Upgrade to
                    Business Pro for extended
                    historical analytics and custom
                    date ranges.
                  </p>
                </div>
              </div>

              <Link
                to="/business/pro"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#3D0F18]"
              >
                <Crown size={15} />

                Explore Business Pro
              </Link>
            </div>
          </section>
        )}

        { /* BUSINESS ACTIVITY */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          {/* ENGAGEMENT */}

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#3D0F18]">
                  Customer Engagement
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Actions people took
                  after discovering your
                  business.
                </p>
              </div>

              <MousePointerClick
                size={22}
                className="text-[#8A2638]"
              />
            </div>

            <div className="mt-6 divide-y divide-[#EFE7E8]">
              <AnalyticsRow
                label="Contact clicks"
                value={numberValue(
                  engagement.contactClicks
                )}
              />

              <AnalyticsRow
                label="Phone clicks"
                value={numberValue(
                  engagement.phoneClicks
                )}
              />

              <AnalyticsRow
                label="Website clicks"
                value={numberValue(
                  engagement.websiteClicks
                )}
              />

              <AnalyticsRow
                label="Listing shares"
                value={numberValue(
                  engagement.listingShares
                )}
              />

              <AnalyticsRow
                label="Engagement rate"
                value={percentageValue(
                  engagement.engagementRate
                )}
              />
            </div>
          </div>

          {/* MARKETPLACE ACTIVITY */}

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-[#3D0F18]">
                  Marketplace Activity
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Listings, offers and
                  completed exchanges.
                </p>
              </div>

              <Store
                size={22}
                className="text-[#8A2638]"
              />
            </div>

            <div className="mt-6 divide-y divide-[#EFE7E8]">
              <AnalyticsRow
                label="Active listings"
                value={numberValue(
                  overview.activeListings
                )}
              />

              <AnalyticsRow
                label="Offers received"
                value={numberValue(
                  overview.offersReceived
                )}
              />

              <AnalyticsRow
                label="Completed trades"
                value={numberValue(
                  overview.completedTrades
                )}
              />

              <AnalyticsRow
                label="Total listing views"
                value={numberValue(
                  overview.listingViews
                )}
              />
            </div>
          </div>
        </section>

        {/* LISTINGS + PROMOTIONS */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8ECEF] text-[#5B1725]">
                <Package
                  size={19}
                />
              </div>

              <div>
                <h2 className="font-extrabold text-[#3D0F18]">
                  Listing Performance
                </h2>

                <p className="text-xs text-gray-500">
                  Basic listing analytics
                </p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-[#EFE7E8]">
              <AnalyticsRow
                label="Total listings"
                value={numberValue(
                  listings.totalListings
                )}
              />

              <AnalyticsRow
                label="Active listings"
                value={numberValue(
                  listings.activeListings
                )}
              />

              <AnalyticsRow
                label="Inactive listings"
                value={numberValue(
                  listings.inactiveListings
                )}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF9EA] text-[#8A6420]">
                <Tag
                  size={19}
                />
              </div>

              <div>
                <h2 className="font-extrabold text-[#3D0F18]">
                  Promotion Performance
                </h2>

                <p className="text-xs text-gray-500">
                  Basic promotion
                  analytics
                </p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-[#EFE7E8]">
              <AnalyticsRow
                label="Promotions"
                value={numberValue(
                  promotions.totalPromotions
                )}
              />

              <AnalyticsRow
                label="Promotion views"
                value={numberValue(
                  promotions.totalViews
                )}
              />

              <AnalyticsRow
                label="Promotion clicks"
                value={numberValue(
                  promotions.totalClicks
                )}
              />

              <AnalyticsRow
                label="Click-through rate"
                value={percentageValue(
                  promotions.clickThroughRate
                )}
              />
            </div>
          </div>
        </section>

        {/* TOP LISTINGS */}

        <section className="mt-6 rounded-3xl border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#3D0F18]">
                Top Listings
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your strongest listings
                during this analytics
                period.
              </p>
            </div>

            <BarChart3
              size={22}
              className="text-[#8A2638]"
            />
          </div>

          {topListings.length >
          0 ? (
            <div className="mt-6 space-y-3">
              {topListings.map(
                (listing, index) => (
                  <div
                    key={
                      listing.id ||
                      listing.listingId ||
                      index
                    }
                    className="flex flex-col gap-4 rounded-2xl border border-[#EFE7E8] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8ECEF] text-sm font-extrabold text-[#5B1725]">
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#3D0F18]">
                          {listing.title ||
                            listing.listingTitle ||
                            "Listing"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {numberValue(
                            listing.views
                          )}{" "}
                          views
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs">
                      <div>
                        <p className="text-gray-400">
                          Engagement
                        </p>

                        <p className="mt-1 font-extrabold text-[#3D0F18]">
                          {numberValue(
                            listing
                              .engagementActions
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">
                          Offers
                        </p>

                        <p className="mt-1 font-extrabold text-[#3D0F18]">
                          {numberValue(
                            listing
                              .offersReceived ??
                              listing.offers
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-400">
                          Trades
                        </p>

                        <p className="mt-1 font-extrabold text-[#3D0F18]">
                          {numberValue(
                            listing
                              .completedTrades
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#D8CBCD] bg-[#FCFAF9] px-6 py-10 text-center">
              <Package
                size={28}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 font-bold text-[#3D0F18]">
                No listing activity yet
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Listing performance will
                appear here as customers
                interact with your items.
              </p>
            </div>
          )}
        </section>

        {/* ======================================================
        BUSINESS PRO — CONVERSION INTELLIGENCE
        ====================================================== */}

      {canUseConversionIntelligence && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-[#DCC9CE] bg-white shadow-sm">
          {/* HEADER */}

          <div className="border-b border-[#EEE6E2] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                    <TrendingUp
                      size={19}
                    />
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A2638]">
                      Business Pro
                    </p>

                    <h2 className="mt-0.5 text-lg font-black text-[#3D0F18]">
                      Conversion Intelligence
                    </h2>
                  </div>
                </div>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                  See how marketplace
                  attention progresses from
                  listing views through
                  engagement, offers and
                  completed trades.
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FFF6DF] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#8A6420]">
                <Crown size={12} />

                Pro Intelligence
              </span>
            </div>
          </div>

          {/* LOADING */}

          {proAnalyticsLoading &&
          !conversionData ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <RefreshCw
                size={22}
                className="mx-auto animate-spin text-[#8A2638]"
              />

              <p className="mt-3 text-sm font-bold text-gray-500">
                Loading conversion
                intelligence...
              </p>
            </div>
          ) : proAnalyticsErrors
              ?.conversionIntelligence ? (
            /* ERROR */

            <div className="px-5 py-8 sm:px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-800">
                  Conversion Intelligence
                  could not be loaded.
                </p>

                <p className="mt-1 text-xs leading-5 text-red-600">
                  {
                    proAnalyticsErrors
                      .conversionIntelligence
                  }
                </p>
              </div>
            </div>
          ) : conversionData ? (
            <div className="p-5 sm:p-6">
              {/* CONVERSION FUNNEL */}

              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-[#3D0F18]">
                      Conversion Funnel
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Activity recorded
                      during the selected
                      analytics period.
                    </p>
                  </div>

                  <span className="rounded-xl bg-[#F8F5F3] px-3 py-2 text-xs font-black text-[#5B1725]">
                    {selectedDays} days
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {/* VIEWS */}

                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Views
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        conversionFunnel
                          .views
                      )}
                    </p>

                    <p className="mt-2 text-[11px] font-bold text-gray-400">
                      Funnel entry
                    </p>
                  </article>

                  {/* ENGAGEMENT */}

                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Engagement
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        conversionFunnel
                          .engagementActions
                      )}
                    </p>

                    <p className="mt-2 text-[11px] font-black text-[#8A2638]">
                      {percentageValue(
                        conversionRates
                          .viewToEngagement
                      )}{" "}
                      of views
                    </p>
                  </article>

                  {/* OFFERS */}

                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Offers
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        conversionFunnel
                          .offersReceived
                      )}
                    </p>

                    <p className="mt-2 text-[11px] font-black text-[#8A2638]">
                      {percentageValue(
                        conversionRates
                          .engagementToOffer
                      )}{" "}
                      from engagement
                    </p>
                  </article>

                  {/* ACCEPTED */}

                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Accepted
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        conversionFunnel
                          .acceptedOffers
                      )}
                    </p>

                    <p className="mt-2 text-[11px] font-black text-[#8A2638]">
                      {percentageValue(
                        conversionRates
                          .offerAcceptance
                      )}{" "}
                      of offers
                    </p>
                  </article>

                  {/* TRADES */}

                  <article className="rounded-2xl border border-[#E3D5B4] bg-[#FFF9EA] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#8A6420]">
                      Completed Trades
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        conversionFunnel
                          .completedTrades
                      )}
                    </p>

                    <p className="mt-2 text-[11px] font-black text-[#8A6420]">
                      {percentageValue(
                        conversionRates
                          .acceptedOfferToTrade
                      )}{" "}
                      from accepted offers
                    </p>
                  </article>
                </div>
              </div>

              {/* OVERALL CONVERSION */}

              <div className="mt-5 rounded-2xl border border-[#E7DDDF] bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Overall Conversion
                    </p>

                    <p className="mt-2 text-3xl font-black text-[#5B1725]">
                      {percentageValue(
                        conversionRates
                          .viewToTrade
                      )}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Listing views that
                      progressed to completed
                      trades.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8F5F3] px-5 py-4 sm:text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Completed
                    </p>

                    <p className="mt-1 text-xl font-black text-[#3D0F18]">
                      {formatNumber(
                        conversionFunnel
                          .completedTrades
                      )}{" "}
                      trades
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      from{" "}
                      {formatNumber(
                        conversionFunnel
                          .views
                      )}{" "}
                      listing views
                    </p>
                  </div>
                </div>
              </div>

              {/* EMPTY ACTIVITY */}

              {conversionFunnel.views ===
                0 &&
                conversionFunnel
                  .offersReceived ===
                  0 &&
                conversionFunnel
                  .completedTrades ===
                  0 && (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#D8CBCD] bg-[#FCFAF9] px-5 py-8 text-center">
                    <TrendingUp
                      size={25}
                      className="mx-auto text-gray-300"
                    />

                    <p className="mt-3 text-sm font-black text-[#3D0F18]">
                      No conversion activity
                      yet
                    </p>

                    <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-gray-500">
                      Conversion Intelligence
                      will become more useful
                      as customers view,
                      engage with and make
                      offers on your listings.
                    </p>
                  </div>
                )}
            </div>
          ) : (
            /* SUCCESSFUL ACCESS BUT NO PAYLOAD */

            <div className="px-5 py-8 text-center sm:px-6">
              <TrendingUp
                size={25}
                className="mx-auto text-gray-300"
              />

              <p className="mt-3 text-sm font-black text-[#3D0F18]">
                Conversion data unavailable
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Refresh analytics to load
                your conversion intelligence.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ======================================================
      BUSINESS PRO — DEMAND INTELLIGENCE
      ====================================================== */}

        {canUseDemandIntelligence && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#DCC9CE] bg-white shadow-sm">
            {/* HEADER */}

            <div className="border-b border-[#EEE6E2] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                    <Search size={19} />
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A2638]">
                      Business Pro
                    </p>

                    <h2 className="mt-0.5 text-lg font-black text-[#3D0F18]">
                      Demand Intelligence
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                      Understand which listings
                      are attracting the strongest
                      observed marketplace demand
                      and where opportunities are
                      developing.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FFF6DF] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#8A6420]">
                  <Crown size={12} />

                  Pro Intelligence
                </span>
              </div>
            </div>

            {/* LOADING */}

            {proAnalyticsLoading &&
            !demandData ? (
              <div className="px-5 py-10 text-center sm:px-6">
                <RefreshCw
                  size={22}
                  className="mx-auto animate-spin text-[#8A2638]"
                />

                <p className="mt-3 text-sm font-bold text-gray-500">
                  Loading demand
                  intelligence...
                </p>
              </div>
            ) : proAnalyticsErrors
                ?.demandIntelligence ? (
              /* ERROR */

              <div className="px-5 py-8 sm:px-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-black text-red-800">
                    Demand Intelligence
                    could not be loaded.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-600">
                    {
                      proAnalyticsErrors
                        .demandIntelligence
                    }
                  </p>
                </div>
              </div>
            ) : demandData ? (
              <div className="p-5 sm:p-6">
                {/* SUMMARY */}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Average Demand
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {numberValue(
                        demandSummary
                          .averageDemandScore
                      ).toFixed(1)}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Average listing score
                    </p>
                  </article>

                  <article className="rounded-2xl border border-[#E3D5B4] bg-[#FFF9EA] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#8A6420]">
                      Strongest Demand
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {numberValue(
                        demandSummary
                          .strongestDemandScore
                      ).toFixed(1)}
                    </p>

                    <p className="mt-1 text-xs text-[#8A6420]">
                      Highest observed score
                    </p>
                  </article>

                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      With Demand
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        demandSummary
                          .listingsWithDemand
                      )}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      of{" "}
                      {formatNumber(
                        demandSummary
                          .totalListings
                      )}{" "}
                      listings
                    </p>
                  </article>

                  <article className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Opportunities
                    </p>

                    <p className="mt-2 text-2xl font-black text-[#3D0F18]">
                      {formatNumber(
                        demandOpportunities
                          .length
                      )}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Demand not fully
                      converted
                    </p>
                  </article>
                </div>

                {/* ACTIVITY SUMMARY */}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <AnalyticsRow
                    label="Listing views"
                    value={formatNumber(
                      demandSummary
                        .totalViews
                    )}
                  />

                  <AnalyticsRow
                    label="Engagement actions"
                    value={formatNumber(
                      demandSummary
                        .totalEngagementActions
                    )}
                  />

                  <AnalyticsRow
                    label="Offers received"
                    value={formatNumber(
                      demandSummary
                        .totalOffersReceived
                    )}
                  />

                  <AnalyticsRow
                    label="Completed trades"
                    value={formatNumber(
                      demandSummary
                        .totalCompletedTrades
                    )}
                  />
                </div>

                {/* TOP DEMAND LISTINGS */}

                <div className="mt-6">
                  <div>
                    <h3 className="text-sm font-black text-[#3D0F18]">
                      Strongest Demand
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Listings generating the
                      strongest combination of
                      observed marketplace
                      demand signals.
                    </p>
                  </div>

                  {topDemandListings.length >
                  0 ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {topDemandListings.map(
                        (listing) => {
                          const level =
                            listing?.demand
                              ?.classification
                              ?.level;

                          return (
                            <article
                              key={listing.id}
                              className="rounded-2xl border border-[#EEE6E2] bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-[#3D0F18]">
                                    {listing.title ||
                                      "Listing"}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    Demand score{" "}
                                    <span className="font-black text-[#5B1725]">
                                      {numberValue(
                                        listing
                                          ?.demand
                                          ?.score
                                      ).toFixed(
                                        1
                                      )}
                                    </span>
                                  </p>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${getDemandBadgeClass(
                                    level
                                  )}`}
                                >
                                  {formatDemandLevel(
                                    level
                                  )}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-[#FAF8F7] p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                    Views
                                  </p>

                                  <p className="mt-1 text-sm font-black text-[#3D0F18]">
                                    {formatNumber(
                                      listing
                                        ?.metrics
                                        ?.views
                                    )}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-[#FAF8F7] p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                    Offers
                                  </p>

                                  <p className="mt-1 text-sm font-black text-[#3D0F18]">
                                    {formatNumber(
                                      listing
                                        ?.metrics
                                        ?.offersReceived
                                    )}
                                  </p>
                                </div>

                                <div className="rounded-xl bg-[#FAF8F7] p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                    Trades
                                  </p>

                                  <p className="mt-1 text-sm font-black text-[#3D0F18]">
                                    {formatNumber(
                                      listing
                                        ?.metrics
                                        ?.completedTrades
                                    )}
                                  </p>
                                </div>
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-[#D8CBCD] bg-[#FCFAF9] px-5 py-7 text-center">
                      <Search
                        size={23}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-2 text-sm font-black text-[#3D0F18]">
                        No observed demand yet
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Demand rankings will
                        appear as your listings
                        receive marketplace
                        activity.
                      </p>
                    </div>
                  )}
                </div>

                {/* DEMAND OPPORTUNITIES */}

                {demandOpportunities.length >
                  0 && (
                  <div className="mt-6 border-t border-[#EEE6E2] pt-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF6DF] text-[#8A6420]">
                        <Lightbulb
                          size={17}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-[#3D0F18]">
                          Demand
                          Opportunities
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Listings showing
                          demand but not yet
                          progressing to a
                          completed trade.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {demandOpportunities.map(
                        (listing) => (
                          <div
                            key={
                              listing.id
                            }
                            className="flex flex-col gap-3 rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#3D0F18]">
                                {listing.title ||
                                  "Listing"}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {
                                  formatNumber(
                                    listing
                                      ?.metrics
                                      ?.engagementActions
                                  )
                                }{" "}
                                engagements ·{" "}
                                {
                                  formatNumber(
                                    listing
                                      ?.metrics
                                      ?.offersReceived
                                  )
                                }{" "}
                                offers
                              </p>
                            </div>

                            <div className="shrink-0 sm:text-right">
                              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                Demand score
                              </p>

                              <p className="mt-1 text-lg font-black text-[#5B1725]">
                                {numberValue(
                                  listing
                                    ?.demand
                                    ?.score
                                ).toFixed(
                                  1
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* HIGH INTEREST / LOW CONVERSION */}

                {highInterestLowConversion
                  .length > 0 && (
                  <div className="mt-6 border-t border-[#EEE6E2] pt-6">
                    <h3 className="text-sm font-black text-[#3D0F18]">
                      High Interest, Low
                      Conversion
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      These listings have
                      observable engagement or
                      offers but no completed
                      trade in this period.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {highInterestLowConversion.map(
                        (listing) => (
                          <article
                            key={
                              listing.id
                            }
                            className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="min-w-0 truncate text-sm font-black text-[#3D0F18]">
                                {listing.title ||
                                  "Listing"}
                              </p>

                              <span className="shrink-0 text-xs font-black text-amber-700">
                                {numberValue(
                                  listing
                                    ?.demand
                                    ?.score
                                ).toFixed(
                                  1
                                )}
                              </span>
                            </div>

                            <p className="mt-2 text-xs leading-5 text-amber-800">
                              {formatNumber(
                                listing
                                  ?.metrics
                                  ?.engagementActions
                              )}{" "}
                              engagement actions
                              and{" "}
                              {formatNumber(
                                listing
                                  ?.metrics
                                  ?.offersReceived
                              )}{" "}
                              offers, but no
                              completed trade.
                            </p>
                          </article>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* COVERAGE */}

                <div className="mt-6 border-t border-[#EEE6E2] pt-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#F8F5F3] px-3 py-1.5 text-[10px] font-black text-[#5B1725]">
                      {formatNumber(
                        demandListings.length
                      )}{" "}
                      listings analysed
                    </span>

                    <span className="rounded-full bg-[#F8F5F3] px-3 py-1.5 text-[10px] font-black text-[#5B1725]">
                      {formatNumber(
                        emergingDemand.length
                      )}{" "}
                      emerging
                    </span>

                    <span className="rounded-full bg-[#F8F5F3] px-3 py-1.5 text-[10px] font-black text-[#5B1725]">
                      {formatNumber(
                        demandSummary
                          .listingsWithoutDemand
                      )}{" "}
                      without observed demand
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-8 text-center sm:px-6">
                <Search
                  size={25}
                  className="mx-auto text-gray-300"
                />

                <p className="mt-3 text-sm font-black text-[#3D0F18]">
                  Demand data unavailable
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Refresh analytics to load
                  your Demand Intelligence.
                </p>
              </div>
            )}
          </section>
        )}

        {/* BUSINESS PRO — CATEGORY BENCHMARKS */}
        {canUseCategoryBenchmarks && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#DCC9CE] bg-white shadow-sm">
            <div className="border-b border-[#EEE6E2] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                  <Scale size={19} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8A2638]">Business Pro</p>
                  <h2 className="mt-1 text-lg font-black text-[#3D0F18]">Category Benchmarks</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Compare your listings with privacy-safe aggregated marketplace performance in the same categories.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {proAnalyticsErrors?.categoryBenchmarks ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800">Category Benchmarks could not be loaded.</p>
                  <p className="mt-2 text-xs text-red-700">{proAnalyticsErrors.categoryBenchmarks}</p>
                </div>
              ) : proAnalyticsLoading && !benchmarkData ? (
                <div role="status" className="flex items-center gap-3 py-6 text-sm text-gray-500">
                  <RefreshCw size={18} className="animate-spin" /> Loading category benchmarks...
                </div>
              ) : !benchmarkData ? (
                <div className="rounded-2xl border border-dashed border-[#DCC9CE] bg-[#FAF8F7] p-6 text-center">
                  <Scale size={26} className="mx-auto text-[#8A2638]" />
                  <p className="mt-3 text-sm font-bold text-[#3D0F18]">Benchmark data unavailable</p>
                  <p className="mt-2 text-xs text-gray-500">Refresh the dashboard to retrieve your category comparisons.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-5">
                    <h3 className="text-sm font-black text-[#3D0F18]">Marketplace Comparison</h3>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Comparisons use aggregated activity from other eligible businesses. Small samples may be withheld to protect privacy.
                    </p>
                    {typeof benchmarkSummary?.description === "string" && (
                      <p className="mt-2 text-xs text-gray-600">{benchmarkSummary.description}</p>
                    )}
                  </div>

                  {benchmarkCategories.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-black text-[#3D0F18]">Category comparisons</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {benchmarkCategories.map((category, index) => (
                          <BenchmarkComparisonCard
                            key={category?.categoryId ?? category?.id ?? index}
                            item={category}
                            fallbackTitle={`Category ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {benchmarkListings.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-black text-[#3D0F18]">Listing comparisons</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {benchmarkListings.map((listing, index) => (
                          <BenchmarkComparisonCard
                            key={listing?.listingId ?? listing?.id ?? index}
                            item={listing}
                            fallbackTitle={`Listing ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {benchmarkOpportunities.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-black text-[#3D0F18]">Benchmark opportunities</h3>
                      <div className="space-y-3">
                        {benchmarkOpportunities.map((opportunity, index) => (
                          <BenchmarkInsightCard key={opportunity?.code ?? index} item={opportunity} />
                        ))}
                      </div>
                    </div>
                  )}

                  {benchmarkRecommendations.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-black text-[#3D0F18]">Recommendations</h3>
                      <div className="space-y-3">
                        {benchmarkRecommendations.map((recommendation, index) => (
                          <BenchmarkInsightCard key={recommendation?.code ?? index} item={recommendation} />
                        ))}
                      </div>
                    </div>
                  )}

                  {benchmarkCategories.length === 0 &&
                    benchmarkListings.length === 0 &&
                    benchmarkOpportunities.length === 0 &&
                    benchmarkRecommendations.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-[#DCC9CE] p-6 text-center">
                        <p className="text-sm font-bold text-[#3D0F18]">No displayable comparisons</p>
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Eligible marketplace samples may be insufficient, or there is no category activity for this period.
                        </p>
                      </div>
                    )}
                </>
              )}
            </div>
          </section>
        )}

        {/* ======================================================
            BUSINESS PRO — GROWTH RECOMMENDATIONS
        ====================================================== */}
        {canUseGrowthRecommendations && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#DCC9CE] bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEE6E2] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]">
                  <Lightbulb size={20} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8A2638]">Business Pro</p>
                  <h2 className="mt-1 text-lg font-black text-[#3D0F18]">Growth Recommendations</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Prioritized actions based on observed listing, conversion, demand and category signals.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#FFF6DF] px-3 py-1.5 text-[10px] font-black text-[#8A6420]">
                <Crown size={12} className="mr-1 inline" /> Pro Intelligence
              </span>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              {proAnalyticsErrors?.growthRecommendations ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-bold text-red-800">Growth recommendations unavailable</p>
                  <p className="mt-1 text-xs text-red-700">{proAnalyticsErrors.growthRecommendations}</p>
                </div>
              ) : proAnalyticsLoading && !growthData ? (
                <div className="flex items-center gap-3 py-8 text-sm text-gray-500">
                  <RefreshCw size={18} className="animate-spin" /> Loading growth recommendations...
                </div>
              ) : !growthData ? (
                <p className="rounded-2xl border border-dashed border-[#DCC9CE] p-6 text-center text-sm text-gray-500">
                  Growth insights are not available. Refresh analytics to try again.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      ["Total actions", growthSummary.totalRecommendations],
                      ["High priority", growthSummary.highPriority],
                      ["Medium priority", growthSummary.mediumPriority],
                      ["Affected listings", growthSummary.affectedListings],
                    ].map(([label, value]) => (
                      <article key={label} className="rounded-2xl border border-[#EEE6E2] bg-[#FAF8F7] p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">{label}</p>
                        <p className="mt-2 text-2xl font-black text-[#3D0F18]">{formatNumber(value)}</p>
                      </article>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-[#3D0F18]">Top actions</h3>
                    <p className="mt-1 text-xs text-gray-500">The five highest-ranked actions from your analytics engine.</p>
                    {growthTopActions.length ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {growthTopActions.map((action, index) => (
                          <GrowthActionCard key={`${action?.code ?? "action"}-${action?.listing?.id ?? index}`} action={action} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-2xl border border-dashed border-[#DCC9CE] p-5 text-sm text-gray-500">
                        No actionable recommendations were identified for this period.
                      </p>
                    )}
                  </div>

                  {growthBusinessActions.length > 0 && (
                    <div className="border-t border-[#EEE6E2] pt-5">
                      <h3 className="text-sm font-black text-[#3D0F18]">Business-wide improvements</h3>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {growthBusinessActions.map((action, index) => (
                          <GrowthActionCard key={`${action?.code ?? "business"}-${index}`} action={action} />
                        ))}
                      </div>
                    </div>
                  )}

                  {growthListingGroups.length > 0 && (
                    <div className="border-t border-[#EEE6E2] pt-5">
                      <h3 className="text-sm font-black text-[#3D0F18]">Listing-specific opportunities</h3>
                      <div className="mt-3 space-y-4">
                        {growthListingGroups.map((group, index) => (
                          <article key={group?.listing?.id ?? index} className="rounded-2xl border border-[#EEE6E2] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-black text-[#3D0F18]">{group?.listing?.title || "Listing"}</h4>
                              <span className="text-xs font-bold text-[#8A2638]">
                                {formatNumber(group?.recommendationCount)} actions
                              </span>
                            </div>
                            {Array.isArray(group?.recommendations) && group.recommendations.length > 0 && (
                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                {group.recommendations.map((action, actionIndex) => (
                                  <GrowthActionCard key={`${action?.code ?? "listing"}-${actionIndex}`} action={action} />
                                ))}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="border-t border-[#EEE6E2] pt-4 text-xs leading-5 text-gray-500">
                    Recommendations are generated from observed marketplace activity, not predictions or guarantees of results.
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {/* BUSINESS PRO — ADVANCED PROMOTION ANALYTICS */}
        {canUseAdvancedPromotionAnalytics && (
          <section className="mt-6 overflow-hidden rounded-3xl border border-[#DCC9CE] bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEE6E2] px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5E8EB] text-[#5B1725]"><Megaphone size={20} /></span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8A2638]">Business Pro</p>
                  <h2 className="mt-1 text-lg font-black text-[#3D0F18]">Advanced Promotion Analytics</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Evaluate promotion traffic, observed outcomes, costs and optimization opportunities.</p>
                </div>
              </div>
              <span className="rounded-full bg-[#FFF6DF] px-3 py-1.5 text-[10px] font-black text-[#8A6420]">Pro Intelligence</span>
            </div>
            <div className="space-y-6 p-5 sm:p-6">
              {proAnalyticsErrors?.advancedPromotionAnalytics ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{proAnalyticsErrors.advancedPromotionAnalytics}</div>
              ) : proAnalyticsLoading && !promotionData ? (
                <p className="flex items-center gap-2 py-8 text-sm text-gray-500"><RefreshCw size={16} className="animate-spin" /> Loading promotion intelligence...</p>
              ) : !promotionData ? (
                <p className="rounded-2xl border border-dashed p-5 text-sm text-gray-500">Promotion intelligence is unavailable. Refresh analytics to retry.</p>
              ) : numberValue(promotionSummary.totalPromotions) === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#DCC9CE] p-6 text-center text-sm text-gray-500">No promotions were recorded for this period.</p>
              ) : (
                <>
                  {promotionCurrencies.length > 1 && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Multiple currencies were used ({promotionCurrencies.join(", ")}). Combined spend and cost-per-outcome are not displayed because currencies cannot be added without conversion.</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <PromotionStat label="Promotions" value={formatNumber(promotionSummary.totalPromotions)} />
                    <PromotionStat label="Promotion views" value={formatNumber(promotionSummary.totalPromotionViews)} />
                    <PromotionStat label="Promotion clicks" value={formatNumber(promotionSummary.totalPromotionClicks)} />
                    <PromotionStat label="Click-through rate" value={percentageValue(promotionSummary.clickThroughRate)} />
                    <PromotionStat label="Total spend" value={formatPromotionCost(promotionSummary.totalSpend)} />
                    <PromotionStat label="Offers during promotions" value={formatNumber(promotionSummary.offersDuringPromotions)} />
                    <PromotionStat label="Accepted offers during promotions" value={formatNumber(promotionSummary.acceptedOffersDuringPromotions)} />
                    <PromotionStat label="Completed trades during promotions" value={formatNumber(promotionSummary.completedTradesDuringPromotions)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#3D0F18]">Cost efficiency</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <PromotionStat label="Cost per view" value={formatPromotionCost(promotionSummary.averageCostPerView)} />
                      <PromotionStat label="Cost per click" value={formatPromotionCost(promotionSummary.averageCostPerClick)} />
                      <PromotionStat label="Cost per offer" value={formatPromotionCost(promotionSummary.averageCostPerOffer)} />
                      <PromotionStat label="Cost per completed trade" value={formatPromotionCost(promotionSummary.averageCostPerCompletedTrade)} />
                    </div>
                  </div>
                  {promotionBest.length > 0 && (
                    <div className="border-t border-[#EEE6E2] pt-5">
                      <h3 className="text-sm font-black text-[#3D0F18]">Best-performing promotions</h3>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">{promotionBest.map((item, index) => <PromotionPerformanceCard key={item?.id ?? index} promotion={item} currencyLabel={promotionCurrency} />)}</div>
                    </div>
                  )}
                  {promotionUnderperforming.length > 0 && (
                    <div className="border-t border-[#EEE6E2] pt-5">
                      <h3 className="text-sm font-black text-[#3D0F18]">Promotions needing attention</h3>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">{promotionUnderperforming.map((item, index) => <PromotionPerformanceCard key={item?.id ?? index} promotion={item} currencyLabel={promotionCurrency} />)}</div>
                    </div>
                  )}
                  {promotionRecommendations.length > 0 && (
                    <div className="border-t border-[#EEE6E2] pt-5">
                      <h3 className="text-sm font-black text-[#3D0F18]">Optimization recommendations</h3>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">{promotionRecommendations.map((item, index) => <PromotionRecommendationCard key={`${item?.code ?? "tip"}-${index}`} item={item} />)}</div>
                    </div>
                  )}
                  {promotionTrends.length > 0 && (
                    <div className="border-t border-[#EEE6E2] pt-5">
                      <h3 className="text-sm font-black text-[#3D0F18]">Historical promotion activity</h3>
                      <p className="mt-2 text-xs text-gray-500">{formatNumber(promotionTrends.length)} trend data points available for this period.</p>
                    </div>
                  )}
                  <p className="border-t border-[#EEE6E2] pt-4 text-xs leading-5 text-gray-500">Offers and trades are activity observed during promotion windows, not proven results caused by promotions. Barter trades are not monetary revenue; financial ROI is not calculated.</p>
                </>
              )}
            </div>
          </section>
        )}

        {/* ======================================================
            BUSINESS PRO INTELLIGENCE
        ====================================================== */}

        <section className="mt-6 rounded-3xl border border-[#E8DFDB] bg-white p-5 shadow-sm sm:p-6">
          {/* HEADER */}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8A2638]">
                  Business Pro Intelligence
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF6DF] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#8A6420]">
                  <Crown size={11} />

                  Pro
                </span>
              </div>

              <h2 className="mt-2 text-xl font-black text-[#3D0F18]">
                Advanced business insights
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Unlock deeper intelligence for
                understanding conversions, demand,
                marketplace performance, growth
                opportunities, and promotions.
              </p>
            </div>

            {!isBusinessPro && (
              <Link
                to="/business/pro"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E3D5B4] bg-[#FFF9EA] px-4 py-2.5 text-xs font-black text-[#8A6420] transition hover:bg-[#FFF3D3]"
              >
                <Crown size={14} />

                Explore Business Pro
              </Link>
            )}
          </div>

          {/* ==================================================
              BUSINESS PRO FEATURE CARDS
          ================================================== */}

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {BUSINESS_PRO_ANALYTICS_FEATURES.map(
              (feature) => {
                const Icon =
                  feature.icon;

                const hasAccess =
                  businessProFeatureAccess[
                    feature.key
                  ] === true;

                return (
                  <article
                    key={feature.key}
                    className={`relative overflow-hidden rounded-2xl border p-5 transition ${
                      hasAccess
                        ? "border-[#DCC9CE] bg-[#FFFDFD]"
                        : "border-[#E8DFDB] bg-[#FAF8F7]"
                    }`}
                  >
                    {/* ICON + ACCESS BADGE */}

                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          hasAccess
                            ? "bg-[#F5E8EB] text-[#5B1725]"
                            : "bg-white text-gray-400"
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      {hasAccess ? (
                        <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#5B1725]">
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E8DFDB] bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-500">
                          <LockKeyhole
                            size={10}
                          />

                          Business Pro
                        </span>
                      )}
                    </div>

                    {/* FEATURE INFORMATION */}

                    <h3 className="mt-4 text-sm font-black text-[#3D0F18]">
                      {feature.title}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      {feature.description}
                    </p>

                    {/* LOCKED STATE */}

                    {!hasAccess && (
                      <div className="mt-4 border-t border-[#EDE5E2] pt-4">
                        <Link
                          to="/business/pro"
                          className="inline-flex items-center gap-1.5 text-xs font-black text-[#5B1725] transition hover:text-[#8A2638]"
                        >
                          <LockKeyhole
                            size={12}
                          />

                          Unlock with Business Pro
                        </Link>
                      </div>
                    )}

                    {/* AVAILABLE STATE */}

                  {hasAccess && (
                    <div className="mt-4 border-t border-[#EDE5E2] pt-4">
                      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B1725]">
                        <Crown size={12} />

                  {[
                    "conversionIntelligence",
                    "demandIntelligence",
                    "categoryBenchmarks",
                  ].includes(
                    feature.key
                  )
                    ? "Active above"
                    : "Included in your Business Pro access"}
                      </p>
                    </div>
                  )}
                  </article>
                );
              }
            )}
          </div>

          {/* ==================================================
              CUSTOM DATE RANGE ACCESS
          ================================================== */}

          {!canUseCustomDateRange && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-dashed border-[#DDCFD2] bg-[#FCFAF9] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gray-400">
                  <LockKeyhole
                    size={16}
                  />
                </div>

                <div>
                  <p className="text-xs font-black text-[#3D0F18]">
                    Custom date ranges
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Business Free uses preset
                    analytics periods. Custom and
                    extended historical ranges are
                    available with Business Pro.
                  </p>
                </div>
              </div>

              <Link
                to="/business/pro"
                className="shrink-0 text-xs font-black text-[#5B1725] transition hover:text-[#8A2638]"
              >
                View Business Pro
              </Link>
            </div>
          )}

          {/* ==================================================
              BUSINESS FREE UPGRADE CTA
          ================================================== */}

          {!isBusinessPro && (
            <div className="mt-5 rounded-2xl border border-[#E3D5B4] bg-[#FFF9EA] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D6B15E]/20 text-[#8A6420]">
                    <Crown size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#3D0F18]">
                      Unlock the full Business
                      Analytics experience
                    </p>

                    <p className="mt-1 max-w-xl text-xs leading-5 text-gray-600">
                      Upgrade to Business Pro for
                      advanced intelligence,
                      extended history, and custom
                      analytics periods.
                    </p>
                  </div>
                </div>

                <Link
                  to="/business/pro"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5B1725] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#3D0F18]"
                >
                  <Crown size={14} />

                  Explore Business Pro
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>  
    </main>
  );
};

/*
 * ============================================================
 * ANALYTICS METRIC CARD
 * ============================================================
 */

const AnalyticsMetricCard = ({
  icon: Icon,
  label,
  value,
  detail,
}) => {
  return (
    <div className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8ECEF] text-[#5B1725]">
          <Icon
            size={19}
          />
        </div>
      </div>

      <p className="mt-5 text-2xl font-extrabold text-[#3D0F18]">
        {value}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-700">
        {label}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {detail}
      </p>
    </div>
  );
};

/*
 * ============================================================
 * ANALYTICS ROW
 * ============================================================
 */

const AnalyticsRow = ({
  label,
  value,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="text-sm font-extrabold text-[#3D0F18]">
        {value}
      </p>
    </div>
  );
};

export default BusinessAnalytics;