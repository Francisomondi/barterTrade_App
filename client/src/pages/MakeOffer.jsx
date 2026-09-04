import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getListingById } from "../api/listingApi";
import { getListings } from "../api/listingApi";
import { createOffer } from "../api/offerApi";

const MakeOffer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requestedListing, setRequestedListing] =
    useState(null);

  const [myListings, setMyListings] = useState([]);

  const [selectedListing, setSelectedListing] =
    useState("");

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const listingResponse =
          await getListingById(id);

        setRequestedListing(
          listingResponse.listing
        );

        const myListingsResponse =
          await getListings({
            mine: true,
          });

        setMyListings(
          myListingsResponse.listings || []
        );
      } catch (error) {
        console.error(
          "Make offer error:",
          error
        );

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
    (listing) =>
      listing.id === selectedListing
  );

  const valueDifference =
    selectedItem && requestedListing
      ? Math.abs(
          Number(
            selectedItem.estimatedValue
          ) -
            Number(
              requestedListing.estimatedValue
            )
        )
      : 0;

  const valueDifferencePercentage =
    selectedItem &&
    requestedListing &&
    Number(requestedListing.estimatedValue) > 0
      ? (
          (valueDifference /
            Number(
              requestedListing.estimatedValue
            )) *
          100
        ).toFixed(1)
      : 0;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!selectedListing) {
      setError(
        "Please select an item to offer."
      );

      return;
    }

    try {
      setSubmitting(true);

      await createOffer({
        receiverId:
          requestedListing.userId,

        offeredListingId:
          selectedListing,

        requestedListingId:
          requestedListing.id,

        message:
          message.trim() || undefined,
      });

      navigate("/dashboard", {
        state: {
          message:
            "Your barter offer has been sent successfully.",
        },
      });
    } catch (error) {
      console.error(
        "Offer submission error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to submit your offer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#8A2638]" />

          <p className="mt-5 text-gray-500">
            Loading trade information...
          </p>
        </div>
      </div>
    );
  }

  if (error && !requestedListing) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F3]">

      {/* HEADER */}

      <section className="bg-[#3D0F18] px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/listings/${requestedListing.id}`
              )
            }
            className="mb-6 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            ← Back to item
          </button>

          <p className="text-sm font-bold uppercase tracking-widest text-[#DCAEB7]">
            Barter Offer
          </p>

          <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
            Make an offer
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Choose one of your items to exchange
            for this item.
          </p>

        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">

        {/* TRADE PREVIEW */}

        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">

          {/* THEIR ITEM */}

          <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

            <div className="bg-[#F5E8EB] px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                You want
              </p>
            </div>

            <div className="p-6">

              <div className="flex h-48 items-center justify-center rounded-xl bg-[#F8F5F3]">

                {requestedListing.images?.[0]?.url ? (
                  <img
                    src={
                      requestedListing
                        .images[0].url
                    }
                    alt={
                      requestedListing.title
                    }
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-5xl">
                    📦
                  </span>
                )}

              </div>

              <h2 className="mt-5 text-xl font-bold text-[#21191B]">
                {requestedListing.title}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {requestedListing.category?.name}
              </p>

              <div className="mt-4 flex items-center justify-between">

                <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                  {requestedListing.condition}
                </span>

                <span className="font-bold text-[#8A2638]">
                  KES{" "}
                  {Number(
                    requestedListing.estimatedValue
                  ).toLocaleString()}
                </span>

              </div>

            </div>

          </div>

          {/* EXCHANGE ICON */}

          <div className="flex items-center justify-center">

            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5B1725] text-2xl text-white shadow-lg">
              ⇄
            </div>

          </div>

          {/* YOUR ITEM */}

          <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">

            <div className="bg-[#F5E8EB] px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                You offer
              </p>
            </div>

            <div className="p-6">

              {selectedItem ? (
                <>
                  <div className="flex h-48 items-center justify-center rounded-xl bg-[#F8F5F3]">

                    {selectedItem.images?.[0]?.url ? (
                      <img
                        src={
                          selectedItem
                            .images[0].url
                        }
                        alt={
                          selectedItem.title
                        }
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <span className="text-5xl">
                        📦
                      </span>
                    )}

                  </div>

                  <h2 className="mt-5 text-xl font-bold text-[#21191B]">
                    {selectedItem.title}
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    {selectedItem.category?.name}
                  </p>

                  <div className="mt-4 flex items-center justify-between">

                    <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                      {selectedItem.condition}
                    </span>

                    <span className="font-bold text-[#8A2638]">
                      KES{" "}
                      {Number(
                        selectedItem.estimatedValue
                      ).toLocaleString()}
                    </span>

                  </div>
                </>
              ) : (
                <div className="flex h-[290px] flex-col items-center justify-center text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-3xl">
                    📦
                  </div>

                  <p className="mt-4 font-semibold text-[#21191B]">
                    Select an item
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose what you want to offer.
                  </p>

                </div>
              )}

            </div>

          </div>

        </div>

        {/* VALUE COMPARISON */}

        {selectedItem && (
          <div className="mt-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                  Value comparison
                </p>

                <h3 className="mt-1 text-xl font-bold text-[#21191B]">
                  Is the trade balanced?
                </h3>
              </div>

              <div className="text-left md:text-right">

                <p className="text-sm text-gray-500">
                  Difference
                </p>

                <p className="text-2xl font-extrabold text-[#5B1725]">
                  KES{" "}
                  {valueDifference.toLocaleString()}
                </p>

                <p className="text-xs text-gray-400">
                  {valueDifferencePercentage}%
                  difference
                </p>

              </div>

            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#F5E8EB]">

              <div
                className="h-full rounded-full bg-[#8A2638] transition-all"
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

            <div className="mt-3 flex justify-between text-xs text-gray-500">

              <span>
                Your item: KES{" "}
                {Number(
                  selectedItem.estimatedValue
                ).toLocaleString()}
              </span>

              <span>
                Requested: KES{" "}
                {Number(
                  requestedListing.estimatedValue
                ).toLocaleString()}
              </span>

            </div>

          </div>
        )}

        {/* OFFER FORM */}

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm md:p-8"
        >

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
              Your items
            </p>

            <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
              Choose what you want to trade
            </h2>
          </div>

          {myListings.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#D8C5C9] bg-[#FBF5F6] p-8 text-center">

              <div className="text-4xl">
                📦
              </div>

              <h3 className="mt-3 font-bold text-[#21191B]">
                You have no active listings
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Create a listing before making
                a barter offer.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/listings/create"
                  )
                }
                className="mt-5 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
              >
                Create Listing
              </button>

            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {myListings.map((listing) => {

                const selected =
                  selectedListing ===
                  listing.id;

                return (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() =>
                      setSelectedListing(
                        listing.id
                      )
                    }
                    className={`overflow-hidden rounded-2xl border-2 text-left transition ${
                      selected
                        ? "border-[#8A2638] bg-[#FBF5F6] shadow-lg"
                        : "border-[#E7DDDF] bg-white hover:border-[#B87987]"
                    }`}
                  >

                    <div className="relative h-40 bg-[#F8F5F3]">

                      {listing.images?.[0]?.url ? (
                        <img
                          src={
                            listing
                              .images[0].url
                          }
                          alt={listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">
                          📦
                        </div>
                      )}

                      {selected && (
                        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#8A2638] text-white">
                          ✓
                        </div>
                      )}

                    </div>

                    <div className="p-4">

                      <h3 className="font-bold text-[#21191B]">
                        {listing.title}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {listing.category?.name}
                      </p>

                      <p className="mt-3 font-bold text-[#8A2638]">
                        KES{" "}
                        {Number(
                          listing.estimatedValue
                        ).toLocaleString()}
                      </p>

                    </div>

                  </button>
                );
              })}

            </div>
          )}

          {/* MESSAGE */}

          {myListings.length > 0 && (
            <>
              <div className="mt-8">

                <label
                  htmlFor="message"
                  className="block text-sm font-bold text-[#21191B]"
                >
                  Message to the owner
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="message"
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  rows={4}
                  maxLength={500}
                  placeholder="Tell the owner why you're interested in this trade..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#8A2638]/10"
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {message.length}/500
                </p>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* SUBMIT */}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/listings/${requestedListing.id}`
                    )
                  }
                  className="rounded-xl border border-[#E7DDDF] px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-[#FBF5F6]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedListing
                  }
                  className="rounded-xl bg-[#5B1725] px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Sending offer..."
                    : "Send Barter Offer"}
                </button>

              </div>

            </>
          )}

        </form>

      </main>

    </div>
  );
};

export default MakeOffer;

