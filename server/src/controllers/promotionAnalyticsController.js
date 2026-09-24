import {
  recordPromotionEvent,
  getPromotionAnalytics,
} from "../services/promotionAnalyticsService.js";

/**
 * RECORD PROMOTION VIEW
 * POST /api/promotions/:id/analytics/view
 */
export const recordPromotionView = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const userId =
      req.user?.id || null;

    await recordPromotionEvent({
      promotionId: id,
      userId,
      type: "VIEW",
    });

    return res.status(201).json({
      success: true,
      message: "Promotion view recorded.",
    });
  } catch (error) {
    console.error(
      "RECORD PROMOTION VIEW ERROR:",
      error
    );

    /*
     * Analytics should never break the marketplace.
     *
     * If tracking fails, the listing can still be viewed.
     */
    return res.status(200).json({
      success: false,
      message:
        "Promotion view could not be recorded.",
    });
  }
};

/**
 * RECORD PROMOTION CLICK
 * POST /api/promotions/:id/analytics/click
 */
export const recordPromotionClick = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const userId =
      req.user?.id || null;

    await recordPromotionEvent({
      promotionId: id,
      userId,
      type: "CLICK",
    });

    return res.status(201).json({
      success: true,
      message: "Promotion click recorded.",
    });
  } catch (error) {
    console.error(
      "RECORD PROMOTION CLICK ERROR:",
      error
    );

    /*
     * Analytics failure must not stop the user
     * from opening the listing.
     */
    return res.status(200).json({
      success: false,
      message:
        "Promotion click could not be recorded.",
    });
  }
};

/**
 * GET PROMOTION ANALYTICS
 * GET /api/promotions/:id/analytics
 */
export const getAnalytics = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

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

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to load promotion analytics.",
    });
  }
};