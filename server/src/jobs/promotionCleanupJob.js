
import { expirePromotions, cleanupPendingPromotions, } from "../services/promotionService.js";

/**
 * Run promotion cleanup immediately when the server starts,
 * then repeat every 15 minutes.
 *
 * Why 15 minutes?
 *
 * A promotion may technically expire at:
 *
 * 10:03:12
 *
 * The cleanup job might run at:
 *
 * 10:15:00
 *
 * That is acceptable because marketplace queries ALSO check
 * endsAt directly.
 *
 * Therefore an expired promotion will never receive
 * marketplace priority simply because the cleanup job has
 * not run yet.
 */

const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

let cleanupRunning = false;


export const runPromotionCleanup = async () => {
  if (cleanupRunning) {
    return;
  }

  cleanupRunning = true;

  try {
    const expiredCount =
      await expirePromotions();

    const cancelledPendingCount =
      await cleanupPendingPromotions();

    if (
      expiredCount > 0 ||
      cancelledPendingCount > 0
    ) {
      console.log(
        `[PROMOTIONS] Cleanup completed. Expired: ${expiredCount}. Cancelled pending: ${cancelledPendingCount}.`
      );
    } else {
      console.log(
        "[PROMOTIONS] Cleanup completed. Nothing to clean."
      );
    }
  } catch (error) {
    console.error(
      "[PROMOTIONS] Cleanup failed:",
      error
    );
  } finally {
    cleanupRunning = false;
  }
};


export const startPromotionCleanupJob = () => {
  /*
   * Run once immediately.
   */
  runPromotionCleanup();

  /*
   * Continue every 15 minutes.
   */
  const interval = setInterval(
    runPromotionCleanup,
    CLEANUP_INTERVAL
  );

  /*
   * Prevent the interval from keeping the Node
   * process alive during shutdown.
   */
  if (typeof interval.unref === "function") {
    interval.unref();
  }

  console.log(
    "[PROMOTIONS] Automatic expiry cleanup started."
  );

  return interval;
};
