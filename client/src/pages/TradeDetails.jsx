import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  confirmTrade,
  completeTrade,
  getTradeById,
  updateTradeStatus,
} from "../api/tradeApi";
import { useAuth } from "../context/AuthContext";

const TradeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     LOAD TRADE
  ========================================================= */

  const loadTrade = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getTradeById(id);

      setTrade(response.trade);
    } catch (err) {
      console.error("Load trade error:", err);

      setError(
        err.response?.data?.message || "Failed to load trade."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadTrade();
    }
  }, [id, loadTrade]);

  /* =========================================================
     PARTICIPATION
  ========================================================= */

  const isTraderA = useMemo(() => {
    if (!trade || !user) return false;

    return trade.traderAId === user.id;
  }, [trade, user]);

  const isTraderB = useMemo(() => {
    if (!trade || !user) return false;

    return trade.traderBId === user.id;
  }, [trade, user]);

  const isParticipant = isTraderA || isTraderB;

  /* =========================================================
     TRADE ITEMS
  ========================================================= */

  const traderATradeItem = useMemo(() => {
    if (!trade?.items) return null;

    return trade.items.find(
      (item) => item.ownerId === trade.traderAId
    );
  }, [trade]);

  const traderBTradeItem = useMemo(() => {
    if (!trade?.items) return null;

    return trade.items.find(
      (item) => item.ownerId === trade.traderBId
    );
  }, [trade]);

  const yourTradeItem = useMemo(() => {
    if (!trade?.items || !user) return null;

    return trade.items.find(
      (item) => item.ownerId === user.id
    );
  }, [trade, user]);

  const theirTradeItem = useMemo(() => {
    if (!trade?.items || !user) return null;

    return trade.items.find(
      (item) => item.ownerId !== user.id
    );
  }, [trade, user]);

  const yourListing = yourTradeItem?.listing || null;
  const theirListing = theirTradeItem?.listing || null;

  const yourAgreedValue =
    yourTradeItem?.agreedValue ??
    yourListing?.estimatedValue ??
    null;

  const theirAgreedValue =
    theirTradeItem?.agreedValue ??
    theirListing?.estimatedValue ??
    null;

  /* =========================================================
     TRADERS
  ========================================================= */

  const yourTrader = isTraderA
    ? trade?.traderA
    : trade?.traderB;

  const otherTrader = isTraderA
    ? trade?.traderB
    : trade?.traderA;

  /* =========================================================
     CONFIRMATIONS
  ========================================================= */

  const confirmations = trade?.confirmations || [];

  const hasTraderConfirmedStage = (traderId, stage) => {
    return confirmations.some(
      (confirmation) =>
        confirmation.userId === traderId &&
        confirmation.stage === stage
    );
  };

  const hasConfirmedStage = (stage) => {
    if (!user) return false;

    return hasTraderConfirmedStage(
      user.id,
      stage
    );
  };

  const currentConfirmationStage = useMemo(() => {
    if (!trade) return null;

    switch (trade.status) {
      case "PENDING":
        return "AGREEMENT";

      case "AGREED":
        return "VERIFICATION";

      case "VERIFICATION":
        return "HANDOVER";

      default:
        return null;
    }
  }, [trade]);

  const traderAConfirmedCurrentStage =
    currentConfirmationStage
      ? hasTraderConfirmedStage(
          trade?.traderAId,
          currentConfirmationStage
        )
      : false;

  const traderBConfirmedCurrentStage =
    currentConfirmationStage
      ? hasTraderConfirmedStage(
          trade?.traderBId,
          currentConfirmationStage
        )
      : false;

  const hasConfirmedCurrentStage =
    currentConfirmationStage
      ? hasConfirmedStage(
          currentConfirmationStage
        )
      : false;

  const bothConfirmedCurrentStage =
    traderAConfirmedCurrentStage &&
    traderBConfirmedCurrentStage;

  const confirmationStageTitle = useMemo(() => {
    switch (currentConfirmationStage) {
      case "AGREEMENT":
        return "Trade Agreement";

      case "VERIFICATION":
        return "Trade Verification";

      case "HANDOVER":
        return "Handover Confirmation";

      default:
        return "";
    }
  }, [currentConfirmationStage]);

  const confirmationStageDescription =
    useMemo(() => {
      switch (currentConfirmationStage) {
        case "AGREEMENT":
          return "Both traders must agree to the proposed barter before the trade can proceed.";

        case "VERIFICATION":
          return "Both traders must confirm the verification stage before preparing for handover.";

        case "HANDOVER":
          return "Both traders must confirm that they are ready for the physical exchange.";

        default:
          return "";
      }
    }, [currentConfirmationStage]);

  const confirmationButtonLabel = useMemo(() => {
    switch (currentConfirmationStage) {
      case "AGREEMENT":
        return "Confirm Trade Agreement";

      case "VERIFICATION":
        return "Confirm Verification";

      case "HANDOVER":
        return "Confirm Handover Readiness";

      default:
        return "Confirm";
    }
  }, [currentConfirmationStage]);

  /* =========================================================
     ACTIONS
  ========================================================= */

  const handleConfirmTrade = async () => {
    if (!trade) return;

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

      const refreshed = await getTradeById(trade.id);

      setTrade(refreshed.trade);
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

  const handleStatusUpdate = async (newStatus) => {
    if (!trade) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await updateTradeStatus(
        trade.id,
        newStatus
      );

      setTrade(response.trade);

      setSuccess(
        response.message ||
          `Trade moved to ${newStatus}.`
      );

      const refreshed = await getTradeById(trade.id);

      setTrade(refreshed.trade);
    } catch (err) {
      console.error(
        "Update trade status error:",
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

  const handleCompleteTrade = async () => {
    if (!trade) return;

    const confirmed = window.confirm(
      "Are you sure you want to mark this trade as completed? This action confirms that the exchange has taken place."
    );

    if (!confirmed) return;

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

      const refreshed = await getTradeById(trade.id);

      setTrade(refreshed.trade);
    } catch (err) {
      console.error(
        "Complete trade error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to complete trade."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =========================================================
     HELPERS
  ========================================================= */

  const getStatusClasses = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-50 text-amber-700 border border-amber-200";

      case "AGREED":
        return "bg-blue-50 text-blue-700 border border-blue-200";

      case "VERIFICATION":
        return "bg-purple-50 text-purple-700 border border-purple-200";

      case "READY_FOR_HANDOVER":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";

      case "IN_PROGRESS":
        return "bg-orange-50 text-orange-700 border border-orange-200";

      case "COMPLETED":
        return "bg-green-50 text-green-700 border border-green-200";

      case "CANCELLED":
        return "bg-gray-100 text-gray-700 border border-gray-200";

      case "DISPUTED":
        return "bg-red-50 text-red-700 border border-red-200";

      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  const formatCurrency = (value) => {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return "Not specified";
    }

    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#5B1725]" />

            <h2 className="mt-5 text-lg font-black text-[#3D0F18]">
              Loading trade
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Please wait while we retrieve your trade details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!trade) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5E8EB] text-3xl">
              📦
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#3D0F18]">
              Trade Not Found
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              {error ||
                "The trade you are looking for could not be found."}
            </p>

            <Link
              to="/trades"
              className="mt-7 inline-flex rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Back to Trades
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ACCESS DENIED
  ========================================================= */

  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-[#E7DDDF] bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
              🔒
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#3D0F18]">
              Access Denied
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              You are not a participant in this trade.
            </p>

            <Link
              to="/trades"
              className="mt-7 inline-flex rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Back to Trades
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     TRADE PROGRESS
  ========================================================= */

  const statusOrder = [
    "PENDING",
    "AGREED",
    "VERIFICATION",
    "READY_FOR_HANDOVER",
    "IN_PROGRESS",
    "COMPLETED",
  ];

  const progressSteps = [
    {
      status: "PENDING",
      label: "Trade Agreement",
      description: "Trade proposal created.",
    },
    {
      status: "AGREED",
      label: "Agreement Confirmed",
      description: "Both traders have agreed.",
    },
    {
      status: "VERIFICATION",
      label: "Verification",
      description: "Items are being verified.",
    },
    {
      status: "READY_FOR_HANDOVER",
      label: "Ready for Handover",
      description: "Both traders are ready to exchange.",
    },
    {
      status: "IN_PROGRESS",
      label: "Trade In Progress",
      description: "The exchange is taking place.",
    },
    {
      status: "COMPLETED",
      label: "Completed",
      description: "Trade successfully completed.",
    },
  ];

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* =====================================================
            BACK
        ====================================================== */}

        <button
          type="button"
          onClick={() => navigate("/trades")}
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-bold text-[#5B1725] transition hover:text-[#3D0F18]"
        >
          <span className="text-lg">←</span>
          Back to Trades
        </button>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <section className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

          <div className="bg-gradient-to-br from-[#3D0F18] via-[#5B1725] to-[#701E30] px-5 py-7 text-white sm:px-7 sm:py-8">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="min-w-0">

                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#DCAEB7]" />

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8C7CD]">
                    Trade Number
                  </p>
                </div>

                <h1 className="mt-2 break-all text-2xl font-black tracking-tight sm:text-3xl">
                  {trade.tradeNumber}
                </h1>

                <p className="mt-2 text-sm text-white/70">
                  Created {formatDate(trade.createdAt)}
                </p>

              </div>

              <span
                className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide ${getStatusClasses(
                  trade.status
                )}`}
              >
                {trade.status.replaceAll("_", " ")}
              </span>

            </div>
          </div>

        </section>

        {/* =====================================================
            ALERTS
        ====================================================== */}

        <div className="mt-5 space-y-3">

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              <span className="shrink-0">✓</span>
              <span>{success}</span>
            </div>
          )}

        </div>

        {/* =====================================================
            CONFIRMATION
        ====================================================== */}

        {currentConfirmationStage && (
          <section className="mt-5 overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

            <div className="bg-[#5B1725] px-5 py-6 text-white sm:px-7">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                <div className="max-w-3xl">

                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#DCAEB7]">
                    Confirmation Required
                  </p>

                  <h2 className="mt-1 text-xl font-black sm:text-2xl">
                    {confirmationStageTitle}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#F5E8EB]">
                    {confirmationStageDescription}
                  </p>

                </div>

                <span className="w-fit rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
                  {currentConfirmationStage}
                </span>

              </div>

            </div>

            <div className="p-5 sm:p-7">

              <div className="grid gap-4 md:grid-cols-2">

                {/* TRADER A */}

                <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-4 sm:p-5">

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      {trade.traderA?.avatar ? (
                        <img
                          src={trade.traderA.avatar}
                          alt={trade.traderA.name || "Trader A"}
                          className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCAEB7] font-bold text-[#3D0F18]">
                          {(trade.traderA?.name || "A")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Trader A
                        </p>

                        <p className="truncate font-bold text-[#3D0F18]">
                          {trade.traderA?.name || "Trader A"}
                        </p>

                      </div>

                    </div>

                    {traderAConfirmedCurrentStage ? (
                      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                        ✓ Confirmed
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold text-yellow-700">
                        Waiting
                      </span>
                    )}

                  </div>

                </div>

                {/* TRADER B */}

                <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-4 sm:p-5">

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      {trade.traderB?.avatar ? (
                        <img
                          src={trade.traderB.avatar}
                          alt={trade.traderB.name || "Trader B"}
                          className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#DCAEB7] font-bold text-[#3D0F18]">
                          {(trade.traderB?.name || "B")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Trader B
                        </p>

                        <p className="truncate font-bold text-[#3D0F18]">
                          {trade.traderB?.name || "Trader B"}
                        </p>

                      </div>

                    </div>

                    {traderBConfirmedCurrentStage ? (
                      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">
                        ✓ Confirmed
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-bold text-yellow-700">
                        Waiting
                      </span>
                    )}

                  </div>

                </div>

              </div>

              {/* USER ACTION */}

              <div className="mt-5">

                {hasConfirmedCurrentStage ? (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
                      ✓
                    </div>

                    <h3 className="mt-3 font-bold text-green-800">
                      You have confirmed this stage
                    </h3>

                    <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-green-700">
                      {bothConfirmedCurrentStage
                        ? "Both traders have confirmed. The trade is moving forward."
                        : `Waiting for ${
                            otherTrader?.name ||
                            "the other trader"
                          } to confirm.`}
                    </p>

                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmTrade}
                    disabled={actionLoading}
                    className="w-full rounded-xl bg-[#5B1725] px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionLoading
                      ? "Processing..."
                      : confirmationButtonLabel}
                  </button>
                )}

              </div>

            </div>
          </section>
        )}

        {/* =====================================================
            PARTICIPANTS
        ====================================================== */}

        <section className="mt-8">

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A2638]">
              Participants
            </p>

            <h2 className="mt-1 text-xl font-black text-[#3D0F18] sm:text-2xl">
              Who is trading?
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              The two people involved in this barter exchange.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

            {/* YOU */}

            <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
                  You
                </p>

                <span className="rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold text-[#5B1725]">
                  Your account
                </span>
              </div>

              <div className="mt-5 flex items-center gap-4">

                {yourTrader?.avatar ? (
                  <img
                    src={yourTrader.avatar}
                    alt={yourTrader.name || "You"}
                    className="h-14 w-14 shrink-0 rounded-2xl border-2 border-[#F5E8EB] object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#DCAEB7] text-lg font-black text-[#3D0F18]">
                    {(yourTrader?.name || "Y")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">

                  <h3 className="truncate font-black text-[#3D0F18]">
                    {yourTrader?.name || "Your account"}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Barter Score:{" "}
                    <span className="font-bold text-[#5B1725]">
                      {yourTrader?.barterScore ?? 0}
                    </span>
                  </p>

                </div>

              </div>

            </div>

            {/* PARTNER */}

            <div className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-6">

              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8A2638]">
                  Trade Partner
                </p>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                  Partner
                </span>
              </div>

              <div className="mt-5 flex items-center gap-4">

                {otherTrader?.avatar ? (
                  <img
                    src={otherTrader.avatar}
                    alt={otherTrader.name || "Trade partner"}
                    className="h-14 w-14 shrink-0 rounded-2xl border-2 border-[#F5E8EB] object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#DCAEB7] text-lg font-black text-[#3D0F18]">
                    {(otherTrader?.name || "T")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">

                  <h3 className="truncate font-black text-[#3D0F18]">
                    {otherTrader?.name || "Trade partner"}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Barter Score:{" "}
                    <span className="font-bold text-[#5B1725]">
                      {otherTrader?.barterScore ?? 0}
                    </span>
                  </p>

                </div>

              </div>

            </div>

          </div>
        </section>

        {/* =====================================================
            ITEMS
        ====================================================== */}

        <section className="mt-8">

          <div className="mb-4">

            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A2638]">
              Exchange
            </p>

            <h2 className="mt-1 text-xl font-black text-[#3D0F18] sm:text-2xl">
              Items Being Exchanged
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review both items and their agreed values before completing the exchange.
            </p>

          </div>

          <div className="grid gap-5 lg:grid-cols-2">

            {/* =================================================
                YOUR ITEM
            ================================================== */}

            <div className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

              <div className="flex items-center justify-between bg-[#5B1725] px-5 py-3.5">

                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Your Item
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white">
                  You
                </span>

              </div>

              {yourListing ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#F5E8EB] p-1.5">

                    {yourListing.images?.length > 0 ? (
                      yourListing.images
                        .slice(0, 4)
                        .map((image) => (
                          <img
                            key={image.id}
                            src={image.url}
                            alt={yourListing.title}
                            className="h-36 w-full object-cover sm:h-40"
                          />
                        ))
                    ) : (
                      <div className="col-span-2 flex h-44 items-center justify-center bg-[#E7DDDF] text-sm font-semibold text-gray-500">
                        No image available
                      </div>
                    )}

                  </div>

                  <div className="p-5 sm:p-6">

                    <h3 className="text-lg font-black text-[#3D0F18] sm:text-xl">
                      {yourListing.title}
                    </h3>

                    {yourListing.category?.name && (
                      <span className="mt-2 inline-flex rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8A2638]">
                        {yourListing.category.name}
                      </span>
                    )}

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                      {yourListing.description}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-2xl bg-[#FBF5F6] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Condition
                        </p>

                        <p className="mt-1.5 text-sm font-bold capitalize text-[#3D0F18]">
                          {yourListing.condition?.replaceAll(
                            "_",
                            " "
                          ) || "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FBF5F6] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Agreed Value
                        </p>

                        <p className="mt-1.5 text-sm font-black text-[#5B1725]">
                          {formatCurrency(yourAgreedValue)}
                        </p>
                      </div>

                    </div>

                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-sm text-gray-500">
                  Your listing information is unavailable.
                </div>
              )}

            </div>

            {/* =================================================
                PARTNER ITEM
            ================================================== */}

            <div className="overflow-hidden rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">

              <div className="flex items-center justify-between bg-[#5B1725] px-5 py-3.5">

                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Trade Partner's Item
                </span>

                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-white">
                  Partner
                </span>

              </div>

              {theirListing ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#F5E8EB] p-1.5">

                    {theirListing.images?.length > 0 ? (
                      theirListing.images
                        .slice(0, 4)
                        .map((image) => (
                          <img
                            key={image.id}
                            src={image.url}
                            alt={theirListing.title}
                            className="h-36 w-full object-cover sm:h-40"
                          />
                        ))
                    ) : (
                      <div className="col-span-2 flex h-44 items-center justify-center bg-[#E7DDDF] text-sm font-semibold text-gray-500">
                        No image available
                      </div>
                    )}

                  </div>

                  <div className="p-5 sm:p-6">

                    <h3 className="text-lg font-black text-[#3D0F18] sm:text-xl">
                      {theirListing.title}
                    </h3>

                    {theirListing.category?.name && (
                      <span className="mt-2 inline-flex rounded-full bg-[#F5E8EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8A2638]">
                        {theirListing.category.name}
                      </span>
                    )}

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">
                      {theirListing.description}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-2xl bg-[#FBF5F6] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Condition
                        </p>

                        <p className="mt-1.5 text-sm font-bold capitalize text-[#3D0F18]">
                          {theirListing.condition?.replaceAll(
                            "_",
                            " "
                          ) || "—"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FBF5F6] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          Agreed Value
                        </p>

                        <p className="mt-1.5 text-sm font-black text-[#5B1725]">
                          {formatCurrency(theirAgreedValue)}
                        </p>
                      </div>

                    </div>

                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-sm text-gray-500">
                  Trade partner's listing information is unavailable.
                </div>
              )}

            </div>

          </div>
        </section>

        {/* =====================================================
            TRADE SUMMARY
        ====================================================== */}

        <section className="mt-8 rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-7">

          <div className="mb-5">

            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A2638]">
              Overview
            </p>

            <h2 className="mt-1 text-xl font-black text-[#3D0F18] sm:text-2xl">
              Trade Summary
            </h2>

          </div>

          <div className="grid gap-3 md:grid-cols-3">

            <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF5F6] p-4 sm:p-5">

              <p className="text-xs font-semibold text-gray-500">
                Your Item
              </p>

              <p className="mt-2 text-lg font-black text-[#3D0F18]">
                {formatCurrency(yourAgreedValue)}
              </p>

            </div>

            <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF5F6] p-4 sm:p-5">

              <p className="text-xs font-semibold text-gray-500">
                Partner's Item
              </p>

              <p className="mt-2 text-lg font-black text-[#3D0F18]">
                {formatCurrency(theirAgreedValue)}
              </p>

            </div>

            <div className="rounded-2xl border border-[#EEE5E7] bg-[#FBF5F6] p-4 sm:p-5">

              <p className="text-xs font-semibold text-gray-500">
                Handover Location
              </p>

              <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-[#3D0F18]">
                {trade.handoverLocation || "To be agreed"}
              </p>

            </div>

          </div>
        </section>

        {/* =====================================================
            TRADE PROGRESS
        ====================================================== */}

        <section className="mt-8 rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-7">

          <div className="mb-6">

            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A2638]">
              Status
            </p>

            <h2 className="mt-1 text-xl font-black text-[#3D0F18] sm:text-2xl">
              Trade Progress
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Follow the progress of your barter from agreement to completion.
            </p>

          </div>

          <div className="space-y-0">

            {progressSteps.map((step, index) => {

              const currentIndex =
                statusOrder.indexOf(trade.status);

              const stepIndex =
                statusOrder.indexOf(step.status);

              const completed =
                currentIndex >= stepIndex;

              const isCurrent =
                trade.status === step.status;

              return (
                <div
                  key={step.status}
                  className="flex min-h-[78px] items-start gap-4"
                >

                  {/* TIMELINE */}

                  <div className="flex flex-col items-center self-stretch">

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                        completed
                          ? "bg-[#5B1725] text-white shadow-sm"
                          : "bg-gray-100 text-gray-400"
                      } ${
                        isCurrent
                          ? "ring-4 ring-[#F5E8EB]"
                          : ""
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>

                    {index < progressSteps.length - 1 && (
                      <div
                        className={`mt-1 min-h-8 w-0.5 flex-1 ${
                          completed
                            ? "bg-[#DCAEB7]"
                            : "bg-gray-200"
                        }`}
                      />
                    )}

                  </div>

                  {/* CONTENT */}

                  <div className="pb-6 pt-0.5">

                    <div className="flex flex-wrap items-center gap-2">

                      <p
                        className={`text-sm font-bold ${
                          completed
                            ? "text-[#3D0F18]"
                            : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>

                      {isCurrent && (
                        <span className="rounded-full bg-[#F5E8EB] px-2 py-0.5 text-[10px] font-bold text-[#8A2638]">
                          Current
                        </span>
                      )}

                    </div>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        completed
                          ? "text-gray-500"
                          : "text-gray-400"
                      }`}
                    >
                      {step.description}
                    </p>

                    {isCurrent &&
                      currentConfirmationStage && (
                        <p className="mt-2 text-xs font-semibold leading-5 text-[#8A2638]">
                          Waiting for both traders to confirm this stage.
                        </p>
                      )}

                  </div>

                </div>
              );
            })}

          </div>
        </section>

        {/* =====================================================
            ACTIONS
        ====================================================== */}

        <section className="mt-8 rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm sm:p-7">

          <div className="mb-5">

            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A2638]">
              Manage
            </p>

            <h2 className="mt-1 text-xl font-black text-[#3D0F18] sm:text-2xl">
              Trade Actions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Available actions depend on the current trade stage.
            </p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">

            {/* READY → IN PROGRESS */}

            {trade.status === "READY_FOR_HANDOVER" && (
              <button
                type="button"
                onClick={() =>
                  handleStatusUpdate("IN_PROGRESS")
                }
                disabled={actionLoading}
                className="w-full rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading
                  ? "Processing..."
                  : "Start Trade Exchange"}
              </button>
            )}

            {/* IN PROGRESS → COMPLETED */}

            {trade.status === "IN_PROGRESS" && (
              <button
                type="button"
                onClick={handleCompleteTrade}
                disabled={actionLoading}
                className="w-full rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {actionLoading
                  ? "Completing..."
                  : "Complete Trade"}
              </button>
            )}

            {/* CANCEL */}

            {(trade.status === "PENDING" ||
              trade.status === "AGREED" ||
              trade.status === "VERIFICATION" ||
              trade.status === "READY_FOR_HANDOVER") && (
              <button
                type="button"
                onClick={() =>
                  handleStatusUpdate("CANCELLED")
                }
                disabled={actionLoading}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Cancel Trade
              </button>
            )}

            {/* DISPUTE */}

            {(trade.status === "VERIFICATION" ||
              trade.status === "READY_FOR_HANDOVER" ||
              trade.status === "IN_PROGRESS") && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/trades/${trade.id}/dispute`
                  )
                }
                className="w-full rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-100 sm:w-auto"
              >
                Report a Problem
              </button>
            )}

          </div>
        </section>

        {/* =====================================================
            COMPLETED
        ====================================================== */}

        {trade.status === "COMPLETED" && (
          <section className="mt-8 mb-8 overflow-hidden rounded-3xl border border-green-200 bg-green-50 text-center">

            <div className="px-5 py-9 sm:px-8 sm:py-10">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                🎉
              </div>

              <h2 className="mt-5 text-2xl font-black text-green-800 sm:text-3xl">
                Trade Completed!
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-green-700">
                This barter trade was successfully completed.
                Both items have been exchanged according to the agreed terms.
              </p>

              {trade.completedAt && (
                <p className="mt-3 text-xs font-medium text-green-600">
                  Completed on {formatDate(trade.completedAt)}
                </p>
              )}

              <Link
                to="/trades"
                className="mt-6 inline-flex rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18]"
              >
                Back to My Trades
              </Link>

            </div>

          </section>
        )}

      </main>
    </div>
  );
};

export default TradeDetails;