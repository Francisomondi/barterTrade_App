
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Crown,
  ImageOff,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

import {
  getMyBusinessFeaturedListings,
  addMyBusinessFeaturedListing,
  removeMyBusinessFeaturedListing,
  reorderMyBusinessFeaturedListings,
} from "../../api/business";

const BRAND = {
  primary: "#5B1725",
  dark: "#3D0F18",
  accent: "#8A2638",
  gold: "#D6B15E",
  background: "#F8F5F3",
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const formatKES = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Value unavailable";

  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getListingImage = (listing) =>
  listing?.images?.find((image) => image.isPrimary)?.url ||
  listing?.images?.[0]?.url ||
  null;

function ListingImage({ listing, className = "" }) {
  const image = getListingImage(listing);

  if (!image) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 text-stone-400 ${className}`}
      >
        <ImageOff size={26} />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={listing?.title || "Listing"}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

function StatusMessage({ type, message, onDismiss }) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <span>{message}</span>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss message"
        className="font-bold opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export default function BusinessFeaturedListingsManagement() {
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null);

  const [business, setBusiness] = useState(null);
  const [access, setAccess] = useState(null);

  const [featuredListings, setFeaturedListings] = useState([]);
  const [eligibleListings, setEligibleListings] = useState([]);

  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState("");

  const canManage =
    access?.canManageFeaturedListings === true;

  const maxFeaturedListings = Math.max(
    0,
    Number(access?.maxFeaturedListings) || 0
  );

  const featuredCount = featuredListings.length;

  const remainingSlots = canManage
    ? Math.max(0, maxFeaturedListings - featuredCount)
    : 0;

  const isBusy = busyAction !== null;

  const notify = (type, text) => {
    setMessage({ type, text });
  };

  /*
   * ==========================================================
   * LOAD FEATURED LISTINGS
   * ==========================================================
   */

  const loadFeaturedListings = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response =
        await getMyBusinessFeaturedListings();

      setBusiness(response.business || null);
      setAccess(response.access || null);

      setFeaturedListings(
        Array.isArray(response.featuredListings)
          ? response.featuredListings
          : []
      );

      setEligibleListings(
        Array.isArray(response.eligibleListings)
          ? response.eligibleListings
          : []
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(
          error,
          "Unable to load featured listings."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeaturedListings();
  }, [loadFeaturedListings]);

  /*
   * ==========================================================
   * DERIVED LISTING DATA
   * ==========================================================
   */

  const featuredIds = useMemo(
    () =>
      new Set(
        featuredListings.map((item) => item.listingId)
      ),
    [featuredListings]
  );

  const availableListings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return eligibleListings.filter((listing) => {
      if (featuredIds.has(listing.id)) return false;

      if (!term) return true;

      return (
        listing.title?.toLowerCase().includes(term) ||
        listing.category?.name
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [eligibleListings, featuredIds, search]);

  /*
   * ==========================================================
   * ADD FEATURED LISTING
   * ==========================================================
   */

  const handleAdd = async (listingId) => {
    if (!canManage || isBusy || remainingSlots <= 0) {
      return;
    }

    setBusyAction(`add:${listingId}`);
    setMessage(null);

    try {
      await addMyBusinessFeaturedListing(listingId);
      await loadFeaturedListings();

      notify(
        "success",
        "Listing added to your featured storefront."
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(
          error,
          "Unable to feature this listing."
        )
      );
    } finally {
      setBusyAction(null);
    }
  };

  /*
   * ==========================================================
   * REMOVE FEATURED LISTING
   * ==========================================================
   */

  const handleRemove = async (listingId) => {
    if (!canManage || isBusy) return;

    setBusyAction(`remove:${listingId}`);
    setMessage(null);

    try {
      await removeMyBusinessFeaturedListing(listingId);
      await loadFeaturedListings();

      notify(
        "success",
        "Listing removed from featured placement."
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(
          error,
          "Unable to remove featured listing."
        )
      );
    } finally {
      setBusyAction(null);
    }
  };

  /*
   * ==========================================================
   * REORDER FEATURED LISTINGS
   * ==========================================================
   */

  const handleMove = async (index, direction) => {
    if (!canManage || isBusy) return;

    const nextIndex = index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= featuredListings.length
    ) {
      return;
    }

    const reordered = [...featuredListings];

    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];

    const listingIds = reordered.map(
      (item) => item.listingId
    );

    setBusyAction("reorder");
    setMessage(null);

    try {
      await reorderMyBusinessFeaturedListings(
        listingIds
      );

      setFeaturedListings(reordered);

      notify(
        "success",
        "Featured listing order updated."
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(
          error,
          "Unable to update listing order."
        )
      );
    } finally {
      setBusyAction(null);
    }
  };

  /*
   * ==========================================================
   * LOADING STATE
   * ==========================================================
   */

  if (loading && !business) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-3 text-stone-600">
          <Loader2 className="animate-spin" size={22} />
          <span>Loading featured listings...</span>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * MAIN UI
   * ==========================================================
   */

  return (
    <div
      className="space-y-6 rounded-2xl p-4 sm:p-6"
      style={{ backgroundColor: BRAND.background }}
    >
      {/* HEADER */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Crown
              size={23}
              style={{ color: BRAND.gold }}
            />

            <h2
              className="text-xl font-bold sm:text-2xl"
              style={{ color: BRAND.dark }}
            >
              Featured Listings
            </h2>
          </div>

          <p className="max-w-xl text-sm text-stone-600">
            Choose which listings visitors see first
            on your business storefront.
          </p>

          {business?.businessName && (
            <p className="mt-2 text-xs text-stone-500">
              Managing: {business.businessName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={loadFeaturedListings}
          disabled={isBusy || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* STATUS */}

      <StatusMessage
        type={message?.type}
        message={message?.text}
        onDismiss={() => setMessage(null)}
      />

      {/* FREE TIER NOTICE */}

      {!canManage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Sparkles
              size={22}
              className="shrink-0 text-amber-600"
            />

            <div>
              <h3 className="font-semibold text-amber-950">
                Business Pro Feature
              </h3>

              <p className="mt-1 text-sm text-amber-900">
                Upgrade to Business Pro to highlight
                up to six listings on your public
                business storefront.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* USAGE SUMMARY */}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Featured",
            value: featuredCount,
          },
          {
            label: "Maximum",
            value: maxFeaturedListings,
          },
          {
            label: "Available Slots",
            value: remainingSlots,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {item.label}
            </p>

            <p
              className="mt-2 text-2xl font-bold"
              style={{ color: BRAND.primary }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* FEATURED LISTINGS */}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3
            className="flex items-center gap-2 text-lg font-semibold"
            style={{ color: BRAND.dark }}
          >
            <Star size={19} fill={BRAND.gold} />
            Your Featured Listings
          </h3>

          <span className="text-xs text-stone-500">
            Display order
          </span>
        </div>

        {featuredListings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center">
            <Star
              className="mx-auto mb-3 text-stone-300"
              size={30}
            />

            <p className="font-medium text-stone-700">
              No featured listings yet
            </p>

            <p className="mt-1 text-sm text-stone-500">
              Select an active listing below to
              feature it on your storefront.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {featuredListings.map((item, index) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 p-3"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    backgroundColor: BRAND.background,
                    color: BRAND.primary,
                  }}
                >
                  {index + 1}
                </span>

                <ListingImage
                  listing={item.listing}
                  className="h-16 w-16 shrink-0 rounded-lg"
                />

                <div className="min-w-[120px] flex-1">
                  <p className="line-clamp-1 font-semibold text-stone-800">
                    {item.listing?.title}
                  </p>

                  <p className="mt-1 text-sm text-stone-500">
                    {formatKES(
                      item.listing?.estimatedValue
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Move ${item.listing?.title} up`}
                    title="Move up"
                    onClick={() => handleMove(index, -1)}
                    disabled={
                      !canManage ||
                      isBusy ||
                      index === 0
                    }
                    className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50 disabled:opacity-30"
                  >
                    <ArrowUp size={17} />
                  </button>

                  <button
                    type="button"
                    aria-label={`Move ${item.listing?.title} down`}
                    title="Move down"
                    onClick={() => handleMove(index, 1)}
                    disabled={
                      !canManage ||
                      isBusy ||
                      index ===
                        featuredListings.length - 1
                    }
                    className="rounded-lg border border-stone-200 p-2 hover:bg-stone-50 disabled:opacity-30"
                  >
                    <ArrowDown size={17} />
                  </button>

                  <button
                    type="button"
                    aria-label={`Remove ${item.listing?.title}`}
                    title="Remove featured listing"
                    onClick={() =>
                      handleRemove(item.listingId)
                    }
                    disabled={!canManage || isBusy}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                  >
                    {busyAction ===
                    `remove:${item.listingId}` ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={17} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ELIGIBLE LISTINGS */}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h3
            className="text-lg font-semibold"
            style={{ color: BRAND.dark }}
          >
            Add Featured Listings
          </h3>

          <p className="mt-1 text-sm text-stone-500">
            Only your active listings are eligible.
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search your listings..."
          aria-label="Search eligible listings"
          className="mb-4 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-[#8A2638]"
        />

        {availableListings.length === 0 ? (
          <p className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">
            No eligible listings found.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {availableListings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center gap-3 rounded-xl border border-stone-200 p-3"
              >
                <ListingImage
                  listing={listing}
                  className="h-20 w-20 shrink-0 rounded-lg"
                />

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-stone-800">
                    {listing.title}
                  </p>

                  <p className="mt-1 text-xs text-stone-500">
                    {listing.category?.name ||
                      "Uncategorized"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-stone-700">
                    {formatKES(
                      listing.estimatedValue
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleAdd(listing.id)
                  }
                  disabled={
                    !canManage ||
                    isBusy ||
                    remainingSlots <= 0
                  }
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    backgroundColor: BRAND.primary,
                  }}
                >
                  {busyAction ===
                  `add:${listing.id}` ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    "Feature"
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* STOREFRONT PREVIEW */}

      {featuredListings.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2
              size={19}
              style={{ color: BRAND.accent }}
            />

            <h3
              className="text-lg font-semibold"
              style={{ color: BRAND.dark }}
            >
              Storefront Preview
            </h3>
          </div>

          <p className="mb-4 text-sm text-stone-500">
            This preview shows your saved featured
            listing order. Public featured placement
            will be connected in the next step.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((item, index) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-stone-200"
              >
                <div className="relative">
                  <ListingImage
                    listing={item.listing}
                    className="aspect-[4/3] w-full"
                  />

                  <span
                    className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{
                      backgroundColor: BRAND.primary,
                    }}
                  >
                    Featured #{index + 1}
                  </span>
                </div>

                <div className="p-3">
                  <p className="line-clamp-1 font-semibold text-stone-800">
                    {item.listing?.title}
                  </p>

                  <p className="mt-1 text-sm text-stone-600">
                    {formatKES(
                      item.listing?.estimatedValue
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
