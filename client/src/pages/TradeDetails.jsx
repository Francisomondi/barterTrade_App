import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  confirmTrade,
  completeTrade,
  getTradeById,
  updateTradeStatus,
} from "../api/tradeApi";

import { useAuth } from "../context/AuthContext";

const STATUS_STYLES = {
  PENDING: {
    label: "Pending Confirmation",
    className: "bg-yellow-100 text-yellow-700",
  },
  AGREED: {
    label: "Trade Agreed",
    className: "bg-blue-100 text-blue-700",
  },
  VERIFICATION: {
    label: "Verification",
    className: "bg-purple-100 text-purple-700",
  },
  READY_FOR_HANDOVER: {
    label: "Ready for Handover",
    className: "bg-orange-100 text-orange-700",
  },
  IN_PROGRESS: {
    label: "Handover in Progress",
    className: "bg-indigo-100 text-indigo-700",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-700",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-700",
  },
  DISPUTED: {
    label: "Disputed",
    className: "bg-red-100 text-red-700",
  },
};

const STATUS_STEPS = [
  "PENDING",
  "AGREED",
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
  "COMPLETED",
];

const STATUS_ACTIONS = {
  AGREED: {
    nextStatus: "VERIFICATION",
    label: "Start Verification",
    description:
      "Begin the verification process for the items involved in this trade.",
  },

  VERIFICATION: {
    nextStatus: "READY_FOR_HANDOVER",
    label: "Ready for Handover",
    description:
      "Confirm that verification is complete and the trade is ready for handover.",
  },

  READY_FOR_HANDOVER: {
    nextStatus: "IN_PROGRESS",
    label: "Start Handover",
    description:
      "Start the physical handover process for the agreed items.",
  },
};

