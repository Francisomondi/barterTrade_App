import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { getListingById, getListings } from "../api/listingApi";
import { createOffer } from "../api/offerApi";

import {
  showSuccess,
  showError,
  showWarning,
} from "../utils/toast";

const getPrimaryImage = (listing) => {
  if (!listing?.images?.length) {
    return null;
  }

  return (
    listing.images.find((image) => image.isPrimary) ||
    listing.images[0]
  );
};

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "Value not specified";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "Value not specified";
  }

  return `KES ${numericValue.toLocaleString()}`;
};

const formatCondition = (condition) => {
  if (!condition) {
    return "N/A";
  }

  return condition
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const MakeOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /*
   * ============================================================
   * MATCH OFFER FLOW
   * ============================================================
   */

  const requestedListingId =
    searchParams.get("requestedListingId");

  const offeredListingId =
    searchParams.get("offeredListingId");

  const isMatchOffer = Boolean(
    requestedListingId && offeredListingId
  );

  /*
   * Normal /make-offer/:id flow
   */

  const targetListingId =
    requestedListingId || id;

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [requestedListing, setRequestedListing] =
    useState(null);

  const [myListings, setMyListings] =
    useState([]);

  const [selectedListing, setSelectedListing] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ============================================================
   * LOAD DATA
   * ============================================================
   */

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        if (!targetListingId) {
          const message =
            "No listing was selected for this offer.";

          setError(message);
          showWarning(message);

          return;
        }

        /*
         * Load requested listing
         */

        const listingResponse =
          await getListingById(targetListingId);

        const targetListing =
          listingResponse?.listing ||
          listingResponse?.data?.listing;

        if (!targetListing) {
          const message =
            "The requested listing could not be found.";

          setError(message);
          showError(message);

          return;
        }

        if (cancelled) {
          return;
        }

        setRequestedListing(targetListing);

        /*
         * ======================================================
         * MATCH OFFER MODE
         * ======================================================
         */

        if (isMatchOffer) {
          const offeredResponse =
            await getListingById(offeredListingId);

          const offeredListing =
            offeredResponse?.listing ||
            offeredResponse?.data?.listing;

          if (!offeredListing) {
            const message =
              "Your matched listing could not be found.";

            setError(message);
            showError(message);

            return;
          }

          if (cancelled) {
            return;
          }

          setMyListings([offeredListing]);
          setSelectedListing(offeredListing.id);

          return;
        }

        /*
         * ======================================================
         * NORMAL OFFER MODE
         * ======================================================
         */

        const myListingsResponse =
          await getListings({
            mine: true,
          });

        if (cancelled) {
          return;
        }

        setMyListings(
          myListingsResponse?.listings || []
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "MAKE OFFER ERROR:",
          err
        );

        const message =
          err?.response?.data?.message ||
          "Unable to load offer information.";

        setError(message);
        showError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    targetListingId,
    offeredListingId,
    isMatchOffer,
  ]);

  /*
   * ============================================================
   * SELECTED ITEM
   * ============================================================
   */

  const selectedItem = myListings.find(
    (listing) =>
      listing.id === selectedListing
  );

  /*
   * ============================================================
   * VALUE COMPARISON
   * ============================================================
   */

  const requestedValue =
    Number(
      requestedListing?.estimatedValue || 0
    );

  const offeredValue =
    Number(
      selectedItem?.estimatedValue || 0
    );

  const valueDifference =
    selectedItem && requestedListing
      ? Math.abs(
          offeredValue -
            requestedValue
        )
      : 0;

  const valueDifferencePercentage =
    selectedItem &&
    requestedValue > 0
      ? (
          (valueDifference /
            requestedValue) *
          100
        ).toFixed(1)
      : "0";

  const valueRatio =
    requestedValue > 0
      ? Math.min(
          100,
          Math.max(
            5,
            (offeredValue /
              requestedValue) *
              100
          )
        )
      : 50;

  /*
   * ============================================================
   * SUBMIT OFFER
   * ============================================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    /*
     * Validate requested listing
     */

    if (!requestedListing) {
      const message =
        "The requested listing is unavailable.";

      setError(message);
      showError(message);

      return;
    }

    /*
     * Validate selected listing
     */

    if (!selectedListing) {
      const message =
        "Please select an item to offer.";

      setError(message);
      showWarning(message);

      return;
    }

    try {
      setSubmitting(true);

      const offerData = {
        receiverId:
          requestedListing.userId,

        offeredListingId:
          selectedListing,

        requestedListingId:
          requestedListing.id,

        ...(message.trim() && {
          message: message.trim(),
        }),
      };

      await createOffer(offerData);

      /*
       * Success toast FIRST
       */

      showSuccess(
        "Barter offer sent successfully! 🎉"
      );

      /*
       * Give Toastify a moment to display the
       * notification before navigating away.
       */

      setTimeout(() => {
        navigate("/dashboard", {
          state: {
            message:
              "Your barter offer has been sent successfully.",
          },
        });
      }, 900);
    } catch (err) {
      console.error(
        "OFFER SUBMISSION ERROR:",
        err
      );

      const errorMessage =
        err?.response?.data?.message ||
        "Unable to submit your offer.";

      setError(errorMessage);

      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse">
            <div className="h-5 w-28 rounded bg-[#E7DDDF]" />

            <div className="mt-3 h-8 w-52 rounded bg-[#E7DDDF]" />

            <div className="mt-2 h-4 w-80 max-w-full rounded bg-[#E7DDDF]" />

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white"
                >
                  <div className="h-48 bg-[#E7DDDF]" />

                  <div className="space-y-3 p-4">
                    <div className="h-5 w-32 rounded bg-[#E7DDDF]" />
                    <div className="h-4 w-24 rounded bg-[#E7DDDF]" />
                    <div className="h-8 w-full rounded bg-[#E7DDDF]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * ERROR / NOT FOUND
   * ============================================================
   */

  if (error && !requestedListing) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-xl font-extrabold text-[#3D0F18]">
              Unable to make offer
            </h1>

            <p className="mt-2 text-sm leading-5 text-gray-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-5 rounded-xl bg-[#5B1725] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const imageRequested =
    getPrimaryImage(requestedListing);

  const imageSelected =
    getPrimaryImage(selectedItem);

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="relative overflow-hidden bg-[#3D0F18]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#8A2638]/30 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#DCAEB7]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-7">
          <button
            type="button"
            onClick={() =>
              requestedListing
                ? navigate(
                    `/listings/${requestedListing.id}`
                  )
                : navigate(-1)
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/65 transition hover:text-white"
          >
            <span className="text-sm">
              ←
            </span>

            Back to item
          </button>

          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#DCAEB7]">
                {isMatchOffer
                  ? "Matched Trade"
                  : "Barter Offer"}
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Make an Offer
              </h1>

              <p className="mt-1 max-w-lg text-xs leading-5 text-white/60 sm:text-sm">
                {isMatchOffer
                  ? "Review the matched items and send your barter offer."
                  : "Choose an item from your listings to exchange."}
              </p>
            </div>

            <div className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right sm:block">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                BarterConnect
              </p>

              <p className="mt-0.5 text-xs font-semibold text-[#DCAEB7]">
                Trade • Connect • Grow
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
        {/* ====================================================
            TRADE PREVIEW
        ===================================================== */}

        <div className="grid items-stretch gap-3 md:grid-cols-[1fr_56px_1fr]">
          {/* ==================================================
              REQUESTED ITEM
          =================================================== */}

          <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F0E8EA] bg-[#FBF5F6] px-4 py-2.5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
                  You want
                </p>

                <p className="text-[11px] text-gray-500">
                  Requested item
                </p>
              </div>

              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E8EB] text-sm">
                🎯
              </span>
            </div>

            <div className="p-3.5">
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-[#F3EEEF]">
                {imageRequested?.url ? (
                  <img
                    src={imageRequested.url}
                    alt={
                      requestedListing?.title ||
                      "Requested listing"
                    }
                    className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    📦
                  </div>
                )}
              </div>

              <div className="mt-3">
                <h2 className="truncate text-base font-extrabold text-[#21191B]">
                  {requestedListing?.title}
                </h2>

                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {requestedListing?.category?.name ||
                    "Other"}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-lg bg-[#F5E8EB] px-2 py-1 text-[10px] font-bold capitalize text-[#5B1725]">
                  {formatCondition(
                    requestedListing?.condition
                  )}
                </span>

                <span className="text-sm font-black text-[#5B1725]">
                  {formatValue(
                    requestedListing?.estimatedValue
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* ==================================================
              EXCHANGE
          =================================================== */}

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 md:flex-col">
              <div className="hidden h-7 w-px bg-[#DCCBD0] md:block" />

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5B1725] text-lg text-white shadow-md">
                ⇄
              </div>

              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                Trade
              </span>

              <div className="hidden h-7 w-px bg-[#DCCBD0] md:block" />
            </div>
          </div>

          {/* ==================================================
              YOUR ITEM
          =================================================== */}

          <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F0E8EA] bg-[#FBF5F6] px-4 py-2.5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
                  You offer
                </p>

                <p className="text-[11px] text-gray-500">
                  {isMatchOffer
                    ? "Matched item"
                    : "Your item"}
                </p>
              </div>

              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E8EB] text-sm">
                📦
              </span>
            </div>

            <div className="p-3.5">
              {selectedItem ? (
                <>
                  <div className="aspect-[16/10] overflow-hidden rounded-xl bg-[#F3EEEF]">
                    {imageSelected?.url ? (
                      <img
                        src={imageSelected.url}
                        alt={
                          selectedItem.title
                        }
                        className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        📦
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <h2 className="truncate text-base font-extrabold text-[#21191B]">
                      {selectedItem.title}
                    </h2>

                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {selectedItem.category?.name ||
                        "Other"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-[#F5E8EB] px-2 py-1 text-[10px] font-bold capitalize text-[#5B1725]">
                      {formatCondition(
                        selectedItem.condition
                      )}
                    </span>

                    <span className="text-sm font-black text-[#5B1725]">
                      {formatValue(
                        selectedItem.estimatedValue
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-[#DCCBD0] bg-[#FBF5F6] px-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5E8EB] text-xl">
                    📦
                  </div>

                  <p className="mt-2 text-sm font-bold text-[#21191B]">
                    Select an item
                  </p>

                  <p className="mt-1 max-w-xs text-[11px] leading-5 text-gray-500">
                    Choose something below to offer in exchange.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            VALUE COMPARISON
        ===================================================== */}

        {selectedItem && (
          <section className="mt-4 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5E8EB] text-xs text-[#5B1725]">
                    ⇄
                  </span>

                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8A2638] sm:text-[10px]">
                    Value comparison
                  </p>
                </div>

                <h3 className="mt-1.5 text-base font-extrabold text-[#21191B] sm:text-lg">
                  Trade balance
                </h3>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  Difference
                </p>

                <p className="text-base font-black text-[#5B1725] sm:text-lg">
                  KES{" "}
                  {valueDifference.toLocaleString()}
                </p>

                <p className="text-[10px] text-gray-400">
                  {valueDifferencePercentage}%
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-[#F1E7E9]">
                <div
                  className="h-full rounded-full bg-[#8A2638] transition-all duration-500"
                  style={{
                    width: `${valueRatio}%`,
                  }}
                />
              </div>

              <div className="mt-1.5 flex justify-between gap-3 text-[10px] text-gray-500">
                <span className="truncate">
                  Your item:{" "}
                  <strong className="text-[#21191B]">
                    KES{" "}
                    {offeredValue.toLocaleString()}
                  </strong>
                </span>

                <span className="truncate text-right">
                  Requested:{" "}
                  <strong className="text-[#21191B]">
                    KES{" "}
                    {requestedValue.toLocaleString()}
                  </strong>
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ====================================================
            OFFER FORM
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="mt-4 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm"
        >
          <div className="border-b border-[#F0E8EA] px-4 py-4 sm:px-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
              {isMatchOffer
                ? "Matched listing"
                : "Your inventory"}
            </p>

            <h2 className="mt-1 text-base font-extrabold text-[#21191B] sm:text-lg">
              {isMatchOffer
                ? "Your matched item is ready"
                : "Choose what you want to trade"}
            </h2>

            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
              {isMatchOffer
                ? "Your matched item will be sent as the offer."
                : "Select one of your active listings below."}
            </p>
          </div>

          {/* ==================================================
              MY LISTINGS
          =================================================== */}

          {myListings.length === 0 ? (
            <div className="p-4 sm:p-5">
              <div className="rounded-xl border border-dashed border-[#D8C5C9] bg-[#FBF5F6] p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5E8EB] text-xl">
                  📦
                </div>

                <h3 className="mt-3 text-sm font-bold text-[#21191B]">
                  No active listings
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-gray-500">
                  Create a listing before making a barter offer.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/listings/create")
                  }
                  className="mt-4 rounded-xl bg-[#5B1725] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
                >
                  Create Listing
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {myListings.map((listing) => {
                  const selected =
                    selectedListing ===
                    listing.id;

                  const image =
                    getPrimaryImage(listing);

                  return (
                    <button
                      key={listing.id}
                      type="button"
                      disabled={isMatchOffer}
                      onClick={() => {
                        if (!isMatchOffer) {
                          setSelectedListing(
                            listing.id
                          );
                        }
                      }}
                      className={`group overflow-hidden rounded-xl border-2 text-left transition-all duration-200 ${
                        selected
                          ? "border-[#8A2638] bg-[#FBF5F6] shadow-md"
                          : "border-[#E7DDDF] bg-white hover:border-[#C79AA4] hover:shadow-sm"
                      } ${
                        isMatchOffer
                          ? "cursor-default"
                          : "cursor-pointer"
                      }`}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#F3EEEF]">
                        {image?.url ? (
                          <img
                            src={image.url}
                            alt={listing.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl">
                            📦
                          </div>
                        )}

                        <div
                          className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
                            selected
                              ? "bg-[#8A2638] text-white"
                              : "bg-white/90 text-transparent"
                          }`}
                        >
                          ✓
                        </div>
                      </div>

                      <div className="p-3">
                        <h3 className="truncate text-sm font-bold text-[#21191B]">
                          {listing.title}
                        </h3>

                        <p className="mt-0.5 truncate text-[11px] text-gray-500">
                          {listing.category?.name ||
                            "Other"}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] capitalize text-gray-400">
                            {formatCondition(
                              listing.condition
                            )}
                          </span>

                          <span className="shrink-0 text-xs font-extrabold text-[#5B1725]">
                            {formatValue(
                              listing.estimatedValue
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* =================================================
                  MESSAGE
              ================================================== */}

              <div className="mt-5 border-t border-[#F0E8EA] pt-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="message"
                    className="text-sm font-bold text-[#21191B]"
                  >
                    Message to owner
                  </label>

                  <span className="text-[10px] text-gray-400">
                    {message.length}/500
                  </span>
                </div>

                <p className="mt-0.5 text-[11px] text-gray-500">
                  Add a short message to introduce your offer.
                </p>

                <textarea
                  id="message"
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Tell the owner why you're interested..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] px-3.5 py-2.5 text-xs leading-5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:bg-white focus:ring-4 focus:ring-[#8A2638]/10"
                />
              </div>

              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700">
                  <span className="font-bold">
                    !
                  </span>

                  <span>{error}</span>
                </div>
              )}

              {/* =================================================
                  ACTIONS
              ================================================== */}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    requestedListing
                      ? navigate(
                          `/listings/${requestedListing.id}`
                        )
                      : navigate(-1)
                  }
                  className="rounded-xl border border-[#E7DDDF] bg-white px-5 py-2.5 text-xs font-bold text-gray-600 transition hover:bg-[#FBF5F6] hover:text-[#5B1725] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedListing
                  }
                  className="rounded-xl bg-[#5B1725] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#3D0F18] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {submitting
                    ? "Sending offer..."
                    : "Send Barter Offer →"}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* ====================================================
            FOOTER NOTE
        ===================================================== */}

        <div className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-center text-[10px] leading-5 text-gray-400">
          <span>🔒</span>

          <span>
            Review your items and estimated values before sending.
          </span>
        </div>
      </main>
    </div>
  );
};

export default MakeOffer;