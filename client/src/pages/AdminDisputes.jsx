
import {useCallback, useEffect, useState,} from "react";
import {getAdminDisputes, updateDispute, applyDisputeOutcome, getDisputeEvents,} from "../api/disputeApi";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   STATUS STYLES
========================================================= */

const statusStyles = {
  OPEN: "border-red-200 bg-red-50 text-red-700",
  UNDER_REVIEW: "border-blue-200 bg-blue-50 text-blue-700",
  RESOLVED: "border-green-200 bg-green-50 text-green-700",
  CLOSED: "border-gray-200 bg-gray-100 text-gray-700",
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

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

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

const getOutcomeLabel = (outcome) => {
  if (outcome === "CANCEL_TRADE") {
    return "Trade Cancelled";
  }

  if (outcome === "REOPEN_TRADE") {
    return "Trade Reopened";
  }

  return formatStatus(outcome);
};

const getEventTitle = (eventType) => {
  const titles = {
    DISPUTE_CREATED: "Dispute Created",
    STATUS_UPDATED: "Dispute Status Updated",
    DISPUTE_STATUS_UPDATED:
      "Dispute Status Updated",
    OUTCOME_APPLIED: "Dispute Outcome Applied",
    DISPUTE_OUTCOME_APPLIED:
      "Dispute Outcome Applied",
    TRADE_STATUS_CHANGED:
      "Trade Status Changed",
  };

  return (
    titles[eventType] ||
    formatStatus(eventType)
  );
};

const getEventIcon = (eventType) => {
  if (
    eventType === "DISPUTE_CREATED"
  ) {
    return "!";
  }

  if (
    eventType?.includes("OUTCOME")
  ) {
    return "✓";
  }

  if (
    eventType?.includes("STATUS")
  ) {
    return "↻";
  }

  return "•";
};

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[status] ||
        statusStyles.OPEN
        }`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {formatStatus(status)}
    </span>
  );
};

const SectionHeader = ({ eyebrow, title, description}) => {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
          {eyebrow}
        </p>
      )}

      <h3 className="mt-1 text-xl font-extrabold tracking-tight text-[#21191B]">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
};

const InfoCard = ({
  label,
  value,
  valueClassName = "",
}) => {
  return (
    <div className="rounded-2xl border border-[#E9DFE2] bg-[#FCF8F9] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p
        className={`mt-2 wrap-break-words text-sm font-extrabold text-[#21191B] ${valueClassName}`}
      >
        {value || "—"}
      </p>
    </div>
  );
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
  const [statusCounts, setStatusCounts] = useState({ OPEN: 0, UNDER_REVIEW: 0, RESOLVED: 0, CLOSED: 0,});
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [filterStatus, setFilterStatus] = useState("OPEN");
  const [resolution, setResolution] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [outcomeError, setOutcomeError] = useState("");

  /* =======================================================
     AUDIT HISTORY
  ======================================================= */

  const [disputeEvents, setDisputeEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const isAdmin = user?.role === "ADMIN";

  /* =======================================================
     LOAD DISPUTES + GLOBAL COUNTS
  ======================================================= */

  const loadDisputes = useCallback(async () => {
      if (!isAdmin) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const statuses = [
          "OPEN",
          "UNDER_REVIEW",
          "RESOLVED",
          "CLOSED",
        ];

        const responses = await Promise.all(
          statuses.map((status) =>
            getAdminDisputes(status)
          )
        );

        const nextCounts = {};

        statuses.forEach(
          (status, index) => {
            nextCounts[status] =
              responses[index]?.disputes
                ?.length || 0;
          }
        );

        setStatusCounts(nextCounts);

        const selectedIndex = statuses.indexOf(filterStatus);
        const selectedResponse = selectedIndex >= 0
            ? responses[selectedIndex]
            : null;

        const nextDisputes = selectedResponse?.disputes || [];

        setDisputes(nextDisputes);

        if (selectedDispute?.id) {
          const refreshed =
            nextDisputes.find(
              (dispute) =>
                dispute.id ===
                selectedDispute.id
            );

          if (refreshed) {
            setSelectedDispute(refreshed);
          }
        }
      } catch (error) {
        console.error("LOAD ADMIN DISPUTES ERROR:", error);

        setError( error.response?.data?.message || "Unable to load disputes."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      isAdmin,
      filterStatus,
      selectedDispute?.id,
    ]
  );

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  /* =======================================================
     LOAD AUDIT EVENTS
  ======================================================= */

  const loadDisputeEvents = useCallback(async (disputeId) => {
      if (!disputeId || !isAdmin) {
        return;
      }

      try {
        setEventsLoading(true);
        setEventsError("");
        setDisputeEvents([]);

        const response = await getDisputeEvents(
            disputeId
          );

        setDisputeEvents(response?.events || []);
      } catch (error) {
        console.error( "LOAD DISPUTE EVENTS ERROR:",error);

        setEventsError(
          error.response?.data?.message || "Unable to load dispute audit history.");

        setDisputeEvents([]);
      } finally {
        setEventsLoading(false);
      }
    },
    [isAdmin]
  );

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

    setDisputeEvents([]);
    setEventsError("");

    loadDisputeEvents(dispute.id);
  };

  /* =======================================================
     CLOSE DISPUTE
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

    setDisputeEvents([]);
    setEventsError("");
  };

  /* =======================================================
     UPDATE DISPUTE STATUS
  ======================================================= */

  const handleUpdateDispute = async () => {
    if (!selectedDispute) {
      return;
    }

    if (!nextStatus) {
      setError("Please select the next dispute status.");
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

      await loadDisputeEvents(
        selectedDispute.id
      );
    } catch (error) {
      console.error( "UPDATE ADMIN DISPUTE ERROR:",  error);

      setError(
        error.response?.data?.message ||"Unable to update dispute.");
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
      selectedDispute.status !=="UNDER_REVIEW"
    ) {
      setOutcomeError( "The dispute must be under review before an outcome can be applied.");
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
      setOutcomeError( "Please enter a resolution.");
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

      const disputeId =
        selectedDispute.id;

      const response =
        await applyDisputeOutcome(
          disputeId,
          selectedOutcome,
          trimmedResolution
        );

      setSuccess(
        response?.message ||
          "Dispute outcome applied successfully."
      );

      setSelectedDispute(null);

      setResolution("");
      setSelectedOutcome("");

      await loadDisputes();

      setDisputeEvents([]);
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
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
            🔐
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#21191B]">
            Authentication required
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Please log in to access the
            dispute management panel.
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
      <div className="min-h-screen bg-[#F8F5F3] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-extrabold text-[#21191B]">
            Administrator Access Required
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            You do not have permission to
            view the dispute management panel.
          </p>
        </div>
      </div>
    );
  }

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
          PAGE HEADER
      ================================================= */}

      <section className="overflow-hidden bg-[#3D0F18] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold text-[#DCAEB7]">
              <span className="h-2 w-2 rounded-full bg-[#DCAEB7]" />
              Administration
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Trade Disputes
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
              Review reported barter problems,
              examine both sides of the trade,
              track the investigation, and
              record the final outcome.
            </p>
          </div>
        </div>
      </section>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* GLOBAL ERROR */}

        {error && !selectedDispute && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="text-lg">
              ⚠️
            </span>

            <div>
              <p className="font-extrabold">
                Something went wrong
              </p>

              <p className="mt-1 leading-6">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* GLOBAL SUCCESS */}

        {success && !selectedDispute && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            <span className="text-lg">
              ✓
            </span>

            <div>
              <p className="font-extrabold">
                Action completed
              </p>

              <p className="mt-1 leading-6">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            QUEUE OVERVIEW
        ================================================= */}

        <section className="rounded-3xl border border-[#E7DDDF] bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                Dispute queue
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#21191B]">
                Review reports
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Select a queue to review cases
                at each stage of the dispute
                workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-130">
              {[
                "OPEN",
                "UNDER_REVIEW",
                "RESOLVED",
                "CLOSED",
              ].map((status) => {
                const active =
                  filterStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setFilterStatus(status)
                    }
                    className={`group rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#DCAEB7] ${
                      active
                        ? "border-[#5B1725] bg-[#5B1725] text-white shadow-md"
                        : "border-[#E7DDDF] bg-white text-[#21191B] hover:border-[#B98A95] hover:bg-[#FCF8F9]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          active
                            ? "text-white/70"
                            : "text-gray-400"
                        }`}
                      >
                        {status ===
                        "UNDER_REVIEW"
                          ? "Under review"
                          : formatStatus(
                              status
                            )}
                      </span>

                      <span
                        className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-[#F5E8EB] text-[#5B1725]"
                        }`}
                      >
                        {statusCounts[
                          status
                        ] || 0}
                      </span>
                    </div>

                    <div
                      className={`mt-2 text-xs ${
                        active
                          ? "text-white/60"
                          : "text-gray-400"
                      }`}
                    >
                      {active
                        ? "Currently viewing"
                        : "View queue"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =================================================
            DISPUTE LIST
        ================================================= */}

        <section className="mt-6">
          {loading ? (
            <div className="rounded-3xl border border-[#E7DDDF] bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5E8EB]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#DCAEB7] border-t-[#5B1725]" />
              </div>

              <h3 className="mt-5 text-lg font-extrabold text-[#21191B]">
                Loading disputes
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Fetching the latest dispute
                queue...
              </p>
            </div>
          ) : disputes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#DCCACE] bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl">
                ✓
              </div>

              <h3 className="mt-5 text-xl font-black text-[#21191B]">
                No disputes found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                There are currently no disputes
                in the{" "}
                <span className="font-bold text-[#5B1725]">
                  {formatStatus(
                    filterStatus
                  )}
                </span>{" "}
                queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => {
                const trade =
                  dispute.trade;

                return (
                  <article
                    key={dispute.id}
                    className="group rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm transition hover:-translate-y-px hover:border-[#CDAAB2] hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        {/* BADGES */}

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={
                              dispute.status
                            }
                          />

                          <span className="inline-flex items-center rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                            Trade{" "}
                            {trade?.tradeNumber ||
                              "Unknown"}
                          </span>

                          {dispute.outcome && (
                            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                              ✓{" "}
                              {getOutcomeLabel(
                                dispute.outcome
                              )}
                            </span>
                          )}
                        </div>

                        {/* TITLE */}

                        <h3 className="mt-5 text-xl font-black tracking-tight text-[#21191B] sm:text-2xl">
                          {dispute.reason ||
                            "Trade dispute"}
                        </h3>

                        <p className="mt-2 line-clamp-3 max-w-3xl text-sm leading-7 text-gray-600">
                          {dispute.description}
                        </p>

                        {/* META */}

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <InfoCard
                            label="Reported by"
                            value={
                              dispute.user
                                ?.name ||
                              "Unknown user"
                            }
                          />

                          <InfoCard
                            label="Submitted"
                            value={formatDateTime(
                              dispute.createdAt
                            )}
                          />
                        </div>

                        {/* OUTCOME SUMMARY */}

                        {dispute.outcome && (
                          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
                                ✓
                              </div>

                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-green-700">
                                  Admin outcome
                                </p>

                                <p className="mt-1 font-extrabold text-green-900">
                                  {getOutcomeLabel(
                                    dispute.outcome
                                  )}
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
                                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-green-800">
                                    {
                                      dispute.resolution
                                    }
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* REVIEW BUTTON */}

                      <div className="shrink-0 lg:pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            openDispute(
                              dispute
                            )
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5B1725] px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#DCAEB7] focus:ring-offset-2 sm:w-auto"
                        >
                          Review Dispute
                          <span className="text-base transition-transform group-hover:translate-x-0.5">
                            →
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =================================================
          REVIEW MODAL
      ================================================= */}

      {selectedDispute && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#21191B]/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !actionLoading &&
              !outcomeLoading
            ) {
              closeDispute();
            }
          }}
        >
          <div className="flex min-h-full items-start justify-center sm:items-center">
            <div className="my-2 flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:my-6">
              {/* =================================================
                  MODAL HEADER
              ================================================= */}

              <header className="shrink-0 border-b border-[#E7DDDF] bg-[#FBF5F6] px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={
                          selectedDispute.status
                        }
                      />

                      {selectedDispute.outcome && (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          ✓{" "}
                          {getOutcomeLabel(
                            selectedDispute.outcome
                          )}
                        </span>
                      )}
                    </div>

                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#8A2638]">
                      Dispute review
                    </p>

                    <h2 className="mt-1 truncate text-xl font-black tracking-tight text-[#21191B] sm:text-2xl">
                      {selectedDispute
                        .trade
                        ?.tradeNumber ||
                        "Trade Dispute"}
                    </h2>

                    <p className="mt-2 text-xs text-gray-500">
                      Submitted{" "}
                      {formatDateTime(
                        selectedDispute.createdAt
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeDispute}
                    disabled={
                      actionLoading ||
                      outcomeLoading
                    }
                    aria-label="Close dispute review"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E7DDDF] bg-white text-xl font-medium text-gray-500 transition hover:border-[#B98A95] hover:bg-[#F5E8EB] hover:text-[#5B1725] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              </header>

              {/* =================================================
                  MODAL BODY
              ================================================= */}

              <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
                <div className="space-y-7">
                  {/* MODAL MESSAGES */}

                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <span className="text-lg">
                        ⚠️
                      </span>

                      <div className="min-w-0">
                        <p className="font-extrabold">
                          Action could not be completed
                        </p>

                        <p className="mt-1 leading-6">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                      <span className="text-lg">
                        ✓
                      </span>

                      <div className="min-w-0">
                        <p className="font-extrabold">
                          Action completed
                        </p>

                        <p className="mt-1 leading-6">
                          {success}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* =================================================
                      REPORTED ISSUE
                  ================================================= */}

                  <section className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-lg">
                        ⚠️
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700">
                          Reported issue
                        </p>

                        <h3 className="mt-1.5 text-xl font-black text-red-950">
                          {selectedDispute.reason}
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-red-900/80">
                          {
                            selectedDispute.description
                          }
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-red-700">
                          <span>
                            Reported by
                          </span>

                          <span className="font-extrabold">
                            {selectedDispute
                              .user
                              ?.name ||
                              "Unknown trader"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* =================================================
                      TRADE CONTEXT
                  ================================================= */}

                  <section>
                    <SectionHeader
                      eyebrow="Trade context"
                      title="Trade information"
                      description="The trade information connected to this dispute."
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard
                        label="Trade number"
                        value={
                          selectedDispute
                            .trade
                            ?.tradeNumber
                        }
                      />

                      <InfoCard
                        label="Current trade status"
                        value={formatStatus(
                          selectedDispute
                            .trade
                            ?.status
                        )}
                      />

                      {selectedDispute.previousTradeStatus && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">
                            Status before dispute
                          </p>

                          <p className="mt-2 text-sm font-extrabold text-amber-900">
                            {formatStatus(
                              selectedDispute.previousTradeStatus
                            )}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-amber-700">
                            This is the trade stage
                            recorded before the
                            dispute moved the trade
                            into DISPUTED.
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =================================================
                      TRADERS
                  ================================================= */}

                  <section>
                    <SectionHeader
                      eyebrow="Participants"
                      title="Traders"
                      description="Both users involved in the trade."
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        selectedDispute.trade
                          ?.traderA,
                        selectedDispute.trade
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
                            className="rounded-3xl border border-[#E7DDDF] bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5E8EB] font-black text-[#5B1725]">
                                {index ===
                                0
                                  ? "A"
                                  : "B"}
                              </div>

                              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Trader{" "}
                                {index ===
                                0
                                  ? "A"
                                  : "B"}
                              </span>
                            </div>

                            <h3 className="mt-5 text-lg font-black text-[#21191B]">
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

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <div className="rounded-xl bg-[#FCF8F9] p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                  Barter score
                                </p>

                                <p className="mt-1 font-black text-[#8A2638]">
                                  {Number(
                                    trader?.barterScore ||
                                      0
                                  ).toFixed(
                                    1
                                  )}
                                </p>
                              </div>

                              <div className="rounded-xl bg-[#FCF8F9] p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                  Completed
                                </p>

                                <p className="mt-1 font-black text-[#8A2638]">
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
                      TRADE ITEMS
                  ================================================= */}

                  <section>
                    <SectionHeader
                      eyebrow="Trade contents"
                      title="Trade items"
                      description="Items attached to the disputed trade."
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      {selectedDispute
                        .trade
                        ?.items?.length > 0 ? (
                        selectedDispute.trade.items.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={
                                item.id ||
                                index
                              }
                              className="rounded-3xl border border-[#E7DDDF] bg-[#FCF8F9] p-5"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-[#8A2638] shadow-sm">
                                {index + 1}
                              </div>

                              <h3 className="mt-4 text-lg font-black text-[#21191B]">
                                {item
                                  .listing
                                  ?.title ||
                                  "Unknown item"}
                              </h3>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-600">
                                  {formatStatus(
                                    item
                                      .listing
                                      ?.condition
                                  )}
                                </span>

                                <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#8A2638]">
                                  KES{" "}
                                  {Number(
                                    item
                                      .listing
                                      ?.estimatedValue ||
                                      0
                                  ).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[#DCCACE] p-6 text-sm text-gray-500 md:col-span-2">
                          No trade item details
                          are available.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =================================================
                      AUDIT HISTORY
                  ================================================= */}

                  <section className="rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
                    <div className="border-b border-[#E7DDDF] bg-[#FCF8F9] p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                            Audit trail
                          </p>

                          <h3 className="mt-1 text-xl font-black text-[#21191B]">
                            Dispute History
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-gray-500">
                            A chronological record
                            of important actions on
                            this dispute.
                          </p>
                        </div>

                        <div className="inline-flex w-fit items-center rounded-full bg-[#F5E8EB] px-3 py-1.5 text-xs font-black text-[#5B1725]">
                          {disputeEvents.length}{" "}
                          {disputeEvents.length ===
                          1
                            ? "event"
                            : "events"}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      {eventsLoading && (
                        <div className="rounded-2xl border border-[#E7DDDF] bg-[#FCF8F9] px-5 py-10 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCAEB7] border-t-[#5B1725]" />
                          </div>

                          <p className="mt-4 text-sm font-bold text-gray-600">
                            Loading audit history...
                          </p>
                        </div>
                      )}

                      {!eventsLoading &&
                        eventsError && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                            <p className="font-extrabold text-red-800">
                              Audit history unavailable
                            </p>

                            <p className="mt-1 text-sm leading-6 text-red-700">
                              {eventsError}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                loadDisputeEvents(
                                  selectedDispute.id
                                )
                              }
                              className="mt-4 inline-flex items-center rounded-xl bg-red-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-red-800"
                            >
                              Try Again
                            </button>
                          </div>
                        )}

                      {!eventsLoading &&
                        !eventsError &&
                        disputeEvents.length ===
                          0 && (
                          <div className="rounded-2xl border border-dashed border-[#DCCACE] bg-[#FCF8F9] px-5 py-10 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
                              📝
                            </div>

                            <p className="mt-4 font-extrabold text-[#21191B]">
                              No audit events yet
                            </p>

                            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-gray-500">
                              No recorded activity is
                              available for this
                              dispute.
                            </p>
                          </div>
                        )}

                      {!eventsLoading &&
                        !eventsError &&
                        disputeEvents.length >
                          0 && (
                          <div className="relative">
                            {/* TIMELINE */}

                            <div className="absolute bottom-5 left-5 top-5 w-px bg-[#E7DDDF]" />

                            <div className="space-y-5">
                              {disputeEvents.map(
                                (
                                  event,
                                  index
                                ) => (
                                  <div
                                    key={
                                      event.id ||
                                      `${event.eventType}-${index}`
                                    }
                                    className="relative flex gap-4"
                                  >
                                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#5B1725] text-xs font-black text-white shadow-sm">
                                      {getEventIcon(
                                        event.eventType
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1 rounded-2xl border border-[#E7DDDF] bg-white p-4 shadow-sm">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="font-extrabold text-[#21191B]">
                                            {getEventTitle(
                                              event.eventType
                                            )}
                                          </p>

                                          {event.user?.name && (
                                            <p className="mt-1 text-xs font-semibold text-[#8A2638]">
                                              By{" "}
                                              {
                                                event
                                                  .user
                                                  .name
                                              }
                                            </p>
                                          )}
                                        </div>

                                        <time className="shrink-0 text-xs font-medium text-gray-400">
                                          {formatDateTime(
                                            event.createdAt
                                          )}
                                        </time>
                                      </div>

                                      {event.description && (
                                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                                          {
                                            event.description
                                          }
                                        </p>
                                      )}

                                      {event.metadata &&
                                        typeof event.metadata ===
                                          "object" &&
                                        Object.keys(
                                          event.metadata
                                        ).length >
                                          0 && (
                                          <details className="mt-4 overflow-hidden rounded-xl border border-[#E7DDDF]">
                                            <summary className="cursor-pointer bg-[#FCF8F9] px-4 py-3 text-xs font-extrabold text-[#5B1725]">
                                              View event details
                                            </summary>

                                            <pre className="max-h-64 overflow-auto bg-[#21191B] p-4 text-xs leading-5 text-white">
                                              {JSON.stringify(
                                                event.metadata,
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </details>
                                        )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </section>

                  {/* =================================================
                      EXISTING OUTCOME
                  ================================================= */}

                  {selectedDispute.outcome && (
                    <section className="rounded-3xl border border-green-200 bg-green-50 p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-lg font-black text-white">
                          ✓
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
                            Final admin outcome
                          </p>

                          <h3 className="mt-1 text-xl font-black text-green-900">
                            {getOutcomeLabel(
                              selectedDispute.outcome
                            )}
                          </h3>

                          {selectedDispute.outcome ===
                            "REOPEN_TRADE" &&
                            selectedDispute.previousTradeStatus && (
                              <p className="mt-2 text-sm text-green-800">
                                Trade returned to{" "}
                                <span className="font-extrabold">
                                  {formatStatus(
                                    selectedDispute.previousTradeStatus
                                  )}
                                </span>
                              </p>
                            )}

                          {selectedDispute.resolution && (
                            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-green-800">
                              {
                                selectedDispute.resolution
                              }
                            </p>
                          )}

                          {selectedDispute.outcomeAt && (
                            <p className="mt-3 text-xs text-green-700">
                              Outcome recorded{" "}
                              {formatDateTime(
                                selectedDispute.outcomeAt
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* =================================================
                      STATUS WORKFLOW
                  ================================================= */}

                  {nextStatuses.length >
                    0 && (
                    <section className="rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
                      <div className="border-b border-[#E7DDDF] bg-[#FCF8F9] p-5 sm:p-6">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                          Dispute workflow
                        </p>

                        <h3 className="mt-1 text-xl font-black text-[#21191B]">
                          Update dispute status
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Move the dispute to the
                          next permitted stage.
                        </p>
                      </div>

                      <div className="space-y-5 p-5 sm:p-6">
                        <div>
                          <label className="mb-2 block text-sm font-extrabold text-[#21191B]">
                            New status
                          </label>

                          <select
                            value={nextStatus}
                            onChange={(
                              event
                            ) => {
                              setNextStatus(
                                event.target
                                  .value
                              );
                              setError("");
                            }}
                            disabled={
                              actionLoading
                            }
                            className="w-full rounded-2xl border border-[#DCCACE] bg-white px-4 py-3.5 text-sm font-medium text-[#21191B] outline-none transition focus:border-[#8A2638] focus:ring-4 focus:ring-[#F5E8EB] disabled:bg-gray-100"
                          >
                            <option value="">
                              Select next status
                            </option>

                            {nextStatuses.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {formatStatus(
                                    status
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-[#E7DDDF] pt-5 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={
                              closeDispute
                            }
                            disabled={
                              actionLoading
                            }
                            className="w-full rounded-2xl border border-[#DCCACE] bg-white px-6 py-3.5 text-sm font-extrabold text-gray-600 transition hover:bg-[#FCF8F9] hover:text-[#5B1725] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5B1725] px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {actionLoading ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Saving...
                              </>
                            ) : (
                              <>
                                Move to{" "}
                                {formatStatus(
                                  nextStatus
                                )}
                                <span>
                                  →
                                </span>
                              </>
                            )}
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
                    <section className="rounded-3xl border border-[#E7DDDF] bg-white shadow-sm">
                      <div className="border-b border-[#E7DDDF] bg-[#FCF8F9] p-5 sm:p-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B1725] text-sm font-black text-white">
                            2
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8A2638]">
                              Final outcome
                            </p>

                            <h3 className="mt-1 text-xl font-black text-[#21191B]">
                              Decide what happens to
                              the trade
                            </h3>
                          </div>
                        </div>

                        <p className="mt-4 text-sm leading-7 text-gray-600">
                          The trade is currently{" "}
                          <span className="font-black text-[#5B1725]">
                            DISPUTED
                          </span>
                          . Choose whether to
                          cancel it permanently or
                          return it to the stage
                          recorded before the dispute.
                        </p>
                      </div>

                      <div className="space-y-6 p-5 sm:p-6">
                        {/* OUTCOME OPTIONS */}

                        <div className="grid gap-4 md:grid-cols-2">
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
                            className={`group rounded-3xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-red-200 ${
                              selectedOutcome ===
                              "CANCEL_TRADE"
                                ? "border-red-500 bg-red-50 shadow-sm ring-2 ring-red-100"
                                : "border-[#E7DDDF] bg-white hover:border-red-300 hover:bg-red-50/50"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-lg text-red-700">
                                ×
                              </div>

                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                                  selectedOutcome ===
                                  "CANCEL_TRADE"
                                    ? "border-red-600 bg-red-600 text-white"
                                    : "border-gray-300"
                                }`}
                              >
                                {selectedOutcome ===
                                  "CANCEL_TRADE" &&
                                  "✓"}
                              </span>
                            </div>

                            <h4 className="mt-5 text-lg font-black text-red-900">
                              Cancel Trade
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-red-800/80">
                              End this trade
                              permanently and move
                              it to CANCELLED.
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
                            className={`group rounded-3xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-green-200 ${
                              selectedOutcome ===
                              "REOPEN_TRADE"
                                ? "border-green-500 bg-green-50 shadow-sm ring-2 ring-green-100"
                                : "border-[#E7DDDF] bg-white hover:border-green-300 hover:bg-green-50/50"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-lg text-green-700">
                                ↻
                              </div>

                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                                  selectedOutcome ===
                                  "REOPEN_TRADE"
                                    ? "border-green-600 bg-green-600 text-white"
                                    : "border-gray-300"
                                }`}
                              >
                                {selectedOutcome ===
                                  "REOPEN_TRADE" &&
                                  "✓"}
                              </span>
                            </div>

                            <h4 className="mt-5 text-lg font-black text-green-900">
                              Reopen Trade
                            </h4>

                            <p className="mt-2 text-sm leading-6 text-green-800/80">
                              Return the trade to
                              the stage it had before
                              the dispute.
                            </p>

                            <div className="mt-4 rounded-xl bg-white px-3 py-2.5 text-xs font-extrabold text-green-800">
                              {selectedDispute.previousTradeStatus
                                ? `Return to ${formatStatus(
                                    selectedDispute.previousTradeStatus
                                  )}`
                                : "Previous stage unavailable"}
                            </div>
                          </button>
                        </div>

                        {/* RESOLUTION */}

                        {selectedOutcome && (
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-4">
                              <label className="text-sm font-extrabold text-[#21191B]">
                                Resolution
                              </label>

                              <span className="text-xs font-medium text-gray-400">
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
                                  event.target
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
                              className="w-full resize-y rounded-2xl border border-[#DCCACE] bg-white px-4 py-3.5 text-sm leading-7 text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-4 focus:ring-[#F5E8EB] disabled:bg-gray-100"
                            />
                          </div>
                        )}

                        {outcomeError && (
                          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                            <span>
                              ⚠️
                            </span>

                            <p className="leading-6">
                              {
                                outcomeError
                              }
                            </p>
                          </div>
                        )}

                        {/* OUTCOME ACTIONS */}

                        <div className="flex flex-col-reverse gap-3 border-t border-[#E7DDDF] pt-5 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={
                              closeDispute
                            }
                            disabled={
                              outcomeLoading
                            }
                            className="w-full rounded-2xl border border-[#DCCACE] bg-white px-6 py-3.5 text-sm font-extrabold text-gray-600 transition hover:bg-[#FCF8F9] hover:text-[#5B1725] disabled:opacity-50 sm:w-auto"
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5B1725] px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {outcomeLoading ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Applying...
                              </>
                            ) : (
                              <>
                                Apply Dispute
                                Outcome
                                <span>
                                  →
                                </span>
                              </>
                            )}
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
                      <section className="rounded-3xl border border-green-200 bg-green-50 p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white">
                            ✓
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
                              Dispute resolved
                            </p>

                            <h3 className="mt-1 text-xl font-black text-green-900">
                              Resolution recorded
                            </h3>

                            {selectedDispute.resolution && (
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-green-800">
                                {
                                  selectedDispute.resolution
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </section>
                    )}

                  {/* =================================================
                      CLOSE RESOLVED DISPUTE
                  ================================================= */}

                  {selectedDispute.status ===
                    "RESOLVED" && (
                    <section className="rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
                          Final workflow
                        </p>

                        <h3 className="mt-1 text-xl font-black text-[#21191B]">
                          Close dispute record
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                          Closing the dispute
                          archives the resolved case.
                          The trade outcome has already
                          been applied.
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
                          className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                            nextStatus ===
                            "CLOSED"
                              ? "bg-[#3D0F18] text-white"
                              : "bg-[#5B1725] text-white hover:bg-[#3D0F18]"
                          }`}
                        >
                          {nextStatus ===
                          "CLOSED"
                            ? "Closing selected"
                            : "Select Close"}
                        </button>
                      )}

                      {nextStatus ===
                        "CLOSED" && (
                        <div className="mt-5 border-t border-gray-200 pt-5">
                          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setNextStatus(
                                  ""
                                )
                              }
                              disabled={
                                actionLoading
                              }
                              className="w-full rounded-2xl border border-[#DCCACE] bg-white px-6 py-3.5 text-sm font-extrabold text-gray-600 transition hover:bg-white disabled:opacity-50 sm:w-auto"
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
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5B1725] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#3D0F18] disabled:opacity-50 sm:w-auto"
                            >
                              {actionLoading ? (
                                <>
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                  Closing...
                                </>
                              ) : (
                                "Close Dispute"
                              )}
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
