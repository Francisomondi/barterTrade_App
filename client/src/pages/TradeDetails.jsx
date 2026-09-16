
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getTradeById,
  updateTradeStatus,
  completeTrade,
  confirmTrade,
} from "../api/tradeApi";

import { useAuth } from "../context/AuthContext";

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

const HANDOVER_STARTED_STAGE = "HANDOVER_STARTED";

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

  const { user } = useAuth();

  const [trade, setTrade] = useState(null);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  const [handoverLoading, setHandoverLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");

  const [handoverError, setHandoverError] =
    useState("");

  const [handoverSuccess, setHandoverSuccess] =
    useState("");

  /**
   * ============================================
   * LOAD TRADE
   * ============================================
   */
  const loadTrade = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTradeById(id);

      setTrade(response.trade);
    } catch (error) {
      console.error(
        "Load trade details error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load trade details."
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

  /**
   * ============================================
   * CURRENT USER
   * ============================================
   */
  const currentUserId = user?.id;

  /**
   * ============================================
   * TRADER ROLES
   * ============================================
   */
  const isTraderA =
    currentUserId &&
    trade?.traderAId === currentUserId;

  const isTraderB =
    currentUserId &&
    trade?.traderBId === currentUserId;

  const isParticipant =
    Boolean(isTraderA || isTraderB);

  /**
   * ============================================
   * OTHER TRADER
   * ============================================
   */
  const otherTrader = useMemo(() => {
    if (!trade || !currentUserId) {
      return null;
    }

    if (trade.traderAId === currentUserId) {
      return trade.traderB;
    }

    if (trade.traderBId === currentUserId) {
      return trade.traderA;
    }

    return null;
  }, [trade, currentUserId]);

  /**
   * ============================================
   * HANDOVER CONFIRMATIONS
   * ============================================
   */
  const handoverConfirmations = useMemo(() => {
    if (!trade?.confirmations) {
      return [];
    }

    return trade.confirmations.filter(
      (confirmation) =>
        confirmation.stage === HANDOVER_STARTED_STAGE
    );
  }, [trade]);

  /**
   * ============================================
   * TRADER A HANDOVER CONFIRMATION
   * ============================================
   */
  const traderAHandoverConfirmation =
    useMemo(() => {
      return handoverConfirmations.find(
        (confirmation) =>
          confirmation.userId === trade?.traderAId
      );
    }, [
      handoverConfirmations,
      trade?.traderAId,
    ]);

  /**
   * ============================================
   * TRADER B HANDOVER CONFIRMATION
   * ============================================
   */
  const traderBHandoverConfirmation =
    useMemo(() => {
      return handoverConfirmations.find(
        (confirmation) =>
          confirmation.userId === trade?.traderBId
      );
    }, [
      handoverConfirmations,
      trade?.traderBId,
    ]);

  /**
   * ============================================
   * CURRENT USER CONFIRMATION
   * ============================================
   */
  const currentUserHandoverConfirmation =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return handoverConfirmations.find(
        (confirmation) =>
          confirmation.userId === currentUserId
      );
    }, [
      handoverConfirmations,
      currentUserId,
    ]);

  const currentUserConfirmedHandover =
    Boolean(currentUserHandoverConfirmation);

  /**
   * ============================================
   * BOTH TRADERS CONFIRMED
   * ============================================
   */
  const bothTradersConfirmedHandover =
    Boolean(
      traderAHandoverConfirmation &&
        traderBHandoverConfirmation
    );

  /**
   * ============================================
   * HANDLE NORMAL STATUS UPDATE
   *
   * IMPORTANT:
   *
   * READY_FOR_HANDOVER -> IN_PROGRESS
   * is NOT handled here.
   *
   * That transition must happen through
   * two-party HANDOVER_STARTED confirmation.
   * ============================================
   */
  const handleStatusUpdate = async (status) => {
    /**
     * Safety guard.
     *
     * Never allow the frontend to attempt the
     * protected direct transition.
     */
    if (
      trade?.status === "READY_FOR_HANDOVER" &&
      status === "IN_PROGRESS"
    ) {
      setActionError(
        "Both traders must confirm that handover has started."
      );

      return;
    }

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

  /**
   * ============================================
   * CONFIRM HANDOVER STARTED
   *
   * PATCH /api/trades/:id/confirm
   *
   * Backend automatically determines:
   *
   * READY_FOR_HANDOVER
   *        ↓
   * HANDOVER_STARTED confirmation
   *        ↓
   * both traders confirmed
   *        ↓
   * IN_PROGRESS
   * ============================================
   */
  const handleConfirmHandoverStarted =
    async () => {
      if (!trade) return;

      if (!isParticipant) {
        setHandoverError(
          "You are not a participant in this trade."
        );

        return;
      }

      if (
        trade.status !==
        "READY_FOR_HANDOVER"
      ) {
        setHandoverError(
          "Handover confirmation is not available at this stage."
        );

        return;
      }

      if (currentUserConfirmedHandover) {
        setHandoverError(
          "You have already confirmed that handover has started."
        );

        return;
      }

      try {
        setHandoverLoading(true);

        setHandoverError("");

        setHandoverSuccess("");

        const response =
          await confirmTrade(id);

        /**
         * Backend returns the updated trade.
         */
        if (response?.trade) {
          setTrade(response.trade);
        } else {
          /**
           * Fallback in case the API response
           * does not contain the trade object.
           */
          await loadTrade();
        }

        if (response?.bothConfirmed) {
          setHandoverSuccess(
            "Both traders have confirmed. Handover is now in progress."
          );
        } else {
          setHandoverSuccess(
            "Your handover confirmation has been recorded. Waiting for your trade partner."
          );
        }
      } catch (error) {
        console.error(
          "Confirm handover started error:",
          error
        );

        setHandoverError(
          error.response?.data?.message ||
            "Unable to confirm that handover has started."
        );

        /**
         * Refresh the trade in case another
         * trader completed the confirmation
         * at the same time.
         */
        try {
          await loadTrade();
        } catch {
          // Ignore refresh failure here.
        }
      } finally {
        setHandoverLoading(false);
      }
    };

  /**
   * ============================================
   * COMPLETE TRADE
   * ============================================
   */
  const handleCompleteTrade = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to mark this trade as completed?"
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setActionError("");

      const response =
        await completeTrade(id);

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

  /**
   * ============================================
   * LOADING
   * ============================================
   */
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

  /**
   * ============================================
   * ERROR
   * ============================================
   */
  if (error || !trade) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-red-800">
            Unable to load trade
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error || "Trade not found."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/trades")
            }
            className="mt-6 rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
          >
            Back to My Trades
          </button>
        </div>
      </div>
    );
  }

  /**
   * ============================================
   * TRADE DATA
   * ============================================
   */
  const currentStatusIndex =
    statusSteps.indexOf(trade.status);

  const yourListing =
    trade.items?.[0]?.listing ||
    trade.offer?.offeredListing;

  const theirListing =
    trade.items?.[1]?.listing ||
    trade.offer?.requestedListing;

  /**
   * ============================================
   * HANDOVER STATUS TEXT
   * ============================================
   */
  const getHandoverStatus = (userId) => {
    const confirmation =
      handoverConfirmations.find(
        (item) =>
          item.userId === userId
      );

    if (confirmation) {
      return {
        label: "Handover Confirmed",
        description: confirmation.confirmedAt
          ? `Confirmed ${formatDateTime(
              confirmation.confirmedAt
            )}`
          : "Confirmed",
        className:
          "bg-green-50 border-green-200 text-green-700",
        icon: "✓",
      };
    }

    return {
      label: "Waiting for Confirmation",
      description:
        "This trader has not confirmed that handover has started.",
      className:
        "bg-gray-50 border-gray-200 text-gray-600",
      icon: "○",
    };
  };

  const traderAStatus =
    getHandoverStatus(trade.traderAId);

  const traderBStatus =
    getHandoverStatus(trade.traderBId);

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* ==========================================
          HEADER
      =========================================== */}
      <section className="bg-[#3D0F18] px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() =>
              navigate("/trades")
            }
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
                Created{" "}
                {formatDate(
                  trade.createdAt
                )}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                statusStyles[
                  trade.status
                ] ||
                "bg-gray-100 text-gray-700"
              }`}
            >
              {formatStatus(
                trade.status
              )}
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* ==========================================
            ACTION ERROR
        =========================================== */}
        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* ==========================================
            TRADE PROGRESS
        =========================================== */}
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
              {formatStatus(
                trade.status
              )}
            </p>
          </div>

          <div className="mt-8 overflow-x-auto pb-2">
            <div className="flex min-w-[700px] items-start">
              {statusSteps.map(
                (status, index) => {
                  const completed =
                    index <=
                    currentStatusIndex;

                  const isCurrent =
                    status ===
                    trade.status;

                  return (
                    <div
                      key={status}
                      className="relative flex flex-1 flex-col items-center"
                    >
                      {index > 0 && (
                        <div
                          className={`absolute right-1/2 top-5 h-1 w-full ${
                            index <=
                            currentStatusIndex
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
                        {completed &&
                        index <
                          currentStatusIndex
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
                        {formatStatus(
                          status
                        )}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* ==========================================
            HANDOVER STARTED SECTION
        =========================================== */}
        {trade.status ===
          "READY_FOR_HANDOVER" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
            {/* HEADER */}
            <div className="border-b border-indigo-100 bg-indigo-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-indigo-700">
                    Step 6.8 · Handover
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Confirm Handover Started
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    The items have been verified and
                    both traders are ready. Each trader
                    must confirm that the physical
                    handover has started before this
                    trade can move into progress.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl">
                  🤝
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="p-6 md:p-8">
              {/* SUCCESS */}
              {handoverSuccess && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                      ✓
                    </div>

                    <p className="text-sm font-semibold leading-6 text-green-700">
                      {handoverSuccess}
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {handoverError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      ⚠️
                    </div>

                    <p className="text-sm font-semibold leading-6 text-red-700">
                      {handoverError}
                    </p>
                  </div>
                </div>
              )}

              {/* TRADER CONFIRMATIONS */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* TRADER A */}
                <div
                  className={`rounded-2xl border p-5 ${
                    traderAStatus.className
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                        Trader A
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold">
                        {trade.traderA
                          ?.name ||
                          "Trader A"}
                      </h3>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm">
                      {traderAStatus.icon}
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    {traderAStatus.label}
                  </p>

                  <p className="mt-1 text-xs opacity-80">
                    {traderAStatus.description}
                  </p>

                  {trade.traderAId ===
                    currentUserId && (
                    <p className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                      You
                    </p>
                  )}
                </div>

                {/* TRADER B */}
                <div
                  className={`rounded-2xl border p-5 ${
                    traderBStatus.className
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                        Trader B
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold">
                        {trade.traderB
                          ?.name ||
                          "Trader B"}
                      </h3>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm">
                      {traderBStatus.icon}
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    {traderBStatus.label}
                  </p>

                  <p className="mt-1 text-xs opacity-80">
                    {traderBStatus.description}
                  </p>

                  {trade.traderBId ===
                    currentUserId && (
                    <p className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                      You
                    </p>
                  )}
                </div>
              </div>

              {/* ========================================
                  BOTH CONFIRMED
              ========================================= */}
              {bothTradersConfirmedHandover && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                      ✓
                    </div>

                    <div>
                      <h3 className="font-extrabold text-green-800">
                        Handover has started
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-green-700">
                        Both traders have confirmed
                        that the handover has started.
                        The trade is now in progress.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================
                  CURRENT USER ACTION
              ========================================= */}
              {!currentUserConfirmedHandover &&
                !bothTradersConfirmedHandover && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Has the handover started?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Only confirm this when you and
                      your trade partner have actually
                      started exchanging the items.
                    </p>

                    <button
                      type="button"
                      disabled={
                        handoverLoading ||
                        !isParticipant
                      }
                      onClick={
                        handleConfirmHandoverStarted
                      }
                      className="mt-5 w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {handoverLoading
                        ? "Confirming..."
                        : "✓ Confirm Handover Started"}
                    </button>
                  </div>
                )}

              {/* ========================================
                  CURRENT USER ALREADY CONFIRMED
              ========================================= */}
              {currentUserConfirmedHandover &&
                !bothTradersConfirmedHandover && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Your confirmation is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          You have confirmed that
                          handover has started. Your
                          trade partner must also confirm
                          before the trade moves to
                          <strong> In Progress</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* ========================================
                  EXPLANATION
              ========================================= */}
              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Important
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  The trade cannot enter{" "}
                  <strong>In Progress</strong> from
                  this screen through a normal status
                  update. Both traders must individually
                  confirm that handover has started.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==========================================
            ITEMS
        =========================================== */}
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
                    src={getImage(
                      yourListing
                    )}
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
                  {yourListing?.category
                    ?.name ||
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
                    src={getImage(
                      theirListing
                    )}
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
                  {theirListing?.category
                    ?.name ||
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

        {/* ==========================================
            TRADER + TRADE INFORMATION
        =========================================== */}
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
                    ?.toUpperCase() ||
                    "U"}
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
                    otherTrader?.barterScore ||
                      0
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
                    trade.agreedValueA ||
                      0
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
                    trade.agreedValueB ||
                      0
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
                  {formatDate(
                    trade.createdAt
                  )}
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

        {/* ==========================================
            OFFER MESSAGE
        =========================================== */}
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

        {/* ==========================================
            ACTIONS
        =========================================== */}
        <section className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
            Trade actions
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* AGREEMENT */}
            {trade.status ===
              "PENDING" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleStatusUpdate(
                    "AGREED"
                  )
                }
                className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Updating..."
                  : "Agree to Trade"}
              </button>
            )}

            {/* VERIFICATION */}
            {trade.status ===
              "AGREED" && (
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

            {/* HANDOVER READINESS */}
            {trade.status ===
              "VERIFICATION" && (
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

            {/* ========================================
                IMPORTANT:
                NO DIRECT IN_PROGRESS BUTTON
            ========================================= */}
            {trade.status ===
              "READY_FOR_HANDOVER" && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-700">
                🤝 Use the{" "}
                <strong>
                  Handover
                </strong>{" "}
                section above to confirm that
                handover has started.
              </div>
            )}

            {/* COMPLETE */}
            {trade.status ===
              "IN_PROGRESS" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={
                  handleCompleteTrade
                }
                className="rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Completing..."
                  : "Complete Trade"}
              </button>
            )}

            {/* COMPLETED */}
            {trade.status ===
              "COMPLETED" && (
              <div className="rounded-xl bg-green-50 px-5 py-4 text-sm font-semibold text-green-700">
                ✓ This trade has been completed.
              </div>
            )}

            {/* CANCELLED */}
            {trade.status ===
              "CANCELLED" && (
              <div className="rounded-xl bg-gray-100 px-5 py-4 text-sm font-semibold text-gray-600">
                This trade has been cancelled.
              </div>
            )}

            {/* DISPUTED */}
            {trade.status ===
              "DISPUTED" && (
              <div className="rounded-xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                This trade is currently under
                dispute.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default TradeDetails;

