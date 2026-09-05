
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getTradeById,
  updateTradeStatus,
  completeTrade,
} from "../api/tradeApi";

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AGREED: "bg-blue-100 text-blue-800",
  VERIFICATION: "bg-purple-100 text-purple-800",
  READY_FOR_HANDOVER: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-700",
  DISPUTED: "bg-red-100 text-red-800",
};

const statusSteps = [
  "PENDING",
  "AGREED",
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
  "COMPLETED",
];

const formatStatus = (status) => {
  return (
    status
      ?.replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
    "Unknown"
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
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

const getImage = (listing) => {
  return (
    listing?.images?.[0]?.url ||
    listing?.images?.[0]?.imageUrl ||
    "https://placehold.co/700x500?text=No+Image"
  );
};

const TradeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const loadTrade = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getTradeById(id);

        setTrade(response.trade);
      } catch (error) {
        console.error("Load trade details error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load trade details."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadTrade();
    }
  }, [id]);

  const handleStatusUpdate = async (status) => {
    try {
      setActionLoading(true);
      setActionError("");

      const response = await updateTradeStatus(
        id,
        status
      );

      setTrade(response.trade);
    } catch (error) {
      console.error(
        "Update trade status error:",
        error
      );

      setActionError(
        error.response?.data?.message ||
          "Unable to update trade status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrade = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this trade as completed?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setActionError("");

      const response = await completeTrade(id);

      setTrade(response.trade);
    } catch (error) {
      console.error(
        "Complete trade error:",
        error
      );

      setActionError(
        error.response?.data?.message ||
          "Unable to complete the trade."
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-8 w-48 rounded bg-[#E7DDDF]" />

          <div className="mt-8 h-32 rounded-2xl bg-[#E7DDDF]" />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="h-96 rounded-2xl bg-[#E7DDDF]" />
            <div className="h-96 rounded-2xl bg-[#E7DDDF]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-5xl">⚠️</div>

          <h1 className="mt-4 text-2xl font-extrabold text-red-800">
            Unable to load trade
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error || "Trade not found."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/trades")}
            className="mt-6 rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
          >
            Back to My Trades
          </button>
        </div>
      </div>
    );
  }

  const currentStatusIndex =
    statusSteps.indexOf(trade.status);

  const otherTrader = trade.traderA || trade.traderB;

  const yourListing =
    trade.items?.[0]?.listing ||
    trade.offer?.offeredListing;

  const theirListing =
    trade.items?.[1]?.listing ||
    trade.offer?.requestedListing;

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* HEADER */}
      <section className="bg-[#3D0F18] px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => navigate("/trades")}
            className="mb-6 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            ← Back to My Trades
          </button>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#DCAEB7]">
                Trade Details
              </p>

              <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
                {trade.tradeNumber}
              </h1>

              <p className="mt-3 text-sm text-white/70">
                Created {formatDate(trade.createdAt)}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                statusStyles[trade.status] ||
                "bg-gray-100 text-gray-700"
              }`}
            >
              {formatStatus(trade.status)}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ACTION ERROR */}
        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* TRADE PROGRESS */}
        <section className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                Trade progress
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                Track your exchange
              </h2>
            </div>

            <p className="text-sm text-gray-500">
              {formatStatus(trade.status)}
            </p>
          </div>

          <div className="mt-8 overflow-x-auto pb-2">
            <div className="flex min-w-[700px] items-start">
              {statusSteps.map((status, index) => {
                const completed =
                  index <= currentStatusIndex;

                const isCurrent =
                  status === trade.status;

                return (
                  <div
                    key={status}
                    className="relative flex flex-1 flex-col items-center"
                  >
                    {index > 0 && (
                      <div
                        className={`absolute right-1/2 top-5 h-1 w-full ${
                          index <= currentStatusIndex
                            ? "bg-[#8A2638]"
                            : "bg-[#E7DDDF]"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-sm font-bold shadow ${
                        completed
                          ? "bg-[#8A2638] text-white"
                          : "bg-[#E7DDDF] text-gray-500"
                      } ${
                        isCurrent
                          ? "ring-4 ring-[#F5E8EB]"
                          : ""
                      }`}
                    >
                      {completed && index < currentStatusIndex
                        ? "✓"
                        : index + 1}
                    </div>

                    <p
                      className={`mt-3 text-center text-xs font-bold ${
                        isCurrent
                          ? "text-[#8A2638]"
                          : completed
                          ? "text-[#21191B]"
                          : "text-gray-400"
                      }`}
                    >
                      {formatStatus(status)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ITEMS */}
        <section className="mt-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
              Exchange
            </p>

            <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
              Items being traded
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* YOUR ITEM */}
            <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
              <div className="bg-[#F5E8EB] px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Your item
                </p>
              </div>

              <div className="p-5">
                <div className="overflow-hidden rounded-xl bg-[#F8F5F3]">
                  <img
                    src={getImage(yourListing)}
                    alt={
                      yourListing?.title ||
                      "Your item"
                    }
                    className="h-64 w-full object-cover"
                  />
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-[#21191B]">
                  {yourListing?.title ||
                    "Item unavailable"}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {yourListing?.category?.name ||
                    "Category unavailable"}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                    {yourListing?.condition ||
                      "Unknown"}
                  </span>

                  <span className="font-bold text-[#8A2638]">
                    KES{" "}
                    {Number(
                      trade.agreedValueA ||
                        yourListing?.estimatedValue ||
                        0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* THEIR ITEM */}
            <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
              <div className="bg-[#F5E8EB] px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                  Their item
                </p>
              </div>

              <div className="p-5">
                <div className="overflow-hidden rounded-xl bg-[#F8F5F3]">
                  <img
                    src={getImage(theirListing)}
                    alt={
                      theirListing?.title ||
                      "Their item"
                    }
                    className="h-64 w-full object-cover"
                  />
                </div>

                <h3 className="mt-5 text-xl font-extrabold text-[#21191B]">
                  {theirListing?.title ||
                    "Item unavailable"}
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  {theirListing?.category?.name ||
                    "Category unavailable"}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                    {theirListing?.condition ||
                      "Unknown"}
                  </span>

                  <span className="font-bold text-[#8A2638]">
                    KES{" "}
                    {Number(
                      trade.agreedValueB ||
                        theirListing?.estimatedValue ||
                        0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRADER + TRADE INFORMATION */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* OTHER TRADER */}
          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
              Trading with
            </p>

            <div className="mt-5 flex items-center gap-4">
              {otherTrader?.avatar ? (
                <img
                  src={otherTrader.avatar}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F5E8EB] text-xl font-extrabold text-[#8A2638]">
                  {otherTrader?.name
                    ?.charAt(0)
                    ?.toUpperCase() || "U"}
                </div>
              )}

              <div>
                <h3 className="text-xl font-extrabold text-[#21191B]">
                  {otherTrader?.name ||
                    "Unknown trader"}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Barter score:{" "}
                  {Number(
                    otherTrader?.barterScore || 0
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* TRADE INFORMATION */}
          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
              Trade information
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7DDDF] pb-3">
                <span className="text-sm text-gray-500">
                  Your agreed value
                </span>

                <span className="font-bold text-[#21191B]">
                  KES{" "}
                  {Number(
                    trade.agreedValueA || 0
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E7DDDF] pb-3">
                <span className="text-sm text-gray-500">
                  Their agreed value
                </span>

                <span className="font-bold text-[#21191B]">
                  KES{" "}
                  {Number(
                    trade.agreedValueB || 0
                  ).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#E7DDDF] pb-3">
                <span className="text-sm text-gray-500">
                  Handover location
                </span>

                <span className="text-right font-semibold text-[#21191B]">
                  {trade.handoverLocation ||
                    "Not specified"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Created
                </span>

                <span className="font-semibold text-[#21191B]">
                  {formatDate(trade.createdAt)}
                </span>
              </div>

              {trade.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Completed
                  </span>

                  <span className="font-semibold text-green-700">
                    {formatDateTime(
                      trade.completedAt
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* OFFER MESSAGE */}
        {trade.offer?.message && (
          <section className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
              Offer message
            </p>

            <p className="mt-4 rounded-xl bg-[#FBF5F6] p-5 text-sm leading-7 text-gray-600">
              "{trade.offer.message}"
            </p>
          </section>
        )}

        {/* ACTIONS */}
        <section className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
            Trade actions
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {trade.status === "PENDING" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleStatusUpdate("AGREED")
                }
                className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Agree to Trade"}
              </button>
            )}

            {trade.status === "AGREED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleStatusUpdate(
                    "VERIFICATION"
                  )
                }
                className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Start Verification"}
              </button>
            )}

            {trade.status === "VERIFICATION" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleStatusUpdate(
                    "READY_FOR_HANDOVER"
                  )
                }
                className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Ready for Handover"}
              </button>
            )}

            {trade.status ===
              "READY_FOR_HANDOVER" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleStatusUpdate(
                    "IN_PROGRESS"
                  )
                }
                className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Start Handover"}
              </button>
            )}

            {trade.status === "IN_PROGRESS" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCompleteTrade}
                className="rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Completing..."
                  : "Complete Trade"}
              </button>
            )}

            {trade.status === "COMPLETED" && (
              <div className="rounded-xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
                ✓ This trade has been completed.
              </div>
            )}

            {trade.status === "CANCELLED" && (
              <div className="rounded-xl bg-gray-100 px-5 py-4 text-sm font-semibold text-gray-600">
                This trade has been cancelled.
              </div>
            )}

            {trade.status === "DISPUTED" && (
              <div className="rounded-xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                This trade is currently under dispute.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default TradeDetails;
