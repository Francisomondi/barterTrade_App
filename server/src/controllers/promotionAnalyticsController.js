import {
  recordPromotionEvent,
  getPromotionAnalytics,
} from "../services/promotionAnalyticsService.js";

import {
  expirePromotionIfNeeded,
} from "../services/promotionExpiryService.js";

/**
 * =====================================================
 * RECORD PROMOTION VIEW
 * POST /api/promotions/:id/analytics/view
 * =====================================================
 */
export const recordPromotionView = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const userId =
      req.user?.id || null;

    const result =
      await recordPromotionEvent({
        promotionId: id,
        userId,
        type: "VIEW",
      });

    /*
     * An expired/inactive promotion is not an error.
     * It simply means the event should not be counted.
     */
    if (!result?.recorded) {
      return res.status(200).json({
        success: true,
        recorded: false,
        message:
          "Promotion view was not recorded because the promotion is not currently active.",
      });
    }

    return res.status(201).json({
      success: true,
      recorded: true,
      message:
        "Promotion view recorded.",
    });
  } catch (error) {
    console.error(
      "RECORD PROMOTION VIEW ERROR:",
      error
    );

    /*
     * Analytics must never break
     * marketplace browsing.
     */
    return res.status(200).json({
      success: false,
      recorded: false,
      message:
        "Promotion view could not be recorded.",
    });
  }
};

/**
 * =====================================================
 * RECORD PROMOTION CLICK
 * POST /api/promotions/:id/analytics/click
 * =====================================================
 */
export const recordPromotionClick = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const userId =
      req.user?.id || null;

    const result =
      await recordPromotionEvent({
        promotionId: id,
        userId,
        type: "CLICK",
      });

    if (!result?.recorded) {
      return res.status(200).json({
        success: true,
        recorded: false,
        message:
          "Promotion click was not recorded because the promotion is not currently active.",
      });
    }

    return res.status(201).json({
      success: true,
      recorded: true,
      message:
        "Promotion click recorded.",
    });
  } catch (error) {
    console.error(
      "RECORD PROMOTION CLICK ERROR:",
      error
    );

    /*
     * Analytics failure must not stop
     * the user from opening the listing.
     */
    return res.status(200).json({
      success: false,
      recorded: false,
      message:
        "Promotion click could not be recorded.",
    });
  }
};

/**
 * =====================================================
 * GET PROMOTION ANALYTICS
 * GET /api/promotions/:id/analytics
 * =====================================================
 */
export const getAnalytics = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const userId =
      req.user.id;

    /*
     * Synchronize the promotion lifecycle
     * before returning analytics.
     *
     * ACTIVE + endsAt <= now
     * becomes EXPIRED.
     */
    await expirePromotionIfNeeded(
      id
    );

    const result =
      await getPromotionAnalytics({
        promotionId: id,
        userId,
      });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "GET PROMOTION ANALYTICS ERROR:",
      error
    );

    return res
      .status(
        error.statusCode || 500
      )
      .json({
        success: false,

        message:
          error.message ||
          "Unable to load promotion analytics.",
      });
  }
};