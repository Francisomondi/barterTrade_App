import {
  getActiveSubscription,
} from "../services/subscriptionService.js";

/*
 * ============================================================
 * REQUIRE PREMIUM
 * ============================================================
 *
 * IMPORTANT:
 *
 * This middleware must be used AFTER the normal authentication
 * middleware.
 *
 * Example:
 *
 * router.get(
 *   "/advanced-analytics",
 *   protect,
 *   requirePremium,
 *   getAdvancedAnalytics
 * );
 *
 * The frontend Premium badge is only visual.
 *
 * This middleware is what actually protects Premium features.
 */

export const requirePremium = async (req, res, next) => {
  try {
    /*
     * The authentication middleware should already have
     * attached the logged-in user to req.user.
     */

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,

        code: "AUTHENTICATION_REQUIRED",

        message: "Authentication is required.",
      });
    }

    /*
     * Always check the current subscription in the database.
     *
     * Do not trust:
     *
     * req.body.isPremium
     * req.query.isPremium
     * old JWT Premium values
     */

    const subscription = await getActiveSubscription(
      req.user.id
    );

    if (!subscription) {
      return res.status(403).json({
        success: false,

        code: "PREMIUM_REQUIRED",

        message:
          "This feature requires BarterTrade Premium.",
      });
    }

    /*
     * Make Premium information available to the next
     * controller.
     */

    req.subscription = subscription;

    req.isPremium = true;

    next();
  } catch (error) {
    console.error(
      "PREMIUM MIDDLEWARE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to verify Premium membership.",
    });
  }
};