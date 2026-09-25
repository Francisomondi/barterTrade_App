import prisma from "../config/prisma.js";

import {
  getUserEntitlements,
} from "../services/premiumEntitlementService.js";

/*
 * ============================================================
 * GET MY ENTITLEMENTS
 * GET /api/entitlements/me
 * ============================================================
 */

export const getMyEntitlements =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const entitlements =
        await getUserEntitlements(
          userId
        );

      const activeListings =
        await prisma.listing.count({
          where: {
            userId,

            status: "ACTIVE",
          },
        });

      const remainingListings =
        Math.max(
          0,
          entitlements
            .activeListingLimit -
            activeListings
        );

      return res
        .status(200)
        .json({
          success: true,

          entitlements: {
            ...entitlements,

            activeListings,

            remainingListings,
          },
        });
    } catch (error) {
      console.error(
        "GET ENTITLEMENTS ERROR:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load account entitlements.",
        });
    }
  };