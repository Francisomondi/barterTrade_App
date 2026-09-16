
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getSentOffers,
  getReceivedOffers,
  acceptOffer,
  rejectOffer,
  cancelOffer,
} from "../api/offerApi";

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (value) => {
  if (value === null || value === undefined) {
    return "Value not specified";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "Value not specified";
  }

  return `KES ${numericValue.toLocaleString("en-KE")}`;
};

const getImage = (listing) => {
  if (!listing) return null;

  if (listing.imageUrl) {
    return listing.imageUrl;
  }

  if (
    listing.images &&
    Array.isArray(listing.images) &&
    listing.images.length > 0
  ) {
    return listing.images[0]?.url || listing.images[0]?.imageUrl || null;
  }

  return null;
};

const getStatusClass = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    case "CANCELLED":
      return "bg-gray-100 text-gray-600 border-gray-200";

    case "COUNTERED":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "EXPIRED":
      return "bg-orange-50 text-orange-700 border-orange-200";

    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

const getStatusDot = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-500";

    case "ACCEPTED":
      return "bg-emerald-500";

    case "REJECTED":
      return "bg-red-500";

    case "CANCELLED":
      return "bg-gray-400";

    case "COUNTERED":
      return "bg-purple-500";

    case "EXPIRED":
      return "bg-orange-500";

    default:
      return "bg-gray-400";
  }
};

