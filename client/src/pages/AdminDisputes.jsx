
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAdminDisputes,
  updateDispute,
  applyDisputeOutcome,
} from "../api/disputeApi";

import { useAuth } from "../context/AuthContext";

/* =========================================================
   STATUS STYLES
========================================================= */

const statusStyles = {
  OPEN:
    "bg-red-100 text-red-700 border-red-200",

  UNDER_REVIEW:
    "bg-blue-100 text-blue-700 border-blue-200",

  RESOLVED:
    "bg-green-100 text-green-700 border-green-200",

  CLOSED:
    "bg-gray-100 text-gray-700 border-gray-200",
};

/* =========================================================
   HELPERS
========================================================= */

const formatStatus = (status) => {
  return (
    status
      ?.replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      ) || "Unknown"
  );
};

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

/* =========================================================
   ALLOWED ADMIN STATUS TRANSITIONS
========================================================= */

const getNextStatuses = (status) => {
  switch (status) {
    case "OPEN":
      return ["UNDER_REVIEW"];

    case "UNDER_REVIEW":
      return [];

    case "RESOLVED":
      return ["CLOSED"];

    case "CLOSED":
      return [];

    default:
      return [];
  }
};

/* =========================================================
   ADMIN DISPUTES
========================================================= */

const AdminDisputes = () => {
  const { user } = useAuth();

  /* =======================================================
     STATE
  ======================================================= */

  const [disputes, setDisputes] = useState([]);

  const [selectedDispute, setSelectedDispute] =
    useState(null);

  const [filterStatus, setFilterStatus] =
    useState("OPEN");

  const [resolution, setResolution] =
    useState("");

  const [nextStatus, setNextStatus] =
    useState("");

  const [selectedOutcome, setSelectedOutcome] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [outcomeLoading, setOutcomeLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [outcomeError, setOutcomeError] =
    useState("");

  /* =======================================================
     ADMIN CHECK
  ======================================================= */

  const isAdmin = user?.role === "ADMIN";

  /* =======================================================
     LOAD DISPUTES
  ======================================================= */

  const loadDisputes = useCallback(
    async () => {
      if (!isAdmin) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await getAdminDisputes(
            filterStatus
          );

        setDisputes(
          response?.disputes || []
        );
      } catch (error) {
        console.error(
          "LOAD ADMIN DISPUTES ERROR:",
          error
        );

        setError(
          error.response?.data?.message ||
            "Unable to load disputes."
        );
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, filterStatus]
  );

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  /* =======================================================
     STATUS COUNTS
  ======================================================= */

  const counts = useMemo(() => {
    return disputes.reduce(
      (result, dispute) => {
        result[dispute.status] =
          (result[dispute.status] || 0) +
          1;

        return result;
      },
      {}
    );
  }, [disputes]);

  /* =======================================================
     OPEN DISPUTE
  ======================================================= */

  const openDispute = (dispute) => {
    setSelectedDispute(dispute);

    setResolution(
      dispute.resolution || ""
    );

    setNextStatus("");

    setSelectedOutcome("");

    setError("");

    setSuccess("");

    setOutcomeError("");
  };

  /* =======================================================
     CLOSE DISPUTE MODAL
  ======================================================= */

  const closeDispute = () => {
    if (
      actionLoading ||
      outcomeLoading
    ) {
      return;
    }

    setSelectedDispute(null);

    setResolution("");

    setNextStatus("");

    setSelectedOutcome("");

    setError("");

    setSuccess("");

    setOutcomeError("");
  };

  /* =======================================================
     UPDATE DISPUTE STATUS
  ======================================================= */

  const handleUpdateDispute = async () => {
    if (!selectedDispute) {
      return;
    }

    if (!nextStatus) {
      setError(
        "Please select the next dispute status."
      );

      return;
    }

    if (
      ["RESOLVED", "CLOSED"].includes(
        nextStatus
      ) &&
      !resolution.trim()
    ) {
      setError(
        "A resolution is required before resolving or closing a dispute."
      );

      return;
    }

    try {
      setActionLoading(true);

      setError("");

      setSuccess("");

      const response =
        await updateDispute(
          selectedDispute.id,
          nextStatus,
          resolution.trim()
        );

      const updatedDispute =
        response?.dispute;

      setSelectedDispute(
        updatedDispute || {
          ...selectedDispute,
          status: nextStatus,
          resolution:
            resolution.trim() ||
            selectedDispute.resolution,
        }
      );

      setSuccess(
        response?.message ||
          "Dispute updated successfully."
      );

      setNextStatus("");

      await loadDisputes();
    } catch (error) {
      console.error(
        "UPDATE ADMIN DISPUTE ERROR:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to update dispute."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     APPLY DISPUTE OUTCOME
  ======================================================= */

  const handleApplyOutcome = async () => {
    if (!selectedDispute) {
      return;
    }

    if (
      selectedDispute.status !==
      "UNDER_REVIEW"
    ) {
      setOutcomeError(
        "The dispute must be under review before an outcome can be applied."
      );

      return;
    }

    if (
      ![
        "CANCEL_TRADE",
        "REOPEN_TRADE",
      ].includes(selectedOutcome)
    ) {
      setOutcomeError(
        "Please select a dispute outcome."
      );

      return;
    }

    const trimmedResolution =
      resolution.trim();

    if (!trimmedResolution) {
      setOutcomeError(
        "Please enter a resolution."
      );

      return;
    }

    if (
      trimmedResolution.length > 5000
    ) {
      setOutcomeError(
        "Resolution cannot exceed 5000 characters."
      );

      return;
    }

    const confirmed =
      window.confirm(
        selectedOutcome ===
          "CANCEL_TRADE"
          ? "Are you sure you want to cancel this trade as the dispute outcome?"
          : `Are you sure you want to reopen this trade at ${formatStatus(
              selectedDispute.previousTradeStatus
            )}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setOutcomeLoading(true);

      setOutcomeError("");

      setError("");

      setSuccess("");

      const response =
        await applyDisputeOutcome(
          selectedDispute.id,
          selectedOutcome,
          trimmedResolution
        );

      setSuccess(
        response?.message ||
          "Dispute outcome applied successfully."
      );

      /*
       * Close the modal after a successful
       * final outcome.
       */
      setSelectedDispute(null);

      setResolution("");

      setSelectedOutcome("");

      await loadDisputes();
    } catch (error) {
      console.error(
        "APPLY DISPUTE OUTCOME ERROR:",
        error
      );

      setOutcomeError(
        error.response?.data?.message ||
          "Unable to apply dispute outcome."
      );
    } finally {
      setOutcomeLoading(false);
    }
  };

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-extrabold text-red-800">
            Authentication required
          </h1>

          <p className="mt-2 text-sm text-red-700">
            Please log in to continue.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ADMIN ACCESS
  ======================================================= */

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8F5F3] px-6 py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-4xl">
            🔒
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-red-800">
            Administrator Access Required
          </h1>

          <p className="mt-2 text-sm leading-6 text-red-700">
            You do not have permission to view
            the dispute management panel.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     NEXT STATUS OPTIONS
  ======================================================= */

  const nextStatuses =
    getNextStatuses(
      selectedDispute?.status
    );

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* =================================================
          HEADER
      ================================================= */}

      <section className="bg-[#3D0F18] px-6 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-widest text-[#DCAEB7]">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-extrabold md:text-5xl">
            Trade Disputes
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
            Review reported barter problems,
            examine both sides of the trade, and
            record final dispute outcomes.
          </p>
        </div>
      </section>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* GLOBAL ERROR */}

        {error &&
          !selectedDispute && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              ⚠️ {error}
            </div>
          )}

        {/* GLOBAL SUCCESS */}

        {success &&
          !selectedDispute && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              ✓ {success}
            </div>
          )}

        {/* =================================================
            STATUS FILTERS
        ================================================= */}

        <section className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                Dispute queue
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                Review reports
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                "OPEN",
                "UNDER_REVIEW",
                "RESOLVED",
                "CLOSED",
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setFilterStatus(status)
                  }
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                    filterStatus === status
                      ? "border-[#5B1725] bg-[#5B1725] text-white"
                      : "border-[#DCCACE] bg-white text-gray-600 hover:bg-[#FBF5F6]"
                  }`}
                >
                  {formatStatus(status)}

                  {counts[status] ? (
                    <span className="ml-2">
                      ({counts[status]})
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================
            DISPUTES
        ================================================= */}

        <section className="mt-6">
          {loading ? (
            <div className="rounded-2xl border border-[#E7DDDF] bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E7DDDF] border-t-[#8A2638]" />

              <p className="mt-4 text-sm text-gray-500">
                Loading disputes...
              </p>
            </div>
          ) : disputes.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-[#DCCACE] bg-white p-12 text-center shadow-sm">
              <div className="text-4xl">
                ✅
              </div>

              <h3 className="mt-4 text-xl font-extrabold text-[#21191B]">
                No disputes found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                There are no disputes in this
                status queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map(
                (dispute) => {
                  const trade =
                    dispute.trade;

                  return (
                    <article
                      key={dispute.id}
                      className="rounded-2xl border border-[#E7DDDF] bg-white p-5 shadow-sm md:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                statusStyles[
                                  dispute.status
                                ] ||
                                statusStyles.OPEN
                              }`}
                            >
                              {formatStatus(
                                dispute.status
                              )}
                            </span>

                            <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                              {trade?.tradeNumber ||
                                "Unknown trade"}
                            </span>

                            {dispute.outcome && (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                {dispute.outcome ===
                                "CANCEL_TRADE"
                                  ? "Trade Cancelled"
                                  : "Trade Reopened"}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-4 text-xl font-extrabold text-[#21191B]">
                            {dispute.reason}
                          </h3>

                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                            {dispute.description}
                          </p>

                          <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl bg-[#FBF5F6] p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Reported by
                              </p>

                              <p className="mt-1 font-bold text-[#21191B]">
                                {dispute.user
                                  ?.name ||
                                  "Unknown user"}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#FBF5F6] p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Submitted
                              </p>

                              <p className="mt-1 font-bold text-[#21191B]">
                                {formatDateTime(
                                  dispute.createdAt
                                )}
                              </p>
                            </div>
                          </div>

                          {dispute.outcome && (
                            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                                Admin outcome
                              </p>

                              <p className="mt-1 text-sm font-extrabold text-green-800">
                                {dispute.outcome ===
                                "CANCEL_TRADE"
                                  ? "Trade Cancelled"
                                  : "Trade Reopened"}
                              </p>

                              {dispute.outcome ===
                                "REOPEN_TRADE" &&
                                dispute.previousTradeStatus && (
                                  <p className="mt-1 text-xs text-green-700">
                                    Returned to{" "}
                                    <span className="font-bold">
                                      {formatStatus(
                                        dispute.previousTradeStatus
                                      )}
                                    </span>
                                  </p>
                                )}

                              {dispute.resolution && (
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-green-700">
                                  {
                                    dispute.resolution
                                  }
                                </p>
                              )}

                              {dispute.outcomeAt && (
                                <p className="mt-2 text-xs text-green-600">
                                  Outcome recorded{" "}
                                  {formatDateTime(
                                    dispute.outcomeAt
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openDispute(
                              dispute
                            )
                          }
                          className="w-full shrink-0 rounded-xl bg-[#5B1725] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] lg:w-auto"
                        >
                          Review Dispute →
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </main>

      {/* =================================================
          REVIEW MODAL
      ================================================= */}

      {selectedDispute && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
          <div className="flex min-h-full items-start justify-center p-3 sm:items-center sm:p-6">
            <div className="my-3 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-6">
              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <div className="shrink-0 border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                      Dispute Review
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold text-[#21191B] sm:text-2xl">
                      {selectedDispute
                        .trade
                        ?.tradeNumber ||
                        "Trade Dispute"}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          statusStyles[
                            selectedDispute
                              .status
                          ] ||
                          statusStyles.OPEN
                        }`}
                      >
                        {formatStatus(
                          selectedDispute.status
                        )}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600">
                        Submitted{" "}
                        {formatDateTime(
                          selectedDispute.createdAt
                        )}
                      </span>

                      {selectedDispute.outcome && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {selectedDispute.outcome ===
                          "CANCEL_TRADE"
                            ? "Trade Cancelled"
                            : "Trade Reopened"}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDispute}
                    disabled={
                      actionLoading ||
                      outcomeLoading
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-gray-500 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* =================================================
                  MODAL CONTENT
              ================================================= */}

              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
                <div className="space-y-6">
                  {/* GLOBAL MODAL ERROR */}

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                      ⚠️ {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                      ✓ {success}
                    </div>
                  )}

                  {/* =================================================
                      REPORTED ISSUE
                  ================================================= */}

                  <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                      Reported issue
                    </p>

                    <h3 className="mt-2 text-lg font-extrabold text-red-900">
                      {selectedDispute.reason}
                    </h3>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-800">
                      {
                        selectedDispute.description
                      }
                    </p>

                    <p className="mt-4 text-xs font-semibold text-red-700">
                      Reported by{" "}
                      {selectedDispute.user
                        ?.name ||
                        "Unknown trader"}
                    </p>
                  </section>

                  {/* =================================================
                      TRADE CONTEXT
                  ================================================= */}

                  <section>
                    <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                      Trade context
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Trade number
                        </p>

                        <p className="mt-1 font-extrabold text-[#21191B]">
                          {selectedDispute
                            .trade
                            ?.tradeNumber ||
                            "Unknown"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#E7DDDF] bg-[#FBF5F6] p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Current trade status
                        </p>

                        <p className="mt-1 font-extrabold text-[#21191B]">
                          {formatStatus(
                            selectedDispute
                              .trade
                              ?.status
                          )}
                        </p>
                      </div>

                      {selectedDispute.previousTradeStatus && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            Status before dispute
                          </p>

                          <p className="mt-1 font-extrabold text-amber-800">
                            {formatStatus(
                              selectedDispute.previousTradeStatus
                            )}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-700">
                            This is the stage the
                            trade was in before
                            it was moved to
                            DISPUTED.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =================================================
                      TRADERS
                  ================================================= */}

                  <section>
                    <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                      Traders
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        selectedDispute
                          .trade
                          ?.traderA,
                        selectedDispute
                          .trade
                          ?.traderB,
                      ].map(
                        (
                          trader,
                          index
                        ) => (
                          <div
                            key={
                              trader?.id ||
                              index
                            }
                            className="rounded-2xl border border-[#E7DDDF] bg-white p-5"
                          >
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              Trader{" "}
                              {index ===
                              0
                                ? "A"
                                : "B"}
                            </p>

                            <h3 className="mt-1 text-lg font-extrabold text-[#21191B]">
                              {trader?.name ||
                                "Unknown trader"}
                            </h3>

                            <p className="mt-1 break-all text-sm text-gray-500">
                              {trader?.email ||
                                "No email"}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {trader?.phone ||
                                "No phone"}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg bg-[#FBF5F6] p-3">
                                <p className="text-xs text-gray-400">
                                  Barter score
                                </p>

                                <p className="mt-1 font-bold text-[#8A2638]">
                                  {Number(
                                    trader?.barterScore ||
                                      0
                                  ).toFixed(
                                    1
                                  )}
                                </p>
                              </div>

                              <div className="rounded-lg bg-[#FBF5F6] p-3">
                                <p className="text-xs text-gray-400">
                                  Completed
                                </p>

                                <p className="mt-1 font-bold text-[#8A2638]">
                                  {trader?.completedTrades ||
                                    0}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </section>

                  {/* =================================================
                      ITEMS
                  ================================================= */}

                  <section>
                    <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                      Trade items
                    </p>

                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedDispute
                        .trade
                        ?.items
                        ?.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={
                                item.id ||
                                index
                              }
                              className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5"
                            >
                              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Item{" "}
                                {index +
                                  1}
                              </p>

                              <h3 className="mt-1 text-lg font-extrabold text-[#21191B]">
                                {item
                                  .listing
                                  ?.title ||
                                  "Unknown item"}
                              </h3>

                              <p className="mt-2 text-sm text-gray-500">
                                Condition:{" "}
                                {item
                                  .listing
                                  ?.condition ||
                                  "Unknown"}
                              </p>

                              <p className="mt-1 text-sm font-bold text-[#8A2638]">
                                KES{" "}
                                {Number(
                                  item
                                    .listing
                                    ?.estimatedValue ||
                                    0
                                ).toLocaleString()}
                              </p>
                            </div>
                          )
                        )}

                      {(!selectedDispute
                        .trade
                        ?.items ||
                        selectedDispute
                          .trade
                          .items
                          .length ===
                          0) && (
                        <div className="rounded-xl border border-dashed border-[#DCCACE] p-5 text-sm text-gray-500 md:col-span-2">
                          No trade item
                          details are
                          available.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =================================================
                      EXISTING RESOLUTION / OUTCOME
                  ================================================= */}

                  {selectedDispute.outcome && (
                    <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                        Final admin outcome
                      </p>

                      <h3 className="mt-1 text-xl font-extrabold text-green-800">
                        {selectedDispute.outcome ===
                        "CANCEL_TRADE"
                          ? "Trade Cancelled"
                          : "Trade Reopened"}
                      </h3>

                      {selectedDispute.outcome ===
                        "REOPEN_TRADE" &&
                        selectedDispute.previousTradeStatus && (
                          <p className="mt-2 text-sm text-green-700">
                            Trade returned to{" "}
                            <span className="font-bold">
                              {formatStatus(
                                selectedDispute.previousTradeStatus
                              )}
                            </span>
                          </p>
                        )}

                      {selectedDispute.resolution && (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-green-700">
                          {
                            selectedDispute.resolution
                          }
                        </p>
                      )}

                      {selectedDispute.outcomeAt && (
                        <p className="mt-3 text-xs text-green-600">
                          Outcome recorded{" "}
                          {formatDateTime(
                            selectedDispute.outcomeAt
                          )}
                        </p>
                      )}
                    </section>
                  )}

                  {/* =================================================
                      ADMIN STATUS ACTION
                  ================================================= */}

                  {nextStatuses.length >
                    0 && (
                    <section className="rounded-2xl border border-[#E7DDDF] bg-white">
                      <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] p-5">
                        <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                          Dispute workflow
                        </p>

                        <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                          Update dispute status
                        </h3>
                      </div>

                      <div className="space-y-5 p-5">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-[#21191B]">
                            New status
                          </label>

                          <select
                            value={nextStatus}
                            onChange={(
                              event
                            ) =>
                              setNextStatus(
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              actionLoading
                            }
                            className="w-full rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm outline-none focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB]"
                          >
                            <option value="">
                              Select next status
                            </option>

                            {nextStatuses.map(
                              (
                                status
                              ) => (
                                <option
                                  key={
                                    status
                                  }
                                  value={
                                    status
                                  }
                                >
                                  {formatStatus(
                                    status
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={
                              closeDispute
                            }
                            disabled={
                              actionLoading
                            }
                            className="w-full rounded-xl border border-[#DCCACE] bg-white px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
                          >
                            Close
                          </button>

                          <button
                            type="button"
                            onClick={
                              handleUpdateDispute
                            }
                            disabled={
                              actionLoading ||
                              !nextStatus
                            }
                            className="w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {actionLoading
                              ? "Saving..."
                              : `Move to ${formatStatus(
                                  nextStatus
                                )}`}
                          </button>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* =================================================
                      FINAL OUTCOME
                  ================================================= */}

                  {selectedDispute.status ===
                    "UNDER_REVIEW" && (
                    <section className="rounded-2xl border border-[#E7DDDF] bg-white">
                      <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                          Step 2 · Final outcome
                        </p>

                        <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                          Decide what happens
                          to the trade
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          The trade is currently{" "}
                          <span className="font-bold">
                            DISPUTED
                          </span>
                          . Choose whether to
                          cancel it or reopen it at
                          the stage recorded before
                          the dispute.
                        </p>
                      </div>

                      <div className="space-y-5 p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {/* CANCEL */}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutcome(
                                "CANCEL_TRADE"
                              );

                              setOutcomeError(
                                ""
                              );
                            }}
                            disabled={
                              outcomeLoading
                            }
                            className={`rounded-2xl border p-5 text-left transition ${
                              selectedOutcome ===
                              "CANCEL_TRADE"
                                ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                                : "border-gray-200 bg-white hover:border-red-300"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-lg font-extrabold text-red-800">
                                Cancel Trade
                              </p>

                              <span className="text-xl">
                                ✕
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-red-700">
                              End this trade
                              permanently and
                              move it to
                              CANCELLED.
                            </p>
                          </button>

                          {/* REOPEN */}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOutcome(
                                "REOPEN_TRADE"
                              );

                              setOutcomeError(
                                ""
                              );
                            }}
                            disabled={
                              outcomeLoading ||
                              !selectedDispute.previousTradeStatus
                            }
                            className={`rounded-2xl border p-5 text-left transition ${
                              selectedOutcome ===
                              "REOPEN_TRADE"
                                ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                                : "border-gray-200 bg-white hover:border-green-300"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-lg font-extrabold text-green-800">
                                Reopen Trade
                              </p>

                              <span className="text-xl">
                                ↻
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-green-700">
                              Return the trade to
                              the stage it had
                              before the dispute.
                            </p>

                            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-green-800">
                              {selectedDispute.previousTradeStatus
                                ? formatStatus(
                                    selectedDispute.previousTradeStatus
                                  )
                                : "Previous stage unavailable"}
                            </p>
                          </button>
                        </div>

                        {/* RESOLUTION */}

                        {selectedOutcome && (
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-4">
                              <label className="block text-sm font-bold text-[#21191B]">
                                Resolution
                              </label>

                              <span className="text-xs text-gray-400">
                                {
                                  resolution.length
                                }
                                /5000
                              </span>
                            </div>

                            <textarea
                              rows={6}
                              maxLength={5000}
                              value={
                                resolution
                              }
                              onChange={(
                                event
                              ) => {
                                setResolution(
                                  event
                                    .target
                                    .value
                                );

                                setOutcomeError(
                                  ""
                                );
                              }}
                              disabled={
                                outcomeLoading
                              }
                              placeholder={
                                selectedOutcome ===
                                "CANCEL_TRADE"
                                  ? "Explain why the trade was cancelled..."
                                  : "Explain why the trade was reopened..."
                              }
                              className="w-full resize-y rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB] disabled:bg-gray-100"
                            />
                          </div>
                        )}

                        {/* OUTCOME ERROR */}

                        {outcomeError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            ⚠️{" "}
                            {
                              outcomeError
                            }
                          </div>
                        )}

                        {/* OUTCOME BUTTONS */}

                        <div className="flex flex-col-reverse gap-3 border-t border-[#E7DDDF] pt-5 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={
                              closeDispute
                            }
                            disabled={
                              outcomeLoading
                            }
                            className="w-full rounded-xl border border-[#DCCACE] bg-white px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
                          >
                            Close
                          </button>

                          <button
                            type="button"
                            onClick={
                              handleApplyOutcome
                            }
                            disabled={
                              outcomeLoading ||
                              !selectedOutcome ||
                              !resolution.trim()
                            }
                            className="w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {outcomeLoading
                              ? "Applying Outcome..."
                              : "Apply Dispute Outcome"}
                          </button>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* =================================================
                      RESOLVED
                  ================================================= */}

                  {selectedDispute.status ===
                    "RESOLVED" &&
                    !selectedDispute.outcome && (
                      <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                          Dispute resolved
                        </p>

                        <h3 className="mt-1 text-xl font-extrabold text-green-800">
                          Resolution recorded
                        </h3>

                        {selectedDispute.resolution && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-green-700">
                            {
                              selectedDispute.resolution
                            }
                          </p>
                        )}
                      </section>
                    )}

                  {/* =================================================
                      CLOSED
                  ================================================= */}

                  {selectedDispute.status ===
                    "RESOLVED" && (
                    <section className="rounded-2xl border border-gray-200 bg-gray-50">
                      <div className="space-y-5 p-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            Final workflow
                          </p>

                          <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                            Close dispute record
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            Closing the dispute
                            archives the resolved
                            case. The trade outcome
                            has already been applied.
                          </p>
                        </div>

                        {nextStatuses.includes(
                          "CLOSED"
                        ) && (
                          <button
                            type="button"
                            onClick={() => {
                              setNextStatus(
                                "CLOSED"
                              );

                              setError("");

                              if (
                                !resolution.trim()
                              ) {
                                setResolution(
                                  selectedDispute.resolution ||
                                    ""
                                );
                              }
                            }}
                            disabled={
                              actionLoading
                            }
                            className={`w-full rounded-xl px-6 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              nextStatus ===
                              "CLOSED"
                                ? "bg-[#3D0F18] text-white"
                                : "bg-[#5B1725] text-white hover:bg-[#3D0F18]"
                            }`}
                          >
                            Select Closed
                          </button>
                        )}
                      </div>

                      {nextStatus ===
                        "CLOSED" && (
                        <div className="border-t border-gray-200 p-5">
                          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setNextStatus(
                                  ""
                                )
                              }
                              className="w-full rounded-xl border border-[#DCCACE] bg-white px-6 py-3 text-sm font-bold text-gray-600 sm:w-auto"
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              onClick={
                                handleUpdateDispute
                              }
                              disabled={
                                actionLoading
                              }
                              className="w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white hover:bg-[#3D0F18] disabled:opacity-50 sm:w-auto"
                            >
                              {actionLoading
                                ? "Closing..."
                                : "Close Dispute"}
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDisputes;
