
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getListingById, getListings } from "../api/listingApi";
import { createOffer } from "../api/offerApi";

const MakeOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requestedListing, setRequestedListing] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const listingResponse = await getListingById(id);

        setRequestedListing(listingResponse.listing);

        const myListingsResponse = await getListings({
          mine: true,
        });

        setMyListings(myListingsResponse.listings || []);
      } catch (error) {
        console.error("Make offer error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load offer information."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const selectedItem = myListings.find(
    (listing) => listing.id === selectedListing
  );

  const valueDifference =
    selectedItem && requestedListing
      ? Math.abs(
          Number(selectedItem.estimatedValue) -
            Number(requestedListing.estimatedValue)
        )
      : 0;

  const valueDifferencePercentage =
    selectedItem &&
    requestedListing &&
    Number(requestedListing.estimatedValue) > 0
      ? (
          (valueDifference /
            Number(requestedListing.estimatedValue)) *
          100
        ).toFixed(1)
      : 0;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!selectedListing) {
      setError("Please select an item to offer.");
      return;
    }

    try {
      setSubmitting(true);

      const offerData = {
        receiverId: requestedListing.userId,
        offeredListingId: selectedListing,
        requestedListingId: requestedListing.id,
        ...(message.trim() && {
          message: message.trim(),
        }),
      };

      await createOffer(offerData);

      navigate("/dashboard", {
        state: {
          message:
            "Your barter offer has been sent successfully.",
        },
      });
    } catch (error) {
      console.error("Offer submission error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to submit your offer."
      );
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
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">

          <div className="animate-pulse">

            <div className="h-4 w-32 rounded bg-gray-200" />

            <div className="mt-5 h-9 w-64 rounded bg-gray-200 sm:h-11 sm:w-80" />

            <div className="mt-3 h-4 w-96 max-w-full rounded bg-gray-200" />

            <div className="mt-8 grid gap-5 lg:grid-cols-2">

              <div className="h-80 rounded-2xl bg-gray-200" />

              <div className="h-80 rounded-2xl bg-gray-200" />

            </div>

            <div className="mt-5 h-40 rounded-2xl bg-gray-200" />

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
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-16 sm:px-6 sm:py-20">

        <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm sm:p-9">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
            !
          </div>

          <h1 className="mt-4 text-xl font-bold text-[#21191B] sm:text-2xl">
            Unable to make offer
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              mt-6
              rounded-xl
              bg-[#5B1725]
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              transition
              hover:bg-[#3D0F18]
            "
          >
            Go back
          </button>

        </div>

      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#F8F5F3]">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="relative overflow-hidden bg-[#3D0F18]">

        {/* Decorative elements */}

        <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-[#8A2638]/25 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#DCAEB7]/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/listings/${requestedListing.id}`
              )
            }
            className="
              inline-flex
              items-center
              gap-1.5
              text-xs
              font-semibold
              text-white/65
              transition
              hover:text-white
              sm:text-sm
            "
          >
            <span className="text-base">←</span>
            Back to item
          </button>

          <div className="mt-6">

            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#DCAEB7] sm:text-xs">
              Barter Offer
            </p>

            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Make an offer
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65 sm:text-[15px]">
              Choose one of your items to exchange for the item you want.
            </p>

          </div>

        </div>

      </section>


      {/* ======================================================
          MAIN
      ======================================================= */}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">


        {/* ====================================================
            TRADE PREVIEW
        ===================================================== */}

        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">


          {/* ==================================================
              ITEM YOU WANT
          =================================================== */}

          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-[#F0E8EA] bg-[#FBF5F6] px-4 py-3">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
                  You want
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Requested item
                </p>

              </div>

              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E8EB] text-sm">
                🎯
              </span>

            </div>


            <div className="flex flex-1 flex-col p-4 sm:p-5">

              {/* Image */}

              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F3EEEF]">

                {requestedListing.images?.[0]?.url ? (
                  <img
                    src={
                      requestedListing.images[0].url
                    }
                    alt={requestedListing.title}
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">
                    📦
                  </div>
                )}

              </div>


              {/* Details */}

              <div className="mt-4">

                <h2 className="truncate text-base font-bold text-[#21191B] sm:text-lg">
                  {requestedListing.title}
                </h2>

                <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
                  {requestedListing.category?.name ||
                    "Other"}
                </p>

              </div>


              {/* Bottom */}

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">

                <span className="rounded-md bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold capitalize text-[#5B1725] sm:text-xs">
                  {requestedListing.condition?.replace(
                    "_",
                    " "
                  )}
                </span>

                <span className="text-sm font-extrabold text-[#5B1725] sm:text-base">
                  KES{" "}
                  {Number(
                    requestedListing.estimatedValue
                  ).toLocaleString()}
                </span>

              </div>

            </div>

          </div>


          {/* ==================================================
              EXCHANGE INDICATOR
          =================================================== */}

          <div className="flex items-center justify-center lg:px-1">

            <div className="flex flex-col items-center gap-2">

              <div className="hidden h-px w-8 bg-[#DCCBD0] lg:block" />

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full
                  bg-[#5B1725]
                  text-xl
                  text-white
                  shadow-md
                "
              >
                ⇄
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Exchange
              </span>

            </div>

          </div>


          {/* ==================================================
              YOUR ITEM
          =================================================== */}

          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

            <div className="flex items-center justify-between border-b border-[#F0E8EA] bg-[#FBF5F6] px-4 py-3">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
                  You offer
                </p>

                <p className="mt-0.5 text-xs text-gray-500">
                  Your selected item
                </p>

              </div>

              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E8EB] text-sm">
                📦
              </span>

            </div>


            <div className="flex flex-1 flex-col p-4 sm:p-5">

              {selectedItem ? (
                <>

                  {/* Image */}

                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F3EEEF]">

                    {selectedItem.images?.[0]?.url ? (
                      <img
                        src={
                          selectedItem.images[0].url
                        }
                        alt={selectedItem.title}
                        className="
                          h-full
                          w-full
                          object-cover
                        "
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">
                        📦
                      </div>
                    )}

                  </div>


                  {/* Details */}

                  <div className="mt-4">

                    <h2 className="truncate text-base font-bold text-[#21191B] sm:text-lg">
                      {selectedItem.title}
                    </h2>

                    <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
                      {selectedItem.category?.name ||
                        "Other"}
                    </p>

                  </div>


                  {/* Bottom */}

                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">

                    <span className="rounded-md bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold capitalize text-[#5B1725] sm:text-xs">
                      {selectedItem.condition?.replace(
                        "_",
                        " "
                      )}
                    </span>

                    <span className="text-sm font-extrabold text-[#5B1725] sm:text-base">
                      KES{" "}
                      {Number(
                        selectedItem.estimatedValue
                      ).toLocaleString()}
                    </span>

                  </div>

                </>
              ) : (

                <div className="flex min-h-[255px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#DCCBD0] bg-[#FBF5F6] px-5 text-center">

                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
                    📦
                  </div>

                  <p className="mt-3 text-sm font-bold text-[#21191B]">
                    Select an item
                  </p>

                  <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">
                    Choose something from your listings below to offer in exchange.
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
          <section className="mt-5 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm sm:p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5E8EB] text-sm text-[#5B1725]">
                    ⇄
                  </span>

                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A2638] sm:text-xs">
                    Value comparison
                  </p>

                </div>

                <h3 className="mt-2 text-lg font-extrabold text-[#21191B] sm:text-xl">
                  Is the trade balanced?
                </h3>

              </div>


              <div className="sm:text-right">

                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Difference
                </p>

                <p className="mt-0.5 text-xl font-black text-[#5B1725] sm:text-2xl">
                  KES{" "}
                  {valueDifference.toLocaleString()}
                </p>

                <p className="mt-0.5 text-xs text-gray-400">
                  {valueDifferencePercentage}% difference
                </p>

              </div>

            </div>


            {/* Progress */}

            <div className="mt-5">

              <div className="relative h-2 overflow-hidden rounded-full bg-[#F1E7E9]">

                <div
                  className="h-full rounded-full bg-[#8A2638] transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        5,
                        (Number(
                          selectedItem.estimatedValue
                        ) /
                          Number(
                            requestedListing.estimatedValue
                          )) *
                          100
                      )
                    )}%`,
                  }}
                />

              </div>

              <div className="mt-2 flex justify-between gap-4 text-[10px] text-gray-500 sm:text-xs">

                <span className="truncate">
                  Your item:{" "}
                  <strong className="text-[#21191B]">
                    KES{" "}
                    {Number(
                      selectedItem.estimatedValue
                    ).toLocaleString()}
                  </strong>
                </span>

                <span className="truncate text-right">
                  Requested:{" "}
                  <strong className="text-[#21191B]">
                    KES{" "}
                    {Number(
                      requestedListing.estimatedValue
                    ).toLocaleString()}
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
          className="
            mt-5
            overflow-hidden
            rounded-2xl
            border
            border-[#E7DDDF]
            bg-white
            shadow-sm
          "
        >

          {/* Form Header */}

          <div className="border-b border-[#F0E8EA] px-4 py-5 sm:px-6">

            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A2638] sm:text-xs">
              Your inventory
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-[#21191B] sm:text-xl">
              Choose what you want to trade
            </h2>

            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
              Select one of your active listings below.
            </p>

          </div>


          {/* ==================================================
              MY LISTINGS
          =================================================== */}

          {myListings.length === 0 ? (

            <div className="px-4 py-8 sm:px-6 sm:py-10">

              <div className="rounded-xl border border-dashed border-[#D8C5C9] bg-[#FBF5F6] p-7 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
                  📦
                </div>

                <h3 className="mt-3 text-sm font-bold text-[#21191B] sm:text-base">
                  You have no active listings
                </h3>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-gray-500 sm:text-sm">
                  Create a listing before making a barter offer.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/listings/create")
                  }
                  className="
                    mt-4
                    rounded-xl
                    bg-[#5B1725]
                    px-5
                    py-2.5
                    text-xs
                    font-bold
                    text-white
                    shadow-sm
                    transition
                    hover:bg-[#3D0F18]
                    sm:text-sm
                  "
                >
                  Create Listing
                </button>

              </div>

            </div>

          ) : (

            <div className="px-4 py-5 sm:px-6">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                {myListings.map((listing) => {

                  const selected =
                    selectedListing === listing.id;

                  return (
                    <button
                      key={listing.id}
                      type="button"
                      onClick={() =>
                        setSelectedListing(
                          listing.id
                        )
                      }
                      className={`
                        group
                        overflow-hidden
                        rounded-xl
                        border-2
                        text-left
                        transition-all
                        duration-200
                        ${
                          selected
                            ? "border-[#8A2638] bg-[#FBF5F6] shadow-md"
                            : "border-[#E7DDDF] bg-white hover:border-[#C79AA4] hover:shadow-sm"
                        }
                      `}
                    >

                      {/* Image */}

                      <div className="relative aspect-[4/3] overflow-hidden bg-[#F3EEEF]">

                        {listing.images?.[0]?.url ? (
                          <img
                            src={
                              listing.images[0].url
                            }
                            alt={listing.title}
                            className="
                              h-full
                              w-full
                              object-cover
                              transition
                              duration-300
                              group-hover:scale-[1.02]
                            "
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-4xl">
                            📦
                          </div>
                        )}


                        {/* Selection */}

                        <div
                          className={`
                            absolute
                            right-2.5
                            top-2.5
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            rounded-full
                            text-xs
                            font-bold
                            shadow-sm
                            ${
                              selected
                                ? "bg-[#8A2638] text-white"
                                : "bg-white/90 text-transparent"
                            }
                          `}
                        >
                          ✓
                        </div>

                      </div>


                      {/* Content */}

                      <div className="p-3">

                        <h3 className="truncate text-sm font-bold text-[#21191B]">
                          {listing.title}
                        </h3>

                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {listing.category?.name ||
                            "Other"}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2">

                          <span className="truncate text-xs text-gray-400">
                            {listing.condition?.replace(
                              "_",
                              " "
                            )}
                          </span>

                          <span className="shrink-0 text-sm font-extrabold text-[#5B1725]">
                            KES{" "}
                            {Number(
                              listing.estimatedValue
                            ).toLocaleString()}
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

              <div className="mt-6 border-t border-[#F0E8EA] pt-5">

                <label
                  htmlFor="message"
                  className="block text-sm font-bold text-[#21191B]"
                >
                  Message to the owner

                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <p className="mt-1 text-xs text-gray-500">
                  Add a short message to introduce your offer.
                </p>

                <textarea
                  id="message"
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Tell the owner why you're interested in this trade..."
                  className="
                    mt-2
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-[#E7DDDF]
                    bg-[#FBF5F6]
                    px-4
                    py-3
                    text-sm
                    leading-6
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-[#8A2638]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#8A2638]/10
                  "
                />

                <p className="mt-1 text-right text-[10px] text-gray-400 sm:text-xs">
                  {message.length}/500
                </p>

              </div>


              {/* =================================================
                  ERROR
              ================================================== */}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700 sm:text-sm">

                  <span className="font-bold">
                    !
                  </span>

                  <span>
                    {error}
                  </span>

                </div>
              )}


              {/* =================================================
                  ACTIONS
              ================================================== */}

              <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/listings/${requestedListing.id}`
                    )
                  }
                  className="
                    rounded-xl
                    border
                    border-[#E7DDDF]
                    bg-white
                    px-5
                    py-3
                    text-sm
                    font-bold
                    text-gray-600
                    transition
                    hover:bg-[#FBF5F6]
                    hover:text-[#5B1725]
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedListing
                  }
                  className="
                    rounded-xl
                    bg-[#5B1725]
                    px-7
                    py-3
                    text-sm
                    font-bold
                    text-white
                    shadow-md
                    transition-all
                    hover:bg-[#3D0F18]
                    hover:shadow-lg
                    active:scale-[0.99]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                    disabled:shadow-none
                  "
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

        <p className="mx-auto mt-5 max-w-xl text-center text-[10px] leading-5 text-gray-400 sm:text-xs">
          Review your selected item and estimated values before sending your barter offer.
        </p>

      </main>

    </div>
  );
};

export default MakeOffer;