const ItemPreview = ({ listing, label }) => {
  const image = getImage(listing);

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[#E9DFE1] bg-[#FCF9F9] p-2.5 transition hover:border-[#D9C2C7]">
      <p className="mb-2 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A2638]">
        {label}
      </p>

      <div className="flex min-w-0 gap-2.5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F3E7E9]">
          {image ? (
            <img
              src={image}
              alt={listing?.title || "Listing"}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">
              📦
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-bold text-[#21191B]">
            {listing?.title || "Item"}
          </h3>

          <p className="mt-1 truncate text-[10px] text-gray-500">
            {listing?.condition || "Condition not specified"}
          </p>

          <p className="mt-1.5 truncate text-xs font-extrabold text-[#5B1725]">
            {formatPrice(listing?.estimatedValue)}
          </p>
        </div>
      </div>
    </div>
  );
};

const Offers = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("received");
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [sentOffers, setSentOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      setError("");

      const [receivedResponse, sentResponse] = await Promise.all([
        getReceivedOffers(),
        getSentOffers(),
      ]);

      setReceivedOffers(receivedResponse.offers || []);
      setSentOffers(sentResponse.offers || []);
    } catch (err) {
      console.error("Failed to load offers:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load your trade offers."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offerId) => {
    try {
      setActionLoading(offerId);
      setError("");
      setSuccess("");

      const response = await acceptOffer(offerId);

      setSuccess(
        response.message ||
          "Offer accepted and trade created successfully."
      );

      await loadOffers();
    } catch (err) {
      console.error("Accept offer error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to accept the offer."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (offerId) => {
    try {
      setActionLoading(offerId);
      setError("");
      setSuccess("");

      const response = await rejectOffer(offerId);

      setSuccess(
        response.message || "Offer rejected successfully."
      );

      await loadOffers();
    } catch (err) {
      console.error("Reject offer error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to reject the offer."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (offerId) => {
    try {
      setActionLoading(offerId);
      setError("");
      setSuccess("");

      const response = await cancelOffer(offerId);

      setSuccess(
        response.message || "Offer cancelled successfully."
      );

      await loadOffers();
    } catch (err) {
      console.error("Cancel offer error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to cancel the offer."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const OfferItem = ({ offer, type }) => {
    const isReceived = type === "received";

    const offeredItem = offer.offeredListing;
    const requestedItem = offer.requestedListing;

    const isPending = offer.status === "PENDING";
    const isProcessing = actionLoading === offer.id;

    return (
      <article
        className="
          group overflow-hidden rounded-2xl
          border border-[#E7DDDF]
          bg-white
          shadow-[0_3px_14px_rgba(61,15,24,0.05)]
          transition duration-300
          hover:-translate-y-0.5
          hover:shadow-[0_8px_24px_rgba(61,15,24,0.10)]
        "
      >
        {/* CARD HEADER */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EEE5E7] px-4 py-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E8EB] text-xs font-bold text-[#5B1725]">
                {isReceived ? "↙" : "↗"}
              </div>

              <p className="truncate text-xs font-bold text-[#3D0F18]">
                {isReceived
                  ? offer.sender?.name || "A user"
                  : offer.receiver?.name || "Another user"}
              </p>
            </div>

            <p className="mt-1 pl-9 text-[10px] text-gray-400">
              {isReceived ? "Sent you an offer" : "Offer sent"} •{" "}
              {formatDate(offer.createdAt)}
            </p>
          </div>

          <span
            className={`
              inline-flex shrink-0 items-center gap-1.5
              rounded-full border px-2.5 py-1
              text-[9px] font-extrabold uppercase tracking-wide
              ${getStatusClass(offer.status)}
            `}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${getStatusDot(
                offer.status
              )}`}
            />

            {offer.status}
          </span>
        </div>

        {/* TRADE VISUAL */}
        <div className="px-3.5 pt-3.5">
          <div className="flex items-stretch gap-2">
            <ItemPreview
              listing={offeredItem}
              label={isReceived ? "They offer" : "You offer"}
            />

            <div className="flex w-7 shrink-0 items-center justify-center">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E2D0D4] bg-[#F8F2F3] text-sm font-bold text-[#5B1725]">
                ⇄
              </div>
            </div>

            <ItemPreview
              listing={requestedItem}
              label={isReceived ? "You give" : "They receive"}
            />
          </div>
        </div>

        {/* VALUE SUMMARY */}
        <div className="mx-3.5 mt-3 flex items-center justify-between rounded-xl bg-[#FBF7F7] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">
              Exchange
            </p>

            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#3D0F18]">
              {offeredItem?.title || "Item"}{" "}
              <span className="font-normal text-gray-400">for</span>{" "}
              {requestedItem?.title || "item"}
            </p>
          </div>

          <div className="ml-3 shrink-0 text-right">
            <p className="text-[9px] text-gray-400">Offer value</p>

            <p className="text-[11px] font-extrabold text-[#5B1725]">
              {formatPrice(offeredItem?.estimatedValue)}
            </p>
          </div>
        </div>

        {/* MESSAGE */}
        {offer.message && (
          <div className="mx-3.5 mt-3 rounded-xl border border-[#E9DDE0] bg-[#FAF4F5] px-3 py-2.5">
            <div className="flex gap-2">
              <span className="text-xs">💬</span>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A2638]">
                  Message
                </p>

                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#4B3A3E]">
                  “{offer.message}”
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TRADE CREATED */}
        {offer.trade && (
          <div className="mx-3.5 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  ✓
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-emerald-800">
                    Trade created
                  </p>

                  <p className="truncate text-[9px] text-emerald-700">
                    {offer.trade.tradeNumber} • {offer.trade.status}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(`/trades/${offer.trade.id}`)
                }
                className="
                  shrink-0 rounded-lg
                  bg-[#5B1725]
                  px-3 py-1.5
                  text-[10px] font-bold text-white
                  transition hover:bg-[#3D0F18]
                "
              >
                View Trade
              </button>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        {isPending && (
          <div className="mt-3 flex gap-2 border-t border-[#EEE5E7] px-3.5 py-3">
            {isReceived ? (
              <>
                <button
                  type="button"
                  onClick={() => handleAccept(offer.id)}
                  disabled={isProcessing}
                  className="
                    flex-1 rounded-lg
                    bg-[#5B1725]
                    px-3 py-2
                    text-[10px] font-bold text-white
                    shadow-sm
                    transition
                    hover:bg-[#3D0F18]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {isProcessing ? "Processing..." : "Accept"}
                </button>

                <button
                  type="button"
                  onClick={() => handleReject(offer.id)}
                  disabled={isProcessing}
                  className="
                    flex-1 rounded-lg
                    border border-red-200
                    bg-white
                    px-3 py-2
                    text-[10px] font-bold text-red-600
                    transition
                    hover:bg-red-50
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCancel(offer.id)}
                disabled={isProcessing}
                className="
                  w-full rounded-lg
                  border border-gray-200
                  bg-white
                  px-3 py-2
                  text-[10px] font-bold text-gray-600
                  transition
                  hover:bg-gray-50
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {isProcessing ? "Cancelling..." : "Cancel Offer"}
              </button>
            )}
          </div>
        )}

        {/* VIEW ITEMS */}
        {!isPending && !offer.trade && (
          <div className="flex gap-2 border-t border-[#EEE5E7] px-3.5 py-3">
            {offeredItem?.id && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/listings/${offeredItem.id}`)
                }
                className="
                  flex-1 rounded-lg
                  border border-[#DCCACE]
                  px-3 py-2
                  text-[10px] font-bold text-[#5B1725]
                  transition hover:bg-[#FAF3F4]
                "
              >
                View Offered Item
              </button>
            )}

            {requestedItem?.id && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/listings/${requestedItem.id}`)
                }
                className="
                  flex-1 rounded-lg
                  border border-[#DCCACE]
                  px-3 py-2
                  text-[10px] font-bold text-[#5B1725]
                  transition hover:bg-[#FAF3F4]
                "
              >
                View Requested Item
              </button>
            )}
          </div>
        )}
      </article>
    );
  };

  const activeOffers =
    activeTab === "received"
      ? receivedOffers
      : sentOffers;

  const pendingReceived = receivedOffers.filter(
    (offer) => offer.status === "PENDING"
  ).length;

  const pendingSent = sentOffers.filter(
    (offer) => offer.status === "PENDING"
  ).length;

  return (
    <div className="min-h-screen bg-[#F8F5F3] text-[#21191B]">
      {/* COMPACT HEADER */}
      <section className="border-b border-[#E7DDDF] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B1725] text-sm text-white">
                  ⇄
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                  BarterConnect
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-black tracking-tight text-[#3D0F18] sm:text-3xl">
                Trade Offers
              </h1>

              <p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">
                Review incoming offers and keep track of the trades
                you've proposed.
              </p>
            </div>

            {/* SUMMARY */}
            <div className="flex w-full gap-2 sm:w-auto">
              <div className="flex-1 rounded-xl border border-[#E7DDDF] bg-[#FBF7F7] px-4 py-2.5 sm:min-w-28">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  Received
                </p>

                <div className="mt-0.5 flex items-end justify-between gap-2">
                  <p className="text-xl font-black text-[#5B1725]">
                    {receivedOffers.length}
                  </p>

                  {pendingReceived > 0 && (
                    <span className="mb-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700">
                      {pendingReceived} pending
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-[#E7DDDF] bg-[#FBF7F7] px-4 py-2.5 sm:min-w-28">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                  Sent
                </p>

                <div className="mt-0.5 flex items-end justify-between gap-2">
                  <p className="text-xl font-black text-[#5B1725]">
                    {sentOffers.length}
                  </p>

                  {pendingSent > 0 && (
                    <span className="mb-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-700">
                      {pendingSent} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* ALERTS */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-medium text-emerald-700">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {/* TABS */}
        <div className="mb-5 flex rounded-xl border border-[#E7DDDF] bg-white p-1 shadow-sm sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`
              flex flex-1 items-center justify-center gap-2
              rounded-lg px-4 py-2
              text-[11px] font-bold
              transition sm:min-w-37
              ${
                activeTab === "received"
                  ? "bg-[#5B1725] text-white shadow-sm"
                  : "text-gray-600 hover:bg-[#FAF3F4] hover:text-[#5B1725]"
              }
            `}
          >
            <span>Received</span>

            <span
              className={`
                rounded-full px-1.5 py-0.5 text-[9px]
                ${
                  activeTab === "received"
                    ? "bg-white/15 text-white"
                    : "bg-[#F4E7E9] text-[#5B1725]"
                }
              `}
            >
              {receivedOffers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`
              flex flex-1 items-center justify-center gap-2
              rounded-lg px-4 py-2
              text-[11px] font-bold
              transition sm:min-w-37
              ${
                activeTab === "sent"
                  ? "bg-[#5B1725] text-white shadow-sm"
                  : "text-gray-600 hover:bg-[#FAF3F4] hover:text-[#5B1725]"
              }
            `}
          >
            <span>Sent</span>

            <span
              className={`
                rounded-full px-1.5 py-0.5 text-[9px]
                ${
                  activeTab === "sent"
                    ? "bg-white/15 text-white"
                    : "bg-[#F4E7E9] text-[#5B1725]"
                }
              `}
            >
              {sentOffers.length}
            </span>
          </button>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="h-7 w-32 animate-pulse rounded-lg bg-gray-200" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
                </div>

                <div className="mt-4 grid grid-cols-[1fr_28px_1fr] gap-2">
                  <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
                  <div />
                  <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
                </div>

                <div className="mt-3 h-10 animate-pulse rounded-xl bg-gray-200" />

                <div className="mt-3 h-8 animate-pulse rounded-lg bg-gray-200" />
              </div>
            ))}
          </div>
        ) : activeOffers.length === 0 ? (
          /* EMPTY STATE */
          <div className="mx-auto max-w-lg rounded-2xl border border-[#E7DDDF] bg-white px-5 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E8EB] text-2xl">
              🤝
            </div>

            <h2 className="mt-4 text-xl font-black text-[#3D0F18]">
              No {activeTab} offers
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-gray-500">
              {activeTab === "received"
                ? "When another user wants to exchange their item with yours, their offer will appear here."
                : "Offers you make to other users will appear here so you can track their progress."}
            </p>

            {activeTab === "sent" && (
              <button
                type="button"
                onClick={() => navigate("/marketplace")}
                className="
                  mt-5 rounded-lg
                  bg-[#5B1725]
                  px-4 py-2
                  text-[11px] font-bold text-white
                  transition hover:bg-[#3D0F18]
                "
              >
                Browse Marketplace
              </button>
            )}
          </div>
        ) : (
          /* 2-COLUMN OFFERS */
          <div className="grid gap-4 md:grid-cols-2 xl:gap-5">
            {activeOffers.map((offer) => (
              <OfferItem
                key={offer.id}
                offer={offer}
                type={activeTab}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Offers;

