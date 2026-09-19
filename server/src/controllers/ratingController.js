
import prisma from "../config/prisma.js";
import { createNotification } from "../services/notificationService.js";

/**
 * ============================================================
 * CREATE RATING
 * POST /api/ratings/trades/:tradeId
 *
 * Body:
 * {
 *   rating: 1-5,
 *   comment?: string
 * }
 *
 * Rules:
 * - Trade must exist
 * - Trade must be COMPLETED
 * - Reviewer must be a participant
 * - Reviewer cannot rate themselves
 * - Reviewed user is determined automatically
 * - Rating must be an integer from 1 to 5
 * - Comment is optional
 * - One rating per trader per completed trade
 * - Reviewed user's barterScore is recalculated
 * ============================================================
 */
export const createRating = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const reviewerId = req.user.id;

    const { rating, comment } = req.body;

    /*
     * ----------------------------------------------------------
     * VALIDATE RATING
     * ----------------------------------------------------------
     */

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5.",
      });
    }

    /*
     * ----------------------------------------------------------
     * VALIDATE COMMENT
     * ----------------------------------------------------------
     */

    const cleanedComment =
      typeof comment === "string"
        ? comment.trim()
        : "";

    if (cleanedComment.length > 1000) {
      return res.status(400).json({
        success: false,
        message:
          "Rating comment cannot exceed 1000 characters.",
      });
    }

    /*
     * ----------------------------------------------------------
     * GET TRADE
     * ----------------------------------------------------------
     */

    const trade = await prisma.trade.findUnique({
      where: {
        id: tradeId,
      },

      include: {
        traderA: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },

        traderB: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found.",
      });
    }

    /*
     * ----------------------------------------------------------
     * ONLY COMPLETED TRADES CAN BE RATED
     * ----------------------------------------------------------
     */

    if (trade.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "You can only rate a trader after the trade has been completed.",
      });
    }

    /*
     * ----------------------------------------------------------
     * CHECK PARTICIPATION
     * ----------------------------------------------------------
     */

    const isTraderA = trade.traderAId === reviewerId;
    const isTraderB = trade.traderBId === reviewerId;

    if (!isTraderA && !isTraderB) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a participant in this trade.",
      });
    }

    /*
     * ----------------------------------------------------------
     * DETERMINE THE OTHER TRADER
     * ----------------------------------------------------------
     *
     * We deliberately do NOT accept reviewedId from
     * the frontend.
     */

    const reviewedId = isTraderA
      ? trade.traderBId
      : trade.traderAId;

    /*
     * ----------------------------------------------------------
     * CHECK FOR EXISTING RATING
     * ----------------------------------------------------------
     */

    const existingRating = await prisma.rating.findUnique({
      where: {
        tradeId_reviewerId_reviewedId: {
          tradeId,
          reviewerId,
          reviewedId,
        },
      },
    });

    if (existingRating) {
      return res.status(409).json({
        success: false,
        message:
          "You have already rated this trader for this trade.",
      });
    }

    /*
     * ----------------------------------------------------------
     * CREATE RATING + UPDATE REPUTATION
     * ----------------------------------------------------------
     */

    const result = await prisma.$transaction(async (tx) => {
      /*
       * Create rating
       */
      const newRating = await tx.rating.create({
        data: {
          tradeId,
          reviewerId,
          reviewedId,
          rating: numericRating,
          comment: cleanedComment || null,
        },

        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },

          reviewed: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      /*
       * Recalculate all ratings received by this user.
       */
      const ratingAggregate = await tx.rating.aggregate({
        where: {
          reviewedId,
        },

        _avg: {
          rating: true,
        },

        _count: {
          rating: true,
        },
      });

      const averageRating =
        ratingAggregate._avg.rating || 0;

      /*
       * Store score to one decimal place.
       *
       * Example:
       * 4.333 -> 4.3
       * 4.666 -> 4.7
       */

      const barterScore =
        Math.round(averageRating * 10) / 10;

      /*
       * Update User.barterScore
       */
      const updatedUser = await tx.user.update({
        where: {
          id: reviewedId,
        },

        data: {
          barterScore,
        },

        select: {
          id: true,
          name: true,
          avatar: true,
          barterScore: true,
          completedTrades: true,
        },
      });

      return {
        rating: newRating,
        user: updatedUser,
        ratingCount: ratingAggregate._count.rating,
      };
    });

    /*
     * ----------------------------------------------------------
     * NOTIFY THE REVIEWED TRADER
     * ----------------------------------------------------------
     */

    await createNotification({
      userId: reviewedId,
      type: "TRADE",
      title: "You received a trade rating",
      referenceId: trade.id,
      referenceType: "TRADE",
      message:
        `${result.rating.reviewer.name} rated you ${numericRating}/5 after your completed trade.`,
    });

    /*
     * ----------------------------------------------------------
     * RESPONSE
     * ----------------------------------------------------------
     */

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully.",

      rating: result.rating,

      reputation: {
        barterScore: result.user.barterScore,
        ratingCount: result.ratingCount,
      },
    });
  } catch (error) {
    console.error("CREATE RATING ERROR:", error);

    /*
     * Prisma duplicate constraint
     */
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "You have already rated this trader for this trade.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit rating.",
    });
  }
};

