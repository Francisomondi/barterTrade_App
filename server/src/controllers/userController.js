// CREATE — server/src/controllers/userController.js

import prisma from "../config/prisma.js";
import { getPremiumStatus } from "../services/subscriptionService.js";

/*
 * ============================================================
 * GET PUBLIC USER PROFILE
 * GET /api/users/:userId/public-profile
 * ============================================================
 *
 * Public marketplace profile for PERSONAL sellers.
 *
 * PUBLIC:
 * - Name
 * - Avatar
 * - Bio
 * - Phone
 * - Location
 * - Barter score
 * - Reputation
 * - Completed trades
 * - Membership date
 * - Premium presentation status
 * - Active listings
 *
 * PRIVATE:
 * - Email
 * - Password
 * - authProvider
 * - role
 * - subscription/payment details
 * - internal account information
 *
 * If the user has an ACTIVE business profile, visitors are
 * redirected to the Business Storefront instead.
 * ============================================================
 */

export const getPublicUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    /*
     * ========================================================
     * VALIDATE USER ID
     * ========================================================
     */

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    /*
     * ========================================================
     * LOAD USER
     * ========================================================
     */

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,

        // Public seller contact information
        phone: true,

        location: true,
        barterScore: true,
        createdAt: true,
        status: true,

        businessProfile: {
          select: {
            id: true,
            businessName: true,
            slug: true,
            logo: true,
            category: true,
            status: true,
            verificationStatus: true,
          },
        },
      },
    });

    /*
     * ========================================================
     * USER NOT FOUND / INACTIVE
     * ========================================================
     */

    if (!user || user.status !== "ACTIVE") {
      return res.status(404).json({
        success: false,
        message: "User profile could not be found.",
      });
    }

    /*
     * ========================================================
     * ACTIVE BUSINESS PROFILE
     * ========================================================
     *
     * Business users use the dedicated storefront instead of
     * their personal marketplace profile.
     * ========================================================
     */

    const activeBusiness =
      user.businessProfile?.status === "ACTIVE"
        ? user.businessProfile
        : null;

    if (activeBusiness) {
      return res.json({
        success: true,

        profileType: "BUSINESS",

        redirectToBusiness: true,

        business: {
          businessName:
            activeBusiness.businessName,

          slug:
            activeBusiness.slug,

          logo:
            activeBusiness.logo,

          category:
            activeBusiness.category,

          verificationStatus:
            activeBusiness.verificationStatus,

          isVerified:
            activeBusiness.verificationStatus ===
            "VERIFIED",
        },
      });
    }

    /*
     * ========================================================
     * COMPLETED TRADES
     * ========================================================
     */

    const completedTrades =
      await prisma.trade.count({
        where: {
          status: "COMPLETED",

          OR: [
            {
              traderAId: user.id,
            },
            {
              traderBId: user.id,
            },
          ],
        },
      });

    /*
     * ========================================================
     * RATINGS
     * ========================================================
     */

    const ratingStats =
      await prisma.rating.aggregate({
        where: {
          reviewedId: user.id,
        },

        _avg: {
          rating: true,
        },

        _count: {
          rating: true,
        },
      });

    const averageRating = Number(
      ratingStats?._avg?.rating || 0
    );

    const totalRatings = Number(
      ratingStats?._count?.rating || 0
    );

    /*
     * ========================================================
     * PREMIUM STATUS
     * ========================================================
     *
     * Subscription remains the source of truth.
     * Only the presentation status is exposed publicly.
     * ========================================================
     */

    const premiumStatus =
      await getPremiumStatus(user.id);

    /*
     * ========================================================
     * ACTIVE PUBLIC LISTINGS
     * ========================================================
     */

    const [
      activeListingCount,
      listings,
    ] = await Promise.all([
      prisma.listing.count({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
      }),

      prisma.listing.findMany({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 8,

        select: {
          id: true,
          title: true,
          description: true,
          condition: true,
          estimatedValue: true,
          createdAt: true,

          category: {
            select: {
              id: true,
              name: true,
            },
          },

          images: {
            orderBy: {
              isPrimary: "desc",
            },

            select: {
              id: true,
              url: true,
              isPrimary: true,
            },
          },
        },
      }),
    ]);

    /*
     * ========================================================
     * PUBLIC RESPONSE
     * ========================================================
     */

    return res.json({
      success: true,

      profileType: "PERSONAL",

      redirectToBusiness: false,

      user: {
        id: user.id,

        name:
          user.name ||
          "BarterConnekt User",

        avatar:
          user.avatar || null,

        bio:
          user.bio || null,

        /*
         * Phone is intentionally public because this is the
         * seller's marketplace contact information.
         */
        phone:
          user.phone || null,

        location:
          user.location || null,

        barterScore:
          Number(
            user.barterScore || 0
          ),

        averageRating,

        totalRatings,

        completedTrades,

        createdAt:
          user.createdAt,

        isPremium:
          Boolean(
            premiumStatus?.isPremium
          ),

        activeListingCount,
      },

      listings,
    });
  } catch (error) {
    console.error(
      "GET PUBLIC USER PROFILE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load this user profile.",
    });
  }
};