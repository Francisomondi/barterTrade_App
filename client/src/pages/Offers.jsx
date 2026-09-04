
import { useEffect, useState } from "react";
import {
  getSentOffers,
  getReceivedOffers,
  acceptOffer,
  rejectOffer,
  cancelOffer,
} from "../api/offerApi";

const Offers = () => {
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

    return `KES ${Number(value).toLocaleString("en-KE")}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";

      case "ACCEPTED":
        return "bg-green-100 text-green-800";

      case "REJECTED":
        return "bg-red-100 text-red-800";

      case "CANCELLED":
        return "bg-gray-200 text-gray-700";

      case "COUNTERED":
        return "bg-purple-100 text-purple-800";

      case "EXPIRED":
        return "bg-orange-100 text-orange-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
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
      return (
        listing.images[0].url ||
        listing.images[0].imageUrl ||
        null
      );
    }

    return null;
  };

  const OfferItem = ({
    offer,
    type,
  }) => {
    const isReceived = type === "received";

    const offeredItem = offer.offeredListing;
    const requestedItem = offer.requestedListing;

    const offeredImage = getImage(offeredItem);
    const requestedImage = getImage(requestedItem);

    const isPending = offer.status === "PENDING";

    return (
      <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm transition hover:shadow-lg">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#5B1725]">
              {isReceived
                ? `${offer.sender?.name || "A user"} sent you an offer`
                : `Offer sent to ${
                    offer.receiver?.name || "another user"
                  }`}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {formatDate(offer.createdAt)}
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
              offer.status
            )}`}
          >
            {offer.status}
          </span>
        </div>

        {/* Trade Items */}
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
          {/* Offered Item */}
          <div className="rounded-2xl border border-[#E7DDDF] bg-[#F8F5F3] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#8A2638]">
              {isReceived ? "They offer" : "You offer"}
            </p>

            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F5E8EB]">
                {offeredImage ? (
                  <img
                    src={offeredImage}
                    alt={offeredItem?.title || "Offered item"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">
                    📦
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-bold text-[#21191B]">
                  {offeredItem?.title || "Item"}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {offeredItem?.condition || "Condition not specified"}
                </p>

                <p className="mt-2 font-bold text-[#5B1725]">
                  {formatPrice(
                    offeredItem?.estimatedValue
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Exchange Icon */}
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5B1725] text-xl text-white shadow-md">
              ⇄
            </div>
          </div>

          {/* Requested Item */}
          <div className="rounded-2xl border border-[#E7DDDF] bg-[#F8F5F3] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#8A2638]">
              {isReceived ? "You give" : "They offer"}
            </p>

            <div className="flex gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F5E8EB]">
                {requestedImage ? (
                  <img
                    src={requestedImage}
                    alt={
                      requestedItem?.title ||
                      "Requested item"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">
                    📦
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-bold text-[#21191B]">
                  {requestedItem?.title || "Item"}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {requestedItem?.condition ||
                    "Condition not specified"}
                </p>

                <p className="mt-2 font-bold text-[#5B1725]">
                  {formatPrice(
                    requestedItem?.estimatedValue
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {offer.message && (
          <div className="mx-5 mb-5 rounded-xl bg-[#F5E8EB] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8A2638]">
              Message
            </p>

            <p className="mt-1 text-sm leading-6 text-[#21191B]">
              "{offer.message}"
            </p>
          </div>
        )}

        {/* Trade */}
        {offer.trade && (
          <div className="mx-5 mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-bold text-green-800">
              ✓ Trade created
            </p>

            <p className="mt-1 text-sm text-green-700">
              Trade Number:{" "}
              <span className="font-bold">
                {offer.trade.tradeNumber}
              </span>
            </p>

            <p className="mt-1 text-xs text-green-600">
              Status: {offer.trade.status}
            </p>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="flex flex-wrap gap-3 border-t border-[#E7DDDF] px-5 py-4">
            {isReceived ? (
              <>
                <button
                  type="button"
                  onClick={() => handleAccept(offer.id)}
                  disabled={actionLoading === offer.id}
                  className="rounded-xl bg-[#5B1725] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === offer.id
                    ? "Processing..."
                    : "Accept Offer"}
                </button>

                <button
                  type="button"
                  onClick={() => handleReject(offer.id)}
                  disabled={actionLoading === offer.id}
                  className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCancel(offer.id)}
                disabled={actionLoading === offer.id}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === offer.id
                  ? "Cancelling..."
                  : "Cancel Offer"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const activeOffers =
    activeTab === "received"
      ? receivedOffers
      : sentOffers;

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#3D0F18]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3D0F18] via-[#5B1725] to-[#8A2638]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              Barter Trade
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Your Trade Offers
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              Manage offers you've received and track the
              trades you've proposed to other users.
            </p>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
              activeTab === "received"
                ? "bg-[#5B1725] text-white shadow-lg"
                : "border border-[#E7DDDF] bg-white text-[#5B1725] hover:bg-[#F5E8EB]"
            }`}
          >
            Received Offers
            {receivedOffers.length > 0 && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === "received"
                    ? "bg-white/20"
                    : "bg-[#F5E8EB]"
                }`}
              >
                {receivedOffers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
              activeTab === "sent"
                ? "bg-[#5B1725] text-white shadow-lg"
                : "border border-[#E7DDDF] bg-white text-[#5B1725] hover:bg-[#F5E8EB]"
            }`}
          >
            Sent Offers
            {sentOffers.length > 0 && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === "sent"
                    ? "bg-white/20"
                    : "bg-[#F5E8EB]"
                }`}
              >
                {sentOffers.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-[#E7DDDF] bg-white p-6"
              >
                <div className="h-5 w-48 rounded bg-gray-200" />

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div className="h-32 rounded-xl bg-gray-200" />
                  <div className="h-32 rounded-xl bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : activeOffers.length === 0 ? (
          /* Empty */
          <div className="rounded-3xl border border-[#E7DDDF] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F5E8EB] text-4xl">
              🤝
            </div>

            <h2 className="mt-6 text-2xl font-black text-[#21191B]">
              No {activeTab} offers yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-gray-500">
              {activeTab === "received"
                ? "When another user wants to exchange their item with yours, their offer will appear here."
                : "Offers you make to other users will appear here so you can track their status."}
            </p>
          </div>
        ) : (
          /* Offers */
          <div className="space-y-6">
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