/**
 * ============================================================
 * GET RATINGS FOR A TRADE
 * GET /api/ratings/trades/:tradeId
 * ============================================================
 */
export const getTradeRatings = async (req, res) => {
  try {
    const { tradeId } = req.params;
    const userId = req.user.id;

    /*
     * ----------------------------------------------------------
     * GET TRADE
     * ----------------------------------------------------------
     */

    const trade = await prisma.trade.findUnique({
      where: {
        id: tradeId,
      },

      select: {
        id: true,
        traderAId: true,
        traderBId: true,
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: "Trade not found.",
      });
    }

    /*
     * ----------------------------------------------------------
     * ONLY PARTICIPANTS CAN VIEW TRADE RATINGS
     * ----------------------------------------------------------
     */

    const isParticipant =
      trade.traderAId === userId ||
      trade.traderBId === userId;

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not a participant in this trade.",
      });
    }

    /*
     * ----------------------------------------------------------
     * GET RATINGS
     * ----------------------------------------------------------
     */

    const ratings = await prisma.rating.findMany({
      where: {
        tradeId,
      },

      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },

        reviewed: {
          select: {
            id: true,
            name: true,
            avatar: true,
            barterScore: true,
          },
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      ratings,
    });
  } catch (error) {
    console.error(
      "GET TRADE RATINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to load trade ratings.",
    });
  }
};

/**
 * ============================================================
 * GET USER RATINGS
 * GET /api/ratings/users/:userId
 *
 * Used for:
 * - Public reputation
 * - User profile
 * - Rating history
 * ============================================================
 */
export const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;

    const ratings = await prisma.rating.findMany({
      where: {
        reviewedId: userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },

        trade: {
          select: {
            id: true,
            tradeNumber: true,
            status: true,
            completedAt: true,

            items: {
              select: {
                listing: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const ratingSummary = await prisma.rating.aggregate({
      where: {
        reviewedId: userId,
      },

      _avg: {
        rating: true,
      },

      _count: {
        rating: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        completedTrades: true,
        barterScore: true,
      },
    });

    return res.status(200).json({
      success: true,

      ratings,

      reputation: {
        averageRating:
          Number(ratingSummary._avg.rating || 0),

        totalRatings:
          Number(ratingSummary._count.rating || 0),

        completedTrades:
          Number(user?.completedTrades || 0),

        barterScore:
          Number(user?.barterScore || 0),
      },
    });
  } catch (error) {
    console.error(
      "GET USER RATINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load user ratings.",
    });
  }
};

