
import { useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate, useParams,} from "react-router-dom";
import {getTradeById,updateTradeStatus, confirmTrade,} from "../api/tradeApi";
import {createRating,getTradeRatings,} from "../api/ratingApi";
import { useAuth } from "../context/AuthContext";
import { getDisputeEvents,createDispute,} from "../api/disputeApi";

/* =========================================================
   STATUS CONFIGURATION
========================================================= */

const statusStyles = {
  PENDING: "bg-yellow-100 text-yellow-800",
  AGREED: "bg-blue-100 text-blue-800",
  VERIFICATION: "bg-purple-100 text-purple-800",
  READY_FOR_HANDOVER:"bg-indigo-100 text-indigo-800",
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

/* =========================================================
   CONFIRMATION STAGES
========================================================= */

const AGREEMENT_STAGE = "AGREEMENT";
const VERIFICATION_STAGE = "VERIFICATION";
const HANDOVER_STAGE = "HANDOVER";
const HANDOVER_STARTED_STAGE =
  "HANDOVER_STARTED";
const COMPLETION_STAGE = "COMPLETION";

/* =========================================================
   HELPERS
========================================================= */

const formatStatus = (status) => {
  return (
    status
      ?.replace(/_/g, " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      ) || "Unknown"
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(
    date
  ).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "—";

  return new Date(
    date
  ).toLocaleString("en-KE", {
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

/* =========================================================
   CONFIRMATION STATUS CARD
========================================================= */

const ConfirmationStatusCard = ({
  label,
  name,
  confirmed,
  confirmedAt,
  isCurrentUser,
}) => {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        confirmed
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${
              confirmed
                ? "text-green-700"
                : "text-gray-500"
            }`}
          >
            {label}
          </p>

          <h3
            className={`mt-1 text-lg font-extrabold ${
              confirmed
                ? "text-green-800"
                : "text-[#21191B]"
            }`}
          >
            {name || label}
          </h3>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
            confirmed
              ? "bg-green-600 text-white"
              : "bg-white text-gray-400 shadow-sm"
          }`}
        >
          {confirmed ? "✓" : "○"}
        </div>
      </div>

      <p
        className={`mt-4 text-sm font-bold ${
          confirmed
            ? "text-green-700"
            : "text-gray-500"
        }`}
      >
        {confirmed
          ? "Confirmation recorded"
          : "Waiting for confirmation"}
      </p>

      {confirmedAt && (
        <p
          className={`mt-1 text-xs ${
            confirmed
              ? "text-green-600"
              : "text-gray-500"
          }`}
        >
          Confirmed{" "}
          {formatDateTime(
            confirmedAt
          )}
        </p>
      )}

      {isCurrentUser && (
        <span className="mt-4 inline-flex rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
          You
        </span>
      )}
    </div>
  );
};

/* =========================================================
   TRADE DETAILS
========================================================= */

const TradeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [handoverError, setHandoverError] = useState("");
  const [confirmationSuccess, setConfirmationSuccess] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState("");
  const [ratings, setRatings] = useState([]);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");
  const [disputeEvents, setDisputeEvents] = useState([]);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [disputeSuccess, setDisputeSuccess] = useState("");

  /* =======================================================
     LOAD TRADE
  ======================================================= */

  const loadTrade = useCallback(
    async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const response =
          await getTradeById(id);

        if (!response?.trade) {
          throw new Error(
            "Trade not found."
          );
        }

        setTrade(
          response.trade
        );
      } catch (error) {
        console.error(
          "Load trade details error:",
          error
        );

        setError(
          error.response?.data?.message ||
            error.message ||
            "Unable to load trade details."
        );
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  const loadDisputeEvents = useCallback(
    async () => {
      if (!trade?.dispute?.id) {
        setDisputeEvents([]);
        return;
      }

      try {
        const response =
          await getDisputeEvents(
            trade.dispute.id
          );

        setDisputeEvents(
          response?.events || []
        );
      } catch (error) {
        console.error(
          "Load dispute events error:",
          error
        );

        setDisputeEvents([]);
      }
    },
    [trade?.dispute?.id]
  );

useEffect(() => {
  loadDisputeEvents();
}, [loadDisputeEvents]);

  const loadRatings =
    useCallback(async () => {
      if (
        !id ||
        trade?.status !== "COMPLETED"
      ) {
        return;
      }

      try {
        const response =
          await getTradeRatings(id);

        setRatings(
          response?.ratings || []
        );
      } catch (error) {
        console.error(
          "Load trade ratings error:",
          error
        );

        setRatings([]);
      }
    }, [id, trade?.status]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  useEffect(() => {
    if (
      trade?.status ===
      "COMPLETED"
    ) {
      loadRatings();
    }
  }, [
    trade?.status,
    loadRatings,
  ]);

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const currentUserId =
    user?.id;

  const isTraderA = Boolean(
    currentUserId &&
      trade?.traderAId ===
        currentUserId
  );

  const isTraderB = Boolean(
    currentUserId &&
      trade?.traderBId ===
        currentUserId
  );

  const isParticipant =
    Boolean(
      isTraderA || isTraderB
    );

    /* =======================================================
   DISPUTE SECURITY / VISIBILITY
======================================================= */

const disputableStatuses = [
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
];

const hasActiveDispute = Boolean(
  trade?.dispute &&
    ["OPEN", "UNDER_REVIEW"].includes(
      trade.dispute.status
    )
);

const hasResolvedDispute = Boolean(
  trade?.dispute &&
    ["RESOLVED", "CLOSED"].includes(
      trade.dispute.status
    )
);

const canRaiseDispute =
  isParticipant &&
  disputableStatuses.includes(
    trade?.status
  ) &&
  !trade?.dispute;

  /* =======================================================
     OTHER TRADER
  ======================================================= */

  const otherTrader =
    useMemo(() => {
      if (
        !trade ||
        !currentUserId
      ) {
        return null;
      }

      if (
        trade.traderAId ===
        currentUserId
      ) {
        return trade.traderB;
      }

      if (
        trade.traderBId ===
        currentUserId
      ) {
        return trade.traderA;
      }

      return null;
    }, [
      trade,
      currentUserId,
    ]);

  /* =======================================================
     RATINGS
  ======================================================= */

  const currentUserRating =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return ratings.find(
        (item) =>
          item.reviewerId ===
          currentUserId
      );
    }, [
      ratings,
      currentUserId,
    ]);

  const partnerRating =
    useMemo(() => {
      if (
        !currentUserId ||
        !otherTrader?.id
      ) {
        return null;
      }

      return ratings.find(
        (item) =>
          item.reviewerId ===
          otherTrader.id
      );
    }, [
      ratings,
      currentUserId,
      otherTrader,
    ]);

  /* =======================================================
     CONFIRMATIONS
  ======================================================= */

  const confirmations =
    useMemo(() => {
      if (
        !Array.isArray(
          trade?.confirmations
        )
      ) {
        return [];
      }

      return trade.confirmations;
    }, [trade]);

  const getStageConfirmations =
    useCallback(
      (stage) => {
        return confirmations.filter(
          (confirmation) =>
            confirmation.stage ===
            stage
        );
      },
      [confirmations]
    );

  const getTraderConfirmation =
    useCallback(
      (stage, traderId) => {
        if (!traderId) {
          return null;
        }

        return (
          getStageConfirmations(
            stage
          ).find(
            (confirmation) =>
              confirmation.userId ===
              traderId
          ) || null
        );
      },
      [getStageConfirmations]
    );

  /* =======================================================
     AGREEMENT
  ======================================================= */

  const agreementConfirmations =
    useMemo(
      () =>
        getStageConfirmations(
          AGREEMENT_STAGE
        ),
      [getStageConfirmations]
    );

  const traderAAgreementConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          AGREEMENT_STAGE,
          trade?.traderAId
        ),
      [
        getTraderConfirmation,
        trade?.traderAId,
      ]
    );

  const traderBAgreementConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          AGREEMENT_STAGE,
          trade?.traderBId
        ),
      [
        getTraderConfirmation,
        trade?.traderBId,
      ]
    );

  const currentUserAgreementConfirmation =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return (
        agreementConfirmations.find(
          (confirmation) =>
            confirmation.userId ===
            currentUserId
        ) || null
      );
    }, [
      agreementConfirmations,
      currentUserId,
    ]);

  const currentUserConfirmedAgreement =
    Boolean(
      currentUserAgreementConfirmation
    );

  const bothTradersConfirmedAgreement =
    Boolean(
      traderAAgreementConfirmation &&
        traderBAgreementConfirmation
    );

  /* =======================================================
     VERIFICATION CONFIRMATIONS
  ======================================================= */

  const verificationConfirmations =
    useMemo(
      () =>
        getStageConfirmations(
          VERIFICATION_STAGE
        ),
      [getStageConfirmations]
    );

  const traderAVerificationConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          VERIFICATION_STAGE,
          trade?.traderAId
        ),
      [
        getTraderConfirmation,
        trade?.traderAId,
      ]
    );

  const traderBVerificationConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          VERIFICATION_STAGE,
          trade?.traderBId
        ),
      [
        getTraderConfirmation,
        trade?.traderBId,
      ]
    );

  const currentUserVerificationConfirmation =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return (
        verificationConfirmations.find(
          (confirmation) =>
            confirmation.userId ===
            currentUserId
        ) || null
      );
    }, [
      verificationConfirmations,
      currentUserId,
    ]);

  const currentUserConfirmedVerification =
    Boolean(
      currentUserVerificationConfirmation
    );

  const bothTradersConfirmedVerification =
    Boolean(
      traderAVerificationConfirmation &&
        traderBVerificationConfirmation
    );

  /* =======================================================
     HANDOVER READINESS
  ======================================================= */

  const handoverConfirmations =
    useMemo(
      () =>
        getStageConfirmations(
          HANDOVER_STAGE
        ),
      [getStageConfirmations]
    );

  const traderAHandoverConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          HANDOVER_STAGE,
          trade?.traderAId
        ),
      [
        getTraderConfirmation,
        trade?.traderAId,
      ]
    );

  const traderBHandoverConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          HANDOVER_STAGE,
          trade?.traderBId
        ),
      [
        getTraderConfirmation,
        trade?.traderBId,
      ]
    );

  const currentUserHandoverConfirmation =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return (
        handoverConfirmations.find(
          (confirmation) =>
            confirmation.userId ===
            currentUserId
        ) || null
      );
    }, [
      handoverConfirmations,
      currentUserId,
    ]);

  const currentUserConfirmedHandoverReadiness =
    Boolean(
      currentUserHandoverConfirmation
    );

  const bothTradersConfirmedHandoverReadiness =
    Boolean(
      traderAHandoverConfirmation &&
        traderBHandoverConfirmation
    );

  /* =======================================================
     HANDOVER STARTED
  ======================================================= */

  const handoverStartedConfirmations =
    useMemo(
      () =>
        getStageConfirmations(
          HANDOVER_STARTED_STAGE
        ),
      [getStageConfirmations]
    );

  const traderAHandoverStartedConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          HANDOVER_STARTED_STAGE,
          trade?.traderAId
        ),
      [
        getTraderConfirmation,
        trade?.traderAId,
      ]
    );

  const traderBHandoverStartedConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          HANDOVER_STARTED_STAGE,
          trade?.traderBId
        ),
      [
        getTraderConfirmation,
        trade?.traderBId,
      ]
    );

  const currentUserHandoverStartedConfirmation =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return (
        handoverStartedConfirmations.find(
          (confirmation) =>
            confirmation.userId ===
            currentUserId
        ) || null
      );
    }, [
      handoverStartedConfirmations,
      currentUserId,
    ]);

  const currentUserConfirmedHandoverStarted =
    Boolean(
      currentUserHandoverStartedConfirmation
    );

  const bothTradersConfirmedHandoverStarted =
    Boolean(
      traderAHandoverStartedConfirmation &&
        traderBHandoverStartedConfirmation
    );

  /* =======================================================
     COMPLETION
  ======================================================= */

  const completionConfirmations =
    useMemo(
      () =>
        getStageConfirmations(
          COMPLETION_STAGE
        ),
      [getStageConfirmations]
    );

  const traderACompletionConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          COMPLETION_STAGE,
          trade?.traderAId
        ),
      [
        getTraderConfirmation,
        trade?.traderAId,
      ]
    );

  const traderBCompletionConfirmation =
    useMemo(
      () =>
        getTraderConfirmation(
          COMPLETION_STAGE,
          trade?.traderBId
        ),
      [
        getTraderConfirmation,
        trade?.traderBId,
      ]
    );

  const currentUserCompletionConfirmation =
    useMemo(() => {
      if (!currentUserId) {
        return null;
      }

      return (
        completionConfirmations.find(
          (confirmation) =>
            confirmation.userId ===
            currentUserId
        ) || null
      );
    }, [
      completionConfirmations,
      currentUserId,
    ]);

  const currentUserConfirmedCompletion =
    Boolean(
      currentUserCompletionConfirmation
    );

  const bothTradersConfirmedCompletion =
    Boolean(
      traderACompletionConfirmation &&
        traderBCompletionConfirmation
    );

  /* =======================================================
     VERIFICATION RECORDS
  ======================================================= */

  const verifications =
    useMemo(() => {
      if (
        !Array.isArray(
          trade?.verifications
        )
      ) {
        return [];
      }

      return trade.verifications;
    }, [trade]);

  const getVerificationForUser =
    useCallback(
      (userId) => {
        if (!userId) {
          return null;
        }

        return (
          verifications.find(
            (verification) =>
              verification.userId ===
              userId
          ) || null
        );
      },
      [verifications]
    );

  const traderAVerification =
    useMemo(
      () =>
        getVerificationForUser(
          trade?.traderAId
        ),
      [
        getVerificationForUser,
        trade?.traderAId,
      ]
    );

  const traderBVerification =
    useMemo(
      () =>
        getVerificationForUser(
          trade?.traderBId
        ),
      [
        getVerificationForUser,
        trade?.traderBId,
      ]
    );

  const currentUserVerification =
    useMemo(
      () =>
        getVerificationForUser(
          currentUserId
        ),
      [
        getVerificationForUser,
        currentUserId,
      ]
    );

  const otherTraderVerification =
    useMemo(
      () =>
        getVerificationForUser(
          otherTrader?.id
        ),
      [
        getVerificationForUser,
        otherTrader?.id,
      ]
    );

  const currentUserItemVerified =
    currentUserVerification?.status ===
    "VERIFIED";

  const partnerItemVerified =
    otherTraderVerification?.status ===
    "VERIFIED";

  const bothItemsVerified =
    currentUserItemVerified &&
    partnerItemVerified;

  /* =======================================================
     TRADE ITEMS
  ======================================================= */

  const yourListing =
    trade?.items?.[0]?.listing ||
    trade?.offer?.offeredListing;

  const theirListing =
    trade?.items?.[1]?.listing ||
    trade?.offer?.requestedListing;

  /* =======================================================
     CONFIRM CURRENT STAGE
  ======================================================= */

  const handleConfirmStage =
    async () => {
      if (!trade) return;

      if (!isParticipant) {
        setActionError(
          "You are not a participant in this trade."
        );
        return;
      }

      setActionError("");
      setConfirmationSuccess("");

      try {
        setActionLoading(true);

        if (
          trade.status === "PENDING" &&
          currentUserConfirmedAgreement
        ) {
          setConfirmationSuccess(
            "Your agreement has already been recorded. Waiting for the other trader."
          );
          return;
        }

        if (
          trade.status === "AGREED" &&
          currentUserConfirmedVerification
        ) {
          setConfirmationSuccess(
            "Your verification-stage confirmation has already been recorded. Waiting for the other trader."
          );
          return;
        }

        if (
          trade.status ===
            "VERIFICATION" &&
          currentUserConfirmedHandoverReadiness
        ) {
          setConfirmationSuccess(
            "Your item verification and handover readiness are already recorded. Waiting for the other trader."
          );
          return;
        }

        const response =
          await confirmTrade(id);

        if (response?.trade) {
          setTrade(
            response.trade
          );
        } else {
          await loadTrade();
        }

        setConfirmationSuccess(
          response?.message ||
            (response?.bothConfirmed
              ? "Both traders have confirmed. The trade has advanced to the next stage."
              : "Your confirmation has been recorded. Waiting for the other trader.")
        );
      } catch (error) {
        console.error(
          "Confirm trade stage error:",
          error
        );

        setActionError(
          error.response?.data?.message ||
            "Unable to confirm this trade stage."
        );

        try {
          await loadTrade();
        } catch {
          // Ignore refresh failure.
        }
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     HANDOVER STARTED
  ======================================================= */

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

      if (
        currentUserConfirmedHandoverStarted
      ) {
        setHandoverSuccess(
          "Your handover-start confirmation is already recorded. Waiting for the other trader."
        );
        return;
      }

      try {
        setHandoverLoading(true);
        setHandoverError("");
        setHandoverSuccess("");

        const response =
          await confirmTrade(id);

        if (response?.trade) {
          setTrade(
            response.trade
          );
        } else {
          await loadTrade();
        }

        setHandoverSuccess(
          response?.message ||
            (response?.bothConfirmed
              ? "Both traders have confirmed. Handover is now in progress."
              : "Your handover-start confirmation has been recorded. Waiting for the other trader.")
        );
      } catch (error) {
        console.error(
          "Confirm handover started error:",
          error
        );

        setHandoverError(
          error.response?.data?.message ||
            "Unable to confirm that handover has started."
        );

        try {
          await loadTrade();
        } catch {
          // Ignore refresh failure.
        }
      } finally {
        setHandoverLoading(false);
      }
    };

  /* =======================================================
     COMPLETION
  ======================================================= */

  const handleConfirmCompletion =
    async () => {
      if (!trade) return;

      if (!isParticipant) {
        setActionError(
          "You are not a participant in this trade."
        );
        return;
      }

      if (
        trade.status !==
        "IN_PROGRESS"
      ) {
        setActionError(
          "The trade must be in progress before completion can be confirmed."
        );
        return;
      }

      if (
        currentUserConfirmedCompletion
      ) {
        setConfirmationSuccess(
          "Your completion confirmation is already recorded. Waiting for the other trader."
        );
        return;
      }

      try {
        setActionLoading(true);
        setActionError("");
        setConfirmationSuccess("");

        const response =
          await confirmTrade(id);

        if (response?.trade) {
          setTrade(
            response.trade
          );
        } else {
          await loadTrade();
        }

        setConfirmationSuccess(
          response?.message ||
            (response?.bothConfirmed
              ? "Both traders have confirmed. The trade is now officially completed."
              : "Your completion confirmation has been recorded. Waiting for the other trader.")
        );
      } catch (error) {
        console.error(
          "Confirm trade completion error:",
          error
        );

        setActionError(
          error.response?.data?.message ||
            "Unable to confirm trade completion."
        );

        try {
          await loadTrade();
        } catch {
          // Ignore refresh failure.
        }
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     CANCEL TRADE
  ======================================================= */

  const handleCancelTrade =
    async () => {
      if (!trade) return;

      if (!isParticipant) {
        setActionError(
          "You are not a participant in this trade."
        );
        return;
      }

      const cancellableStatuses =
        [
          "PENDING",
          "AGREED",
          "VERIFICATION",
          "READY_FOR_HANDOVER",
        ];

      if (
        !cancellableStatuses.includes(
          trade.status
        )
      ) {
        setActionError(
          "This trade can no longer be cancelled at its current stage."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this trade?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(true);
        setActionError("");
        setConfirmationSuccess("");

        const response =
          await updateTradeStatus(
            id,
            "CANCELLED"
          );

        if (response?.trade) {
          setTrade(
            response.trade
          );
        } else {
          await loadTrade();
        }
      } catch (error) {
        console.error(
          "Cancel trade error:",
          error
        );

        setActionError(
          error.response?.data?.message ||
            "Unable to cancel this trade."
        );
      } finally {
        setActionLoading(false);
      }
    };

    /* =======================================================
   RAISE DISPUTE
======================================================= */

  const handleSubmitDispute = async () => {
    if (!trade) {
      return;
    }

    if (!isParticipant) {
      setDisputeError(
        "You are not a participant in this trade."
      );
      return;
    }

    if (
      !disputableStatuses.includes(
        trade.status
      )
    ) {
      setDisputeError(
        "A dispute can only be raised during verification, handover readiness, or an active handover."
      );
      return;
    }

    if (trade.dispute) {
      setDisputeError(
        "This trade already has a dispute record. A second dispute cannot be opened."
      );
      return;
    }

    const trimmedReason =
      disputeReason.trim();

    const trimmedDescription =
      disputeDescription.trim();

    if (!trimmedReason) {
      setDisputeError(
        "Please provide a reason for the dispute."
      );
      return;
    }

    if (trimmedReason.length > 100) {
      setDisputeError(
        "The dispute reason cannot exceed 100 characters."
      );
      return;
    }

    if (!trimmedDescription) {
      setDisputeError(
        "Please describe the issue before submitting the dispute."
      );
      return;
    }

    if (trimmedDescription.length < 10) {
      setDisputeError(
        "The dispute description must contain at least 10 characters."
      );
      return;
    }

    if (trimmedDescription.length > 5000) {
      setDisputeError(
        "The dispute description cannot exceed 5000 characters."
      );
      return;
    }

    try {
      setDisputeSubmitting(true);
      setDisputeError("");
      setDisputeSuccess("");

      const response =
        await createDispute(
          id,
          trimmedReason,
          trimmedDescription
        );

      if (response?.trade) {
        setTrade(response.trade);
      } else {
        await loadTrade();
      }

      setDisputeReason("");
      setDisputeDescription("");

      setDisputeSuccess(
        response?.message ||
          "Your dispute has been submitted successfully. Trade progress is now paused while the dispute is reviewed."
      );
    } catch (error) {
      console.error(
        "Create dispute error:",
        error
      );

      const status =
        error.response?.status;

      if (status === 409) {
        setDisputeError(
          error.response?.data?.message ||
            "A dispute already exists for this trade."
        );
      } else {
        setDisputeError(
          error.response?.data?.message ||
            "Unable to submit the dispute. Please try again."
        );
      }

      try {
        await loadTrade();
      } catch {
        // Ignore refresh failure.
      }
    } finally {
      setDisputeSubmitting(false);
    }
  };

  /* =======================================================
     SUBMIT RATING
  ======================================================= */

  const handleSubmitRating =
    async () => {
      if (!trade) return;

      if (!isParticipant) {
        setRatingError(
          "You are not a participant in this trade."
        );
        return;
      }

      if (
        trade.status !==
        "COMPLETED"
      ) {
        setRatingError(
          "You can only rate a trader after the trade is completed."
        );
        return;
      }

      if (currentUserRating) {
        setRatingError(
          "You have already rated this trade."
        );
        return;
      }

      if (
        !Number.isInteger(
          ratingValue
        ) ||
        ratingValue < 1 ||
        ratingValue > 5
      ) {
        setRatingError(
          "Please select a rating from 1 to 5 stars."
        );
        return;
      }

      if (
        ratingComment.length >
        1000
      ) {
        setRatingError(
          "Your comment cannot exceed 1000 characters."
        );
        return;
      }

      try {
        setRatingLoading(true);
        setRatingError("");
        setRatingSuccess("");

        const response =
          await createRating(
            id,
            ratingValue,
            ratingComment.trim()
          );

        setRatingSuccess(
          response?.message ||
            "Your rating has been submitted successfully."
        );

        setRatingValue(0);
        setRatingComment("");

        await loadTrade();
        await loadRatings();
      } catch (error) {
        console.error(
          "Submit rating error:",
          error
        );

        setRatingError(
          error.response?.data?.message ||
            "Unable to submit your rating."
        );
      } finally {
        setRatingLoading(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

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

  /* =======================================================
     LOAD ERROR
  ======================================================= */

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
            {error ||
              "Trade not found."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadTrade}
              className="rounded-xl border border-red-300 bg-white px-6 py-3 font-bold text-red-700 transition hover:bg-red-100"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/trades")
              }
              className="rounded-xl bg-[#5B1725] px-6 py-3 font-bold text-white transition hover:bg-[#3D0F18]"
            >
              Back to My Trades
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     TRADE DATA
  ======================================================= */

  const currentStatusIndex =
    statusSteps.indexOf(
      trade.status
    );

  const getHandoverStartedStatus =
    (userId) => {
      const confirmation =
        handoverStartedConfirmations.find(
          (item) =>
            item.userId ===
            userId
        );

      if (confirmation) {
        return {
          label:
            "Handover Confirmed",
          description:
            confirmation.confirmedAt
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
        label:
          "Waiting for Confirmation",
        description:
          "This trader has not confirmed that handover has started.",
        className:
          "bg-gray-50 border-gray-200 text-gray-600",
        icon: "○",
      };
    };

  const traderAHandoverStartedStatus =
    getHandoverStartedStatus(
      trade.traderAId
    );

  const traderBHandoverStartedStatus =
    getHandoverStartedStatus(
      trade.traderBId
    );

  const getVerificationStatus =
    (verification) => {
      if (
        verification?.status ===
        "VERIFIED"
      ) {
        return {
          label:
            "Item Verified",
          description:
            verification.updatedAt
              ? `Verified ${formatDateTime(
                  verification.updatedAt
                )}`
              : "Verified",
          className:
            "border-green-200 bg-green-50 text-green-700",
          icon: "✓",
        };
      }

      if (
        verification?.status ===
        "REJECTED"
      ) {
        return {
          label:
            "Verification Rejected",
          description:
            verification.notes ||
            "This verification was rejected.",
          className:
            "border-red-200 bg-red-50 text-red-700",
          icon: "!",
        };
      }

      return {
        label:
          "Waiting for Verification",
        description:
          "This trader has not yet verified the item.",
        className:
          "border-gray-200 bg-gray-50 text-gray-600",
        icon: "○",
      };
    };

  const traderAVerificationStatus =
    getVerificationStatus(
      traderAVerification
    );

  const traderBVerificationStatus =
    getVerificationStatus(
      traderBVerification
    );

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      {/* ==================================================
          HEADER
      ================================================== */}

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
        {/* =================================================
            GLOBAL ACTION ERROR
        ================================================== */}

        {actionError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
              <span>⚠️</span>

              <p>{actionError}</p>
            </div>
          </div>
        )}

        {/* =================================================
            GLOBAL SUCCESS
        ================================================== */}

        {confirmationSuccess && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                ✓
              </div>

              <p className="text-sm font-semibold leading-6 text-green-700">
                {confirmationSuccess}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            TRADE PROGRESS
        ================================================== */}

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
            <div className="flex min-w-175 items-start">
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

        {/* =================================================
            AGREEMENT STAGE
        ================================================== */}

        {trade.status ===
          "PENDING" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
            <div className="border-b border-blue-100 bg-blue-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                    Stage 1 · Agreement
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Confirm the Trade
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    Both traders must agree to
                    the trade before it can move
                    to verification.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl">
                  🤝
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <ConfirmationStatusCard
                  label="Trader A"
                  name={
                    trade.traderA?.name ||
                    "Trader A"
                  }
                  confirmed={Boolean(
                    traderAAgreementConfirmation
                  )}
                  confirmedAt={
                    traderAAgreementConfirmation?.confirmedAt
                  }
                  isCurrentUser={
                    isTraderA
                  }
                />

                <ConfirmationStatusCard
                  label="Trader B"
                  name={
                    trade.traderB?.name ||
                    "Trader B"
                  }
                  confirmed={Boolean(
                    traderBAgreementConfirmation
                  )}
                  confirmedAt={
                    traderBAgreementConfirmation?.confirmedAt
                  }
                  isCurrentUser={
                    isTraderB
                  }
                />
              </div>

              {currentUserConfirmedAgreement &&
                !bothTradersConfirmedAgreement && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Your agreement is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          The other trader must
                          also agree before the
                          trade moves to Verification.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            VERIFICATION START
        ================================================== */}

        {trade.status ===
          "AGREED" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
            <div className="border-b border-purple-100 bg-purple-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-purple-700">
                    Stage 2 · Verification
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Start Item Verification
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    Both traders must confirm
                    before the trade enters actual
                    verification.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100 text-2xl">
                  🔎
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <ConfirmationStatusCard
                  label="Trader A"
                  name={
                    trade.traderA?.name ||
                    "Trader A"
                  }
                  confirmed={Boolean(
                    traderAVerificationConfirmation
                  )}
                  confirmedAt={
                    traderAVerificationConfirmation?.confirmedAt
                  }
                  isCurrentUser={
                    isTraderA
                  }
                />

                <ConfirmationStatusCard
                  label="Trader B"
                  name={
                    trade.traderB?.name ||
                    "Trader B"
                  }
                  confirmed={Boolean(
                    traderBVerificationConfirmation
                  )}
                  confirmedAt={
                    traderBVerificationConfirmation?.confirmedAt
                  }
                  isCurrentUser={
                    isTraderB
                  }
                />
              </div>

              {currentUserConfirmedVerification &&
                !bothTradersConfirmedVerification && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Your verification confirmation
                          is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Waiting for the other trader
                          to confirm.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            VERIFICATION
        ================================================== */}

        {trade.status ===
          "VERIFICATION" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
            <div className="border-b border-purple-100 bg-purple-50 px-6 py-6 md:px-8">
              <p className="text-sm font-bold uppercase tracking-wider text-purple-700">
                Stage 3 · Verification
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                Verify the items
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Each trader must verify the item they
                are receiving and confirm readiness
                for handover.
              </p>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <div
                  className={`rounded-2xl border p-5 ${traderAVerificationStatus.className}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Trader A
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold">
                        {trade.traderA?.name ||
                          "Trader A"}
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold">
                      {
                        traderAVerificationStatus.icon
                      }
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    {
                      traderAVerificationStatus.label
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    {
                      traderAVerificationStatus.description
                    }
                  </p>

                
                </div>

                <div
                  className={`rounded-2xl border p-5 ${traderBVerificationStatus.className}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Trader B
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold">
                        {trade.traderB?.name ||
                          "Trader B"}
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold">
                      {
                        traderBVerificationStatus.icon
                      }
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    {
                      traderBVerificationStatus.label
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    {
                      traderBVerificationStatus.description
                    }
                  </p>
                </div>
              </div>

              {handoverError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  ⚠️{" "}
                  {handoverError}
                </div>
              )}

              {handoverSuccess && (
                <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                  ✓{" "}
                  {handoverSuccess}
                </div>
              )}

              {!currentUserConfirmedHandoverReadiness &&
                isParticipant && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Verify your item
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Confirm only after checking
                      that the item you are receiving
                      matches the trade agreement.
                    </p>

                    <button
                      type="button"
                      disabled={
                        actionLoading
                      }
                      onClick={
                        handleConfirmStage
                      }
                      className="mt-5 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Verifying..."
                        : "✓ Verify Item & Ready for Handover"}
                    </button>
                  </div>
                )}

              {currentUserConfirmedHandoverReadiness &&
                !bothTradersConfirmedHandoverReadiness && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Your item is verified
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Your verification and handover
                          readiness have been recorded.
                          Waiting for the other trader.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {bothItemsVerified &&
                bothTradersConfirmedHandoverReadiness && (
                  <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-green-800">
                          Both items are verified
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-green-700">
                          Both traders have verified
                          their items and confirmed
                          handover readiness.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            HANDOVER
        ================================================== */}

        {trade.status ===
          "READY_FOR_HANDOVER" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <div className="border-b border-indigo-100 bg-indigo-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-indigo-700">
                    Stage 4 · Handover
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Start the exchange
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Both traders must confirm that
                    the physical handover has started.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl">
                  🤝
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <div
                  className={`rounded-2xl border p-5 ${traderAHandoverStartedStatus.className}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Trader A
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold">
                    {trade.traderA?.name ||
                      "Trader A"}
                  </h3>

                  <p className="mt-4 text-sm font-bold">
                    {
                      traderAHandoverStartedStatus.label
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    {
                      traderAHandoverStartedStatus.description
                    }
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${traderBHandoverStartedStatus.className}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Trader B
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold">
                    {trade.traderB?.name ||
                      "Trader B"}
                  </h3>

                  <p className="mt-4 text-sm font-bold">
                    {
                      traderBHandoverStartedStatus.label
                    }
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    {
                      traderBHandoverStartedStatus.description
                    }
                  </p>
                </div>
              </div>

              {!currentUserConfirmedHandoverStarted &&
                isParticipant && (
                  <button
                    type="button"
                    disabled={
                      handoverLoading
                    }
                    onClick={
                      handleConfirmHandoverStarted
                    }
                    className="mt-6 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {handoverLoading
                      ? "Confirming..."
                      : "✓ Confirm Handover Started"}
                  </button>
                )}

              {currentUserConfirmedHandoverStarted &&
                !bothTradersConfirmedHandoverStarted && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Handover start confirmed
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Waiting for your trade partner
                          to confirm.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            IN PROGRESS
        ================================================== */}

        {trade.status ===
          "IN_PROGRESS" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
            <div className="border-b border-orange-100 bg-orange-50 px-6 py-6 md:px-8">
              <p className="text-sm font-bold uppercase tracking-wider text-orange-700">
                Stage 5 · In Progress
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                Complete the exchange
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Both traders must confirm once the
                physical exchange has been completed.
              </p>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2">
                <ConfirmationStatusCard
                  label="Trader A"
                  name={
                    trade.traderA?.name ||
                    "Trader A"
                  }
                  confirmed={Boolean(
                    traderACompletionConfirmation
                  )}
                  confirmedAt={
                    traderACompletionConfirmation?.confirmedAt
                  }
                  isCurrentUser={
                    isTraderA
                  }
                />

                <ConfirmationStatusCard
                  label="Trader B"
                  name={
                    trade.traderB?.name ||
                    "Trader B"
                  }
                  confirmed={Boolean(
                    traderBCompletionConfirmation
                  )}
                  confirmedAt={
                    traderBCompletionConfirmation?.confirmedAt
                  }
                  isCurrentUser={
                    isTraderB
                  }
                />
              </div>

              {!currentUserConfirmedCompletion &&
                isParticipant && (
                  <button
                    type="button"
                    disabled={
                      actionLoading
                    }
                    onClick={
                      handleConfirmCompletion
                    }
                    className="mt-6 w-full rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {actionLoading
                      ? "Confirming..."
                      : "✓ Confirm Trade Completed"}
                  </button>
                )}

              {currentUserConfirmedCompletion &&
                !bothTradersConfirmedCompletion && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Your completion confirmation
                          is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Your trade partner must also
                          confirm before the trade becomes
                          officially completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            COMPLETED
        ================================================== */}

        {trade.status ===
          "COMPLETED" && (
          <section className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl font-bold text-white">
                ✓
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                  Trade completed
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-green-800">
                  Exchange Successfully Completed
                </h2>

                <p className="mt-2 text-sm leading-6 text-green-700">
                  Both traders confirmed completion
                  of this barter trade.
                </p>

                {trade.completedAt && (
                  <p className="mt-2 text-xs font-semibold text-green-600">
                    Completed{" "}
                    {formatDateTime(
                      trade.completedAt
                    )}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            CANCELLED
        ================================================== */}

        {trade.status === "CANCELLED" && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-100 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-500 text-xl font-bold text-white">
                ×
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Trade cancelled
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-gray-700">
                  This trade has been cancelled
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  No further trade confirmations can
                  be made.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            RAISE DISPUTE
        ================================================== */}

        {canRaiseDispute && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-red-700">
                    Trade protection
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Raise a Dispute
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    If there is a problem with the item,
                    verification, or physical handover,
                    you can pause the trade and ask for
                    administrator review.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl">
                  ⚠️
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {disputeError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      ⚠️
                    </span>

                    <p className="text-sm font-semibold leading-6 text-red-700">
                      {disputeError}
                    </p>
                  </div>
                </div>
              )}

              {disputeSuccess && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                      ✓
                    </div>

                    <p className="text-sm font-semibold leading-6 text-green-700">
                      {disputeSuccess}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                <p className="text-sm font-bold text-[#5B1725]">
                  Before submitting
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Raising a dispute immediately pauses
                  the trade. An administrator will review
                  the issue and either cancel the trade or
                  reopen it at the appropriate stage.
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="dispute-reason"
                  className="block text-sm font-bold text-[#21191B]"
                >
                  Reason
                </label>

                <input
                  id="dispute-reason"
                  type="text"
                  value={disputeReason}
                  onChange={(event) => {
                    setDisputeReason(
                      event.target.value
                    );
                    setDisputeError("");
                    setDisputeSuccess("");
                  }}
                  maxLength={100}
                  disabled={disputeSubmitting}
                  placeholder="e.g. Item does not match the agreed condition"
                  className="mt-2 w-full rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB] disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <div className="mt-1 flex justify-end">
                  <p className="text-xs text-gray-400">
                    {disputeReason.length}/100
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="dispute-description"
                  className="block text-sm font-bold text-[#21191B]"
                >
                  Describe the problem
                </label>

                <textarea
                  id="dispute-description"
                  value={disputeDescription}
                  onChange={(event) => {
                    setDisputeDescription(
                      event.target.value
                    );
                    setDisputeError("");
                    setDisputeSuccess("");
                  }}
                  rows={6}
                  maxLength={5000}
                  disabled={disputeSubmitting}
                  placeholder="Explain what happened, what you expected, and why you believe the trade needs administrator review."
                  className="mt-2 w-full resize-y rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB] disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-400">
                    Minimum 10 characters
                  </p>

                  <p className="text-xs text-gray-400">
                    {disputeDescription.length}/5000
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    ℹ️
                  </span>

                  <p className="text-sm leading-6 text-amber-700">
                    Only raise a dispute when there is a
                    genuine problem with the trade. Once
                    submitted, normal trade confirmations
                    are paused until the dispute is resolved.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmitDispute}
                disabled={disputeSubmitting}
                className="mt-6 w-full rounded-xl bg-[#5B1725] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {disputeSubmitting
                  ? "Submitting Dispute..."
                  : "⚠ Raise Dispute"}
              </button>
            </div>
          </section>
        )}

        {/* =================================================
            DISPUTED
        ================================================== */}

        {trade.status === "DISPUTED" && (
          <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white">
                !
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Trade dispute
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-red-800">
                  This trade is under dispute
                </h2>

                <p className="mt-2 text-sm leading-6 text-red-700">
                  Further trade progress is paused while
                  the dispute is handled.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            DISPUTE STATUS
        ================================================== */}

        {hasActiveDispute && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                !
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Dispute review
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-amber-800">
                  Your dispute is being reviewed
                </h2>

                <p className="mt-2 text-sm leading-6 text-amber-700">
                  Normal trade progress is paused while an
                  administrator reviews the reported issue.
                </p>

                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-600">
                  Status:{" "}
                  {formatStatus(
                    trade.dispute.status
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

{hasResolvedDispute && (
  <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
        ✓
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
          Dispute resolved
        </p>

        <h2 className="mt-1 text-xl font-extrabold text-blue-800">
          Administrator review completed
        </h2>

        <p className="mt-2 text-sm leading-6 text-blue-700">
          This dispute has been resolved. The
          decision and trade recovery information
          are shown in the dispute history below.
        </p>

        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-blue-600">
          Status:{" "}
          {formatStatus(
            trade.dispute.status
          )}
        </p>
      </div>
    </div>
  </section>
)}

        {/* =================================================
            DISPUTE HISTORY
        ================================================== */}
      {trade.dispute && (
        <section className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5B1725] text-lg font-bold text-white">
              !
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                Dispute history
              </p>

              <h2 className="mt-1 text-xl font-extrabold text-[#21191B]">
                Trade dispute record
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {trade.dispute.reason}
              </p>

              {trade.dispute.description && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Reported issue
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {trade.dispute.description}
                  </p>
                </div>
              )}

              {trade.dispute.previousTradeStatus && (
                <div className="mt-4 rounded-xl bg-[#FBF5F6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                    Status before dispute
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-[#21191B]">
                    {formatStatus(
                      trade.dispute.previousTradeStatus
                    )}
                  </p>
                </div>
              )}

              {trade.dispute.outcome && (
                <div className="mt-4 rounded-xl bg-[#FBF5F6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                    Admin outcome
                  </p>

                  <p className="mt-1 text-sm font-extrabold text-[#21191B]">
                    {trade.dispute.outcome ===
                    "CANCEL_TRADE"
                      ? "Trade Cancelled"
                      : "Trade Reopened"}
                  </p>

                  {trade.dispute.outcome === "REOPEN_TRADE" &&trade.dispute.previousTradeStatus && (
                      <p className="mt-1 text-sm text-gray-600">
                        Reopened at{" "}
                        <span className="font-bold">
                          {formatStatus(
                            trade.dispute
                              .previousTradeStatus
                          )}
                        </span>
                      </p>
                    )}

                  {trade.dispute.resolution && (
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Resolution
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {trade.dispute.resolution}
                      </p>
                    </div>
                  )}

                  {trade.dispute.outcomeAt && (
                    <p className="mt-3 text-xs text-gray-400">
                      Outcome recorded{" "}
                      {formatDateTime(
                        trade.dispute.outcomeAt
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* =================================================
                  RECOVERY MESSAGE
              ================================================== */}

              {trade.dispute.outcome === "REOPEN_TRADE" && trade.dispute.previousTradeStatus && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-800">
                      Trade recovery completed
                    </p>

                    {trade.dispute.previousTradeStatus === "VERIFICATION" && (
                      <p className="mt-1 text-sm leading-6 text-blue-700">
                        Verification was reset after the
                        dispute review. Both traders must
                        verify their items again before the
                        trade can continue to handover.
                      </p>
                    )}

                    {trade.dispute.previousTradeStatus === "READY_FOR_HANDOVER" && (
                      <p className="mt-1 text-sm leading-6 text-blue-700">
                        Handover-start confirmation was reset.
                        Both traders must confirm that
                        physical handover has started before
                        the trade can return to progress.
                      </p>
                    )}

                    {trade.dispute.previousTradeStatus === "IN_PROGRESS" && (
                      <p className="mt-1 text-sm leading-6 text-blue-700">
                        Completion confirmations were reset.
                        Both traders must confirm completion
                        again before the trade can be marked
                        completed.
                      </p>
                    )}
                  </div>
                )}

              {trade.status === "CANCELLED" && trade.dispute.outcome === "CANCEL_TRADE" && (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-gray-100 p-4">
                    <p className="text-sm font-bold text-gray-700">
                      Trade state recovered
                    </p>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      The trade was cancelled after dispute
                      review and its reserved listings were
                      released back to the marketplace.
                    </p>
                  </div>
                )}

              {!trade.dispute.outcome && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-800">
                    Dispute under review
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    Further trade progress is paused until
                    an administrator records the final
                    outcome.
                  </p>
                </div>
              )}

              {trade.dispute.createdAt && (
                <p className="mt-4 text-xs text-gray-400">
                  Dispute raised{" "}
                  {formatDateTime(
                    trade.dispute.createdAt
                  )}
                </p>
              )}

              {disputeEvents.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                    Activity timeline
                  </p>

                  <div className="mt-4 space-y-4">
                    {disputeEvents.map(
                      (event, index) => (
                        <div
                          key={event.id}
                          className="relative flex gap-4"
                        >
                          {index <
                            disputeEvents.length - 1 && (
                            <div className="absolute left-3 top-7 h-full w-px bg-[#E7DDDF]" />
                          )}

                          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5B1725] text-xs font-bold text-white">
                            ✓
                          </div>

                          <div className="min-w-0 flex-1 rounded-xl border border-[#E7DDDF] bg-white p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-extrabold text-[#21191B]">
                                  {event.eventType
                                    ?.replaceAll("_", " ")
                                    .toLowerCase()
                                    .replace(
                                      /\b\w/g,
                                      (letter) =>
                                        letter.toUpperCase()
                                    )}
                                </p>

                                {event.description && (
                                  <p className="mt-1 text-sm leading-6 text-gray-600">
                                    {event.description}
                                  </p>
                                )}
                              </div>

                              <p className="shrink-0 text-xs text-gray-400">
                                {formatDateTime(
                                  event.createdAt
                                )}
                              </p>
                            </div>

                            {event.user?.name && (
                              <p className="mt-3 text-xs font-semibold text-[#8A2638]">
                                Recorded by {event.user.name}
                              </p>
                            )}

                            {event.metadata && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-bold text-gray-500">
                                  Technical details
                                </summary>

                                <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
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
          </div>
        </section>
      )}

        {/* =================================================
            RATINGS
        ================================================== */}

        {trade.status ===
          "COMPLETED" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                    Step 6.10.4 · Reputation
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Rate your trade partner
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    The trade is complete. Share your
                    experience with{" "}
                    {otherTrader?.name ||
                      "your trade partner"}{" "}
                    to help build trust across the
                    Barter Trace marketplace.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F5E8EB] text-2xl">
                  ⭐
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {ratingSuccess && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                      ✓
                    </div>

                    <div>
                      <p className="text-sm font-bold text-green-800">
                        Rating submitted successfully
                      </p>

                      <p className="mt-1 text-sm leading-6 text-green-700">
                        {ratingSuccess}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ratingError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      ⚠️
                    </div>

                    <p className="text-sm font-semibold leading-6 text-red-700">
                      {ratingError}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {/* YOUR RATING */}

                <div className="rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-6">
                  {currentUserRating ? (
                    <>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                            Your rating
                          </p>

                          <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                            You rated{" "}
                            {otherTrader?.name ||
                              "your trade partner"}
                          </h3>
                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                          ✓
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <span
                              key={star}
                              className={
                                star <=
                                currentUserRating.rating
                                  ? "text-3xl text-yellow-500"
                                  : "text-3xl text-gray-300"
                              }
                            >
                              ★
                            </span>
                          )
                        )}
                      </div>

                      <p className="mt-2 text-sm font-bold text-[#5B1725]">
                        {
                          currentUserRating.rating
                        }
                        /5
                      </p>

                      {currentUserRating.comment && (
                        <div className="mt-5 rounded-xl bg-white p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Your comment
                          </p>

                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            "
                            {
                              currentUserRating.comment
                            }
                            "
                          </p>
                        </div>
                      )}

                      {currentUserRating.createdAt && (
                        <p className="mt-4 text-xs text-gray-400">
                          Submitted{" "}
                          {formatDateTime(
                            currentUserRating.createdAt
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                        Leave a rating
                      </p>

                      <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                        How was your experience?
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        Rate{" "}
                        {otherTrader?.name ||
                          "your trade partner"}{" "}
                        from 1 to 5 stars.
                      </p>

                      <div
                        className="mt-5 flex items-center gap-1 sm:gap-2"
                        role="radiogroup"
                        aria-label="Trade partner rating"
                      >
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() =>
                                setRatingValue(
                                  star
                                )
                              }
                              disabled={
                                ratingLoading
                              }
                              aria-label={`Rate ${star} out of 5`}
                              className="rounded-lg p-1 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span
                                className={
                                  star <=
                                  ratingValue
                                    ? "text-4xl text-yellow-500"
                                    : "text-4xl text-gray-300"
                                }
                              >
                                ★
                              </span>
                            </button>
                          )
                        )}
                      </div>

                      {ratingValue > 0 && (
                        <p className="mt-2 text-sm font-bold text-[#5B1725]">
                          {ratingValue}/5
                        </p>
                      )}

                      <textarea
                        value={
                          ratingComment
                        }
                        onChange={(event) =>
                          setRatingComment(
                            event.target
                              .value
                          )
                        }
                        rows={5}
                        maxLength={1000}
                        disabled={
                          ratingLoading
                        }
                        placeholder="Leave an optional comment about your trading experience..."
                        className="mt-5 w-full resize-y rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB] disabled:bg-gray-100"
                      />

                      <p className="mt-1 text-right text-xs text-gray-400">
                        {
                          ratingComment.length
                        }
                        /1000
                      </p>

                      <button
                        type="button"
                        disabled={
                          ratingLoading ||
                          ratingValue < 1
                        }
                        onClick={
                          handleSubmitRating
                        }
                        className="mt-4 w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {ratingLoading
                          ? "Submitting..."
                          : "Submit Rating"}
                      </button>
                    </>
                  )}
                </div>

                {/* PARTNER RATING */}

                <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                    Partner rating
                  </p>

                  <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                    {otherTrader?.name ||
                      "Your trade partner"}
                  </h3>

                  {partnerRating ? (
                    <>
                      <div className="mt-5 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(
                          (star) => (
                            <span
                              key={star}
                              className={
                                star <=
                                partnerRating.rating
                                  ? "text-3xl text-yellow-500"
                                  : "text-3xl text-gray-300"
                              }
                            >
                              ★
                            </span>
                          )
                        )}
                      </div>

                      <p className="mt-2 text-sm font-bold text-[#5B1725]">
                        {
                          partnerRating.rating
                        }
                        /5
                      </p>

                      {partnerRating.comment && (
                        <div className="mt-5 rounded-xl bg-[#FBF5F6] p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Partner comment
                          </p>

                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            "
                            {
                              partnerRating.comment
                            }
                            "
                          </p>
                        </div>
                      )}

                      {partnerRating.createdAt && (
                        <p className="mt-4 text-xs text-gray-400">
                          Submitted{" "}
                          {formatDateTime(
                            partnerRating.createdAt
                          )}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-800">
                        Waiting for your trade partner
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Their rating will appear here once
                        they rate this completed trade.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  About ratings
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Each trader can submit one rating for
                  this completed trade. Ratings are linked
                  to the actual trade participants, and
                  your rating contributes to the trader's
                  Barter Score.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            ITEMS BEING TRADED
        ================================================== */}

        <section className="mt-8">
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                    {formatStatus(
                      yourListing?.condition
                    ) || "Unknown"}
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-[#F5E8EB] px-3 py-1 text-xs font-bold text-[#5B1725]">
                    {formatStatus(
                      theirListing?.condition
                    ) || "Unknown"}
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

        {/* =================================================
            TRADER + TRADE INFORMATION
        ================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* OTHER TRADER */}

          <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
              Trading with
            </p>

            <div className="mt-5 flex items-center gap-4">
              {otherTrader?.avatar ? (
                <img
                  src={
                    otherTrader.avatar
                  }
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

            {trade.status ===
              "VERIFICATION" && (
              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Partner verification
                </p>

                <p
                  className={`mt-2 text-sm font-bold ${
                    partnerItemVerified
                      ? "text-green-700"
                      : "text-gray-600"
                  }`}
                >
                  {partnerItemVerified
                    ? "✓ Partner has verified their item"
                    : "○ Partner has not yet verified their item"}
                </p>
              </div>
            )}
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

        {/* =================================================
            OFFER MESSAGE
        ================================================== */}

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

        {/* =================================================
            TRADE ACTIONS
        ================================================== */}

        <section className="mt-6 rounded-2xl border border-[#E7DDDF] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                Trade actions
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Actions available to you at the
                current trade stage.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* AGREEMENT */}

            {trade.status ===
              "PENDING" &&
              isParticipant &&
              !currentUserConfirmedAgreement && (
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleConfirmStage
                  }
                  className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Confirming..."
                    : "✓ Agree to Trade"}
                </button>
              )}

            {/* VERIFICATION START */}

            {trade.status ===
              "AGREED" &&
              isParticipant &&
              !currentUserConfirmedVerification && (
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleConfirmStage
                  }
                  className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Confirming..."
                    : "✓ Start Verification"}
                </button>
              )}

            {/* ITEM VERIFICATION */}

            {trade.status ===
              "VERIFICATION" &&
              isParticipant &&
              !currentUserConfirmedHandoverReadiness && (
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleConfirmStage
                  }
                  className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Verifying..."
                    : "✓ Verify Item & Ready for Handover"}
                </button>
              )}

            {/* HANDOVER */}

            {trade.status ===
              "READY_FOR_HANDOVER" &&
              isParticipant &&
              !currentUserConfirmedHandoverStarted && (
                <button
                  type="button"
                  disabled={
                    handoverLoading
                  }
                  onClick={
                    handleConfirmHandoverStarted
                  }
                  className="rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {handoverLoading
                    ? "Confirming..."
                    : "✓ Confirm Handover Started"}
                </button>
              )}

            {/* COMPLETION */}

            {trade.status ===
              "IN_PROGRESS" &&
              isParticipant &&
              !currentUserConfirmedCompletion && (
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleConfirmCompletion
                  }
                  className="rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Confirming..."
                    : "✓ Confirm Trade Completed"}
                </button>
              )}

            {/* CANCEL */}

            {[
              "PENDING",
              "AGREED",
              "VERIFICATION",
              "READY_FOR_HANDOVER",
            ].includes(
              trade.status
            ) &&
              isParticipant && (
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    handleCancelTrade
                  }
                  className="rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? "Processing..."
                    : "Cancel Trade"}
                </button>
              )}

            {/* WAITING - AGREEMENT */}

            {trade.status ===
              "PENDING" &&
              currentUserConfirmedAgreement &&
              !bothTradersConfirmedAgreement && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ You have agreed. Waiting for the
                  other trader.
                </div>
              )}

            {/* WAITING - VERIFICATION */}

            {trade.status ===
              "AGREED" &&
              currentUserConfirmedVerification &&
              !bothTradersConfirmedVerification && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ Your verification-stage confirmation
                  is recorded. Waiting for the other
                  trader.
                </div>
              )}

            {/* WAITING - HANDOVER READINESS */}

            {trade.status ===
              "VERIFICATION" &&
              currentUserConfirmedHandoverReadiness &&
              !bothTradersConfirmedHandoverReadiness && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ Your item is verified and your handover
                  readiness is recorded. Waiting for the
                  other trader.
                </div>
              )}

            {/* WAITING - HANDOVER STARTED */}

            {trade.status ===
              "READY_FOR_HANDOVER" &&
              currentUserConfirmedHandoverStarted &&
              !bothTradersConfirmedHandoverStarted && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ You confirmed that handover has started.
                  Waiting for the other trader.
                </div>
              )}

            {/* WAITING - COMPLETION */}

            {trade.status ===
              "IN_PROGRESS" &&
              currentUserConfirmedCompletion &&
              !bothTradersConfirmedCompletion && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ Your completion confirmation is recorded.
                  Waiting for the other trader.
                </div>
              )}

            {/* COMPLETED */}

            {trade.status ===
              "COMPLETED" && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700">
                ✓ This trade has been completed successfully.
              </div>
            )}

            {/* CANCELLED */}

            {trade.status ===
              "CANCELLED" && (
              <div className="rounded-xl border border-gray-200 bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-600">
                This trade has been cancelled.
              </div>
            )}

            {/* DISPUTED */}

            {trade.status ===
              "DISPUTED" && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
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
