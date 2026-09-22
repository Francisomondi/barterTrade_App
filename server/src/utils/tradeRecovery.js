
/**
 * Trade Recovery Helpers
 *
 * Centralizes the rules used when a disputed trade is
 * cancelled or reopened.
 *
 * IMPORTANT:
 * These helpers only calculate recovery actions.
 * Database writes should remain inside the controller
 * transaction.
 */

/**
 * Valid trade statuses that are safe to restore
 * after a dispute.
 */
export const REOPENABLE_TRADE_STATUSES = [
  "VERIFICATION",
  "READY_FOR_HANDOVER",
  "IN_PROGRESS",
];

/**
 * Check whether a trade status can be restored
 * after a dispute.
 */
export const isReopenableTradeStatus = (status) => {
  return REOPENABLE_TRADE_STATUSES.includes(status);
};

/**
 * Get the confirmation fields that should be reset
 * when a trade is reopened.
 *
 * The confirmation model stores confirmations
 * separately by stage, so resetting is done through
 * TradeConfirmation records rather than trying to
 * mutate historical records.
 */
export const getRecoveryStages = (previousStatus) => {
  switch (previousStatus) {
    case "VERIFICATION":
      return [
        "HANDOVER",
        "COMPLETION",
      ];

    case "READY_FOR_HANDOVER":
      return [
        "HANDOVER",
        "COMPLETION",
      ];

    case "IN_PROGRESS":
      return [
        "COMPLETION",
      ];

    default:
      return [];
  }
};

/**
 * Determine whether verification should be reset.
 *
 * Verification is only relevant while the trade is
 * still inside the verification stage.
 */
export const shouldResetVerification = (previousStatus) => {
  return previousStatus === "VERIFICATION";
};

/**
 * Get the recovery plan for a disputed trade.
 *
 * This does not touch the database.
 */
export const getTradeRecoveryPlan = (previousStatus) => {
  if (!isReopenableTradeStatus(previousStatus)) {
    return {
      canReopen: false,
      previousStatus,
      resetStages: [],
      resetVerification: false,
    };
  }

  return {
    canReopen: true,
    previousStatus,
    resetStages: getRecoveryStages(previousStatus),
    resetVerification: shouldResetVerification(previousStatus),
  };
};
