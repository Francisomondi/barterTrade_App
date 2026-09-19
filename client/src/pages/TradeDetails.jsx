
import { useCallback, useEffect, useMemo, useState,} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTradeById, updateTradeStatus, confirmTrade,} from "../api/tradeApi";
import { createRating, getTradeRatings,} from "../api/ratingApi";
import { useAuth } from "../context/AuthContext";
import { createDispute } from "../api/disputeApi";

/* =========================================================
   STATUS CONFIGURATION
========================================================= */

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

/* =========================================================
   CONFIRMATION STAGES
========================================================= */

const AGREEMENT_STAGE = "AGREEMENT";
const VERIFICATION_STAGE = "VERIFICATION";
const HANDOVER_STAGE = "HANDOVER";
const HANDOVER_STARTED_STAGE = "HANDOVER_STARTED";
const COMPLETION_STAGE = "COMPLETION";

/* =========================================================
   HELPERS
========================================================= */

const formatStatus = (status) => {
  return (
    status
      ?.replace(/_/g, " ")
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
          Confirmed {formatDateTime(confirmedAt)}
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
  const [handoverLoading, setHandoverLoading] = useState(false);
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
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] =  useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [disputeSuccess, setDisputeSuccess] = useState("");

  /* =======================================================
     LOAD TRADE
  ======================================================= */

  const loadTrade = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await getTradeById(id);

      if (!response?.trade) {
        throw new Error("Trade not found.");
      }

      setTrade(response.trade);
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
  }, [id]);

  const loadRatings = useCallback(async () => {
    if (!id || trade?.status !== "COMPLETED") {
      return;
    }

    try {
      const response = await getTradeRatings(id);

      setRatings(response?.ratings || []);
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
    if (trade?.status === "COMPLETED") {
      loadRatings();
    }
  }, [trade?.status, loadRatings]);

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const currentUserId = user?.id;

  const isTraderA = Boolean(
    currentUserId &&
      trade?.traderAId === currentUserId
  );

  const isTraderB = Boolean(
    currentUserId &&
      trade?.traderBId === currentUserId
  );

  const isParticipant = Boolean(
    isTraderA || isTraderB
  );

  /* =======================================================
     OTHER TRADER
  ======================================================= */

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

  const currentUserRating = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return ratings.find(
      (item) =>
        item.reviewerId === currentUserId
    );
  }, [ratings, currentUserId]);

  const partnerRating = useMemo(() => {
    if (!currentUserId || !otherTrader?.id) {
      return null;
    }

    return ratings.find(
      (item) =>
        item.reviewerId === otherTrader.id
    );
  }, [ratings, currentUserId, otherTrader]);

  /* =======================================================
     CONFIRMATIONS
  ======================================================= */

  const confirmations = useMemo(() => {
    if (!Array.isArray(trade?.confirmations)) {
      return [];
    }

    return trade.confirmations;
  }, [trade]);

  const getStageConfirmations = useCallback(
    (stage) => {
      return confirmations.filter(
        (confirmation) =>
          confirmation.stage === stage
      );
    },
    [confirmations]
  );

  const getTraderConfirmation = useCallback(
    (stage, traderId) => {
      if (!traderId) return null;

      return (
        getStageConfirmations(stage).find(
          (confirmation) =>
            confirmation.userId === traderId
        ) || null
      );
    },
    [getStageConfirmations]
  );

  /* =======================================================
     AGREEMENT CONFIRMATIONS
  ======================================================= */

  const agreementConfirmations = useMemo(
    () =>
      getStageConfirmations(
        AGREEMENT_STAGE
      ),
    [getStageConfirmations]
  );

  const traderAAgreementConfirmation = useMemo(
      () =>
        getTraderConfirmation(
          AGREEMENT_STAGE,
          trade?.traderAId
        ),
      [getTraderConfirmation, trade?.traderAId]
    );

  const traderBAgreementConfirmation = useMemo(
      () =>
        getTraderConfirmation(
          AGREEMENT_STAGE,
          trade?.traderBId
        ),
      [getTraderConfirmation, trade?.traderBId]
    );

  const currentUserAgreementConfirmation = useMemo(() => {
      if (!currentUserId) return null;

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

  const currentUserConfirmedAgreement = Boolean(currentUserAgreementConfirmation);

  const bothTradersConfirmedAgreement = Boolean(
      traderAAgreementConfirmation &&
        traderBAgreementConfirmation
    );

  /* =======================================================
     VERIFICATION-STAGE CONFIRMATIONS
  ======================================================= */

  const verificationConfirmations = useMemo(
    () =>
      getStageConfirmations(
        VERIFICATION_STAGE
      ),
    [getStageConfirmations]
  );

  const traderAVerificationConfirmation = useMemo(
      () =>
        getTraderConfirmation(
          VERIFICATION_STAGE,
          trade?.traderAId
        ),
      [getTraderConfirmation, trade?.traderAId]
    );

  const traderBVerificationConfirmation = useMemo(
      () =>
        getTraderConfirmation(
          VERIFICATION_STAGE,
          trade?.traderBId
        ),
      [getTraderConfirmation, trade?.traderBId]
    );

  const currentUserVerificationConfirmation = useMemo(() => {
      if (!currentUserId) return null;

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

  const currentUserConfirmedVerification = Boolean(
      currentUserVerificationConfirmation
    );

  const bothTradersConfirmedVerification = Boolean(
      traderAVerificationConfirmation &&
        traderBVerificationConfirmation
    );

  /* =======================================================
     HANDOVER READINESS CONFIRMATIONS
     =======================================================

     IMPORTANT:

     At VERIFICATION, the backend should:
       1. Create/update current user's Verification
          record as VERIFIED.
       2. Create current user's HANDOVER confirmation.
       3. Move to READY_FOR_HANDOVER only after
          both traders have done the same.
  ======================================================= */

  const handoverConfirmations = useMemo( () =>
      getStageConfirmations(
        HANDOVER_STAGE
      ),
    [getStageConfirmations]
  );

  const traderAHandoverConfirmation = useMemo(
      () =>
        getTraderConfirmation(
          HANDOVER_STAGE,
          trade?.traderAId
        ),
      [getTraderConfirmation, trade?.traderAId]
    );

  const traderBHandoverConfirmation = useMemo(
      () =>
        getTraderConfirmation(
          HANDOVER_STAGE,
          trade?.traderBId
        ),
      [getTraderConfirmation, trade?.traderBId]
    );

  const currentUserHandoverConfirmation = useMemo(() => {
      if (!currentUserId) return null;

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
    Boolean(currentUserHandoverConfirmation);

  const bothTradersConfirmedHandoverReadiness =
    Boolean(
      traderAHandoverConfirmation &&
        traderBHandoverConfirmation
    );

  /* =======================================================
     HANDOVER STARTED
  ======================================================= */

  const handoverStartedConfirmations = useMemo(
      () =>
        getStageConfirmations(
          HANDOVER_STARTED_STAGE
        ),
      [getStageConfirmations]
    );

  const traderAHandoverStartedConfirmation = useMemo(
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

  const traderBHandoverStartedConfirmation = useMemo(
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

  const currentUserHandoverStartedConfirmation = useMemo(() => {
      if (!currentUserId) return null;

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

  const currentUserConfirmedHandoverStarted = Boolean(
      currentUserHandoverStartedConfirmation
    );

  const bothTradersConfirmedHandoverStarted = Boolean(
      traderAHandoverStartedConfirmation &&
        traderBHandoverStartedConfirmation
    );

  /* =======================================================
     COMPLETION CONFIRMATIONS
  ======================================================= */

  const completionConfirmations = useMemo( () =>
      getStageConfirmations(
        COMPLETION_STAGE
      ),
    [getStageConfirmations]
  );

  const traderACompletionConfirmation = useMemo(
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

  const traderBCompletionConfirmation = useMemo(
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

  const currentUserCompletionConfirmation = useMemo(() => {
      if (!currentUserId) return null;

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

  const currentUserConfirmedCompletion = Boolean(
      currentUserCompletionConfirmation
    );

  const bothTradersConfirmedCompletion = Boolean(
      traderACompletionConfirmation &&
        traderBCompletionConfirmation
    );

  /* =======================================================
     VERIFICATION RECORDS
  ======================================================= */

  const verifications = useMemo(() => {
    if (!Array.isArray(trade?.verifications)) {
      return [];
    }

    return trade.verifications;
  }, [trade]);

  const getVerificationForUser = useCallback(
      (userId) => {
        if (!userId) return null;

        return (
          verifications.find(
            (verification) =>
              verification.userId === userId
          ) || null
        );
      },
      [verifications]
    );

  const traderAVerification = useMemo(() =>
      getVerificationForUser(
        trade?.traderAId
      ),
    [
      getVerificationForUser,
      trade?.traderAId,
    ]
  );

  const traderBVerification = useMemo(() =>
      getVerificationForUser(
        trade?.traderBId
      ),
    [
      getVerificationForUser,
      trade?.traderBId,
    ]
  );

  const currentUserVerification = useMemo(() =>
      getVerificationForUser(
        currentUserId
      ),
    [
      getVerificationForUser,
      currentUserId,
    ]
  );

  const otherTraderVerification = useMemo(() =>
      getVerificationForUser(
        otherTrader?.id
      ),
    [
      getVerificationForUser,
      otherTrader?.id,
    ]
  );

  const currentUserItemVerified = currentUserVerification?.status === "VERIFIED";

  const partnerItemVerified =otherTraderVerification?.status === "VERIFIED";

  const bothItemsVerified = currentUserItemVerified && partnerItemVerified;

  /* =======================================================
     TRADE ITEMS
  ======================================================= */

  const yourListing = trade?.items?.[0]?.listing || trade?.offer?.offeredListing;

  const theirListing = trade?.items?.[1]?.listing || trade?.offer?.requestedListing;

  /* =======================================================
     CONFIRM CURRENT TRADE STAGE
  =======================================================

     PENDING
       -> AGREEMENT confirmation

     AGREED
       -> VERIFICATION confirmation

     VERIFICATION
       -> verify item
       -> record HANDOVER readiness
       -> READY_FOR_HANDOVER after both traders

     No unilateral status changes happen here.
  ======================================================= */

  const handleConfirmStage = async () => {
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

      /* ---------------------------------------------------
         AGREEMENT
      --------------------------------------------------- */

      if (trade.status === "PENDING") {
        if (currentUserConfirmedAgreement) {
          setConfirmationSuccess(
            "Your agreement has already been recorded. Waiting for the other trader."
          );
          return;
        }
      }

      /* ---------------------------------------------------
         START VERIFICATION
      --------------------------------------------------- */

      if (trade.status === "AGREED") {
        if (currentUserConfirmedVerification) {
          setConfirmationSuccess(
            "Your verification-stage confirmation has already been recorded. Waiting for the other trader."
          );
          return;
        }
      }

      /* ---------------------------------------------------
         ITEM VERIFICATION + HANDOVER READINESS

         This is intentionally one click.

         The backend should create/update:
           Verification(status=VERIFIED)
         and
           TradeConfirmation(stage=HANDOVER)

         for the current user.
      --------------------------------------------------- */

      if (
        trade.status === "VERIFICATION" &&
        currentUserConfirmedHandoverReadiness
      ) {
        setConfirmationSuccess(
          "Your item verification and handover readiness are already recorded. Waiting for the other trader."
        );
        return;
      }

      const response = await confirmTrade(id);

      console.log( "CONFIRM TRADE RESPONSE:", response);

      if (response?.trade) {
        setTrade(response.trade);
      } else {
        await loadTrade();
      }

      if (response?.bothConfirmed) {
        setConfirmationSuccess(
          response?.message ||
            "Both traders have confirmed. The trade has advanced to the next stage."
        );
      } else {
        setConfirmationSuccess(
          response?.message ||
            "Your confirmation has been recorded. Waiting for the other trader."
        );
      }
    } catch (error) {
      console.error(
        "Confirm trade stage error:",
        error
      );

      console.error("Backend response:",error.response?.data);

      setActionError(
        error.response?.data?.message || "Unable to confirm this trade stage."
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
     CONFIRM HANDOVER STARTED

     READY_FOR_HANDOVER
       -> HANDOVER_STARTED confirmation

     Both traders must confirm.
  ======================================================= */

  const handleConfirmHandoverStarted = async () => {
      if (!trade) return;

      if (!isParticipant) {
        setHandoverError(
          "You are not a participant in this trade."
        );
        return;
      }

      if (
        trade.status !== "READY_FOR_HANDOVER"
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

        const response = await confirmTrade(id);

        console.log(
          "CONFIRM HANDOVER RESPONSE:",
          response
        );

        if (response?.trade) {
          setTrade(response.trade);
        } else {
          await loadTrade();
        }

        if (response?.bothConfirmed) {
          setHandoverSuccess(
            response?.message ||
              "Both traders have confirmed. Handover is now in progress."
          );
        } else {
          setHandoverSuccess(
            response?.message ||
              "Your handover-start confirmation has been recorded. Waiting for the other trader."
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
     CONFIRM COMPLETION

     IN_PROGRESS
       -> COMPLETION confirmation

     Both traders must confirm.
  ======================================================= */

  const handleConfirmCompletion = async () => {
    if (!trade) return;

    if (!isParticipant) {
      setActionError(
        "You are not a participant in this trade."
      );
      return;
    }

    if (trade.status !== "IN_PROGRESS") {
      setActionError(
        "The trade must be in progress before completion can be confirmed."
      );
      return;
    }

    if (currentUserConfirmedCompletion) {
      setConfirmationSuccess(
        "Your completion confirmation is already recorded. Waiting for the other trader."
      );
      return;
    }

    try {
      setActionLoading(true);

      setActionError("");
      setConfirmationSuccess("");

      const response = await confirmTrade(id);

      console.log(
        "CONFIRM COMPLETION RESPONSE:",
        response
      );

      if (response?.trade) {
        setTrade(response.trade);
      } else {
        await loadTrade();
      }

      if (response?.bothConfirmed) {
        setConfirmationSuccess(
          response?.message ||
            "Both traders have confirmed. The trade is now officially completed."
        );
      } else {
        setConfirmationSuccess(
          response?.message ||
            "Your completion confirmation has been recorded. Waiting for the other trader."
        );
      }
    } catch (error) {
      console.error(
        "Confirm trade completion error:",
        error
      );

      setActionError(
        error.response?.data?.message || "Unable to confirm trade completion."
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

     Only allowed while the trade is still before
     physical handover.
  ======================================================= */

  const handleCancelTrade = async () => {
    if (!trade) return;

    if (!isParticipant) {
      setActionError("You are not a participant in this trade.");
      return;
    }

    const cancellableStatuses = [
      "PENDING",
      "AGREED",
      "VERIFICATION",
      "READY_FOR_HANDOVER",
    ];

    if (!cancellableStatuses.includes( trade.status )) {
      setActionError(
        "This trade can no longer be cancelled at its current stage."
      );
      return;
    }

    const confirmed = window.confirm( "Are you sure you want to cancel this trade?");

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
        setTrade(response.trade);
      } else {
        await loadTrade();
      }
    } catch (error) {
      console.error(
        "Cancel trade error:",
        error
      );

      setActionError( error.response?.data?.message || "Unable to cancel this trade.");
    } finally {
      setActionLoading(false);
    }
  };


  const handleSubmitRating = async () => {
    if (!trade) return;

    if (!isParticipant) {
      setRatingError(
        "You are not a participant in this trade."
      );

      return;
    }

    if (trade.status !== "COMPLETED") {
      setRatingError( "You can only rate a trader after the trade is completed.");

      return;
    }

    if (currentUserRating) {
      setRatingError("You have already rated this trade.");

      return;
    }

    if (
      !Number.isInteger(ratingValue) ||
      ratingValue < 1 ||
      ratingValue > 5
    ) {
      setRatingError("Please select a rating from 1 to 5 stars.");

      return;
    }

    if (ratingComment.length > 1000) {
      setRatingError("Your comment cannot exceed 1000 characters.");

      return;
    }

    try {
      setRatingLoading(true);
      setRatingError("");
      setRatingSuccess("");

      const response = await createRating(
        id,
        ratingValue,
        ratingComment.trim()
      );

      setRatingSuccess(response?.message || "Your rating has been submitted successfully.");

      setRatingValue(0);
      setRatingComment("");

      await loadRatings();
      await loadTrade();
    } catch (error) {
      console.error("Submit rating error:",error);

      setRatingError(error.response?.data?.message || "Unable to submit your rating.");

      try {
        await loadRatings();
      } catch {
        // Ignore refresh failure.
      }
    } finally {
      setRatingLoading(false);
    }
  };
  const handleSubmitDispute = async () => {
    if (!trade) return;

    if (!isParticipant) {
      setDisputeError("You are not a participant in this trade.");
      return;
    }

    const disputableStatuses = [
      "VERIFICATION",
      "READY_FOR_HANDOVER",
      "IN_PROGRESS",
    ];

    if (!disputableStatuses.includes(trade.status)) {
      setDisputeError("This trade cannot be disputed at its current stage.");
      return;
    }

    if (trade.dispute) {
      setDisputeError("This trade already has a dispute.");
      return;
    }

    const trimmedReason = disputeReason.trim();

    const trimmedDescription = disputeDescription.trim();

    if (!trimmedReason) {
       setDisputeError("Please select or enter a dispute reason.");
      return;
    }

    if (!trimmedDescription) {
      setDisputeError("Please describe what happened.");
      return;
    }

    if (trimmedReason.length > 100) {
      setDisputeError("Dispute reason cannot exceed 100 characters.");
      return;
    }

    if (trimmedDescription.length < 10) {
      setDisputeError("Please provide at least 10 characters describing the issue.");
      return;
    }

    if (trimmedDescription.length > 5000) {
      setDisputeError("Description cannot exceed 5000 characters.");
      return;
    }

    try {
      setDisputeLoading(true);
      setDisputeError("");
      setDisputeSuccess("");

      const response = await createDispute(
          id,
          trimmedReason,
          trimmedDescription
        );

      setDisputeSuccess(
        response?.message || "Your dispute has been submitted."
      );

      setDisputeModalOpen(false);

      setDisputeReason("");
      setDisputeDescription("");

      if (response?.trade) {
        setTrade((currentTrade) => ({
          ...currentTrade,
          status: response.trade.status,
          dispute: response.dispute,
        }));
      } else {
        await loadTrade();
      }
    } catch (error) {
      console.error("SUBMIT DISPUTE ERROR:", error);

      setDisputeError(
        error.response?.data?.message || "Unable to submit dispute.");
    } finally {
      setDisputeLoading(false);
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
     ERROR
  ======================================================= */

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

  const currentStatusIndex = statusSteps.indexOf(trade.status);

  /* =======================================================
     HANDOVER STARTED STATUS
  ======================================================= */

  const getHandoverStartedStatus = (userId) => {
    const confirmation =
      handoverStartedConfirmations.find(
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
        className:  "bg-green-50 border-green-200 text-green-700", icon: "✓",
      };
    }

    return {
      label: "Waiting for Confirmation",
      description: "This trader has not confirmed that handover has started.",
      className: "bg-gray-50 border-gray-200 text-gray-600", icon: "○",
    };
  };

  const traderAHandoverStartedStatus = getHandoverStartedStatus(trade.traderAId);
  const traderBHandoverStartedStatus = getHandoverStartedStatus(trade.traderBId);

  /* =======================================================
     VERIFICATION STATUS
  ======================================================= */

  const getVerificationStatus = (verification) => {
    if (
      verification?.status === "VERIFIED"
    ) {
      return {
        label: "Item Verified",
        description: verification.updatedAt
            ? `Verified ${formatDateTime(
                verification.updatedAt
              )}`
            : "Verified",
        className: "border-green-200 bg-green-50 text-green-700", icon: "✓",
      };
    }

    if (
      verification?.status === "REJECTED"
    ) {
      return {
        label: "Verification Rejected",
        description: verification.notes || "This verification was rejected.",
        className: "border-red-200 bg-red-50 text-red-700", icon: "!",
      };
    }

    return {
      label: "Waiting for Verification",
      description: "This trader has not yet verified the item.",
      className: "border-gray-200 bg-gray-50 text-gray-600", icon: "○",
    };
  };

  const traderAVerificationStatus = getVerificationStatus( traderAVerification);
  const traderBVerificationStatus = getVerificationStatus(traderBVerification);

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

        {disputeSuccess && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
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

        {trade.status === "PENDING" && (
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
                    Both traders must agree to the trade
                    before it can move to verification.
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
                  isCurrentUser={isTraderA}
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
                  isCurrentUser={isTraderB}
                />
              </div>

              {!currentUserConfirmedAgreement &&
                isParticipant && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Do you agree to this trade?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Confirm only after reviewing the
                      items, values and other trade details.
                    </p>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={
                        handleConfirmStage
                      }
                      className="mt-5 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Confirming..."
                        : "✓ Agree to Trade"}
                    </button>
                  </div>
                )}

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
                          The other trader must also agree
                          before the trade moves to{" "}
                          <strong>
                            Verification
                          </strong>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            VERIFICATION START STAGE
        ================================================== */}

        {trade.status === "AGREED" && (
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
                    Both traders must confirm that they are
                    ready to verify the items before the trade
                    enters the verification stage.
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
                  isCurrentUser={isTraderA}
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
                  isCurrentUser={isTraderB}
                />
              </div>

              {!currentUserConfirmedVerification &&
                isParticipant && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Ready to verify the item?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Confirm that you are ready. Both traders
                      must do this before the actual item
                      verification stage begins.
                    </p>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={
                        handleConfirmStage
                      }
                      className="mt-5 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Confirming..."
                        : "✓ Start Verification"}
                    </button>
                  </div>
                )}

              {currentUserConfirmedVerification &&
                !bothTradersConfirmedVerification && (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                        ✓
                      </div>

                      <div>
                        <h3 className="font-extrabold text-amber-800">
                          Your verification-stage confirmation is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          The other trader must also confirm
                          before both items can be verified.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}

        {/* =================================================
            ITEM VERIFICATION + HANDOVER READINESS
        ================================================== */}

        {trade.status === "VERIFICATION" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
            <div className="border-b border-purple-100 bg-purple-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-purple-700">
                    Stage 3 · Item Verification
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Verify Items & Confirm Handover Readiness
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Check your item carefully against the
                    barter agreement. One click will record
                    your item as verified and your readiness
                    for handover. The other trader must do the
                    same before the trade can move forward.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100 text-2xl">
                  🔍
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* ITEM VERIFICATION */}
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                  Item verification
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {/* TRADER A */}
                  <div
                    className={`rounded-2xl border p-5 ${traderAVerificationStatus.className}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                          Trader A
                        </p>

                        <h3 className="mt-1 text-lg font-extrabold">
                          {trade.traderA?.name ||
                            "Trader A"}
                        </h3>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm">
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

                    <p className="mt-1 text-xs opacity-80">
                      {
                        traderAVerificationStatus.description
                      }
                    </p>

                    {isTraderA && (
                      <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                        You
                      </span>
                    )}
                  </div>

                  {/* TRADER B */}
                  <div
                    className={`rounded-2xl border p-5 ${traderBVerificationStatus.className}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                          Trader B
                        </p>

                        <h3 className="mt-1 text-lg font-extrabold">
                          {trade.traderB?.name ||
                            "Trader B"}
                        </h3>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm">
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

                    <p className="mt-1 text-xs opacity-80">
                      {
                        traderBVerificationStatus.description
                      }
                    </p>

                    {isTraderB && (
                      <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                        You
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* HANDOVER READINESS */}
              <div className="mt-8">
                <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                  Handover readiness
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <ConfirmationStatusCard
                    label="Trader A"
                    name={
                      trade.traderA?.name ||
                      "Trader A"
                    }
                    confirmed={Boolean(
                      traderAHandoverConfirmation
                    )}
                    confirmedAt={
                      traderAHandoverConfirmation?.confirmedAt
                    }
                    isCurrentUser={isTraderA}
                  />

                  <ConfirmationStatusCard
                    label="Trader B"
                    name={
                      trade.traderB?.name ||
                      "Trader B"
                    }
                    confirmed={Boolean(
                      traderBHandoverConfirmation
                    )}
                    confirmedAt={
                      traderBHandoverConfirmation?.confirmedAt
                    }
                    isCurrentUser={isTraderB}
                  />
                </div>
              </div>

              {/* CURRENT USER ACTION */}
              {isParticipant &&
                !currentUserConfirmedHandoverReadiness && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Verify your item
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Confirm only after checking that the
                      item you are receiving matches the trade
                      agreement. Your item will be marked as
                      verified and your handover readiness will
                      be recorded together.
                    </p>

                    <button
                      type="button"
                      disabled={actionLoading}
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

              {/* CURRENT USER ALREADY CONFIRMED */}
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

              {/* BOTH READY */}
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
                          Both traders have verified their
                          items and confirmed handover
                          readiness. The trade can now move to
                          the handover stage.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Important
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  One trader cannot make the trade
                  handover-ready alone. Each trader must
                  verify their side individually.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            HANDOVER STARTED
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
                    Confirm Handover Started
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    Both items are verified and the trade is
                    ready for physical exchange. Each trader
                    must confirm when the handover actually
                    starts.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl">
                  🤝
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
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

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={`rounded-2xl border p-5 ${traderAHandoverStartedStatus.className}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                        Trader A
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold">
                        {trade.traderA?.name ||
                          "Trader A"}
                      </h3>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm">
                      {
                        traderAHandoverStartedStatus.icon
                      }
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    {
                      traderAHandoverStartedStatus.label
                    }
                  </p>

                  <p className="mt-1 text-xs opacity-80">
                    {
                      traderAHandoverStartedStatus.description
                    }
                  </p>

                  {isTraderA && (
                    <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                      You
                    </span>
                  )}
                </div>

                <div
                  className={`rounded-2xl border p-5 ${traderBHandoverStartedStatus.className}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
                        Trader B
                      </p>

                      <h3 className="mt-1 text-lg font-extrabold">
                        {trade.traderB?.name ||
                          "Trader B"}
                      </h3>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold shadow-sm">
                      {
                        traderBHandoverStartedStatus.icon
                      }
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-bold">
                    {
                      traderBHandoverStartedStatus.label
                    }
                  </p>

                  <p className="mt-1 text-xs opacity-80">
                    {
                      traderBHandoverStartedStatus.description
                    }
                  </p>

                  {isTraderB && (
                    <span className="mt-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                      You
                    </span>
                  )}
                </div>
              </div>

              {!currentUserConfirmedHandoverStarted &&
                !bothTradersConfirmedHandoverStarted &&
                isParticipant && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Has the handover started?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Only confirm this when you and your
                      trade partner have actually started
                      exchanging the items.
                    </p>

                    <button
                      type="button"
                      disabled={handoverLoading}
                      onClick={
                        handleConfirmHandoverStarted
                      }
                      className="mt-5 rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {handoverLoading
                        ? "Confirming..."
                        : "✓ Confirm Handover Started"}
                    </button>
                  </div>
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
                          Your handover confirmation is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Your trade partner must also confirm
                          that the handover has started before
                          the trade moves to{" "}
                          <strong>
                            In Progress
                          </strong>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {bothTradersConfirmedHandoverStarted && (
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
                        Both traders have confirmed that the
                        physical handover has started. The
                        trade is now in progress.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Important
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  The trade cannot enter{" "}
                  <strong>In Progress</strong> through a
                  normal status update. Both traders must
                  individually confirm that handover has
                  started.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            COMPLETION
        ================================================== */}

        {trade.status === "IN_PROGRESS" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
            <div className="border-b border-orange-100 bg-orange-50 px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-orange-700">
                    Stage 5 · Completion
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Confirm Trade Completion
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    Confirm only after you have received the
                    item you agreed to receive and handed over
                    your own item.
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl">
                  ✅
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
                    traderACompletionConfirmation
                  )}
                  confirmedAt={
                    traderACompletionConfirmation?.confirmedAt
                  }
                  isCurrentUser={isTraderA}
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
                  isCurrentUser={isTraderB}
                />
              </div>

              {!currentUserConfirmedCompletion &&
                !bothTradersConfirmedCompletion &&
                isParticipant && (
                  <div className="mt-6 rounded-2xl border border-[#E7DDDF] bg-[#FBF5F6] p-5">
                    <h3 className="font-extrabold text-[#21191B]">
                      Has the exchange been completed?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Only confirm this after the physical
                      exchange has actually been completed.
                    </p>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={
                        handleConfirmCompletion
                      }
                      className="mt-5 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Confirming..."
                        : "✓ Confirm Trade Completed"}
                    </button>
                  </div>
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
                          Your completion confirmation is recorded
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Your trade partner must also confirm
                          before the trade becomes officially
                          completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {bothTradersConfirmedCompletion && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
                      ✓
                    </div>

                    <div>
                      <h3 className="font-extrabold text-green-800">
                        Trade Completed
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-green-700">
                        Both traders have confirmed that the
                        exchange has been completed. This trade
                        is now officially completed.
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
                </div>
              )}

              <div className="mt-6 rounded-xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Important
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  One trader cannot complete the trade alone.
                  Both traders must individually confirm
                  completion.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            COMPLETED
        ================================================== */}

        {trade.status === "COMPLETED" && (
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
                  Both traders confirmed completion of this
                  barter trade.
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
                  No further trade confirmations can be made.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            DISPUTED
         ================================================== */}
        {trade.status === "DISPUTED" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="border-b border-red-100 bg-red-50 px-6 py-6 md:px-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white">
                  !
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                    Trade dispute
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-red-900">
                    This trade is under dispute
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-red-700">
                    Further trade progress is paused while the
                    dispute is reviewed.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6 md:p-8">
              {trade.dispute ? (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-red-700">
                      {formatStatus(
                        trade.dispute.status
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Reason
                    </p>

                    <p className="mt-2 text-sm font-semibold text-[#21191B]">
                      {trade.dispute.reason}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Description
                    </p>

                    <p className="mt-2 rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-600">
                      {trade.dispute.description}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#E7DDDF] bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Raised by
                      </p>

                      <p className="mt-1 font-bold text-[#21191B]">
                        {trade.dispute.user?.name ||
                          "Trade participant"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#E7DDDF] bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Submitted
                      </p>

                      <p className="mt-1 font-bold text-[#21191B]">
                        {formatDateTime(
                          trade.dispute.createdAt
                        )}
                      </p>
                    </div>
                  </div>

                  {trade.dispute.resolution && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                        Resolution
                      </p>

                      <p className="mt-2 text-sm leading-7 text-green-800">
                        {trade.dispute.resolution}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                  This trade is disputed, but dispute details
                  are not currently available.
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================
            RATINGS — STEP 6.10.4
        ================================================== */}

        {trade.status === "COMPLETED" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-[#E7DDDF] bg-white shadow-sm">
            <div className="border-b border-[#E7DDDF] bg-[#FBF5F6] px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider text-[#8A2638]">
                    Trade Reputation
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold text-[#21191B]">
                    Rate your trade partner
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    The trade is complete. Share your experience
                    with {otherTrader?.name || "your trade partner"}
                    to help build trust across the Barter Trace
                    marketplace.
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
                    <div className="text-lg">⚠️</div>
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
                            You rated {otherTrader?.name || "your trade partner"}
                          </h3>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                          ✓
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={
                              star <= currentUserRating.rating
                                ? "text-3xl text-yellow-500"
                                : "text-3xl text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <p className="mt-2 text-sm font-bold text-[#5B1725]">
                        {currentUserRating.rating}/5
                      </p>

                      {currentUserRating.comment && (
                        <div className="mt-5 rounded-xl bg-white p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Your comment
                          </p>
                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            "{currentUserRating.comment}"
                          </p>
                        </div>
                      )}

                      {currentUserRating.createdAt && (
                        <p className="mt-4 text-xs text-gray-400">
                          Submitted {formatDateTime(currentUserRating.createdAt)}
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
                        Rate {otherTrader?.name || "your trade partner"} from 1 to 5 stars.
                      </p>

                      <div
                        className="mt-5 flex items-center gap-1 sm:gap-2"
                        role="radiogroup"
                        aria-label="Trade partner rating"
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingValue(star)}
                            disabled={ratingLoading}
                            aria-label={`Rate ${star} out of 5`}
                            aria-pressed={ratingValue === star}
                            className={`rounded-lg p-1 text-4xl leading-none transition sm:text-5xl ${
                              star <= ratingValue
                                ? "scale-105 text-yellow-500"
                                : "text-gray-300 hover:text-yellow-400"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <p className="mt-2 text-xs font-semibold text-gray-500">
                        {ratingValue === 0
                          ? "Select your rating."
                          : `${ratingValue} out of 5 stars selected`}
                      </p>

                      <div className="mt-6">
                        <label
                          htmlFor="rating-comment"
                          className="text-sm font-bold text-[#21191B]"
                        >
                          Comment <span className="font-normal text-gray-400">(optional)</span>
                        </label>

                        <textarea
                          id="rating-comment"
                          rows={4}
                          maxLength={1000}
                          value={ratingComment}
                          onChange={(event) => setRatingComment(event.target.value)}
                          disabled={ratingLoading}
                          placeholder="Tell your trade partner how the experience went..."
                          className="mt-2 w-full resize-none rounded-xl border border-[#DCCED1] bg-white px-4 py-3 text-sm text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB] disabled:cursor-not-allowed disabled:bg-gray-100"
                        />

                        <div className="mt-2 flex justify-end">
                          <span className="text-xs text-gray-400">
                            {ratingComment.length}/1000
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={ratingLoading || !isParticipant || ratingValue < 1}
                        onClick={handleSubmitRating}
                        className="mt-5 w-full rounded-xl bg-[#5B1725] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#3D0F18] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {ratingLoading ? "Submitting Rating..." : "⭐ Submit Rating"}
                      </button>
                    </>
                  )}
                </div>

                {/* PARTNER RATING */}
                <div className="rounded-2xl border border-[#E7DDDF] bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#8A2638]">
                        Partner's rating
                      </p>
                      <h3 className="mt-1 text-xl font-extrabold text-[#21191B]">
                        {otherTrader?.name || "Trade partner"}
                      </h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5E8EB] text-lg">
                      ⭐
                    </div>
                  </div>

                  {partnerRating ? (
                    <>
                      <div className="mt-5 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={
                              star <= partnerRating.rating
                                ? "text-3xl text-yellow-500"
                                : "text-3xl text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#5B1725]">
                        {partnerRating.rating}/5
                      </p>

                      {partnerRating.comment && (
                        <div className="mt-5 rounded-xl bg-[#FBF5F6] p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            Partner comment
                          </p>
                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            "{partnerRating.comment}"
                          </p>
                        </div>
                      )}

                      {partnerRating.createdAt && (
                        <p className="mt-4 text-xs text-gray-400">
                          Submitted {formatDateTime(partnerRating.createdAt)}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-800">
                        Waiting for your trade partner
                      </p>
                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Their rating will appear here once they rate this completed trade.
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
                  Each trader can submit one rating for this completed trade.
                  Ratings are linked to the actual trade participants, and your
                  rating contributes to the trader's Barter Score.
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

            {/* PARTNER VERIFICATION */}
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
                Actions available to you at the current
                trade stage.
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
            {[
                "VERIFICATION",
                "READY_FOR_HANDOVER",
                "IN_PROGRESS",
              ].includes(trade.status) &&
                isParticipant &&
                !trade.dispute && (
                  <button
                    type="button"
                    disabled={disputeLoading}
                    onClick={() => {
                      setDisputeError("");
                      setDisputeSuccess("");
                      setDisputeModalOpen(true);
                    }}
                    className="rounded-xl border border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ⚠️ Report a Problem
                  </button>
          )}
            {/* AGREEMENT */}
            {trade.status === "PENDING" &&
              isParticipant &&
              !currentUserConfirmedAgreement && (
                <button
                  type="button"
                  disabled={actionLoading}
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
            {trade.status === "AGREED" &&
              isParticipant &&
              !currentUserConfirmedVerification && (
                <button
                  type="button"
                  disabled={actionLoading}
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
            {trade.status === "VERIFICATION" &&
              isParticipant &&
              !currentUserConfirmedHandoverReadiness && (
                <button
                  type="button"
                  disabled={actionLoading}
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
                  disabled={handoverLoading}
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
                  disabled={actionLoading}
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
                  disabled={actionLoading}
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

            {/* WAITING STATES */}
            {trade.status === "PENDING" &&
              currentUserConfirmedAgreement &&
              !bothTradersConfirmedAgreement && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ You have agreed. Waiting for the other
                  trader.
                </div>
              )}

            {trade.status === "AGREED" &&
              currentUserConfirmedVerification &&
              !bothTradersConfirmedVerification && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ Your verification-stage confirmation is
                  recorded. Waiting for the other trader.
                </div>
              )}

            {trade.status === "VERIFICATION" &&
              currentUserConfirmedHandoverReadiness &&
              !bothTradersConfirmedHandoverReadiness && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ Your item is verified and your handover
                  readiness is recorded. Waiting for the
                  other trader.
                </div>
              )}

            {trade.status ===
              "READY_FOR_HANDOVER" &&
              currentUserConfirmedHandoverStarted &&
              !bothTradersConfirmedHandoverStarted && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ You confirmed that handover has started.
                  Waiting for the other trader.
                </div>
              )}

            {trade.status === "IN_PROGRESS" &&
              currentUserConfirmedCompletion &&
              !bothTradersConfirmedCompletion && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
                  ✓ Your completion confirmation is recorded.
                  Waiting for the other trader.
                </div>
              )}

            {/* COMPLETED */}
            {trade.status === "COMPLETED" && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-sm font-semibold text-green-700">
                ✓ This trade has been completed successfully.
              </div>
            )}

            {/* CANCELLED */}
            {trade.status === "CANCELLED" && (
              <div className="rounded-xl border border-gray-200 bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-600">
                This trade has been cancelled.
              </div>
            )}

            {/* DISPUTED */}
            {trade.status === "DISPUTED" && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
                This trade is currently under dispute.
              </div>
            )}
          </div>
        </section>
      </main>
      {/* =================================================
          DISPUTE MODAL
      ================================================= */}

      {disputeModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60"
          aria-modal="true"
          role="dialog"
        >
          {/* Scrollable viewport */}
          <div className="flex min-h-full items-start justify-center p-3 sm:items-center sm:p-6">
            {/* Modal */}
            <div className="my-3 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-6">
              
              {/* ==============================
                  HEADER
              ============================== */}
              <div className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-5 sm:px-6 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700 sm:text-sm">
                      Trade Safety
                    </p>

                    <h2 className="mt-1 text-xl font-extrabold leading-tight text-red-900 sm:text-2xl">
                      Report a Problem
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-red-700">
                      Tell us what went wrong with this trade.
                      Submitting a dispute will pause further
                      trade progress.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!disputeLoading) {
                        setDisputeModalOpen(false);
                        setDisputeError("");
                      }
                    }}
                    disabled={disputeLoading}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold text-gray-500 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close dispute modal"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* ==============================
                  SCROLLABLE CONTENT
              ============================== */}
              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain px-4 py-5 sm:max-h-[calc(100dvh-6rem)] sm:px-6 sm:py-6 md:px-8 md:py-8">
                <div className="space-y-5 sm:space-y-6">

                  {/* ERROR */}
                  {disputeError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                      ⚠️ {disputeError}
                    </div>
                  )}

                  {/* REASON */}
                  <div>
                    <label
                      htmlFor="dispute-reason"
                      className="mb-2 block text-sm font-bold text-[#21191B]"
                    >
                      Reason
                    </label>

                    <select
                      id="dispute-reason"
                      value={disputeReason}
                      onChange={(event) =>
                        setDisputeReason(event.target.value)
                      }
                      disabled={disputeLoading}
                      className="w-full rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm text-[#21191B] outline-none transition focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB]"
                    >
                      <option value="">
                        Select a reason
                      </option>

                      <option value="Item condition differs from the agreement">
                        Item condition differs from the agreement
                      </option>

                      <option value="Item was not received">
                        Item was not received
                      </option>

                      <option value="Trader did not appear for handover">
                        Trader did not appear for handover
                      </option>

                      <option value="Suspected fraud">
                        Suspected fraud
                      </option>

                      <option value="Item does not match the listing">
                        Item does not match the listing
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <label
                        htmlFor="dispute-description"
                        className="block text-sm font-bold text-[#21191B]"
                      >
                        Describe what happened
                      </label>

                      <span className="text-xs text-gray-400">
                        {disputeDescription.length}/5000
                      </span>
                    </div>

                    <textarea
                      id="dispute-description"
                      value={disputeDescription}
                      onChange={(event) =>
                        setDisputeDescription(
                          event.target.value
                        )
                      }
                      disabled={disputeLoading}
                      rows={6}
                      maxLength={5000}
                      placeholder="Explain the problem clearly. Include what was agreed, what happened, and why you believe the trade should be reviewed."
                      className="min-h-[150px] w-full resize-y rounded-xl border border-[#DCCACE] bg-white px-4 py-3 text-sm leading-6 text-[#21191B] outline-none transition placeholder:text-gray-400 focus:border-[#8A2638] focus:ring-2 focus:ring-[#F5E8EB]"
                    />
                  </div>

                  {/* WARNING */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-800">
                      Important
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      Only submit a dispute when there is a genuine
                      problem with this barter trade. Once submitted,
                      the trade will be moved to Disputed and normal
                      trade progression will stop.
                    </p>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (disputeLoading) return;

                        setDisputeModalOpen(false);
                        setDisputeError("");
                      }}
                      disabled={disputeLoading}
                      className="w-full rounded-xl border border-[#DCCACE] bg-white px-6 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitDispute}
                      disabled={disputeLoading}
                      className="w-full rounded-xl bg-red-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {disputeLoading
                        ? "Submitting..."
                        : "Submit Dispute"}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeDetails;

