
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getMyPromotions } from "../api/promotionApi";

const STATUS_STYLES = {
  ACTIVE: {
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    label: "Active",
  },

  PENDING: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    label: "Payment Pending",
  },

  EXPIRED: {
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    label: "Expired",
  },

  CANCELLED: {
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    label: "Cancelled",
  },
};

const PROMOTION_STYLES = {
  FEATURED: {
    icon: "⭐",
    label: "Featured",
    description: "Priority placement in the marketplace",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },

  BOOST: {
    icon: "🚀",
    label: "Boosted",
    description: "Higher visibility in marketplace results",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },

  HOMEPAGE: {
    icon: "🏠",
    label: "Homepage",
    description: "Featured placement on the homepage",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatMoney = (amount, currency = "KES") => {
  const value = Number(amount);

  if (Number.isNaN(value)) {
    return `${currency} —`;
  }

  return `${currency} ${value.toLocaleString("en-KE")}`;
};

const getListingImage = (listing) => {
  if (!listing) {
    return "https://placehold.co/600x400?text=No+Image";
  }

  return (
    listing.imageUrl ||
    listing.images?.[0]?.url ||
    listing.images?.[0]?.imageUrl ||
    "https://placehold.co/600x400?text=No+Image"
  );
};

const getRemainingDays = (endsAt) => {
  if (!endsAt) return 0;

  const difference =
    new Date(endsAt).getTime() -
    Date.now();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
};

const PromotionCard = ({
  promotion,
  onPromoteAgain,
  onContinuePayment,
  onViewAnalytics,
  onManageListing,
}) => {
  const promotionStyle =
    PROMOTION_STYLES[promotion.type] ||
    PROMOTION_STYLES.FEATURED;

  const statusStyle =
    STATUS_STYLES[promotion.status] ||
    STATUS_STYLES.CANCELLED;

  const listing = promotion.listing;

  const remainingDays =
    promotion.status === "ACTIVE"
      ? getRemainingDays(promotion.endsAt)
      : 0;

  const isExpired =
    promotion.status === "EXPIRED" ||
    (
      promotion.status === "ACTIVE" &&
      remainingDays <= 0
    );

  return (
    <article
      className={`
        overflow-hidden rounded-2xl border
        bg-white shadow-sm transition
        hover:-translate-y-0.5 hover:shadow-md
        ${
          promotion.status === "ACTIVE"
            ? "border-[#D9C2C7]"
            : "border-[#E7DDDF]"
        }
      `}
    >
      {/* Listing image */}
      <div className="relative h-52 overflow-hidden bg-[#F8F5F3]">
        <img
          src={getListingImage(listing)}
          alt={listing?.title || "Promoted listing"}
          className="h-full w-full object-cover"
        />

        {/* Promotion badge */}
        <div className="absolute left-4 top-4">
          <span
            className={`
              inline-flex items-center gap-1.5
              rounded-full border px-3 py-1.5
              text-xs font-extrabold shadow-sm
              ${promotionStyle.badge}
            `}
          >
            <span>
              {promotionStyle.icon}
            </span>

            {promotionStyle.label}
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute right-4 top-4">
          <span
            className={`
              inline-flex items-center gap-2
              rounded-full border bg-white/95
              px-3 py-1.5 text-xs font-bold
              shadow-sm
              ${statusStyle.badge}
            `}
          >
            <span
              className={`h-2 w-2 rounded-full ${statusStyle.dot}`}
            />

            {statusStyle.label}
          </span>
        </div>

        {/* Remaining days */}
        {promotion.status === "ACTIVE" &&
          !isExpired && (
            <div className="absolute bottom-4 left-4">
              <span className="rounded-lg bg-[#3D0F18]/90 px-3 py-2 text-xs font-bold text-white">
                {remainingDays === 1
                  ? "1 day remaining"
                  : `${remainingDays} days remaining`}
              </span>
            </div>
          )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold text-[#3D0F18]">
            {listing?.title ||
              "Untitled listing"}
          </h3>

          {listing?.category?.name && (
            <p className="mt-1 text-sm text-gray-500">
              {listing.category.name}
            </p>
          )}
        </div>

        {/* Promotion details */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#FBF5F6] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Promotion
            </p>

            <p className="mt-1 text-sm font-extrabold text-[#5B1725]">
              {promotionStyle.label}
            </p>
          </div>

          <div className="rounded-xl bg-[#FBF5F6] p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Duration
            </p>

            <p className="mt-1 text-sm font-extrabold text-[#5B1725]">
              {promotion.durationDays}{" "}
              {promotion.durationDays === 1
                ? "day"
                : "days"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Amount
            </p>

            <p className="mt-1 text-sm font-extrabold text-[#3D0F18]">
              {formatMoney(
                promotion.amount,
                promotion.currency
              )}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Created
            </p>

            <p className="mt-1 text-sm font-bold text-gray-700">
              {formatDate(
                promotion.createdAt
              )}
            </p>
          </div>
        </div>

        {/* Active information */}
        {promotion.status === "ACTIVE" &&
          !isExpired && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                Promotion active
              </p>

              <p className="mt-1 text-sm font-semibold text-green-800">
                Ends {formatDateTime(
                  promotion.endsAt
                )}
              </p>

              <p className="mt-1 text-xs text-green-600">
                {promotionStyle.description}
              </p>
            </div>
          )}

        {/* Expired information */}
        {(promotion.status === "EXPIRED" ||
          isExpired) && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Promotion ended
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-700">
              Ended {formatDate(
                promotion.endsAt
              )}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Your listing is still available for
              barter.
            </p>
          </div>
        )}

        {/* Pending information */}
        {promotion.status === "PENDING" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Payment required
            </p>

            <p className="mt-1 text-sm font-semibold text-amber-800">
              Complete payment to activate this
              promotion.
            </p>

            {promotion.payments?.[0]?.createdAt && (
              <p className="mt-1 text-xs text-amber-600">
                Latest payment attempt{" "}
                {formatDateTime(
                  promotion.payments[0].createdAt
                )}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {promotion.status === "PENDING" && (
            <button
              type="button"
              onClick={() =>
                onContinuePayment(promotion)
              }
              className="flex-1 rounded-xl bg-[#5B1725] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Continue Payment
            </button>
          )}

          {(promotion.status === "EXPIRED" ||
            promotion.status === "CANCELLED" ||
            isExpired) && (
            <button
              type="button"
              onClick={() =>
                onPromoteAgain(promotion)
              }
              className="flex-1 rounded-xl bg-[#5B1725] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Promote Again →
            </button>
          )}

          {promotion.status === "ACTIVE" &&
            !isExpired && (
              <button
                type="button"
                onClick={() =>
                  onViewAnalytics(promotion)
                }
                className="flex-1 rounded-xl bg-[#5B1725] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
              >
                View Analytics →
              </button>
            )}

          {promotion?.listing?.id && (
            <button
              type="button"
              onClick={() =>
                onManageListing(promotion)
              }
              className="flex-1 rounded-xl border border-[#DCAEB7] bg-white px-4 py-3 text-sm font-bold text-[#5B1725] transition hover:bg-[#FBF5F6]"
            >
              Manage Listing
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

const EmptyState = ({ title, message }) => {
  return (
    <div className="rounded-2xl border border-dashed border-[#DCCACE] bg-white p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
        📣
      </div>

      <h3 className="mt-4 text-lg font-extrabold text-[#3D0F18]">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {message}
      </p>
    </div>
  );
};

const MyPromotions = () => {
  const navigate = useNavigate();

  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  const loadPromotions = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getMyPromotions();

      setPromotions(
        response?.promotions || []
      );
    } catch (error) {
      console.error(
        "Load promotions error:",
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

  const activePromotions = useMemo(
    () =>
      promotions.filter(
        (promotion) =>
          promotion.status === "ACTIVE" &&
          getRemainingDays(
            promotion.endsAt
          ) > 0
      ),
    [promotions]
  );

  const pendingPromotions = useMemo(
    () =>
      promotions.filter(
        (promotion) =>
          promotion.status === "PENDING"
      ),
    [promotions]
  );

  const expiredPromotions = useMemo(
    () =>
      promotions.filter(
        (promotion) =>
          promotion.status === "EXPIRED" ||
          promotion.status === "CANCELLED" ||
          (
            promotion.status === "ACTIVE" &&
            getRemainingDays(
              promotion.endsAt
            ) <= 0
          )
      ),
    [promotions]
  );

  const completedPromotionSpend = useMemo(
    () =>
      promotions.reduce((total, promotion) => {
        const hasCompletedPayment =
          promotion.payments?.some(
            (payment) =>
              payment.status === "COMPLETED"
          );

        return hasCompletedPayment
          ? total + (Number(promotion.amount) || 0)
          : total;
      }, 0),
    [promotions]
  );

  const handlePromoteAgain = (
    promotion
  ) => {
    if (!promotion?.listingId) {
      return;
    }

    navigate(
      `/promotions?listingId=${encodeURIComponent(
        promotion.listingId
      )}`
    );
  };

  const handleContinuePayment = (
    promotion
  ) => {
    const listingId =
      promotion?.listing?.id ||
      promotion?.listingId;

    if (!promotion?.id || !listingId) {
      return;
    }

    const params = new URLSearchParams({
      continuePayment: "1",
      promotionId: promotion.id,
      promotionType: promotion.type || "",
    });

    navigate(
      `/listings/${listingId}/manage?${params.toString()}`
    );
  };

  const handleViewAnalytics = (
    promotion
  ) => {
    if (!promotion?.id) {
      return;
    }

    navigate(
      `/promotions/${promotion.id}/analytics`
    );
  };

  const handleManageListing = (
    promotion
  ) => {
    const listingId =
      promotion?.listing?.id ||
      promotion?.listingId;

    if (!listingId) {
      return;
    }

    navigate(
      `/listings/${listingId}/manage`
    );
  };

  if (loading) {
    return (
      <div className="min-h-[300px] rounded-2xl border border-[#E7DDDF] bg-white p-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

        <p className="mt-4 text-sm font-semibold text-gray-500">
          Loading your promotions...
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-5 border-b border-[#EEE6E8] bg-gradient-to-r from-[#FCF8F9] to-white p-5 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#8A2638]">
            Promotion Management
          </p>

          <h2 className="mt-1 text-2xl font-extrabold text-[#3D0F18] md:text-3xl">
            My Promotions
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Manage your promoted listings, track
            active campaigns and promote your
            listings again whenever you need more
            visibility.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/promotions")
          }
          className="rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
        >
          + Promote a Listing
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}

          <button
            type="button"
            onClick={loadPromotions}
            className="ml-3 font-extrabold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary */}
      {!error && (
        <div className="mx-5 mt-7 grid gap-4 sm:grid-cols-2 md:mx-8 xl:grid-cols-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-green-700">
              Active
            </p>

            <p className="mt-2 text-3xl font-extrabold text-green-800">
              {activePromotions.length}
            </p>

            <p className="mt-1 text-xs text-green-600">
              Currently promoting listings
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Pending
            </p>

            <p className="mt-2 text-3xl font-extrabold text-amber-800">
              {pendingPromotions.length}
            </p>

            <p className="mt-1 text-xs text-amber-600">
              Awaiting payment
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Expired
            </p>

            <p className="mt-2 text-3xl font-extrabold text-gray-700">
              {expiredPromotions.length}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Previous promotions
            </p>
          </div>

          <div className="rounded-2xl border border-[#E4D6B0] bg-[#FFF9E8] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A6A12]">
              Promotion Spend
            </p>

            <p className="mt-2 text-2xl font-extrabold text-[#5B1725]">
              {formatMoney(completedPromotionSpend)}
            </p>

            <p className="mt-1 text-xs text-[#8A6A12]">
              Completed promotion payments
            </p>
          </div>
        </div>
      )}

      {/* ACTIVE */}
      <div className="mx-5 mt-10 md:mx-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-[#3D0F18]">
              Active Promotions
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Promotions currently giving your
              listings additional visibility.
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            {activePromotions.length}
          </span>
        </div>

        {activePromotions.length === 0 ? (
          <EmptyState
            title="No active promotions"
            message="You do not currently have any active promoted listings."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {activePromotions.map(
              (promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={promotion}
                  onPromoteAgain={
                    handlePromoteAgain
                  }
                  onContinuePayment={
                    handleContinuePayment
                  }
                  onViewAnalytics={
                    handleViewAnalytics
                  }
                  onManageListing={
                    handleManageListing
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {/* PENDING */}
      {pendingPromotions.length > 0 && (
        <div className="mx-5 mt-10 md:mx-8">
          <div className="mb-4">
            <h3 className="text-xl font-extrabold text-[#3D0F18]">
              Pending Promotions
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Complete payment to activate these
              promotions.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {pendingPromotions.map(
              (promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={promotion}
                  onPromoteAgain={
                    handlePromoteAgain
                  }
                  onContinuePayment={
                    handleContinuePayment
                  }
                  onViewAnalytics={
                    handleViewAnalytics
                  }
                  onManageListing={
                    handleManageListing
                  }
                />
              )
            )}
          </div>
        </div>
      )}

      {/* EXPIRED */}
      <div className="mx-5 mb-8 mt-10 md:mx-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-[#3D0F18]">
              Expired Promotions
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Previous promotions that have ended.
            </p>
          </div>

          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
            {expiredPromotions.length}
          </span>
        </div>

        {expiredPromotions.length === 0 ? (
          <EmptyState
            title="No expired promotions"
            message="Your previous promotions will appear here after they expire."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {expiredPromotions.map(
              (promotion) => (
                <PromotionCard
                  key={promotion.id}
                  promotion={promotion}
                  onPromoteAgain={
                    handlePromoteAgain
                  }
                  onContinuePayment={
                    handleContinuePayment
                  }
                  onViewAnalytics={
                    handleViewAnalytics
                  }
                  onManageListing={
                    handleManageListing
                  }
                />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyPromotions;