const formatDate = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "KES 0";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "KES 0";
  }

  return `KES ${number.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const getStatusStyle = (status) => {
  return (
    STATUS_STYLES[status] || {
      label: status || "Unknown",
      className: "bg-gray-100 text-gray-700",
    }
  );
};

const TradeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();

  const [trade, setTrade] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD TRADE
   * ---------------------------------------------------------
   */

  const loadTrade = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTradeById(id);

      setTrade(response.trade);
    } catch (err) {
      console.error("Load trade error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load trade details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTrade();
    }
  }, [id]);

  /*
   * ---------------------------------------------------------
   * TRADER ORIENTATION
   * ---------------------------------------------------------
   *
   * The logged-in user's ID is compared against the actual
   * traderAId and traderBId stored on the Trade.
   */

  const isTraderA = useMemo(() => {
    return Boolean(
      trade?.traderAId &&
        user?.id &&
        trade.traderAId === user.id
    );
  }, [trade, user]);

  const isTraderB = useMemo(() => {
    return Boolean(
      trade?.traderBId &&
        user?.id &&
        trade.traderBId === user.id
    );
  }, [trade, user]);

  const isParticipant = isTraderA || isTraderB;

  /*
   * ---------------------------------------------------------
   * YOUR / OTHER TRADER
   * ---------------------------------------------------------
   */

  const otherTrader = useMemo(() => {
    if (!trade) {
      return null;
    }

    if (isTraderA) {
      return trade.traderB || null;
    }

    if (isTraderB) {
      return trade.traderA || null;
    }

    return null;
  }, [trade, isTraderA, isTraderB]);

  /*
   * ---------------------------------------------------------
   * TWO-PARTY CONFIRMATION
   * ---------------------------------------------------------
   */

  const yourConfirmation = useMemo(() => {
    if (!trade || !user) {
      return false;
    }

    if (isTraderA) {
      return Boolean(trade.traderAConfirmed);
    }

    if (isTraderB) {
      return Boolean(trade.traderBConfirmed);
    }

    return false;
  }, [trade, user, isTraderA, isTraderB]);

  const otherConfirmation = useMemo(() => {
    if (!trade || !user) {
      return false;
    }

    if (isTraderA) {
      return Boolean(trade.traderBConfirmed);
    }

    if (isTraderB) {
      return Boolean(trade.traderAConfirmed);
    }

    return false;
  }, [trade, user, isTraderA, isTraderB]);

  const yourConfirmationAt = useMemo(() => {
    if (!trade) {
      return null;
    }

    if (isTraderA) {
      return trade.traderAConfirmedAt;
    }

    if (isTraderB) {
      return trade.traderBConfirmedAt;
    }

    return null;
  }, [trade, isTraderA, isTraderB]);

  const otherConfirmationAt = useMemo(() => {
    if (!trade) {
      return null;
    }

    if (isTraderA) {
      return trade.traderBConfirmedAt;
    }

    if (isTraderB) {
      return trade.traderAConfirmedAt;
    }

    return null;
  }, [trade, isTraderA, isTraderB]);

  /*
   * ---------------------------------------------------------
   * DERIVE LISTINGS BY TRADER IDS
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * We do NOT assume:
   *
   *   items[0] = your item
   *   items[1] = their item
   *
   * Instead:
   *
   *   Trade.traderAId
   *          ↓
   *   TradeItem.ownerId
   *          ↓
   *   TradeItem.listing
   *
   * and the same for traderB.
   *
   * This guarantees that the correct listing is displayed
   * regardless of the order Prisma returns Trade.items.
   */

  const traderATradeItem = useMemo(() => {
    if (!trade?.items?.length || !trade?.traderAId) {
      return null;
    }

    return (
      trade.items.find(
        (item) => item.ownerId === trade.traderAId
      ) || null
    );
  }, [trade]);

  const traderBTradeItem = useMemo(() => {
    if (!trade?.items?.length || !trade?.traderBId) {
      return null;
    }

    return (
      trade.items.find(
        (item) => item.ownerId === trade.traderBId
      ) || null
    );
  }, [trade]);

  /*
   * Listing owned by the logged-in trader.
   */

  const yourTradeItem = useMemo(() => {
    if (!trade?.items?.length || !user?.id) {
      return null;
    }

    return (
      trade.items.find(
        (item) => item.ownerId === user.id
      ) || null
    );
  }, [trade, user]);

  /*
   * Listing owned by the other trader.
   */

  const theirTradeItem = useMemo(() => {
    if (!trade?.items?.length || !user?.id) {
      return null;
    }

    return (
      trade.items.find(
        (item) => item.ownerId !== user.id
      ) || null
    );
  }, [trade, user]);

  /*
   * Resolve listings directly from the TradeItem.
   */

  const yourListing = yourTradeItem?.listing || null;

  const theirListing = theirTradeItem?.listing || null;

  /*
   * Agreed values also come from the correct TradeItem.
   */

  const yourAgreedValue =
    yourTradeItem?.agreedValue ??
    yourListing?.estimatedValue ??
    null;

  const theirAgreedValue =
    theirTradeItem?.agreedValue ??
    theirListing?.estimatedValue ??
    null;

  /*
   * ---------------------------------------------------------
   * CONFIRM TRADE
   * ---------------------------------------------------------
   */

  const handleConfirmTrade = async () => {
    if (!trade) {
      return;
    }

    if (!isParticipant) {
      setError(
        "You are not a participant in this trade."
      );
      return;
    }

    if (yourConfirmation) {
      setError(
        "You have already confirmed this trade."
      );
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await confirmTrade(trade.id);

      setTrade(response.trade);

      setSuccess(
        response.message ||
          "Your confirmation has been recorded."
      );
    } catch (err) {
      console.error("Confirm trade error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to confirm the trade."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * STATUS UPDATE
   * ---------------------------------------------------------
   */

  const handleStatusUpdate = async (status) => {
    if (!trade) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await updateTradeStatus(
        trade.id,
        status
      );

      setTrade(response.trade);

      setSuccess(
        response.message ||
          `Trade status updated to ${status}.`
      );
    } catch (err) {
      console.error(
        "Trade status update error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to update trade status."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * COMPLETE TRADE
   * ---------------------------------------------------------
   */

  const handleCompleteTrade = async () => {
    if (!trade) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to mark this trade as completed? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await completeTrade(trade.id);

      setTrade(response.trade);

      setSuccess(
        response.message ||
          "Trade completed successfully."
      );
    } catch (err) {
      console.error(
        "Complete trade error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to complete the trade."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * STATUS HELPERS
   * ---------------------------------------------------------
   */

  const currentStatusIndex = STATUS_STEPS.indexOf(
    trade?.status
  );

  const statusStyle = getStatusStyle(trade?.status);

  const statusAction = trade
    ? STATUS_ACTIONS[trade.status]
    : null;

  const canComplete =
    trade?.status === "IN_PROGRESS";

  /*
   * ---------------------------------------------------------
   * LOADING STATE
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-6 h-5 w-32 rounded bg-gray-200" />

          <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
            <div className="h-8 w-64 rounded bg-gray-200" />
            <div className="mt-4 h-4 w-40 rounded bg-gray-200" />
          </div>

          <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
            <div className="h-6 w-48 rounded bg-gray-200" />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="h-28 rounded-xl bg-gray-100" />
              <div className="h-28 rounded-xl bg-gray-100" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-72 rounded-2xl bg-white shadow-sm" />
            <div className="h-72 rounded-2xl bg-white shadow-sm" />
            <div className="h-72 rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * TRADE NOT FOUND
   * ---------------------------------------------------------
   */

  if (!trade) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-12">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-2xl font-black text-[#21191B]">
            Trade Not Found
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            {error ||
              "The trade you are looking for could not be found."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/trades")}
              className="rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Back to Trades
            </button>

            <button
              type="button"
              onClick={loadTrade}
              className="rounded-xl border border-[#E7DDDF] bg-white px-6 py-3 font-bold text-[#5B1725] transition hover:bg-[#F8F5F3]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-[#F8F5F3] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* BACK */}
        <button
          type="button"
          onClick={() => navigate("/trades")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#5B1725] transition hover:text-[#3D0F18]"
        >
          ← Back to My Trades
        </button>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>

              <div className="flex-1">
                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={() => setError("")}
                className="font-black text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
            <div className="flex items-start gap-3">
              <span className="text-lg">✓</span>

              <div className="flex-1">
                <p>{success}</p>
              </div>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="font-black text-green-500 hover:text-green-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-8 overflow-hidden rounded-3xl bg-[#3D0F18] shadow-xl">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                    Trade
                  </span>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusStyle.className}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <h1 className="text-2xl font-black text-white sm:text-3xl">
                  {trade.tradeNumber}
                </h1>

                <p className="mt-2 text-sm text-[#DCAEB7]">
                  Created on{" "}
                  {formatDate(trade.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-[#DCAEB7]">
                  Current Status
                </p>

                <p className="mt-1 text-lg font-black text-white">
                  {statusStyle.label}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* PARTICIPANT WARNING */}
        {/* ================================================= */}

        {!isParticipant && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>

              <div>
                <h2 className="font-black text-red-800">
                  Unauthorized Trade Access
                </h2>

                <p className="mt-1 text-sm leading-6 text-red-700">
                  You are not one of the traders involved
                  in this trade. Actions are disabled.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TWO-PARTY CONFIRMATION */}
        {/* ================================================= */}

        {trade.status === "PENDING" && (
          <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F5E8EB] text-xl">
                  🤝
                </div>

                <div>
                  <h2 className="text-xl font-black text-[#21191B]">
                    Confirm This Trade
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Both traders must confirm before this
                    trade can move to the agreed stage.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* YOU */}
              <div
                className={`rounded-xl border p-4 ${
                  yourConfirmation
                    ? "border-green-200 bg-green-50"
                    : "border-[#E7DDDF] bg-[#F8F5F3]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#8A2638]">
                      You
                    </p>

                    <p className="mt-1 font-bold text-[#21191B]">
                      {user?.name || "You"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      yourConfirmation
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {yourConfirmation
                      ? "✓ Confirmed"
                      : "Waiting"}
                  </span>
                </div>

                {yourConfirmationAt && (
                  <p className="mt-3 text-xs text-green-600">
                    Confirmed on{" "}
                    {formatDateTime(
                      yourConfirmationAt
                    )}
                  </p>
                )}
              </div>

              {/* OTHER TRADER */}
              <div
                className={`rounded-xl border p-4 ${
                  otherConfirmation
                    ? "border-green-200 bg-green-50"
                    : "border-[#E7DDDF] bg-[#F8F5F3]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#8A2638]">
                      Other Trader
                    </p>

                    <p className="mt-1 font-bold text-[#21191B]">
                      {otherTrader?.name ||
                        "Other trader"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      otherConfirmation
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {otherConfirmation
                      ? "✓ Confirmed"
                      : "Waiting"}
                  </span>
                </div>

                {otherConfirmationAt && (
                  <p className="mt-3 text-xs text-green-600">
                    Confirmed on{" "}
                    {formatDateTime(
                      otherConfirmationAt
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              {!isParticipant ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                  You are not a participant in this trade.
                </div>
              ) : !yourConfirmation ? (
                <button
                  type="button"
                  onClick={handleConfirmTrade}
                  disabled={actionLoading}
                  className="w-full rounded-xl bg-[#5B1725] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {actionLoading
                    ? "Confirming..."
                    : "Confirm Trade"}
                </button>
              ) : otherConfirmation ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
                  ✓ Both traders have confirmed this trade.
                  The trade can now proceed.
                </div>
              ) : (
                <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
                  ✓ You have confirmed this trade.
                  Waiting for the other trader.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* TRADE PROGRESS */}
        {/* ================================================= */}

        <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <h2 className="text-xl font-black text-[#21191B]">
              Trade Progress
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Follow the progress of your barter from
              agreement to completion.
            </p>
          </div>

          <div className="overflow-x-auto pb-3">
            <div className="flex min-w-[760px] items-start">
              {STATUS_STEPS.map((step, index) => {
                const completed =
                  currentStatusIndex >= 0 &&
                  index < currentStatusIndex;

                const active =
                  index === currentStatusIndex;

                const stepStyle = getStatusStyle(step);

                return (
                  <div
                    key={step}
                    className="relative flex flex-1 flex-col items-center"
                  >
                    {index > 0 && (
                      <div
                        className={`absolute right-1/2 top-5 h-0.5 w-full ${
                          index <= currentStatusIndex
                            ? "bg-[#5B1725]"
                            : "bg-[#E7DDDF]"
                        }`}
                      />
                    )}

                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black ${
                        completed
                          ? "border-[#5B1725] bg-[#5B1725] text-white"
                          : active
                          ? "border-[#5B1725] bg-white text-[#5B1725]"
                          : "border-[#E7DDDF] bg-white text-gray-400"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>

                    <p
                      className={`mt-3 text-center text-xs font-bold ${
                        active || completed
                          ? "text-[#5B1725]"
                          : "text-gray-400"
                      }`}
                    >
                      {stepStyle.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* TRADE ITEMS */}
        {/* ================================================= */}

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* YOUR ITEM */}
          <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="border-b border-[#E7DDDF] bg-[#F8F5F3] px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                Your Item
              </p>

              <h2 className="mt-1 text-lg font-black text-[#21191B]">
                What You Are Trading
              </h2>
            </div>

            {yourListing ? (
              <div className="p-6">
                <div className="mb-5 overflow-hidden rounded-2xl bg-[#F8F5F3]">
                  {yourListing.images?.length ? (
                    <img
                      src={yourListing.images[0].url}
                      alt={
                        yourListing.title ||
                        "Your listing"
                      }
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-5xl">
                      📦
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-black text-[#21191B]">
                  {yourListing.title ||
                    "Untitled Item"}
                </h3>

                {yourListing.category?.name && (
                  <p className="mt-1 text-sm font-semibold text-[#8A2638]">
                    {yourListing.category.name}
                  </p>
                )}

                {yourListing.description && (
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {yourListing.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {yourListing.condition && (
                    <span className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725]">
                      {yourListing.condition}
                    </span>
                  )}

                  {yourListing.location && (
                    <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                      📍 {yourListing.location}
                    </span>
                  )}
                </div>

                <div className="mt-6 border-t border-[#E7DDDF] pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500">
                      Agreed Value
                    </span>

                    <span className="text-lg font-black text-[#5B1725]">
                      {formatCurrency(
                        yourAgreedValue
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl">📦</div>

                <p className="mt-3 text-sm font-semibold text-gray-500">
                  Your trade item could not be found.
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  The TradeItem owner ID does not match
                  your user ID.
                </p>
              </div>
            )}
          </div>

          {/* THEIR ITEM */}
          <div className="overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="border-b border-[#E7DDDF] bg-[#F8F5F3] px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                Other Trader's Item
              </p>

              <h2 className="mt-1 text-lg font-black text-[#21191B]">
                What You Are Receiving
              </h2>
            </div>

            {theirListing ? (
              <div className="p-6">
                <div className="mb-5 overflow-hidden rounded-2xl bg-[#F8F5F3]">
                  {theirListing.images?.length ? (
                    <img
                      src={theirListing.images[0].url}
                      alt={
                        theirListing.title ||
                        "Other listing"
                      }
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-5xl">
                      📦
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-black text-[#21191B]">
                  {theirListing.title ||
                    "Untitled Item"}
                </h3>

                {theirListing.category?.name && (
                  <p className="mt-1 text-sm font-semibold text-[#8A2638]">
                    {theirListing.category.name}
                  </p>
                )}

                {theirListing.description && (
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    {theirListing.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {theirListing.condition && (
                    <span className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725]">
                      {theirListing.condition}
                    </span>
                  )}

                  {theirListing.location && (
                    <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">
                      📍 {theirListing.location}
                    </span>
                  )}
                </div>

                <div className="mt-6 border-t border-[#E7DDDF] pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500">
                      Agreed Value
                    </span>

                    <span className="text-lg font-black text-[#5B1725]">
                      {formatCurrency(
                        theirAgreedValue
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl">📦</div>

                <p className="mt-3 text-sm font-semibold text-gray-500">
                  The other trader's item could not be
                  found.
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  The TradeItem owner ID does not match
                  trader A or trader B.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* DEBUG / TRADE STRUCTURE INDICATOR */}
        {/* ================================================= */}

        <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725]">
              Trader A
            </span>

            <span className="break-all text-xs text-gray-500">
              {trade.traderAId}
            </span>

            <span className="mx-1 text-gray-300">•</span>

            <span className="rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-bold text-[#5B1725]">
              Trader B
            </span>

            <span className="break-all text-xs text-gray-500">
              {trade.traderBId}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-[#F8F5F3] p-3">
              <span className="font-bold text-[#8A2638]">
                Your role:
              </span>{" "}
              {isTraderA
                ? "Trader A"
                : isTraderB
                ? "Trader B"
                : "Not a participant"}
            </div>

            <div className="rounded-xl bg-[#F8F5F3] p-3">
              <span className="font-bold text-[#8A2638]">
                Trade items:
              </span>{" "}
              {trade.items?.length || 0}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* TRADERS */}
        {/* ================================================= */}

        <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#21191B]">
              Traders
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Information about both participants in this
              barter.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* YOU */}
            <div className="rounded-2xl border border-[#E7DDDF] bg-[#F8F5F3] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                You
              </p>

              <div className="mt-4 flex items-center gap-4">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || "You"}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5B1725] text-lg font-black text-white">
                    {(user?.name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-black text-[#21191B]">
                    {user?.name || "You"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {user?.email || ""}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                    {isTraderA
                      ? "Trader A"
                      : isTraderB
                      ? "Trader B"
                      : "Not a participant"}
                  </p>
                </div>
              </div>
            </div>

            {/* OTHER TRADER */}
            <div className="rounded-2xl border border-[#E7DDDF] bg-[#F8F5F3] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                Other Trader
              </p>

              <div className="mt-4 flex items-center gap-4">
                {otherTrader?.avatar ? (
                  <img
                    src={otherTrader.avatar}
                    alt={
                      otherTrader.name ||
                      "Other trader"
                    }
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8A2638] text-lg font-black text-white">
                    {(otherTrader?.name || "T")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="font-black text-[#21191B]">
                    {otherTrader?.name ||
                      "Other trader"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {otherTrader?.email || ""}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                    {isTraderA
                      ? "Trader B"
                      : isTraderB
                      ? "Trader A"
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* TRADE INFORMATION */}
        {/* ================================================= */}

        <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-[#21191B]">
            Trade Information
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-[#F8F5F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Trade Number
              </p>

              <p className="mt-2 break-all text-sm font-black text-[#5B1725]">
                {trade.tradeNumber}
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F5F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Created
              </p>

              <p className="mt-2 text-sm font-black text-[#21191B]">
                {formatDate(trade.createdAt)}
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F5F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Handover Location
              </p>

              <p className="mt-2 text-sm font-black text-[#21191B]">
                {trade.handoverLocation ||
                  "Not specified"}
              </p>
            </div>

            <div className="rounded-xl bg-[#F8F5F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Completed
              </p>

              <p className="mt-2 text-sm font-black text-[#21191B]">
                {trade.completedAt
                  ? formatDate(trade.completedAt)
                  : "Not completed"}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* TRADE ACTIONS */}
        {/* ================================================= */}

        <div className="mb-8 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-[#21191B]">
            Trade Actions
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Available actions depend on the current trade
            stage.
          </p>

          <div className="mt-6">
            {/* PENDING */}
            {trade.status === "PENDING" && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">🤝</div>

                  <div>
                    <h3 className="font-black text-yellow-800">
                      Waiting for Both Traders
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-yellow-700">
                      Both traders must confirm this trade
                      before it can move to the agreed
                      stage.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          yourConfirmation
                            ? "bg-green-100 text-green-700"
                            : "bg-white text-yellow-700"
                        }`}
                      >
                        You:{" "}
                        {yourConfirmation
                          ? "Confirmed"
                          : "Waiting"}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          otherConfirmation
                            ? "bg-green-100 text-green-700"
                            : "bg-white text-yellow-700"
                        }`}
                      >
                        Other trader:{" "}
                        {otherConfirmation
                          ? "Confirmed"
                          : "Waiting"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STATUS ACTION */}
            {statusAction && (
              <div className="rounded-2xl border border-[#E7DDDF] bg-[#F8F5F3] p-5">
                <h3 className="font-black text-[#21191B]">
                  {statusAction.label}
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  {statusAction.description}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleStatusUpdate(
                      statusAction.nextStatus
                    )
                  }
                  disabled={
                    actionLoading || !isParticipant
                  }
                  className="mt-5 rounded-xl bg-[#5B1725] px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading
                    ? "Updating..."
                    : statusAction.label}
                </button>
              </div>
            )}

            {/* COMPLETE */}
            {canComplete && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black text-green-800">
                      Complete This Trade
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-green-700">
                      Only mark the trade as completed once
                      the item handover has successfully
                      taken place.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompleteTrade}
                    disabled={
                      actionLoading || !isParticipant
                    }
                    className="shrink-0 rounded-xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading
                      ? "Completing..."
                      : "✓ Complete Trade"}
                  </button>
                </div>
              </div>
            )}

            {/* COMPLETED */}
            {trade.status === "COMPLETED" && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
                  ✓
                </div>

                <h3 className="mt-4 text-xl font-black text-green-800">
                  Trade Completed Successfully
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-green-700">
                  This barter has been completed. Both
                  listings have been marked as traded.
                </p>

                {trade.completedAt && (
                  <p className="mt-3 text-xs font-semibold text-green-600">
                    Completed on{" "}
                    {formatDateTime(
                      trade.completedAt
                    )}
                  </p>
                )}
              </div>
            )}

            {/* CANCELLED */}
            {trade.status === "CANCELLED" && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
                  ✕
                </div>

                <h3 className="mt-4 text-xl font-black text-gray-700">
                  Trade Cancelled
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
                  This trade is no longer active.
                </p>
              </div>
            )}

            {/* DISPUTED */}
            {trade.status === "DISPUTED" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl">
                  ⚠️
                </div>

                <h3 className="mt-4 text-xl font-black text-red-800">
                  Trade Disputed
                </h3>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
                  This trade is currently under dispute
                  review.
                </p>

                {trade.dispute && (
                  <div className="mx-auto mt-5 max-w-xl rounded-xl bg-white p-4 text-left">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-500">
                      Reason
                    </p>

                    <p className="mt-2 text-sm font-semibold text-gray-700">
                      {trade.dispute.reason ||
                        "No reason provided"}
                    </p>

                    {trade.dispute.description && (
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {trade.dispute.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FALLBACK */}
            {!statusAction &&
              !canComplete &&
              ![
                "PENDING",
                "COMPLETED",
                "CANCELLED",
                "DISPUTED",
              ].includes(trade.status) && (
                <div className="rounded-xl border border-[#E7DDDF] bg-[#F8F5F3] p-5 text-sm text-gray-500">
                  No action is currently available for
                  this trade.
                </div>
              )}
          </div>
        </div>

        {/* ================================================= */}
        {/* NAVIGATION */}
        {/* ================================================= */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link
            to="/trades"
            className="rounded-xl border border-[#E7DDDF] bg-white px-6 py-3 text-center text-sm font-bold text-[#5B1725] shadow-sm transition hover:bg-[#F8F5F3]"
          >
            ← All Trades
          </Link>

          <button
            type="button"
            onClick={loadTrade}
            disabled={loading}
            className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-60"
          >
            ↻ Refresh Trade
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeDetails;

